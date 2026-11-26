export type UserRole = 'ADMINISTRADOR' | 'INSTRUCTOR' | 'ESTUDIANTE';

export type Department =
  | 'Investigación Textil'
  | 'Diseño y Patronaje'
  | 'Confección Avanzada'
  | 'Innovación y Materiales'
  | 'Gestión Administrativa'
  | 'Calidad y Metrología';

export type ContractType = 'Término Indefinido' | 'Término Fijo' | 'Obra o Labor';
export type EmployeeStatus = 'Activo' | 'Vacaciones' | 'Retirado';
export type PayrollFrequency = 'Mensual' | 'Quincenal';
export type ArlRiskLevel = 1 | 2 | 3 | 4 | 5;

export interface LegislationParams {
  year: number;
  smmlv: number;
  auxilioTransporte: number;
  uvt: number;
  saludEmpleadoPct: number;
  saludEmpleadorPct: number;
  pensionEmpleadoPct: number;
  pensionEmpleadorPct: number;
  fspUmbralSmmlv: number;
  fspPct: number;
  arlRates: Record<ArlRiskLevel, number>;
  cajaCompensacionPct: number;
  senaPct: number;
  icbfPct: number;
  vacacionesDiasPorAno: number;
  interesesCesantiasPct: number;
  retefuenteUmbralUvt: number;
}

export interface CompanyConfig {
  name: string;
  nit: string;
  address: string;
  city: string;
  activeYear: number;
  defaultFrequency: PayrollFrequency;
}

export type BenefitCategory =
  | 'Alimentación'
  | 'Salud'
  | 'Movilidad'
  | 'Bienestar'
  | 'Formación';

export interface BenefitPlan {
  id: string;
  name: string;
  category: BenefitCategory;
  monthlyAmount: number;
  salarialFactor: boolean;
  description: string;
  active: boolean;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  documentId: string;
  role: string;
  department: Department;
  contractType: ContractType;
  hireDate: string;
  contractEndDate: string | null;
  baseSalary: number;
  arlRiskLevel: ArlRiskLevel;
  bankName: string;
  bankAccountNumber: string;
  usedVacationDays: number;
  compensatedVacationDays: number;
  status: EmployeeStatus;
  benefitIds: string[];
}

export interface OvertimeHours {
  extraDiurna: number;
  extraNocturna: number;
  extraDominicalDiurna: number;
  extraDominicalNocturna: number;
  recargoNocturno: number;
}

export interface PeriodAdjustment {
  overtime: OvertimeHours;
  performanceBonus: number;
  otherDeductions: number;
}

export interface PayslipBenefitLine {
  id: string;
  name: string;
  amount: number;
  salarialFactor: boolean;
}

export type PayslipPaymentStatus = 'Pendiente' | 'Pagado';

export interface Payslip {
  id: string;
  receiptNumber: string;
  periodKey: string;
  periodLabel: string;
  frequency: PayrollFrequency;
  employeeId: string;
  employeeName: string;
  employeeDocumentId: string;
  employeeRole: string;
  department: Department;
  bankName: string;
  bankAccountMasked: string;
  baseSalaryPeriod: number;
  auxilioTransporte: number;
  overtimeAmount: number;
  overtimeDetail: OvertimeHours;
  performanceBonus: number;
  benefitsBreakdown: PayslipBenefitLine[];
  benefitsTotal: number;
  grossPay: number;
  saludDeduction: number;
  pensionDeduction: number;
  fspDeduction: number;
  retefuenteDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  employerHealth: number;
  employerPension: number;
  employerArl: number;
  parafiscalesTotal: number;
  vacationDaysTaken: number;
  paymentStatus: PayslipPaymentStatus;
  generatedAt: string;
  paidAt: string | null;
}

export type PayrollPeriodStatus = 'Borrador' | 'Procesada' | 'Pagada';

export interface PayrollPeriod {
  periodKey: string;
  label: string;
  year: number;
  frequency: PayrollFrequency;
  status: PayrollPeriodStatus;
  processedAt: string | null;
  paidAt: string | null;
  adjustments: Record<string, PeriodAdjustment>;
  payslips: Payslip[];
}

export type VacationType =
  | 'Vacaciones Anuales'
  | 'Compensación en Dinero'
  | 'Permiso Remunerado'
  | 'Incapacidad / Licencia';

export type VacationStatus = 'Aprobada' | 'Pendiente' | 'Rechazada';

export interface VacationRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  businessDays: number;
  type: VacationType;
  status: VacationStatus;
  compensatedAmount: number;
  notes: string;
  createdAt: string;
}

export type TerminationCause =
  | 'Renuncia Voluntaria'
  | 'Despido con Justa Causa'
  | 'Despido sin Justa Causa';

export interface SeveranceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocumentId: string;
  employeeRole: string;
  department: Department;
  contractType: ContractType;
  hireDate: string;
  terminationDate: string;
  cause: TerminationCause;
  baseSalary: number;
  auxilioTransporte: number;
  daysWorkedTotal: number;
  pendingSalaryDays: number;
  pendingSalaryAmount: number;
  primaProporcional: number;
  cesantiasProporcional: number;
  interesesCesantias: number;
  vacacionesPendientesDias: number;
  vacacionesPendientesAmount: number;
  indemnizacionAmount: number;
  indemnizacionFormulaNote: string;
  totalLiquidation: number;
  createdAt: string;
}

export type ElectronicDocStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface ElectronicPayrollDoc {
  id: string;
  payslipId: string;
  receiptNumber: string;
  periodKey: string;
  periodLabel: string;
  employeeId: string;
  employeeName: string;
  employeeDocumentId: string;
  cune: string;
  status: ElectronicDocStatus;
  dianMessage: string;
  retryCount: number;
  xmlContent: string;
  netPay: number;
  grossPay: number;
  updatedAt: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LIQUIDATE' | 'EMIT';

export interface AuditLogEntry {
  id: string;
  usuario: string;
  rol: UserRole;
  accion: AuditAction;
  entidadAfectada: string;
  datosAnteriores: string;
  datosNuevos: string;
  ipOrigen: string;
  timestamp: string;
}

export type EventualityType =
  | 'Incapacidad Médica (EPS/ARL)'
  | 'Licencia Maternidad / Paternidad'
  | 'Calamidad Doméstica'
  | 'Permiso Académico / SENA'
  | 'Ausencia Injustificada'
  | 'Bonificación Especial';

export type EventualityImpact =
  | 'Sin impacto salarial'
  | 'Descuento'
  | 'Bonificación'
  | 'Incapacidad EPS/ARL';

export type EventualityStatus = 'Activa' | 'Aplicada en Nómina' | 'Cerrada';

export interface Eventuality {
  id: string;
  employeeId: string;
  type: EventualityType;
  startDate: string;
  endDate: string;
  days: number;
  payrollImpact: EventualityImpact;
  amount: number;
  status: EventualityStatus;
  description: string;
  createdAt: string;
}

export interface PayrollDatabase {
  schemaVersion: number;
  company: CompanyConfig;
  legislation: LegislationParams[];
  employees: Employee[];
  benefits: BenefitPlan[];
  vacations: VacationRequest[];
  eventualities: Eventuality[];
  periods: PayrollPeriod[];
  severances: SeveranceRecord[];
  electronicDocs: ElectronicPayrollDoc[];
  auditLogs: AuditLogEntry[];
}

export interface SenaInstructor {
  id: string;
  fullName: string;
  documentId: string;
  email: string;
  specialty: string;
  active: boolean;
  createdAt: string;
}

export interface SenaFicha {
  id: string;
  code: string;
  name: string;
  schedule: string;
  program: string;
  instructorId: string;
  createdAt: string;
}

export interface SenaStudent {
  id: string;
  fullName: string;
  documentId: string;
  email: string;
  fichaId: string;
  instructorId: string;
  active: boolean;
  createdAt: string;
}

export interface WorkspaceSummary {
  employeeCount: number;
  payslipCount: number;
  vacationCount: number;
  eventualityCount: number;
  severanceCount: number;
  latestPeriodStatus: PayrollPeriodStatus;
}

export interface SenaGlobalStats {
  totalInstructors: number;
  activeInstructors: number;
  totalFichas: number;
  totalStudents: number;
  activeStudents: number;
  totalWorkersAcrossWorkspaces: number;
  totalPayslipsAcrossWorkspaces: number;
}

export interface SenaPlatformState {
  schemaVersion: number;
  instructors: SenaInstructor[];
  fichas: SenaFicha[];
  students: SenaStudent[];
  workspaces: Record<string, PayrollDatabase>;
}

export interface ScopedPlatformResponse {
  schemaVersion: number;
  role: UserRole;
  actorId: string;
  activeWorkspaceId: string;
  globalStats: SenaGlobalStats;
  instructors: SenaInstructor[];
  fichas: SenaFicha[];
  students: SenaStudent[];
  workspaces: Record<string, PayrollDatabase>;
  workspaceSummaries: Record<string, WorkspaceSummary>;
}
