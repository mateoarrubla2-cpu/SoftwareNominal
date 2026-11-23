import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createInitialSeedData } from './src/data/seedData.ts';
import {
  buildElectronicDocFromPayslip,
  buildPayslipForEmployee,
  calculateBusinessDays,
  calculateCalendarDaysInclusive,
  calculateSeveranceLiquidation,
  getPeriodLabel,
  recalculateDraftPeriod,
} from './src/lib/payrollEngine.ts';
import type {
  AuditAction,
  AuditLogEntry,
  BenefitPlan,
  CompanyConfig,
  Employee,
  Eventuality,
  EventualityImpact,
  EventualityStatus,
  EventualityType,
  LegislationParams,
  PayrollDatabase,
  PayrollFrequency,
  PayrollPeriod,
  PeriodAdjustment,
  TerminationCause,
  UserRole,
  VacationRequest,
  VacationStatus,
} from './src/types/payroll.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'payroll-db.json');

function ensureDatabase(): PayrollDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createInitialSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PayrollDatabase;
    if (parsed.schemaVersion !== 3) {
      const seed = createInitialSeedData();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    return parsed;
  } catch {
    const seed = createInitialSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveDatabase(db: PayrollDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function appendAudit(
  db: PayrollDatabase,
  req: express.Request,
  params: {
    accion: AuditAction;
    entidadAfectada: string;
    datosAnteriores: unknown;
    datosNuevos: unknown;
  },
): void {
  const rolHeader = String(req.header('x-demo-role') ?? 'ADMINISTRADOR');
  const rol: UserRole = rolHeader === 'TRABAJADOR' ? 'TRABAJADOR' : 'ADMINISTRADOR';
  const usuario =
    req.header('x-demo-user') ??
    (rol === 'ADMINISTRADOR'
      ? 'admin.rrhh@inamod.sena.edu.co'
      : 'trabajador@inamod.sena.edu.co');

  const entry: AuditLogEntry = {
    id: `AUD-${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    usuario,
    rol,
    accion: params.accion,
    entidadAfectada: params.entidadAfectada,
    datosAnteriores: JSON.stringify(params.datosAnteriores),
    datosNuevos: JSON.stringify(params.datosNuevos),
    ipOrigen: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
}

function syncDraftPeriodsAndDocs(db: PayrollDatabase): PayrollDatabase {
  db.periods = db.periods.map((period) =>
    period.status === 'Borrador'
      ? recalculateDraftPeriod(
          period,
          db.employees,
          db.benefits,
          db.vacations,
          db.legislation,
          db.eventualities,
        )
      : period,
  );

  // Sync electronic docs for all payslips in draft periods
  const existingDocMap = new Map(
    db.electronicDocs.map((d) => [d.payslipId, d]),
  );
  for (const period of db.periods) {
    for (const slip of period.payslips) {
      const existing = existingDocMap.get(slip.id);
      if (!existing || existing.status === 'PENDIENTE') {
        const updatedDoc = buildElectronicDocFromPayslip(
          slip,
          db.company,
          existing,
        );
        existingDocMap.set(slip.id, updatedDoc);
      }
    }
  }
  db.electronicDocs = Array.from(existingDocMap.values()).sort((a, b) =>
    b.periodKey.localeCompare(a.periodKey),
  );
  return db;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/state', (_req, res) => {
    const db = syncDraftPeriodsAndDocs(ensureDatabase());
    res.json(db);
  });

  app.post('/api/demo/reset', (req, res) => {
    const seed = createInitialSeedData();
    appendAudit(seed, req, {
      accion: 'UPDATE',
      entidadAfectada: 'Sistema:ResetDemo',
      datosAnteriores: null,
      datosNuevos: { restaurado: true },
    });
    saveDatabase(seed);
    res.json(seed);
  });

  app.put('/api/company', (req, res) => {
    const db = ensureDatabase();
    const prev = { ...db.company };
    const patch = req.body as Partial<CompanyConfig>;
    db.company = { ...db.company, ...patch };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: 'Empresa:Configuracion',
      datosAnteriores: prev,
      datosNuevos: db.company,
    });
    saveDatabase(db);
    res.json(db);
  });

  app.put('/api/legislation/:year', (req, res) => {
    const db = ensureDatabase();
    const year = Number(req.params.year);
    const idx = db.legislation.findIndex((l) => l.year === year);
    const patch = req.body as Partial<LegislationParams>;
    if (idx === -1) {
      res.status(404).json({ error: 'Año fiscal no encontrado' });
      return;
    }
    const prev = { ...db.legislation[idx] };
    db.legislation[idx] = { ...db.legislation[idx], ...patch, year };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `LegislacionAnual:${year}`,
      datosAnteriores: { smmlv: prev.smmlv, auxilio: prev.auxilioTransporte, uvt: prev.uvt },
      datosNuevos: {
        smmlv: db.legislation[idx].smmlv,
        auxilio: db.legislation[idx].auxilioTransporte,
        uvt: db.legislation[idx].uvt,
      },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/employees', (req, res) => {
    const db = ensureDatabase();
    const payload = req.body as Omit<Employee, 'id'>;
    const nextNum =
      db.employees.reduce((max, emp) => {
        const n = Number(emp.id.replace('EMP-', ''));
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;

    const newEmployee: Employee = {
      ...payload,
      id: `EMP-${String(nextNum).padStart(3, '0')}`,
    };
    db.employees.push(newEmployee);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'CREATE',
      entidadAfectada: `Empleado:${newEmployee.id}`,
      datosAnteriores: null,
      datosNuevos: { nombre: newEmployee.fullName, cargo: newEmployee.role },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.put('/api/employees/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const idx = db.employees.findIndex((e) => e.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }
    const prev = { ...db.employees[idx] };
    const patch = req.body as Partial<Employee>;
    db.employees[idx] = { ...db.employees[idx], ...patch, id };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `Empleado:${id}`,
      datosAnteriores: { salario: prev.baseSalary, estado: prev.status },
      datosNuevos: {
        salario: db.employees[idx].baseSalary,
        estado: db.employees[idx].status,
      },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.delete('/api/employees/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const existing = db.employees.find((e) => e.id === id);
    db.employees = db.employees.filter((e) => e.id !== id);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'DELETE',
      entidadAfectada: `Empleado:${id}`,
      datosAnteriores: existing ? { nombre: existing.fullName } : null,
      datosNuevos: null,
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/benefits', (req, res) => {
    const db = ensureDatabase();
    const payload = req.body as Omit<BenefitPlan, 'id'>;
    const nextNum =
      db.benefits.reduce((max, b) => {
        const n = Number(b.id.replace('BEN-', ''));
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;
    const newBenefit: BenefitPlan = {
      ...payload,
      id: `BEN-${String(nextNum).padStart(2, '0')}`,
    };
    db.benefits.push(newBenefit);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'CREATE',
      entidadAfectada: `Beneficio:${newBenefit.id}`,
      datosAnteriores: null,
      datosNuevos: { nombre: newBenefit.name, monto: newBenefit.monthlyAmount },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.put('/api/benefits/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const idx = db.benefits.findIndex((b) => b.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Beneficio no encontrado' });
      return;
    }
    const prev = { ...db.benefits[idx] };
    db.benefits[idx] = { ...db.benefits[idx], ...(req.body as Partial<BenefitPlan>), id };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `Beneficio:${id}`,
      datosAnteriores: { monto: prev.monthlyAmount, activo: prev.active },
      datosNuevos: {
        monto: db.benefits[idx].monthlyAmount,
        activo: db.benefits[idx].active,
      },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/vacations', (req, res) => {
    const db = ensureDatabase();
    const payload = req.body as {
      employeeId: string;
      startDate: string;
      endDate: string;
      type: VacationRequest['type'];
      status: VacationStatus;
      compensatedDays?: number;
      notes: string;
    };

    const emp = db.employees.find((e) => e.id === payload.employeeId);
    if (!emp) {
      res.status(404).json({ error: 'Trabajador no encontrado' });
      return;
    }

    const isComp = payload.type === 'Compensación en Dinero';
    const days = isComp
      ? Math.max(1, Number(payload.compensatedDays) || 1)
      : calculateBusinessDays(payload.startDate, payload.endDate);

    if (days <= 0) {
      res.status(400).json({ error: 'Debe incluir al menos 1 día hábil' });
      return;
    }

    const compensatedAmount = isComp
      ? Math.round((emp.baseSalary / 30) * days)
      : 0;

    const newReq: VacationRequest = {
      id: `VAC-2026-${String(db.vacations.length + 1).padStart(2, '0')}`,
      employeeId: payload.employeeId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      businessDays: days,
      type: payload.type,
      status: payload.status,
      compensatedAmount,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    db.vacations.unshift(newReq);

    if (newReq.status === 'Aprobada') {
      if (isComp) {
        emp.compensatedVacationDays += days;
      } else if (newReq.type === 'Vacaciones Anuales') {
        emp.usedVacationDays += days;
      }
    }

    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'CREATE',
      entidadAfectada: `Vacacion:${newReq.id}`,
      datosAnteriores: null,
      datosNuevos: {
        empleado: emp.fullName,
        tipo: newReq.type,
        dias: days,
        estado: newReq.status,
      },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.patch('/api/vacations/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const { status } = req.body as { status: VacationStatus };
    const vac = db.vacations.find((v) => v.id === id);
    if (!vac) {
      res.status(404).json({ error: 'Solicitud no encontrada' });
      return;
    }

    const prevStatus = vac.status;
    vac.status = status;

    const emp = db.employees.find((e) => e.id === vac.employeeId);
    if (emp) {
      if (vac.type === 'Vacaciones Anuales') {
        if (prevStatus !== 'Aprobada' && status === 'Aprobada') {
          emp.usedVacationDays += vac.businessDays;
        } else if (prevStatus === 'Aprobada' && status !== 'Aprobada') {
          emp.usedVacationDays = Math.max(0, emp.usedVacationDays - vac.businessDays);
        }
      } else if (vac.type === 'Compensación en Dinero') {
        if (prevStatus !== 'Aprobada' && status === 'Aprobada') {
          emp.compensatedVacationDays += vac.businessDays;
        } else if (prevStatus === 'Aprobada' && status !== 'Aprobada') {
          emp.compensatedVacationDays = Math.max(
            0,
            emp.compensatedVacationDays - vac.businessDays,
          );
        }
      }
    }

    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `Vacacion:${id}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: { estado: status },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/eventualities', (req, res) => {
    const db = ensureDatabase();
    const payload = req.body as {
      employeeId: string;
      type: EventualityType;
      startDate: string;
      endDate: string;
      payrollImpact: EventualityImpact;
      amount: number;
      status: EventualityStatus;
      description: string;
    };

    const emp = db.employees.find((e) => e.id === payload.employeeId);
    if (!emp) {
      res.status(404).json({ error: 'Trabajador no encontrado' });
      return;
    }
    const days = Math.max(
      1,
      calculateCalendarDaysInclusive(payload.startDate, payload.endDate),
    );
    const nextNum =
      db.eventualities.reduce((max, ev) => {
        const n = Number(ev.id.split('-')[2]);
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;

    const newEv: Eventuality = {
      id: `EVE-2026-${String(nextNum).padStart(2, '0')}`,
      employeeId: payload.employeeId,
      type: payload.type,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days,
      payrollImpact: payload.payrollImpact,
      amount: Math.max(0, Number(payload.amount) || 0),
      status: payload.status,
      description: payload.description,
      createdAt: new Date().toISOString(),
    };
    db.eventualities.unshift(newEv);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'CREATE',
      entidadAfectada: `Eventualidad:${newEv.id}`,
      datosAnteriores: null,
      datosNuevos: {
        empleado: emp.fullName,
        tipo: newEv.type,
        impacto: newEv.payrollImpact,
        monto: newEv.amount,
      },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.patch('/api/eventualities/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const ev = db.eventualities.find((e) => e.id === id);
    if (!ev) {
      res.status(404).json({ error: 'Eventualidad no encontrada' });
      return;
    }
    const prev = { status: ev.status };
    const patch = req.body as Partial<Eventuality>;
    Object.assign(ev, patch, { id });
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `Eventualidad:${id}`,
      datosAnteriores: prev,
      datosNuevos: { status: ev.status },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.delete('/api/eventualities/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const existing = db.eventualities.find((e) => e.id === id);
    db.eventualities = db.eventualities.filter((e) => e.id !== id);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'DELETE',
      entidadAfectada: `Eventualidad:${id}`,
      datosAnteriores: existing ? { tipo: existing.type } : null,
      datosNuevos: null,
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/payroll/periods', (req, res) => {
    const db = ensureDatabase();
    const { periodKey, frequency } = req.body as {
      periodKey: string;
      frequency?: PayrollFrequency;
    };
    if (!/^\d{4}-\d{2}$/.test(periodKey)) {
      res.status(400).json({ error: 'Formato inválido (YYYY-MM)' });
      return;
    }
    if (db.periods.some((p) => p.periodKey === periodKey)) {
      res.status(409).json({ error: 'El período ya existe' });
      return;
    }

    const year = Number(periodKey.split('-')[0]) || db.company.activeYear;
    const leg = db.legislation.find((l) => l.year === year) ?? db.legislation[0];
    const freq: PayrollFrequency = frequency ?? db.company.defaultFrequency;
    const label = getPeriodLabel(periodKey);
    const eligible = db.employees.filter((e) => e.status !== 'Retirado');

    const payslips = eligible.map((emp, idx) =>
      buildPayslipForEmployee({
        employee: emp,
        index: idx,
        periodKey,
        periodLabel: label,
        frequency: freq,
        legislation: leg,
        benefits: db.benefits,
        vacations: db.vacations,
        eventualities: db.eventualities,
      }),
    );

    const newPeriod: PayrollPeriod = {
      periodKey,
      label,
      year,
      frequency: freq,
      status: 'Borrador',
      processedAt: null,
      paidAt: null,
      adjustments: {},
      payslips,
    };

    db.periods.unshift(newPeriod);
    db.periods.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'CREATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: null,
      datosNuevos: { label, periodicidad: freq },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.patch('/api/payroll/:periodKey/frequency', (req, res) => {
    const db = ensureDatabase();
    const { periodKey } = req.params;
    const { frequency } = req.body as { frequency: PayrollFrequency };
    const idx = db.periods.findIndex((p) => p.periodKey === periodKey);
    if (idx === -1) {
      res.status(404).json({ error: 'Período no encontrado' });
      return;
    }
    if (db.periods[idx].status === 'Pagada') {
      res.status(400).json({ error: 'Un período pagado no puede cambiarse' });
      return;
    }
    const prevFreq = db.periods[idx].frequency;
    db.periods[idx].frequency = frequency;
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: { periodicidad: prevFreq },
      datosNuevos: { periodicidad: frequency },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.patch('/api/payroll/:periodKey/adjustment', (req, res) => {
    const db = ensureDatabase();
    const { periodKey } = req.params;
    const { employeeId, adjustment } = req.body as {
      employeeId: string;
      adjustment: PeriodAdjustment;
    };
    const idx = db.periods.findIndex((p) => p.periodKey === periodKey);
    if (idx === -1) {
      res.status(404).json({ error: 'Período no encontrado' });
      return;
    }
    if (db.periods[idx].status === 'Pagada') {
      res.status(400).json({ error: 'Un período pagado no puede modificarse' });
      return;
    }

    db.periods[idx].adjustments[employeeId] = adjustment;
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'UPDATE',
      entidadAfectada: `NovedadNomina:${periodKey}:${employeeId}`,
      datosAnteriores: null,
      datosNuevos: adjustment,
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/payroll/:periodKey/process', (req, res) => {
    const db = ensureDatabase();
    const { periodKey } = req.params;
    const { markPaid } = req.body as { markPaid?: boolean };
    const periodIdx = db.periods.findIndex((p) => p.periodKey === periodKey);
    if (periodIdx === -1) {
      res.status(404).json({ error: 'Período no encontrado' });
      return;
    }

    const prevStatus = db.periods[periodIdx].status;
    const now = new Date().toISOString();
    const recalculated = recalculateDraftPeriod(
      db.periods[periodIdx],
      db.employees,
      db.benefits,
      db.vacations,
      db.legislation,
      db.eventualities,
    );

    const finalPaid = Boolean(markPaid);
    recalculated.status = finalPaid ? 'Pagada' : 'Procesada';
    recalculated.processedAt = recalculated.processedAt ?? now;
    recalculated.paidAt = finalPaid ? now : null;
    recalculated.payslips = recalculated.payslips.map((p) => ({
      ...p,
      generatedAt: now,
      paymentStatus: finalPaid ? 'Pagado' : p.paymentStatus,
      paidAt: finalPaid ? now : p.paidAt,
    }));

    db.periods[periodIdx] = recalculated;
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'LIQUIDATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: {
        estado: recalculated.status,
        recibos: recalculated.payslips.length,
      },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.patch('/api/payroll/:periodKey/payslips/:payslipId/pay', (req, res) => {
    const db = ensureDatabase();
    const { periodKey, payslipId } = req.params;
    const period = db.periods.find((p) => p.periodKey === periodKey);
    const slip = period?.payslips.find((s) => s.id === payslipId);
    if (!period || !slip) {
      res.status(404).json({ error: 'Recibo no encontrado' });
      return;
    }

    const now = new Date().toISOString();
    slip.paymentStatus = 'Pagado';
    slip.paidAt = now;
    if (period.payslips.every((p) => p.paymentStatus === 'Pagado')) {
      period.status = 'Pagada';
      period.paidAt = now;
      period.processedAt = period.processedAt ?? now;
    }

    appendAudit(db, req, {
      accion: 'LIQUIDATE',
      entidadAfectada: `Desprendible:${slip.receiptNumber}`,
      datosAnteriores: { estado: 'Pendiente' },
      datosNuevos: { estado: 'Pagado', neto: slip.netPay },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/severances', (req, res) => {
    const db = ensureDatabase();
    const { employeeId, terminationDate, cause, pendingSalaryDays, markRetired } =
      req.body as {
        employeeId: string;
        terminationDate: string;
        cause: TerminationCause;
        pendingSalaryDays: number;
        markRetired?: boolean;
      };

    const emp = db.employees.find((e) => e.id === employeeId);
    if (!emp) {
      res.status(404).json({ error: 'Trabajador no encontrado' });
      return;
    }

    const year = Number(terminationDate.split('-')[0]) || db.company.activeYear;
    const leg = db.legislation.find((l) => l.year === year) ?? db.legislation[0];

    const record = calculateSeveranceLiquidation({
      id: `LIQ-2026-${String(db.severances.length + 1).padStart(2, '0')}`,
      employee: emp,
      terminationDate,
      cause,
      pendingSalaryDays: Number(pendingSalaryDays) || 0,
      legislation: leg,
    });

    db.severances.unshift(record);
    if (markRetired) {
      emp.status = 'Retirado';
    }

    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, {
      accion: 'LIQUIDATE',
      entidadAfectada: `LiquidacionDefinitiva:${record.id}`,
      datosAnteriores: { empleado: emp.fullName },
      datosNuevos: {
        causal: cause,
        totalLiquidacion: record.totalLiquidation,
      },
    });
    saveDatabase(db);
    res.status(201).json(db);
  });

  app.post('/api/electronic-payroll/:docId/emit', (req, res) => {
    const db = ensureDatabase();
    const { docId } = req.params;
    const { simulateReject } = req.body as { simulateReject?: boolean };
    const doc = db.electronicDocs.find((d) => d.id === docId);
    if (!doc) {
      res.status(404).json({ error: 'Documento electrónico no encontrado' });
      return;
    }

    const prevStatus = doc.status;
    const now = new Date().toISOString();
    if (simulateReject) {
      doc.status = 'RECHAZADO';
      doc.retryCount += 1;
      doc.dianMessage =
        'Regla DIAN NIE088 (Simulación): Tiempo de espera del proveedor tecnológico o validación XML pendiente de reintento.';
    } else {
      doc.status = 'APROBADO';
      doc.retryCount += prevStatus === 'RECHAZADO' ? 1 : 0;
      doc.dianMessage =
        'Validado exitosamente por DIAN · Documento Soporte de Nómina Electrónica aceptado con CUNE verificado.';
    }
    doc.updatedAt = now;

    appendAudit(db, req, {
      accion: 'EMIT',
      entidadAfectada: `NominaElectronica:${doc.receiptNumber}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: { estado: doc.status, cune: doc.cune },
    });
    saveDatabase(db);
    res.json(db);
  });

  app.post('/api/electronic-payroll/period/:periodKey/emit-all', (req, res) => {
    const db = ensureDatabase();
    const { periodKey } = req.params;
    const now = new Date().toISOString();
    let count = 0;

    for (const doc of db.electronicDocs) {
      if (doc.periodKey === periodKey && doc.status !== 'APROBADO') {
        if (doc.status === 'RECHAZADO') doc.retryCount += 1;
        doc.status = 'APROBADO';
        doc.dianMessage =
          'Validado exitosamente por DIAN · Lote de Nómina Electrónica transmitido.';
        doc.updatedAt = now;
        count += 1;
      }
    }

    appendAudit(db, req, {
      accion: 'EMIT',
      entidadAfectada: `NominaElectronicaLote:${periodKey}`,
      datosAnteriores: { pendientesORechazados: count },
      datosNuevos: { aprobadosEnLote: count },
    });
    saveDatabase(db);
    res.json(db);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`INAMOD SENA Nómina server listening on port ${port}`);
  });
}

startServer();
