import {
  buildElectronicDocFromPayslip,
  buildPayslipForEmployee,
  calculateSeveranceLiquidation,
  EMPTY_OVERTIME,
} from '../lib/payrollEngine.ts';
import type {
  AuditLogEntry,
  BenefitPlan,
  CompanyConfig,
  ElectronicPayrollDoc,
  Employee,
  Eventuality,
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
  SenaFicha,
  SenaInstructor,
  SenaPlatformState,
  SenaStudent,
  VacationRequest,
} from '../types/payroll.ts';

const company: CompanyConfig = {
  name: 'Grupo de Investigación INAMOD · SENA',
  nit: '899.999.034-1',
  address: 'Calle 63 No. 58B-03, Centro de Diseño, Confección y Moda',
  city: 'Itagüí, Antioquia',
  activeYear: 2026,
  defaultFrequency: 'Mensual',
};

const legislation: LegislationParams[] = [
  {
    year: 2026,
    smmlv: 1520000,
    auxilioTransporte: 215000,
    uvt: 52400,
    saludEmpleadoPct: 4.0,
    saludEmpleadorPct: 8.5,
    pensionEmpleadoPct: 4.0,
    pensionEmpleadorPct: 12.0,
    fspUmbralSmmlv: 4,
    fspPct: 1.0,
    arlRates: {
      1: 0.522,
      2: 1.044,
      3: 2.436,
      4: 4.35,
      5: 6.96,
    },
    cajaCompensacionPct: 4.0,
    senaPct: 2.0,
    icbfPct: 3.0,
    vacacionesDiasPorAno: 15,
    interesesCesantiasPct: 12.0,
    retefuenteUmbralUvt: 95,
  },
  {
    year: 2025,
    smmlv: 1423500,
    auxilioTransporte: 200000,
    uvt: 49799,
    saludEmpleadoPct: 4.0,
    saludEmpleadorPct: 8.5,
    pensionEmpleadoPct: 4.0,
    pensionEmpleadorPct: 12.0,
    fspUmbralSmmlv: 4,
    fspPct: 1.0,
    arlRates: {
      1: 0.522,
      2: 1.044,
      3: 2.436,
      4: 4.35,
      5: 6.96,
    },
    cajaCompensacionPct: 4.0,
    senaPct: 2.0,
    icbfPct: 3.0,
    vacacionesDiasPorAno: 15,
    interesesCesantiasPct: 12.0,
    retefuenteUmbralUvt: 95,
  },
];

const benefits: BenefitPlan[] = [
  {
    id: 'BEN-01',
    name: 'Auxilio de Alimentación',
    category: 'Alimentación',
    monthlyAmount: 240000,
    salarialFactor: false,
    description: 'Bono mensual no constitutivo de salario para alimentación en sede.',
    active: true,
  },
  {
    id: 'BEN-02',
    name: 'Plan Complementario de Salud',
    category: 'Salud',
    monthlyAmount: 195000,
    salarialFactor: false,
    description: 'Cobertura médica complementaria EPS para el investigador.',
    active: true,
  },
  {
    id: 'BEN-03',
    name: 'Bono de Conectividad e Investigación',
    category: 'Bienestar',
    monthlyAmount: 150000,
    salarialFactor: false,
    description: 'Apoyo mensual para herramientas digitales e internet.',
    active: true,
  },
  {
    id: 'BEN-04',
    name: 'Estímulo por Publicación / Patente',
    category: 'Formación',
    monthlyAmount: 350000,
    salarialFactor: true,
    description: 'Bonificación salarial por productividad académica registrada.',
    active: true,
  },
];

const employees: Employee[] = [
  {
    id: 'EMP-001',
    fullName: 'Elena Vargas Restrepo',
    email: 'elena.vargas@inamod.sena.edu.co',
    documentId: '1037612845',
    role: 'Investigadora Principal Textil',
    department: 'Investigación Textil',
    contractType: 'Término Indefinido',
    hireDate: '2022-03-15',
    contractEndDate: null,
    baseSalary: 6850000,
    arlRiskLevel: 1,
    bankName: 'Bancolombia',
    bankAccountNumber: '23409184821',
    usedVacationDays: 28,
    compensatedVacationDays: 0,
    status: 'Activo',
    benefitIds: ['BEN-01', 'BEN-02', 'BEN-04'],
  },
  {
    id: 'EMP-002',
    fullName: 'Carlos Navarro Ospina',
    email: 'carlos.navarro@inamod.sena.edu.co',
    documentId: '71389452',
    role: 'Coordinador Administrativo y Financiero',
    department: 'Gestión Administrativa',
    contractType: 'Término Indefinido',
    hireDate: '2021-02-01',
    contractEndDate: null,
    baseSalary: 8200000,
    arlRiskLevel: 1,
    bankName: 'Davivienda',
    bankAccountNumber: '48102939104',
    usedVacationDays: 45,
    compensatedVacationDays: 5,
    status: 'Activo',
    benefitIds: ['BEN-01', 'BEN-02'],
  },
  {
    id: 'EMP-003',
    fullName: 'Camila Bedoya Montoya',
    email: 'camila.bedoya@inamod.sena.edu.co',
    documentId: '1017245980',
    role: 'Patronista Industrial Senior',
    department: 'Diseño y Patronaje',
    contractType: 'Término Indefinido',
    hireDate: '2023-06-10',
    contractEndDate: null,
    baseSalary: 2850000,
    arlRiskLevel: 2,
    bankName: 'Bancolombia',
    bankAccountNumber: '51902343370',
    usedVacationDays: 18,
    compensatedVacationDays: 0,
    status: 'Activo',
    benefitIds: ['BEN-01', 'BEN-03'],
  },
  {
    id: 'EMP-004',
    fullName: 'Mateo Rojas Giraldo',
    email: 'mateo.rojas@inamod.sena.edu.co',
    documentId: '1036954120',
    role: 'Técnico de Confección y Prototipado',
    department: 'Confección Avanzada',
    contractType: 'Término Fijo',
    hireDate: '2024-02-01',
    contractEndDate: '2027-01-31',
    baseSalary: 2350000,
    arlRiskLevel: 3,
    bankName: 'Banco de Bogotá',
    bankAccountNumber: '00491827712',
    usedVacationDays: 10,
    compensatedVacationDays: 0,
    status: 'Vacaciones',
    benefitIds: ['BEN-01'],
  },
  {
    id: 'EMP-005',
    fullName: 'Sofía Domínguez Arango',
    email: 'sofia.dominguez@inamod.sena.edu.co',
    documentId: '1152448912',
    role: 'Especialista en Materiales Sostenibles',
    department: 'Innovación y Materiales',
    contractType: 'Término Indefinido',
    hireDate: '2023-08-01',
    contractEndDate: null,
    baseSalary: 4950000,
    arlRiskLevel: 2,
    bankName: 'Bancolombia',
    bankAccountNumber: '23481926058',
    usedVacationDays: 15,
    compensatedVacationDays: 0,
    status: 'Activo',
    benefitIds: ['BEN-01', 'BEN-02', 'BEN-03'],
  },
  {
    id: 'EMP-006',
    fullName: 'Andrés Felipe Vélez Cano',
    email: 'andres.velez@inamod.sena.edu.co',
    documentId: '1020456789',
    role: 'Auxiliar de Laboratorio de Metrología',
    department: 'Calidad y Metrología',
    contractType: 'Término Fijo',
    hireDate: '2025-05-15',
    contractEndDate: '2027-05-14',
    baseSalary: 1950000,
    arlRiskLevel: 3,
    bankName: 'Nequi / Bancolombia',
    bankAccountNumber: '31048211593',
    usedVacationDays: 0,
    compensatedVacationDays: 0,
    status: 'Activo',
    benefitIds: ['BEN-01'],
  },
];

const vacations: VacationRequest[] = [
  {
    id: 'VAC-2026-01',
    employeeId: 'EMP-004',
    startDate: '2026-11-16',
    endDate: '2026-11-20',
    businessDays: 5,
    type: 'Vacaciones Anuales',
    status: 'Aprobada',
    compensatedAmount: 0,
    notes: 'Período ordinario aprobado con entrega de prototipos.',
    createdAt: '2026-10-28T10:15:00.000Z',
  },
  {
    id: 'VAC-2026-02',
    employeeId: 'EMP-001',
    startDate: '2026-12-21',
    endDate: '2026-12-28',
    businessDays: 5,
    type: 'Vacaciones Anuales',
    status: 'Pendiente',
    compensatedAmount: 0,
    notes: 'Cierre de vigencia investigativa 2026.',
    createdAt: '2026-11-12T14:30:00.000Z',
  },
  {
    id: 'VAC-2026-03',
    employeeId: 'EMP-003',
    startDate: '2026-12-07',
    endDate: '2026-12-11',
    businessDays: 5,
    type: 'Vacaciones Anuales',
    status: 'Pendiente',
    compensatedAmount: 0,
    notes: 'Solicitud de descanso programado.',
    createdAt: '2026-11-14T09:20:00.000Z',
  },
  {
    id: 'VAC-2026-04',
    employeeId: 'EMP-002',
    startDate: '2026-10-05',
    endDate: '2026-10-09',
    businessDays: 5,
    type: 'Compensación en Dinero',
    status: 'Aprobada',
    compensatedAmount: 1366667,
    notes: 'Compensación parcial de 5 días hábiles aprobada por Gerencia.',
    createdAt: '2026-10-01T15:00:00.000Z',
  },
];

function buildSeedPeriod(params: {
  periodKey: string;
  label: string;
  year: number;
  status: PayrollPeriod['status'];
  processedAt: string | null;
  paidAt: string | null;
  adjustments: PayrollPeriod['adjustments'];
}): PayrollPeriod {
  const { periodKey, label, year, status, processedAt, paidAt, adjustments } =
    params;
  const leg = legislation.find((l) => l.year === year) ?? legislation[0];
  const forcePaid = status === 'Pagada';

  const payslips = employees.map((emp, idx) => {
    const p = buildPayslipForEmployee({
      employee: emp,
      index: idx,
      periodKey,
      periodLabel: label,
      frequency: 'Mensual',
      legislation: leg,
      benefits,
      vacations,
      adjustment: adjustments[emp.id],
      forcePaid,
    });
    if (processedAt) p.generatedAt = processedAt;
    if (paidAt) p.paidAt = paidAt;
    return p;
  });

  return {
    periodKey,
    label,
    year,
    frequency: 'Mensual',
    status,
    processedAt,
    paidAt,
    adjustments,
    payslips,
  };
}

export function createInitialSeedData(overrides?: {
  companyName?: string;
}): PayrollDatabase {
  const customCompany: CompanyConfig = overrides?.companyName
    ? { ...company, name: overrides.companyName }
    : { ...company };
  const octPeriod = buildSeedPeriod({
    periodKey: '2026-10',
    label: 'Octubre 2026',
    year: 2026,
    status: 'Pagada',
    processedAt: '2026-10-27T16:40:00.000Z',
    paidAt: '2026-10-30T10:15:00.000Z',
    adjustments: {
      'EMP-003': {
        overtime: { ...EMPTY_OVERTIME, extraDiurna: 6 },
        performanceBonus: 250000,
        otherDeductions: 0,
      },
      'EMP-006': {
        overtime: { ...EMPTY_OVERTIME, extraDiurna: 8, extraNocturna: 2 },
        performanceBonus: 0,
        otherDeductions: 0,
      },
    },
  });

  const novPeriod = buildSeedPeriod({
    periodKey: '2026-11',
    label: 'Noviembre 2026',
    year: 2026,
    status: 'Borrador',
    processedAt: null,
    paidAt: null,
    adjustments: {
      'EMP-003': {
        overtime: { ...EMPTY_OVERTIME, extraDiurna: 4, extraDominicalDiurna: 3 },
        performanceBonus: 0,
        otherDeductions: 0,
      },
      'EMP-006': {
        overtime: { ...EMPTY_OVERTIME, extraDiurna: 6 },
        performanceBonus: 180000,
        otherDeductions: 0,
      },
    },
  });

  const electronicDocs: ElectronicPayrollDoc[] = [
    ...octPeriod.payslips.map((p, idx) => {
      const doc = buildElectronicDocFromPayslip(p, customCompany);
      doc.status = idx === 3 ? 'RECHAZADO' : 'APROBADO';
      doc.dianMessage =
        idx === 3
          ? 'Regla DIAN NIE142: Validar código de municipio en nodo LugarGeneracionXML (listo para reintento).'
          : 'Validado exitosamente por DIAN · Documento Soporte de Nómina Electrónica aceptado.';
      doc.retryCount = idx === 3 ? 1 : 0;
      doc.updatedAt = '2026-10-30T11:05:00.000Z';
      return doc;
    }),
    ...novPeriod.payslips.map((p) => buildElectronicDocFromPayslip(p, customCompany)),
  ];

  const sampleSeverance = calculateSeveranceLiquidation({
    id: 'LIQ-2026-01',
    employee: employees[5],
    terminationDate: '2026-11-15',
    cause: 'Despido sin Justa Causa',
    pendingSalaryDays: 15,
    legislation: legislation[0],
  });

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'AUD-001',
      usuario: 'admin.rrhh@inamod.sena.edu.co',
      rol: 'ADMINISTRADOR',
      accion: 'LIQUIDATE',
      entidadAfectada: 'NominaPeriodo:2026-10',
      datosAnteriores: '{"estado":"Borrador"}',
      datosNuevos: '{"estado":"Pagada","recibos":6}',
      ipOrigen: '190.85.142.18',
      timestamp: '2026-10-30T10:15:00.000Z',
    },
    {
      id: 'AUD-002',
      usuario: 'admin.rrhh@inamod.sena.edu.co',
      rol: 'ADMINISTRADOR',
      accion: 'EMIT',
      entidadAfectada: 'NominaElectronica:2026-10',
      datosAnteriores: '{"estado":"PENDIENTE"}',
      datosNuevos: '{"aprobados":5,"rechazados":1}',
      ipOrigen: '190.85.142.18',
      timestamp: '2026-10-30T11:05:00.000Z',
    },
    {
      id: 'AUD-003',
      usuario: 'laura.gomez@soy.sena.edu.co',
      rol: 'ESTUDIANTE',
      accion: 'CREATE',
      entidadAfectada: 'Vacacion:VAC-2026-02',
      datosAnteriores: 'null',
      datosNuevos: '{"diasHabiles":5,"inicio":"2026-12-21"}',
      ipOrigen: '181.132.90.44',
      timestamp: '2026-11-12T14:30:00.000Z',
    },
    {
      id: 'AUD-004',
      usuario: 'admin.rrhh@inamod.sena.edu.co',
      rol: 'ADMINISTRADOR',
      accion: 'UPDATE',
      entidadAfectada: 'LegislacionAnual:2026',
      datosAnteriores: '{"smmlv":1423500}',
      datosNuevos: '{"smmlv":1520000,"auxilioTransporte":215000}',
      ipOrigen: '190.85.142.18',
      timestamp: '2026-11-15T08:45:00.000Z',
    },
  ];

  const eventualities: Eventuality[] = [
    {
      id: 'EVE-2026-01',
      employeeId: 'EMP-005',
      type: 'Incapacidad Médica (EPS/ARL)',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      days: 3,
      payrollImpact: 'Incapacidad EPS/ARL',
      amount: 0,
      status: 'Aplicada en Nómina',
      description: 'Incapacidad general EPS Sura por 3 días con soporte médico radicado.',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
    {
      id: 'EVE-2026-02',
      employeeId: 'EMP-001',
      type: 'Permiso Académico / SENA',
      startDate: '2026-11-24',
      endDate: '2026-11-25',
      days: 2,
      payrollImpact: 'Sin impacto salarial',
      amount: 0,
      status: 'Activa',
      description: 'Ponencia Congreso Internacional de Textiles Sostenibles en Medellín.',
      createdAt: '2026-11-13T11:20:00.000Z',
    },
    {
      id: 'EVE-2026-03',
      employeeId: 'EMP-003',
      type: 'Bonificación Especial',
      startDate: '2026-11-18',
      endDate: '2026-11-18',
      days: 1,
      payrollImpact: 'Bonificación',
      amount: 320000,
      status: 'Aplicada en Nómina',
      description: 'Estímulo por validación de prototipo ergonómico INAMOD.',
      createdAt: '2026-11-14T15:10:00.000Z',
    },
    {
      id: 'EVE-2026-04',
      employeeId: 'EMP-006',
      type: 'Calamidad Doméstica',
      startDate: '2026-11-05',
      endDate: '2026-11-06',
      days: 2,
      payrollImpact: 'Sin impacto salarial',
      amount: 0,
      status: 'Cerrada',
      description: 'Licencia remunerada por calamidad familiar debidamente soportada.',
      createdAt: '2026-11-05T08:30:00.000Z',
    },
  ];

  return {
    schemaVersion: 4,
    company: customCompany,
    legislation: structuredClone(legislation),
    employees: structuredClone(employees),
    benefits: structuredClone(benefits),
    vacations: structuredClone(vacations),
    eventualities: structuredClone(eventualities),
    periods: [novPeriod, octPeriod],
    severances: [sampleSeverance],
    electronicDocs,
    auditLogs,
  };
}

export function createBlankPayrollWorkspace(options?: {
  companyName?: string;
  city?: string;
}): PayrollDatabase {
  const blankCompany: CompanyConfig = {
    name: options?.companyName ?? 'Práctica Formativa SENA · Nómina',
    nit: '899.999.034-1',
    address: 'Centro de Formación SENA Regional Antioquia',
    city: options?.city ?? 'Medellín, Antioquia',
    activeYear: 2026,
    defaultFrequency: 'Mensual',
  };

  const initialPeriod: PayrollPeriod = {
    periodKey: '2026-11',
    label: 'Noviembre 2026',
    year: 2026,
    frequency: 'Mensual',
    status: 'Borrador',
    processedAt: null,
    paidAt: null,
    adjustments: {},
    payslips: [],
  };

  return {
    schemaVersion: 4,
    company: blankCompany,
    legislation: structuredClone(legislation),
    employees: [],
    benefits: [],
    vacations: [],
    eventualities: [],
    periods: [initialPeriod],
    severances: [],
    electronicDocs: [],
    auditLogs: [],
  };
}

export function createInitialSenaPlatformData(): SenaPlatformState {
  const instructors: SenaInstructor[] = [
    {
      id: 'INST-001',
      fullName: 'Prof. Alejandro Restrepo Mejía',
      documentId: '71380412',
      email: 'alejandro.restrepo@misena.edu.co',
      specialty: 'Gestión del Talento Humano y Nómina',
      active: true,
      createdAt: '2026-02-01T08:00:00.000Z',
    },
    {
      id: 'INST-002',
      fullName: 'Prof. Valeria Montoya Castaño',
      documentId: '43912874',
      email: 'valeria.montoya@misena.edu.co',
      specialty: 'Contabilidad, Prestaciones y Legislación Laboral',
      active: true,
      createdAt: '2026-02-10T08:00:00.000Z',
    },
  ];

  const fichas: SenaFicha[] = [
    {
      id: 'FIC-001',
      code: '2847102',
      name: 'Recursos Humanos Mañana',
      schedule: 'Mañana (06:00 - 12:00)',
      program: 'Técnico en Recursos Humanos',
      instructorId: 'INST-001',
      createdAt: '2026-02-15T07:00:00.000Z',
    },
    {
      id: 'FIC-002',
      code: '2847105',
      name: 'Recursos Humanos Tarde',
      schedule: 'Tarde (12:30 - 18:30)',
      program: 'Tecnólogo en Gestión del Talento Humano',
      instructorId: 'INST-001',
      createdAt: '2026-02-16T13:00:00.000Z',
    },
    {
      id: 'FIC-003',
      code: '2910440',
      name: 'Nómina y Prestaciones Noche',
      schedule: 'Noche (18:30 - 22:00)',
      program: 'Técnico en Contabilización de Operaciones Comerciales',
      instructorId: 'INST-002',
      createdAt: '2026-03-01T18:30:00.000Z',
    },
  ];

  const students: SenaStudent[] = [
    {
      id: 'EST-001',
      fullName: 'Laura Sofía Gómez Pérez',
      documentId: '1037654321',
      email: 'laura.gomez@soy.sena.edu.co',
      fichaId: 'FIC-001',
      instructorId: 'INST-001',
      active: true,
      createdAt: '2026-02-20T08:00:00.000Z',
    },
    {
      id: 'EST-002',
      fullName: 'Juan David Ospina Ríos',
      documentId: '1020987654',
      email: 'juan.ospina@soy.sena.edu.co',
      fichaId: 'FIC-001',
      instructorId: 'INST-001',
      active: true,
      createdAt: '2026-02-20T08:15:00.000Z',
    },
    {
      id: 'EST-003',
      fullName: 'Mariana Herrera Zapata',
      documentId: '1017882233',
      email: 'mariana.herrera@soy.sena.edu.co',
      fichaId: 'FIC-002',
      instructorId: 'INST-001',
      active: true,
      createdAt: '2026-02-21T13:00:00.000Z',
    },
    {
      id: 'EST-004',
      fullName: 'Santiago Morales Londoño',
      documentId: '1036778899',
      email: 'santiago.morales@soy.sena.edu.co',
      fichaId: 'FIC-003',
      instructorId: 'INST-002',
      active: true,
      createdAt: '2026-03-02T18:30:00.000Z',
    },
  ];

  const workspaces: Record<string, PayrollDatabase> = {
    'ficha:FIC-001': createInitialSeedData({
      companyName: 'Ficha 2847102 · Recursos Humanos Mañana',
    }),
    'ficha:FIC-002': createBlankPayrollWorkspace({
      companyName: 'Ficha 2847105 · Recursos Humanos Tarde',
    }),
    'ficha:FIC-003': createBlankPayrollWorkspace({
      companyName: 'Ficha 2910440 · Nómina y Prestaciones Noche',
    }),
  };

  for (const st of students) {
    workspaces[`student:${st.id}`] = createBlankPayrollWorkspace({
      companyName: `Práctica SENA · ${st.fullName}`,
    });
  }

  return {
    schemaVersion: 4,
    instructors,
    fichas,
    students,
    workspaces,
  };
}
