import type {
  BenefitPlan,
  CompanyConfig,
  ElectronicPayrollDoc,
  Employee,
  Eventuality,
  LegislationParams,
  OvertimeHours,
  PayrollDatabase,
  PayrollFrequency,
  PayrollPeriod,
  Payslip,
  PayslipBenefitLine,
  PeriodAdjustment,
  SeveranceRecord,
  TerminationCause,
  VacationRequest,
} from '../types/payroll.ts';

export const EMPTY_OVERTIME: OvertimeHours = {
  extraDiurna: 0,
  extraNocturna: 0,
  extraDominicalDiurna: 0,
  extraDominicalNocturna: 0,
  recargoNocturno: 0,
};

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function maskBankAccount(account: string): string {
  const clean = account.replace(/\s+/g, '');
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

export function maskDocumentId(doc: string): string {
  const clean = doc.trim();
  if (clean.length <= 4) return clean;
  return `••••${clean.slice(-4)}`;
}

export function round0(n: number): number {
  return Math.round(n);
}

export function calculateBusinessDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function calculateCalendarDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateAccruedVacationDays(
  hireDate: string,
  referenceDate: string,
  daysPerYear = 15,
): number {
  const daysWorked = calculateCalendarDaysInclusive(hireDate, referenceDate);
  if (daysWorked <= 0) return 0;
  return Math.round(((daysWorked / 365) * daysPerYear) * 10) / 10;
}

export function calculateOvertimeAmount(
  monthlySalary: number,
  overtime: OvertimeHours,
): number {
  // Base 220 horas/mes estándar laboral Colombia (Ley 2101 reducción gradual)
  const hourlyRate = monthlySalary / 220;
  const total =
    overtime.extraDiurna * hourlyRate * 1.25 +
    overtime.extraNocturna * hourlyRate * 1.75 +
    overtime.extraDominicalDiurna * hourlyRate * 2.0 +
    overtime.extraDominicalNocturna * hourlyRate * 2.5 +
    overtime.recargoNocturno * hourlyRate * 0.35;
  return round0(total);
}

export function calculateRetefuenteColombia(
  taxableMonthlyIncome: number,
  uvtValue: number,
  umbralUvt: number,
): number {
  if (uvtValue <= 0 || taxableMonthlyIncome <= 0) return 0;
  // Renta exenta laboral general simplificada (25% exento Art. 206 #10 ET)
  const netTaxable = taxableMonthlyIncome * 0.75;
  const uvtAmount = netTaxable / uvtValue;
  if (uvtAmount <= umbralUvt) return 0;

  let taxUvt = 0;
  if (uvtAmount <= 150) {
    taxUvt = (uvtAmount - 95) * 0.19;
  } else if (uvtAmount <= 360) {
    taxUvt = (uvtAmount - 150) * 0.28 + 10.45;
  } else if (uvtAmount <= 640) {
    taxUvt = (uvtAmount - 360) * 0.33 + 69.25;
  } else {
    taxUvt = (uvtAmount - 640) * 0.35 + 161.65;
  }
  return round0(Math.max(0, taxUvt * uvtValue));
}

export function getVacationDaysInPeriod(
  employeeId: string,
  periodKey: string,
  vacations: VacationRequest[],
): number {
  const [yStr, mStr] = periodKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(month)) return 0;

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 0);

  let total = 0;
  for (const vac of vacations) {
    if (
      vac.employeeId !== employeeId ||
      vac.status !== 'Aprobada' ||
      vac.type === 'Compensación en Dinero'
    ) {
      continue;
    }
    const vacStart = new Date(`${vac.startDate}T00:00:00`);
    const vacEnd = new Date(`${vac.endDate}T00:00:00`);
    const overlapStart = vacStart > periodStart ? vacStart : periodStart;
    const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd;
    if (overlapEnd >= overlapStart) {
      const cursor = new Date(overlapStart);
      while (cursor <= overlapEnd) {
        const d = cursor.getDay();
        if (d !== 0 && d !== 6) total += 1;
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }
  return total;
}

export function getEventualityImpactInPeriod(
  employeeId: string,
  periodKey: string,
  eventualities: Eventuality[],
): { bonus: number; deduction: number } {
  let bonus = 0;
  let deduction = 0;
  for (const ev of eventualities) {
    if (ev.employeeId !== employeeId || ev.status === 'Cerrada') continue;
    const overlapsMonth =
      ev.startDate.slice(0, 7) <= periodKey && ev.endDate.slice(0, 7) >= periodKey;
    if (!overlapsMonth) continue;
    if (ev.payrollImpact === 'Bonificación') {
      bonus += ev.amount;
    } else if (ev.payrollImpact === 'Descuento') {
      deduction += ev.amount;
    }
  }
  return { bonus: round0(bonus), deduction: round0(deduction) };
}

export function buildPayslipForEmployee(params: {
  employee: Employee;
  index: number;
  periodKey: string;
  periodLabel: string;
  frequency: PayrollFrequency;
  legislation: LegislationParams;
  benefits: BenefitPlan[];
  vacations: VacationRequest[];
  eventualities?: Eventuality[];
  adjustment?: PeriodAdjustment;
  existingPayslip?: Payslip;
  forcePaid?: boolean;
}): Payslip {
  const {
    employee,
    index,
    periodKey,
    periodLabel,
    frequency,
    legislation,
    benefits,
    vacations,
    eventualities = [],
    adjustment,
    existingPayslip,
    forcePaid,
  } = params;

  const factor = frequency === 'Quincenal' ? 0.5 : 1;
  const baseSalaryPeriod = round0(employee.baseSalary * factor);

  // Auxilio de transporte solo aplica si salario básico mensual <= 2 SMMLV
  const getsTransportAux = employee.baseSalary <= legislation.smmlv * 2;
  const auxilioTransporte = getsTransportAux
    ? round0(legislation.auxilioTransporte * factor)
    : 0;

  const activeBenefits = benefits.filter(
    (b) => b.active && employee.benefitIds.includes(b.id),
  );
  const benefitsBreakdown: PayslipBenefitLine[] = activeBenefits.map((b) => ({
    id: b.id,
    name: b.name,
    amount: round0(b.monthlyAmount * factor),
    salarialFactor: b.salarialFactor,
  }));
  const benefitsTotal = benefitsBreakdown.reduce((s, b) => s + b.amount, 0);
  const salarialBenefits = benefitsBreakdown
    .filter((b) => b.salarialFactor)
    .reduce((s, b) => s + b.amount, 0);

  const evImpact = getEventualityImpactInPeriod(
    employee.id,
    periodKey,
    eventualities,
  );
  const overtimeDetail = adjustment?.overtime ?? EMPTY_OVERTIME;
  const overtimeAmount = calculateOvertimeAmount(employee.baseSalary, overtimeDetail);
  const performanceBonus = round0((adjustment?.performanceBonus ?? 0) + evImpact.bonus);
  const otherDeductions = round0((adjustment?.otherDeductions ?? 0) + evImpact.deduction);

  const grossPay =
    baseSalaryPeriod +
    auxilioTransporte +
    overtimeAmount +
    performanceBonus +
    benefitsTotal;

  // IBC (Ingreso Base de Cotización) = Salario + extras + bonos salariales (excluye Aux Transporte)
  const ibc = baseSalaryPeriod + overtimeAmount + performanceBonus + salarialBenefits;

  const saludDeduction = round0(ibc * (legislation.saludEmpleadoPct / 100));
  const pensionDeduction = round0(ibc * (legislation.pensionEmpleadoPct / 100));

  const fspDeduction =
    employee.baseSalary >= legislation.smmlv * legislation.fspUmbralSmmlv
      ? round0(ibc * (legislation.fspPct / 100))
      : 0;

  // Retefuente mensualizada y escalada al período
  const monthlyEquivalentTaxable =
    (ibc - saludDeduction - pensionDeduction - fspDeduction) / factor;
  const monthlyRetefuente = calculateRetefuenteColombia(
    monthlyEquivalentTaxable,
    legislation.uvt,
    legislation.retefuenteUmbralUvt,
  );
  const retefuenteDeduction = round0(monthlyRetefuente * factor);

  const totalDeductions =
    saludDeduction +
    pensionDeduction +
    fspDeduction +
    retefuenteDeduction +
    otherDeductions;
  const netPay = Math.max(0, grossPay - totalDeductions);

  // Aportes Patronales y Parafiscales (Ley 1607 / exoneración parcial opcional, calculado explícito)
  const employerHealth = round0(ibc * (legislation.saludEmpleadorPct / 100));
  const employerPension = round0(ibc * (legislation.pensionEmpleadorPct / 100));
  const arlRate = legislation.arlRates[employee.arlRiskLevel] ?? 0.522;
  const employerArl = round0(ibc * (arlRate / 100));
  const parafiscalesTotal = round0(
    ibc *
      ((legislation.cajaCompensacionPct +
        legislation.senaPct +
        legislation.icbfPct) /
        100),
  );

  const compactPeriod = periodKey.replace('-', '');
  const seq = String(index + 1).padStart(3, '0');
  const receiptNumber =
    existingPayslip?.receiptNumber ?? `INAM-${compactPeriod}-${seq}`;
  const isPaid = forcePaid || existingPayslip?.paymentStatus === 'Pagado';

  return {
    id: existingPayslip?.id ?? `PAY-${compactPeriod}-${employee.id}`,
    receiptNumber,
    periodKey,
    periodLabel,
    frequency,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeDocumentId: employee.documentId,
    employeeRole: employee.role,
    department: employee.department,
    bankName: employee.bankName,
    bankAccountMasked: maskBankAccount(employee.bankAccountNumber),
    baseSalaryPeriod,
    auxilioTransporte,
    overtimeAmount,
    overtimeDetail,
    performanceBonus,
    benefitsBreakdown,
    benefitsTotal,
    grossPay,
    saludDeduction,
    pensionDeduction,
    fspDeduction,
    retefuenteDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
    employerHealth,
    employerPension,
    employerArl,
    parafiscalesTotal,
    vacationDaysTaken: getVacationDaysInPeriod(employee.id, periodKey, vacations),
    paymentStatus: isPaid ? 'Pagado' : 'Pendiente',
    generatedAt: existingPayslip?.generatedAt ?? new Date().toISOString(),
    paidAt: isPaid ? existingPayslip?.paidAt ?? new Date().toISOString() : null,
  };
}

export function recalculateDraftPeriod(
  period: PayrollPeriod,
  employees: Employee[],
  benefits: BenefitPlan[],
  vacations: VacationRequest[],
  legislationList: LegislationParams[],
  eventualities: Eventuality[] = [],
): PayrollPeriod {
  if (period.status === 'Pagada') return period;

  const leg =
    legislationList.find((l) => l.year === period.year) ?? legislationList[0];
  const eligible = employees.filter((e) => e.status !== 'Retirado');
  const existingMap = new Map(period.payslips.map((p) => [p.employeeId, p]));

  const payslips = eligible.map((emp, idx) =>
    buildPayslipForEmployee({
      employee: emp,
      index: idx,
      periodKey: period.periodKey,
      periodLabel: period.label,
      frequency: period.frequency,
      legislation: leg,
      benefits,
      vacations,
      eventualities,
      adjustment: period.adjustments[emp.id],
      existingPayslip: existingMap.get(emp.id),
    }),
  );

  return {
    ...period,
    payslips,
  };
}

export interface SocialBenefitsEmployeeCalc {
  employeeId: string;
  employeeName: string;
  department: string;
  baseSalary: number;
  auxilioTransporte: number;
  basePrestacional: number;
  daysYear: number;
  daysSemester: number;
  primaServicios: number;
  cesantias: number;
  interesesCesantias: number;
  aplicaDotacion: boolean;
  motivoDotacion: string;
}

export function calculateSocialBenefitsForEmployee(
  employee: Employee,
  legislation: LegislationParams,
  referenceDate = '2026-11-17',
): SocialBenefitsEmployeeCalc {
  const yearStart = `${legislation.year}-01-01`;
  const semesterStart =
    Number(referenceDate.split('-')[1]) >= 7
      ? `${legislation.year}-07-01`
      : `${legislation.year}-01-01`;

  const effectiveYearStart =
    employee.hireDate > yearStart ? employee.hireDate : yearStart;
  const effectiveSemesterStart =
    employee.hireDate > semesterStart ? employee.hireDate : semesterStart;

  const daysYear = Math.min(
    360,
    Math.max(0, calculateCalendarDaysInclusive(effectiveYearStart, referenceDate)),
  );
  const daysSemester = Math.min(
    180,
    Math.max(
      0,
      calculateCalendarDaysInclusive(effectiveSemesterStart, referenceDate),
    ),
  );

  const getsTransport = employee.baseSalary <= legislation.smmlv * 2;
  const auxilioTransporte = getsTransport ? legislation.auxilioTransporte : 0;
  const basePrestacional = employee.baseSalary + auxilioTransporte;

  const primaServicios = round0((basePrestacional * daysSemester) / 360);
  const cesantias = round0((basePrestacional * daysYear) / 360);
  const interesesCesantias = round0(
    (cesantias * daysYear * (legislation.interesesCesantiasPct / 100)) / 360,
  );

  const totalTenureDays = calculateCalendarDaysInclusive(
    employee.hireDate,
    referenceDate,
  );
  const aplicaDotacion = getsTransport && totalTenureDays >= 90;
  const motivoDotacion = !getsTransport
    ? 'Supera tope de 2 SMMLV'
    : totalTenureDays < 90
      ? 'Menos de 3 meses de antigüedad'
      : 'Cumple (≤ 2 SMMLV · Entregas: Abr 30 / Ago 31 / Dic 20)';

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    baseSalary: employee.baseSalary,
    auxilioTransporte,
    basePrestacional,
    daysYear,
    daysSemester,
    primaServicios,
    cesantias,
    interesesCesantias,
    aplicaDotacion,
    motivoDotacion,
  };
}

export function calculateSeveranceLiquidation(params: {
  id: string;
  employee: Employee;
  terminationDate: string;
  cause: TerminationCause;
  pendingSalaryDays: number;
  legislation: LegislationParams;
}): SeveranceRecord {
  const { id, employee, terminationDate, cause, pendingSalaryDays, legislation } =
    params;

  const year = Number(terminationDate.split('-')[0]) || legislation.year;
  const yearStart = `${year}-01-01`;
  const semesterStart =
    Number(terminationDate.split('-')[1]) >= 7
      ? `${year}-07-01`
      : `${year}-01-01`;

  const effectiveYearStart =
    employee.hireDate > yearStart ? employee.hireDate : yearStart;
  const effectiveSemesterStart =
    employee.hireDate > semesterStart ? employee.hireDate : semesterStart;

  const daysWorkedTotal = Math.max(
    1,
    calculateCalendarDaysInclusive(employee.hireDate, terminationDate),
  );
  const daysYear = Math.min(
    360,
    Math.max(1, calculateCalendarDaysInclusive(effectiveYearStart, terminationDate)),
  );
  const daysSemester = Math.min(
    180,
    Math.max(
      1,
      calculateCalendarDaysInclusive(effectiveSemesterStart, terminationDate),
    ),
  );

  const getsTransport = employee.baseSalary <= legislation.smmlv * 2;
  const aux = getsTransport ? legislation.auxilioTransporte : 0;
  const basePrestacional = employee.baseSalary + aux;
  const dailySalary = employee.baseSalary / 30;

  const pendingSalaryAmount = round0(
    ((employee.baseSalary + aux) / 30) * Math.max(0, pendingSalaryDays),
  );
  const primaProporcional = round0((basePrestacional * daysSemester) / 360);
  const cesantiasProporcional = round0((basePrestacional * daysYear) / 360);
  const interesesCesantias = round0(
    (cesantiasProporcional * daysYear * (legislation.interesesCesantiasPct / 100)) /
      360,
  );

  const accruedVacations = calculateAccruedVacationDays(
    employee.hireDate,
    terminationDate,
    legislation.vacacionesDiasPorAno,
  );
  const vacacionesPendientesDias = Math.max(
    0,
    Math.round(
      (accruedVacations -
        employee.usedVacationDays -
        employee.compensatedVacationDays) *
        10,
    ) / 10,
  );
  const vacacionesPendientesAmount = round0(
    dailySalary * vacacionesPendientesDias,
  );

  let indemnizacionAmount = 0;
  let indemnizacionFormulaNote = 'No aplica indemnización para esta causal.';

  if (cause === 'Despido sin Justa Causa') {
    if (employee.contractType === 'Término Fijo' && employee.contractEndDate) {
      const remainingDays = Math.max(
        15,
        calculateCalendarDaysInclusive(terminationDate, employee.contractEndDate),
      );
      indemnizacionAmount = round0(dailySalary * remainingDays);
      indemnizacionFormulaNote = `Art. 64 CST (Término Fijo): ${remainingDays} días faltantes hasta vencimiento (${formatShortDate(employee.contractEndDate)}).`;
    } else {
      const yearsWorked = daysWorkedTotal / 365;
      const underTenSmmlv = employee.baseSalary < legislation.smmlv * 10;
      const firstYearDays = underTenSmmlv ? 30 : 20;
      const extraYearDays = underTenSmmlv ? 20 : 15;
      const indemnDays =
        yearsWorked <= 1
          ? firstYearDays
          : firstYearDays + (yearsWorked - 1) * extraYearDays;
      indemnizacionAmount = round0(dailySalary * indemnDays);
      indemnizacionFormulaNote = `Art. 64 CST (Término Indefinido ${underTenSmmlv ? '< 10 SMMLV' : '≥ 10 SMMLV'}): ${indemnDays.toFixed(1)} días equivalentes.`;
    }
  }

  const totalLiquidation =
    pendingSalaryAmount +
    primaProporcional +
    cesantiasProporcional +
    interesesCesantias +
    vacacionesPendientesAmount +
    indemnizacionAmount;

  return {
    id,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeDocumentId: employee.documentId,
    employeeRole: employee.role,
    department: employee.department,
    contractType: employee.contractType,
    hireDate: employee.hireDate,
    terminationDate,
    cause,
    baseSalary: employee.baseSalary,
    auxilioTransporte: aux,
    daysWorkedTotal,
    pendingSalaryDays,
    pendingSalaryAmount,
    primaProporcional,
    cesantiasProporcional,
    interesesCesantias,
    vacacionesPendientesDias,
    vacacionesPendientesAmount,
    indemnizacionAmount,
    indemnizacionFormulaNote,
    totalLiquidation,
    createdAt: new Date().toISOString(),
  };
}

export function generatePseudoCune(
  receiptNumber: string,
  documentId: string,
  netPay: number,
  periodKey: string,
): string {
  const raw = `${receiptNumber}|${documentId}|${netPay}|${periodKey}|DIAN-INAMOD`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  const part = `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  return `${part}${part}${part}`.slice(0, 48).toUpperCase();
}

export function buildElectronicPayrollXML(
  payslip: Payslip,
  company: CompanyConfig,
  cune: string,
): string {
  const issueDate = payslip.generatedAt.split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual" SchemaLocation="NominaIndividualElectronica.xsd">
  <Novedad CUNE="${cune}">false</Novedad>
  <Periodo FechaIngreso="${issueDate}" FechaLiquidacionInicio="${payslip.periodKey}-01" FechaLiquidacionFin="${payslip.periodKey}-28" TiempoLaborado="30" FechaGen="${issueDate}" />
  <NumeroSecuenciaXML Prefijo="INAM" Consecutivo="${payslip.receiptNumber}" Numero="${payslip.receiptNumber}" />
  <LugarGeneracionXML Pais="CO" DepartamentoEstado="05" MunicipioCiudad="05001" Idioma="es" />
  <ProveedorXML NIT="${company.nit}" SoftwareID="INAMOD-NE-2026" />
  <Empleador RazonSocial="${company.name}" NIT="${company.nit}" Pais="CO" DepartamentoEstado="Antioquia" MunicipioCiudad="Medellín" Direccion="${company.address}" />
  <Trabajador TipoTrabajador="01" SubTipoTrabajador="00" AltoRiesgoPension="false" TipoDocumento="13" NumeroDocumento="${payslip.employeeDocumentId}" PrimerNombre="${payslip.employeeName}" Cargo="${payslip.employeeRole}" Sueldo="${payslip.baseSalaryPeriod}" />
  <Pago Forma="1" Metodo="47" Banco="${payslip.bankName}" NumeroCuenta="${payslip.bankAccountMasked}" />
  <Devengados>
    <Basico DiasTrabajados="30" SueldoTrabajado="${payslip.baseSalaryPeriod}" />
    <Transporte AuxilioTransporte="${payslip.auxilioTransporte}" />
    <HorasExtras Total="${payslip.overtimeAmount}" />
    <Bonificaciones Total="${payslip.performanceBonus + payslip.benefitsTotal}" />
    <DevengadosTotal>${payslip.grossPay}</DevengadosTotal>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${payslip.saludDeduction}" />
    <FondoPension Porcentaje="4.00" Deduccion="${payslip.pensionDeduction}" />
    <FondoSP Deduccion="${payslip.fspDeduction}" />
    <RetencionFuente Valor="${payslip.retefuenteDeduction}" />
    <OtrasDeducciones Valor="${payslip.otherDeductions}" />
    <DeduccionesTotal>${payslip.totalDeductions}</DeduccionesTotal>
  </Deducciones>
  <ComprobanteTotal>${payslip.netPay}</ComprobanteTotal>
</NominaIndividual>`;
}

export function buildElectronicDocFromPayslip(
  payslip: Payslip,
  company: CompanyConfig,
  existing?: ElectronicPayrollDoc,
): ElectronicPayrollDoc {
  const cune =
    existing?.cune ??
    generatePseudoCune(
      payslip.receiptNumber,
      payslip.employeeDocumentId,
      payslip.netPay,
      payslip.periodKey,
    );

  return {
    id: existing?.id ?? `NE-${payslip.receiptNumber}`,
    payslipId: payslip.id,
    receiptNumber: payslip.receiptNumber,
    periodKey: payslip.periodKey,
    periodLabel: payslip.periodLabel,
    employeeId: payslip.employeeId,
    employeeName: payslip.employeeName,
    employeeDocumentId: payslip.employeeDocumentId,
    cune,
    status: existing?.status ?? 'PENDIENTE',
    dianMessage:
      existing?.dianMessage ?? 'Documento XML generado listo para transmisión DIAN.',
    retryCount: existing?.retryCount ?? 0,
    xmlContent: buildElectronicPayrollXML(payslip, company, cune),
    netPay: payslip.netPay,
    grossPay: payslip.grossPay,
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  };
}

export function getPeriodLabel(periodKey: string): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const [yStr, mStr] = periodKey.split('-');
  const mIdx = Number(mStr) - 1;
  return `${months[mIdx] ?? 'Mes'} ${yStr}`;
}

export type CalendarEventCategory =
  | 'pago'
  | 'vacaciones'
  | 'eventualidad'
  | 'hito';

export interface CalendarEventItem {
  id: string;
  date: string;
  category: CalendarEventCategory;
  title: string;
  subtitle: string;
  status?: string;
  amount?: number;
  employeeName?: string;
}

export function buildCalendarEventsForMonth(
  db: PayrollDatabase,
  year: number,
  monthIndex0: number,
  restrictedEmployeeId?: string,
): CalendarEventItem[] {
  const mm = String(monthIndex0 + 1).padStart(2, '0');
  const monthKey = `${year}-${mm}`;
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const empMap = new Map(db.employees.map((e) => [e.id, e]));
  const events: CalendarEventItem[] = [];

  // 1. Pagos de nómina (si el período existe, usa sus valores; si no, proyecta día 28)
  const period = db.periods.find((p) => p.periodKey === monthKey);
  if (period) {
    const slips = restrictedEmployeeId
      ? period.payslips.filter((s) => s.employeeId === restrictedEmployeeId)
      : period.payslips;
    const totalNet = slips.reduce((s, p) => s + p.netPay, 0);

    if (period.frequency === 'Quincenal') {
      events.push({
        id: `PAY-Q1-${monthKey}`,
        date: `${monthKey}-15`,
        category: 'pago',
        title: `Pago 1ª Quincena ${period.label}`,
        subtitle: restrictedEmployeeId
          ? 'Tu pago quincenal programado'
          : `${slips.length} colaboradores · ${period.status}`,
        status: period.status,
        amount: totalNet,
      });
    }
    const payDay = Math.min(28, daysInMonth);
    events.push({
      id: `PAY-END-${monthKey}`,
      date: `${monthKey}-${String(payDay).padStart(2, '0')}`,
      category: 'pago',
      title:
        period.frequency === 'Quincenal'
          ? `Pago 2ª Quincena ${period.label}`
          : `Pago Nómina ${period.label}`,
      subtitle: restrictedEmployeeId
        ? 'Fecha oficial de abono en cuenta'
        : `${slips.length} desprendibles · ${period.status}`,
      status: period.status,
      amount: totalNet,
    });
  } else {
    events.push({
      id: `PAY-PROJ-${monthKey}`,
      date: `${monthKey}-28`,
      category: 'pago',
      title: `Fecha Programada de Nómina (${getPeriodLabel(monthKey)})`,
      subtitle: 'Dispersión mensual proyectada',
      status: 'Programado',
    });
  }

  // 2. Vacaciones (por cada día del rango dentro del mes visible)
  const monthStartStr = `${monthKey}-01`;
  const monthEndStr = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
  for (const v of db.vacations) {
    if (restrictedEmployeeId && v.employeeId !== restrictedEmployeeId) continue;
    if (v.status === 'Rechazada') continue;
    if (v.endDate < monthStartStr || v.startDate > monthEndStr) continue;

    const empName = empMap.get(v.employeeId)?.fullName ?? v.employeeId;
    if (v.type === 'Compensación en Dinero') {
      if (v.startDate.startsWith(monthKey)) {
        events.push({
          id: `VAC-EV-${v.id}`,
          date: v.startDate,
          category: 'vacaciones',
          title: `Compensación Vacaciones · ${empName}`,
          subtitle: `${v.businessDays} días compensados (${v.status})`,
          status: v.status,
          amount: v.compensatedAmount,
          employeeName: empName,
        });
      }
      continue;
    }

    const startDay = v.startDate < monthStartStr ? monthStartStr : v.startDate;
    const endDay = v.endDate > monthEndStr ? monthEndStr : v.endDate;
    const cursor = new Date(`${startDay}T00:00:00`);
    const endDt = new Date(`${endDay}T00:00:00`);
    while (cursor <= endDt) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        events.push({
          id: `VAC-${v.id}-${y}${m}${d}`,
          date: `${y}-${m}-${d}`,
          category: 'vacaciones',
          title: `${v.type === 'Vacaciones Anuales' ? 'Vacaciones' : v.type}: ${empName}`,
          subtitle: `${formatShortDate(v.startDate)} al ${formatShortDate(v.endDate)} (${v.status})`,
          status: v.status,
          employeeName: empName,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // 3. Eventualidades
  for (const ev of db.eventualities) {
    if (restrictedEmployeeId && ev.employeeId !== restrictedEmployeeId) continue;
    if (ev.endDate < monthStartStr || ev.startDate > monthEndStr) continue;

    const empName = empMap.get(ev.employeeId)?.fullName ?? ev.employeeId;
    const startDay = ev.startDate < monthStartStr ? monthStartStr : ev.startDate;
    const endDay = ev.endDate > monthEndStr ? monthEndStr : ev.endDate;
    const cursor = new Date(`${startDay}T00:00:00`);
    const endDt = new Date(`${endDay}T00:00:00`);
    while (cursor <= endDt) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      events.push({
        id: `EVE-${ev.id}-${y}${m}${d}`,
        date: `${y}-${m}-${d}`,
        category: 'eventualidad',
        title: `${ev.type}: ${empName}`,
        subtitle: `${ev.payrollImpact} · ${ev.description}`,
        status: ev.status,
        amount: ev.amount > 0 ? ev.amount : undefined,
        employeeName: empName,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // 4. Hitos Legales Colombianos y Contratos / Liquidaciones
  const legalMilestones: { mmdd: string; title: string; subtitle: string }[] = [
    {
      mmdd: '01-31',
      title: 'Pago Intereses sobre Cesantías (12%)',
      subtitle: 'Plazo máximo legal pago directo al trabajador (Ley 52/1975)',
    },
    {
      mmdd: '02-14',
      title: 'Consignación de Cesantías a Fondo',
      subtitle: 'Fecha límite legal consignación anual (Art. 99 Ley 50/1990)',
    },
    {
      mmdd: '04-30',
      title: '1ª Entrega de Dotación Legal',
      subtitle: 'Aplica a trabajadores con salario ≤ 2 SMMLV (Art. 230 CST)',
    },
    {
      mmdd: '06-30',
      title: 'Pago Prima de Servicios (1er Semestre)',
      subtitle: 'Plazo límite legal 30 de junio (Art. 306 CST)',
    },
    {
      mmdd: '08-31',
      title: '2ª Entrega de Dotación Legal',
      subtitle: 'Aplica a trabajadores con salario ≤ 2 SMMLV (Art. 230 CST)',
    },
    {
      mmdd: '12-20',
      title: 'Prima de Servicios (2do Sem.) + 3ª Dotación',
      subtitle: 'Plazo límite legal 20 de diciembre (Art. 306 y 230 CST)',
    },
  ];

  for (const h of legalMilestones) {
    if (h.mmdd.startsWith(mm)) {
      events.push({
        id: `HITO-${year}-${h.mmdd}`,
        date: `${year}-${h.mmdd}`,
        category: 'hito',
        title: h.title,
        subtitle: h.subtitle,
        status: 'Obligación Legal',
      });
    }
  }

  if (!restrictedEmployeeId) {
    for (const sev of db.severances) {
      if (sev.terminationDate.startsWith(monthKey)) {
        events.push({
          id: `SEV-${sev.id}`,
          date: sev.terminationDate,
          category: 'hito',
          title: `Liquidación Definitiva: ${sev.employeeName}`,
          subtitle: `${sev.cause} · Radicado ${sev.id}`,
          status: 'Liquidado',
          amount: sev.totalLiquidation,
          employeeName: sev.employeeName,
        });
      }
    }
  }

  for (const emp of db.employees) {
    if (restrictedEmployeeId && emp.id !== restrictedEmployeeId) continue;
    if (emp.contractEndDate && emp.contractEndDate.startsWith(monthKey)) {
      events.push({
        id: `CON-${emp.id}`,
        date: emp.contractEndDate,
        category: 'hito',
        title: `Vencimiento Contrato Fijo: ${emp.fullName}`,
        subtitle: `Recordatorio preaviso 30 días (Art. 46 CST)`,
        status: 'Contrato',
        employeeName: emp.fullName,
      });
    }
  }

  return events;
}

