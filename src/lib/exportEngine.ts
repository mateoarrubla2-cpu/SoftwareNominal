import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  calculateSocialBenefitsForEmployee,
  formatCOP,
  formatShortDate,
} from './payrollEngine.ts';
import type {
  BenefitPlan,
  CompanyConfig,
  Employee,
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
  Payslip,
  SeveranceRecord,
  VacationRequest,
} from '../types/payroll.ts';

function renderPayslipPage(
  doc: jsPDF,
  payslip: Payslip,
  company: CompanyConfig,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.name, margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`NIT: ${company.nit} · ${company.city}`, margin, 19.5);
  doc.text(company.address, margin, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('DESPRENDIBLE DE PAGO', pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`Comprobante: ${payslip.receiptNumber}`, pageWidth - margin, 19.5, {
    align: 'right',
  });
  doc.text(
    `${payslip.periodLabel} (${payslip.frequency})`,
    pageWidth - margin,
    25,
    { align: 'right' },
  );

  let y = 42;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(payslip.employeeName, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${payslip.employeeRole} · ${payslip.department}`, margin + 5, y + 14.5);
  doc.text(
    `C.C. ${payslip.employeeDocumentId}  |  ID: ${payslip.employeeId}`,
    margin + 5,
    y + 20.5,
  );
  doc.text(
    `Abono: ${payslip.bankName} (${payslip.bankAccountMasked})`,
    margin + 5,
    y + 26.5,
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(
    payslip.paymentStatus === 'Pagado' ? 15 : 180,
    payslip.paymentStatus === 'Pagado' ? 118 : 83,
    payslip.paymentStatus === 'Pagado' ? 110 : 9,
  );
  doc.text(`Estado: ${payslip.paymentStatus}`, pageWidth - margin - 5, y + 8, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Emisión: ${formatShortDate(payslip.generatedAt)}`,
    pageWidth - margin - 5,
    y + 15,
    { align: 'right' },
  );
  doc.text(
    `Días vacaciones período: ${payslip.vacationDaysTaken}`,
    pageWidth - margin - 5,
    y + 21.5,
    { align: 'right' },
  );

  y += 40;

  const earningRows: (string | number)[][] = [
    [
      `Salario Básico (${payslip.frequency})`,
      'Factor Salarial',
      formatCOP(payslip.baseSalaryPeriod),
    ],
  ];

  if (payslip.auxilioTransporte > 0) {
    earningRows.push([
      'Auxilio de Transporte Legal',
      '≤ 2 SMMLV',
      formatCOP(payslip.auxilioTransporte),
    ]);
  }
  if (payslip.overtimeAmount > 0) {
    earningRows.push([
      'Horas Extras y Recargos',
      'Ley Laboral',
      formatCOP(payslip.overtimeAmount),
    ]);
  }
  if (payslip.performanceBonus > 0) {
    earningRows.push([
      'Bonificación / Estímulo',
      'Percepción período',
      formatCOP(payslip.performanceBonus),
    ]);
  }
  for (const b of payslip.benefitsBreakdown) {
    earningRows.push([
      b.name,
      b.salarialFactor ? 'Salarial' : 'No salarial',
      formatCOP(b.amount),
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Devengos', 'Naturaleza', 'Valor (COP)']],
    body: earningRows,
    foot: [['TOTAL DEVENGADO', '', formatCOP(payslip.grossPay)]],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9 },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
  });

  const afterEarnY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 7;

  const dedRows: (string | number)[][] = [
    ['Aporte Salud (EPS)', '4.0% s/ IBC', formatCOP(payslip.saludDeduction)],
    [
      'Aporte Pensión (AFP)',
      '4.0% s/ IBC',
      formatCOP(payslip.pensionDeduction),
    ],
  ];
  if (payslip.fspDeduction > 0) {
    dedRows.push([
      'Fondo de Solidaridad Pensional',
      '≥ 4 SMMLV (1%)',
      formatCOP(payslip.fspDeduction),
    ]);
  }
  if (payslip.retefuenteDeduction > 0) {
    dedRows.push([
      'Retención en la Fuente (Art. 383 ET)',
      'Base UVT',
      formatCOP(payslip.retefuenteDeduction),
    ]);
  }
  if (payslip.otherDeductions > 0) {
    dedRows.push([
      'Otras Deducciones / Libranzas',
      'Descuento período',
      formatCOP(payslip.otherDeductions),
    ]);
  }

  autoTable(doc, {
    startY: afterEarnY,
    margin: { left: margin, right: margin },
    head: [['Deducciones de Ley y Otras', 'Base / Concepto', 'Valor (COP)']],
    body: dedRows,
    foot: [['TOTAL DEDUCCIONES', '', formatCOP(payslip.totalDeductions)]],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
  });

  const afterDedY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 9;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, afterDedY, contentWidth, 18, 2, 2, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('NETO A PAGAR AL TRABAJADOR', margin + 6, afterDedY + 7.5);
  doc.text(
    `Aportes empleador informativos: Salud ${formatCOP(payslip.employerHealth)} · Pensión ${formatCOP(payslip.employerPension)} · ARL ${formatCOP(payslip.employerArl)}`,
    margin + 6,
    afterDedY + 13.5,
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(formatCOP(payslip.netPay), pageWidth - margin - 6, afterDedY + 11.5, {
    align: 'right',
  });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${company.name} · Documento generado automáticamente · ${payslip.receiptNumber}`,
    pageWidth / 2,
    285,
    { align: 'center' },
  );
}

export function exportPayslipPDF(
  payslip: Payslip,
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderPayslipPage(doc, payslip, company);
  doc.save(
    `Desprendible_${payslip.receiptNumber}_${payslip.employeeName.replace(/\s+/g, '_')}.pdf`,
  );
}

export function exportAllPayslipsPDF(
  period: PayrollPeriod,
  company: CompanyConfig,
): void {
  if (period.payslips.length === 0) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  period.payslips.forEach((p, idx) => {
    if (idx > 0) doc.addPage();
    renderPayslipPage(doc, p, company);
  });
  doc.save(`Desprendibles_${period.periodKey}_${period.frequency}.pdf`);
}

export function exportPayrollReportPDF(
  period: PayrollPeriod,
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const totalGross = period.payslips.reduce((s, p) => s + p.grossPay, 0);
  const totalDed = period.payslips.reduce((s, p) => s + p.totalDeductions, 0);
  const totalNet = period.payslips.reduce((s, p) => s + p.netPay, 0);
  const totalAux = period.payslips.reduce((s, p) => s + p.auxilioTransporte, 0);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(
    `Reporte General de Nómina — ${period.label} (${period.frequency})`,
    margin,
    10.5,
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${company.name} · NIT ${company.nit} · Estado: ${period.status}`,
    margin,
    17.5,
  );

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [
      [
        'Trabajadores',
        'Auxilio Transporte',
        'Total Devengado',
        'Total Deducciones',
        'Neto a Dispersar',
      ],
    ],
    body: [
      [
        String(period.payslips.length),
        formatCOP(totalAux),
        formatCOP(totalGross),
        formatCOP(totalDed),
        formatCOP(totalNet),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 9.5, fontStyle: 'bold', halign: 'center' },
  });

  const y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        'Comprobante',
        'Trabajador',
        'Básico',
        'Aux. Transp.',
        'Extras/Bonos',
        'Beneficios',
        'Salud+Pensión',
        'FSP+Retefuente',
        'Neto',
        'Estado',
      ],
    ],
    body: period.payslips.map((p) => [
      p.receiptNumber,
      p.employeeName,
      formatCOP(p.baseSalaryPeriod),
      formatCOP(p.auxilioTransporte),
      formatCOP(p.overtimeAmount + p.performanceBonus),
      formatCOP(p.benefitsTotal),
      formatCOP(p.saludDeduction + p.pensionDeduction),
      formatCOP(p.fspDeduction + p.retefuenteDeduction),
      formatCOP(p.netPay),
      p.paymentStatus,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.8 },
    styles: { fontSize: 7.8, cellPadding: 2.3 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Nomina_INAMOD_${period.periodKey}.pdf`);
}

export function exportPayrollWorkbookExcel(
  db: PayrollDatabase,
  period: PayrollPeriod,
): void {
  const wb = XLSX.utils.book_new();

  const payrollRows = period.payslips.map((p) => ({
    Comprobante: p.receiptNumber,
    Cédula: p.employeeDocumentId,
    Colaborador: p.employeeName,
    Cargo: p.employeeRole,
    Departamento: p.department,
    Periodicidad: p.frequency,
    'Salario Básico': p.baseSalaryPeriod,
    'Auxilio Transporte': p.auxilioTransporte,
    'Horas Extras': p.overtimeAmount,
    Bonificaciones: p.performanceBonus,
    Beneficios: p.benefitsTotal,
    'Total Devengado': p.grossPay,
    'Salud (4%)': p.saludDeduction,
    'Pensión (4%)': p.pensionDeduction,
    'Fondo Solidaridad': p.fspDeduction,
    Retefuente: p.retefuenteDeduction,
    'Otras Deducciones': p.otherDeductions,
    'Total Deducciones': p.totalDeductions,
    'Neto a Pagar': p.netPay,
    Estado: p.paymentStatus,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(payrollRows),
    'Nómina del Período',
  );

  const leg =
    db.legislation.find((l) => l.year === period.year) ?? db.legislation[0];
  const socialRows = db.employees
    .filter((e) => e.status !== 'Retirado')
    .map((emp) => {
      const calc = calculateSocialBenefitsForEmployee(emp, leg);
      return {
        Colaborador: emp.fullName,
        Departamento: emp.department,
        'Salario Base': calc.baseSalary,
        'Aux. Transporte': calc.auxilioTransporte,
        'Base Prestacional': calc.basePrestacional,
        'Prima de Servicios': calc.primaServicios,
        Cesantías: calc.cesantias,
        'Intereses Cesantías (12%)': calc.interesesCesantias,
        'Aplica Dotación': calc.aplicaDotacion ? 'Sí' : 'No',
        Observación: calc.motivoDotacion,
      };
    });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(socialRows),
    'Prestaciones Sociales',
  );

  const empMap = new Map(db.employees.map((e) => [e.id, e]));
  const vacRows = db.vacations.map((v) => ({
    ID: v.id,
    Colaborador: empMap.get(v.employeeId)?.fullName ?? v.employeeId,
    Tipo: v.type,
    Inicio: v.startDate,
    Fin: v.endDate,
    'Días Hábiles': v.businessDays,
    'Compensación COP': v.compensatedAmount,
    Estado: v.status,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(vacRows),
    'Vacaciones',
  );

  XLSX.writeFile(wb, `Nomina_INAMOD_${period.periodKey}.xlsx`);
}

export function exportSocialBenefitsPDF(
  employees: Employee[],
  legislation: LegislationParams,
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(
    `Provisiones y Prestaciones Sociales — Vigencia ${legislation.year}`,
    margin,
    10.5,
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${company.name} · SMMLV ${formatCOP(legislation.smmlv)} · Aux. Transporte ${formatCOP(legislation.auxilioTransporte)}`,
    margin,
    17.5,
  );

  const calcs = employees
    .filter((e) => e.status !== 'Retirado')
    .map((e) => calculateSocialBenefitsForEmployee(e, legislation));

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [
      [
        'Colaborador',
        'Base Prestacional',
        'Días Sem.',
        'Prima Servicios',
        'Días Año',
        'Cesantías',
        'Intereses (12%)',
        'Dotación',
      ],
    ],
    body: calcs.map((c) => [
      c.employeeName,
      formatCOP(c.basePrestacional),
      String(c.daysSemester),
      formatCOP(c.primaServicios),
      String(c.daysYear),
      formatCOP(c.cesantias),
      formatCOP(c.interesesCesantias),
      c.aplicaDotacion ? 'Sí aplica' : c.motivoDotacion,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.3, cellPadding: 2.5 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right' },
    },
  });

  doc.save(`Prestaciones_Sociales_${legislation.year}.pdf`);
}

export function exportSeverancePDF(
  record: SeveranceRecord,
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ACTA DE LIQUIDACIÓN DEFINITIVA DE CONTRATO', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${company.name} · NIT ${company.nit}`, margin, 21);
  doc.text(`Radicado: ${record.id}`, pageWidth - margin, 14, { align: 'right' });

  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Colaborador: ${record.employeeName}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `C.C. ${record.employeeDocumentId} · ${record.employeeRole} · ${record.department}`,
    margin,
    y + 6,
  );
  doc.text(
    `Contrato: ${record.contractType} · Ingreso: ${formatShortDate(record.hireDate)} · Retiro: ${formatShortDate(record.terminationDate)} (${record.daysWorkedTotal} días)`,
    margin,
    y + 12,
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Causal de terminación: ${record.cause}`, margin, y + 18);

  autoTable(doc, {
    startY: y + 26,
    margin: { left: margin, right: margin },
    head: [['Concepto de Liquidación', 'Detalle / Base Legal', 'Valor (COP)']],
    body: [
      [
        'Salarios pendientes por pagar',
        `${record.pendingSalaryDays} días pendientes`,
        formatCOP(record.pendingSalaryAmount),
      ],
      [
        'Prima de servicios proporcional',
        'Art. 306 CST (semestre en curso)',
        formatCOP(record.primaProporcional),
      ],
      [
        'Cesantías proporcionales',
        'Art. 249 CST (vigencia en curso)',
        formatCOP(record.cesantiasProporcional),
      ],
      [
        'Intereses sobre cesantías (12%)',
        'Ley 52 de 1975',
        formatCOP(record.interesesCesantias),
      ],
      [
        'Vacaciones pendientes en dinero',
        `${record.vacacionesPendientesDias} días hábiles acumulados`,
        formatCOP(record.vacacionesPendientesAmount),
      ],
      [
        'Indemnización por despido',
        record.indemnizacionFormulaNote,
        formatCOP(record.indemnizacionAmount),
      ],
    ],
    foot: [['TOTAL NETO LIQUIDACIÓN DEFINITIVA', '', formatCOP(record.totalLiquidation)]],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9 },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: { fontSize: 8.8, cellPadding: 3 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
  });

  const sigY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 32;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 6, sigY, margin + 72, sigY);
  doc.line(pageWidth - margin - 72, sigY, pageWidth - margin - 6, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Empleador · INAMOD SENA', margin + 39, sigY + 5, { align: 'center' });
  doc.text(`Recibí Conforme · ${record.employeeName}`, pageWidth - margin - 39, sigY + 5, {
    align: 'center',
  });

  doc.save(
    `Liquidacion_${record.id}_${record.employeeName.replace(/\s+/g, '_')}.pdf`,
  );
}

export function exportVacationsPDF(
  employees: Employee[],
  vacations: VacationRequest[],
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const empMap = new Map(employees.map((e) => [e.id, e]));

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('Control de Vacaciones y Compensaciones — INAMOD SENA', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${company.name} · Emitido el ${formatShortDate(new Date().toISOString())}`,
    margin,
    17.5,
  );

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [
      [
        'Solicitud',
        'Trabajador',
        'Tipo',
        'Inicio',
        'Fin',
        'Días Hábiles',
        'Compensado',
        'Estado',
      ],
    ],
    body: vacations.map((v) => [
      v.id,
      empMap.get(v.employeeId)?.fullName ?? v.employeeId,
      v.type,
      formatShortDate(v.startDate),
      formatShortDate(v.endDate),
      String(v.businessDays),
      v.compensatedAmount > 0 ? formatCOP(v.compensatedAmount) : '—',
      v.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.3, cellPadding: 2.5 },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
  });

  doc.save('Vacaciones_INAMOD_SENA.pdf');
}

export function exportVacationsExcel(
  employees: Employee[],
  vacations: VacationRequest[],
): void {
  const wb = XLSX.utils.book_new();
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const rows = vacations.map((v) => ({
    Solicitud: v.id,
    Trabajador: empMap.get(v.employeeId)?.fullName ?? v.employeeId,
    Tipo: v.type,
    Inicio: v.startDate,
    Fin: v.endDate,
    'Días Hábiles': v.businessDays,
    'Compensación COP': v.compensatedAmount,
    Estado: v.status,
    Notas: v.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Vacaciones');
  XLSX.writeFile(wb, 'Vacaciones_INAMOD_SENA.xlsx');
}

export function exportBenefitsPDF(
  benefits: BenefitPlan[],
  employees: Employee[],
  company: CompanyConfig,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Beneficios Adicionales del Personal — INAMOD', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225);
  doc.text(company.name, margin, 17.5);

  autoTable(doc, {
    startY: 32,
    margin: { left: margin, right: margin },
    head: [['Plan', 'Categoría', 'Factor Salarial', 'Monto', 'Inscritos', 'Estado']],
    body: benefits.map((b) => {
      const cnt = employees.filter((e) => e.benefitIds.includes(b.id)).length;
      return [
        b.name,
        b.category,
        b.salarialFactor ? 'Sí (constitutivo)' : 'No salarial',
        formatCOP(b.monthlyAmount),
        String(cnt),
        b.active ? 'Activo' : 'Pausado',
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  doc.save('Beneficios_INAMOD_SENA.pdf');
}

export function exportBenefitsExcel(
  benefits: BenefitPlan[],
  employees: Employee[],
): void {
  const wb = XLSX.utils.book_new();
  const rows = benefits.map((b) => {
    const enrolled = employees.filter((e) => e.benefitIds.includes(b.id));
    return {
      ID: b.id,
      Plan: b.name,
      Categoría: b.category,
      'Factor Salarial': b.salarialFactor ? 'Sí' : 'No',
      'Monto Mensual COP': b.monthlyAmount,
      Inscritos: enrolled.length,
      Estado: b.active ? 'Activo' : 'Pausado',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Beneficios');
  XLSX.writeFile(wb, 'Beneficios_INAMOD_SENA.xlsx');
}
