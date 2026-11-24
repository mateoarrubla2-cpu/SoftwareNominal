import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  createBlankPayrollWorkspace,
  createInitialSenaPlatformData,
} from './src/data/seedData.ts';
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
  ScopedPlatformResponse,
  SenaFicha,
  SenaGlobalStats,
  SenaInstructor,
  SenaPlatformState,
  SenaStudent,
  TerminationCause,
  UserRole,
  VacationRequest,
  VacationStatus,
  WorkspaceSummary,
} from './src/types/payroll.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'payroll-db.json');

function ensurePlatformDatabase(): SenaPlatformState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createInitialSenaPlatformData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as SenaPlatformState;
    if (
      parsed.schemaVersion !== 4 ||
      !Array.isArray(parsed.instructors) ||
      !Array.isArray(parsed.fichas) ||
      !Array.isArray(parsed.students) ||
      !parsed.workspaces
    ) {
      const seed = createInitialSenaPlatformData();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    return parsed;
  } catch {
    const seed = createInitialSenaPlatformData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function savePlatformDatabase(state: SenaPlatformState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function parseActorContext(req: express.Request): {
  role: UserRole;
  actorId: string;
  requestedWorkspaceId: string;
  demoUser: string;
} {
  const rawRole = String(
    req.header('x-demo-role') ?? req.query.role ?? 'ADMINISTRADOR',
  ).toUpperCase();
  const role: UserRole =
    rawRole === 'INSTRUCTOR'
      ? 'INSTRUCTOR'
      : rawRole === 'ESTUDIANTE'
        ? 'ESTUDIANTE'
        : 'ADMINISTRADOR';
  const actorId = String(
    req.header('x-actor-id') ?? req.query.actorId ?? '',
  ).trim();
  const requestedWorkspaceId = String(
    req.header('x-workspace-id') ?? req.query.workspaceId ?? '',
  ).trim();
  const demoUser = String(req.header('x-demo-user') ?? '').trim();

  return { role, actorId, requestedWorkspaceId, demoUser };
}

function resolveEffectiveActorId(
  state: SenaPlatformState,
  role: UserRole,
  actorId: string,
): string {
  if (role === 'ADMINISTRADOR') return 'ADMIN';
  if (role === 'INSTRUCTOR') {
    if (state.instructors.some((i) => i.id === actorId)) return actorId;
    return state.instructors[0]?.id ?? '';
  }
  if (state.students.some((s) => s.id === actorId)) return actorId;
  return state.students[0]?.id ?? '';
}

function appendAudit(
  db: PayrollDatabase,
  req: express.Request,
  role: UserRole,
  actorName: string,
  params: {
    accion: AuditAction;
    entidadAfectada: string;
    datosAnteriores: unknown;
    datosNuevos: unknown;
  },
): void {
  const usuario = req.header('x-demo-user') || actorName || 'usuario@sena.edu.co';
  const entry: AuditLogEntry = {
    id: `AUD-${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    usuario,
    rol: role,
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

  const existingDocMap = new Map(
    db.electronicDocs.map((d) => [d.payslipId, d]),
  );
  const activePayslipIds = new Set<string>();
  for (const period of db.periods) {
    for (const slip of period.payslips) {
      activePayslipIds.add(slip.id);
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
  db.electronicDocs = Array.from(existingDocMap.values())
    .filter((d) => activePayslipIds.has(d.payslipId))
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
  return db;
}

function summarizeWorkspace(db: PayrollDatabase): WorkspaceSummary {
  const totalPayslips = db.periods.reduce((sum, p) => sum + p.payslips.length, 0);
  return {
    employeeCount: db.employees.length,
    payslipCount: totalPayslips,
    vacationCount: db.vacations.length,
    eventualityCount: db.eventualities.length,
    severanceCount: db.severances.length,
    latestPeriodStatus: db.periods[0]?.status ?? 'Borrador',
  };
}

function canReadWorkspace(
  state: SenaPlatformState,
  role: UserRole,
  effectiveActorId: string,
  workspaceId: string,
): boolean {
  if (!workspaceId || !state.workspaces[workspaceId]) return false;
  if (role === 'ADMINISTRADOR') return true;
  if (role === 'ESTUDIANTE') {
    return workspaceId === `student:${effectiveActorId}`;
  }
  // INSTRUCTOR
  if (workspaceId.startsWith('ficha:')) {
    const fichaId = workspaceId.slice('ficha:'.length);
    const ficha = state.fichas.find((f) => f.id === fichaId);
    return ficha?.instructorId === effectiveActorId;
  }
  if (workspaceId.startsWith('student:')) {
    const studentId = workspaceId.slice('student:'.length);
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return false;
    const ficha = state.fichas.find((f) => f.id === student.fichaId);
    return ficha?.instructorId === effectiveActorId;
  }
  return false;
}

function canWriteWorkspace(
  state: SenaPlatformState,
  role: UserRole,
  effectiveActorId: string,
  workspaceId: string,
): boolean {
  if (!workspaceId || !state.workspaces[workspaceId]) return false;
  if (role === 'ADMINISTRADOR') return true;
  if (role === 'ESTUDIANTE') {
    return workspaceId === `student:${effectiveActorId}`;
  }
  // INSTRUCTOR can mutate ONLY their own ficha workspaces; student workspaces are read-only supervision
  if (workspaceId.startsWith('ficha:')) {
    const fichaId = workspaceId.slice('ficha:'.length);
    const ficha = state.fichas.find((f) => f.id === fichaId);
    return ficha?.instructorId === effectiveActorId;
  }
  return false;
}

function resolveWorkspaceOrFail(
  req: express.Request,
  res: express.Response,
  state: SenaPlatformState,
  mode: 'read' | 'write',
): {
  role: UserRole;
  actorId: string;
  actorLabel: string;
  workspaceId: string;
  db: PayrollDatabase;
} | null {
  const ctx = parseActorContext(req);
  const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);

  let workspaceId = ctx.requestedWorkspaceId;
  if (ctx.role === 'ESTUDIANTE') {
    const ownWorkspaceId = `student:${effectiveActorId}`;
    if (workspaceId && workspaceId !== ownWorkspaceId) {
      res.status(403).json({
        error:
          'Acceso denegado: como estudiante solo puedes operar dentro de tu propio panel en blanco.',
      });
      return null;
    }
    workspaceId = ownWorkspaceId;
  } else if (!workspaceId) {
    if (ctx.role === 'INSTRUCTOR') {
      const firstFicha = state.fichas.find((f) => f.instructorId === effectiveActorId);
      workspaceId = firstFicha ? `ficha:${firstFicha.id}` : '';
    } else {
      const firstFicha = state.fichas[0];
      workspaceId = firstFicha
        ? `ficha:${firstFicha.id}`
        : Object.keys(state.workspaces)[0] ?? '';
    }
  }

  const allowed =
    mode === 'write'
      ? canWriteWorkspace(state, ctx.role, effectiveActorId, workspaceId)
      : canReadWorkspace(state, ctx.role, effectiveActorId, workspaceId);

  if (!allowed) {
    res.status(403).json({
      error:
        mode === 'write'
          ? 'No tienes permisos para modificar este espacio de trabajo.'
          : 'Acceso denegado: no puedes visualizar información de otros instructores o estudiantes.',
    });
    return null;
  }

  const db = state.workspaces[workspaceId];
  let actorLabel = 'admin.sena@misena.edu.co';
  if (ctx.role === 'INSTRUCTOR') {
    actorLabel =
      state.instructors.find((i) => i.id === effectiveActorId)?.email ??
      'instructor@misena.edu.co';
  } else if (ctx.role === 'ESTUDIANTE') {
    actorLabel =
      state.students.find((s) => s.id === effectiveActorId)?.email ??
      'estudiante@soy.sena.edu.co';
  }

  return {
    role: ctx.role,
    actorId: effectiveActorId,
    actorLabel,
    workspaceId,
    db,
  };
}

function buildScopedPlatformResponse(
  state: SenaPlatformState,
  req: express.Request,
  overrideWorkspaceId?: string,
): ScopedPlatformResponse {
  const ctx = parseActorContext(req);
  const role = ctx.role;
  const actorId = resolveEffectiveActorId(state, role, ctx.actorId);
  const reqWs = overrideWorkspaceId ?? ctx.requestedWorkspaceId;

  let scopedInstructors: SenaInstructor[] = [];
  let scopedFichas: SenaFicha[] = [];
  let scopedStudents: SenaStudent[] = [];
  const scopedWorkspaces: Record<string, PayrollDatabase> = {};
  const workspaceSummaries: Record<string, WorkspaceSummary> = {};

  if (role === 'ADMINISTRADOR') {
    scopedInstructors = state.instructors;
    scopedFichas = state.fichas;
    scopedStudents = state.students;
    for (const [key, ws] of Object.entries(state.workspaces)) {
      const synced = syncDraftPeriodsAndDocs(ws);
      scopedWorkspaces[key] = synced;
      workspaceSummaries[key] = summarizeWorkspace(synced);
    }
  } else if (role === 'INSTRUCTOR') {
    scopedInstructors = state.instructors.filter((i) => i.id === actorId);
    scopedFichas = state.fichas.filter((f) => f.instructorId === actorId);
    const ownFichaIds = new Set(scopedFichas.map((f) => f.id));
    scopedStudents = state.students.filter((s) => ownFichaIds.has(s.fichaId));

    for (const ficha of scopedFichas) {
      const key = `ficha:${ficha.id}`;
      const ws = state.workspaces[key];
      if (ws) {
        const synced = syncDraftPeriodsAndDocs(ws);
        scopedWorkspaces[key] = synced;
        workspaceSummaries[key] = summarizeWorkspace(synced);
      }
    }
    for (const student of scopedStudents) {
      const key = `student:${student.id}`;
      const ws = state.workspaces[key];
      if (ws) {
        const synced = syncDraftPeriodsAndDocs(ws);
        scopedWorkspaces[key] = synced;
        workspaceSummaries[key] = summarizeWorkspace(synced);
      }
    }
  } else {
    // ESTUDIANTE: strictly isolated to own student record, own ficha metadata, and own workspace
    const selfStudent = state.students.find((s) => s.id === actorId);
    scopedStudents = selfStudent ? [selfStudent] : [];
    scopedFichas = selfStudent
      ? state.fichas.filter((f) => f.id === selfStudent.fichaId)
      : [];
    const ownFicha = scopedFichas[0];
    scopedInstructors = ownFicha
      ? state.instructors.filter((i) => i.id === ownFicha.instructorId)
      : [];

    if (selfStudent) {
      const key = `student:${selfStudent.id}`;
      const ws = state.workspaces[key];
      if (ws) {
        const synced = syncDraftPeriodsAndDocs(ws);
        scopedWorkspaces[key] = synced;
        workspaceSummaries[key] = summarizeWorkspace(synced);
      }
    }
  }

  let activeWorkspaceId = '';
  if (role === 'ESTUDIANTE') {
    activeWorkspaceId = actorId ? `student:${actorId}` : '';
  } else if (reqWs && scopedWorkspaces[reqWs]) {
    activeWorkspaceId = reqWs;
  } else if (role === 'INSTRUCTOR') {
    const firstFicha = scopedFichas[0];
    activeWorkspaceId = firstFicha ? `ficha:${firstFicha.id}` : '';
  } else {
    const firstFicha = scopedFichas[0];
    activeWorkspaceId = firstFicha
      ? `ficha:${firstFicha.id}`
      : Object.keys(scopedWorkspaces)[0] ?? '';
  }

  const allVisibleWorkspaces = Object.values(scopedWorkspaces);
  const globalStats: SenaGlobalStats = {
    totalInstructors: scopedInstructors.length,
    activeInstructors: scopedInstructors.filter((i) => i.active).length,
    totalFichas: scopedFichas.length,
    totalStudents: scopedStudents.length,
    activeStudents: scopedStudents.filter((s) => s.active).length,
    totalWorkersAcrossWorkspaces: allVisibleWorkspaces.reduce(
      (sum, ws) => sum + ws.employees.length,
      0,
    ),
    totalPayslipsAcrossWorkspaces: allVisibleWorkspaces.reduce(
      (sum, ws) =>
        sum + ws.periods.reduce((ps, p) => ps + p.payslips.length, 0),
      0,
    ),
  };

  return {
    schemaVersion: state.schemaVersion,
    role,
    actorId,
    activeWorkspaceId,
    globalStats,
    instructors: scopedInstructors,
    fichas: scopedFichas,
    students: scopedStudents,
    workspaces: scopedWorkspaces,
    workspaceSummaries,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Lightweight actor list for the RBAC role simulator dropdown
  app.get('/api/demo/actors', (_req, res) => {
    const state = ensurePlatformDatabase();
    res.json({
      instructors: state.instructors.map((i) => ({
        id: i.id,
        fullName: i.fullName,
      })),
      students: state.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
      })),
    });
  });

  // Scoped SENA platform entrypoint
  app.get('/api/platform', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);

    if (ctx.requestedWorkspaceId) {
      if (!canReadWorkspace(state, ctx.role, effectiveActorId, ctx.requestedWorkspaceId)) {
        res.status(403).json({
          error:
            'Acceso denegado: no puedes acceder a espacios de trabajo de otros usuarios.',
        });
        return;
      }
    }

    res.json(buildScopedPlatformResponse(state, req));
  });

  // Backward-compatible state route (returns active workspace)
  app.get('/api/state', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'read');
    if (!resolved) return;
    res.json(syncDraftPeriodsAndDocs(resolved.db));
  });

  // Reset full SENA training platform (Administrator only)
  app.post('/api/demo/reset', (req, res) => {
    const ctx = parseActorContext(req);
    if (ctx.role !== 'ADMINISTRADOR') {
      res.status(403).json({
        error: 'Solo el Administrador SENA puede reiniciar toda la plataforma.',
      });
      return;
    }
    const seed = createInitialSenaPlatformData();
    savePlatformDatabase(seed);
    res.json(buildScopedPlatformResponse(seed, req));
  });

  // Reset a single workspace back to clean blank state
  app.post('/api/sena/workspaces/:workspaceId/reset-blank', (req, res) => {
    const state = ensurePlatformDatabase();
    const { workspaceId } = req.params;
    const ctx = parseActorContext(req);
    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);

    if (!canWriteWorkspace(state, ctx.role, effectiveActorId, workspaceId)) {
      res.status(403).json({
        error: 'No tienes permisos para reiniciar este panel.',
      });
      return;
    }

    const existingCompanyName =
      state.workspaces[workspaceId]?.company.name ?? 'Práctica Formativa SENA';
    state.workspaces[workspaceId] = createBlankPayrollWorkspace({
      companyName: existingCompanyName,
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  // ==========================================
  // SENA ADMIN CRUD: INSTRUCTORES
  // ==========================================
  app.post('/api/sena/instructors', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role !== 'ADMINISTRADOR') {
      res.status(403).json({
        error: 'Solo el Administrador puede registrar instructores.',
      });
      return;
    }

    const payload = req.body as Omit<SenaInstructor, 'id' | 'createdAt'>;
    if (!payload.fullName?.trim() || !payload.email?.trim()) {
      res.status(400).json({ error: 'Nombre y correo son obligatorios.' });
      return;
    }

    const nextNum =
      state.instructors.reduce((max, inst) => {
        const n = Number(inst.id.replace('INST-', ''));
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;

    const newInstructor: SenaInstructor = {
      id: `INST-${String(nextNum).padStart(3, '0')}`,
      fullName: payload.fullName.trim(),
      documentId: String(payload.documentId ?? '').trim() || '00000000',
      email: payload.email.trim(),
      specialty: payload.specialty?.trim() || 'Gestión Humana y Nómina',
      active: payload.active ?? true,
      createdAt: new Date().toISOString(),
    };

    state.instructors.push(newInstructor);
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req));
  });

  app.put('/api/sena/instructors/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role !== 'ADMINISTRADOR') {
      res.status(403).json({
        error: 'Solo el Administrador puede editar instructores.',
      });
      return;
    }

    const { id } = req.params;
    const idx = state.instructors.findIndex((i) => i.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Instructor no encontrado.' });
      return;
    }

    const patch = req.body as Partial<SenaInstructor>;
    state.instructors[idx] = { ...state.instructors[idx], ...patch, id };
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  app.delete('/api/sena/instructors/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role !== 'ADMINISTRADOR') {
      res.status(403).json({
        error: 'Solo el Administrador puede eliminar instructores.',
      });
      return;
    }

    const { id } = req.params;
    const existing = state.instructors.find((i) => i.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Instructor no encontrado.' });
      return;
    }

    const removedFichaIds = new Set(
      state.fichas.filter((f) => f.instructorId === id).map((f) => f.id),
    );
    const removedStudentIds = new Set(
      state.students
        .filter((s) => s.instructorId === id || removedFichaIds.has(s.fichaId))
        .map((s) => s.id),
    );

    state.instructors = state.instructors.filter((i) => i.id !== id);
    state.fichas = state.fichas.filter((f) => !removedFichaIds.has(f.id));
    state.students = state.students.filter((s) => !removedStudentIds.has(s.id));

    for (const fId of removedFichaIds) {
      delete state.workspaces[`ficha:${fId}`];
    }
    for (const sId of removedStudentIds) {
      delete state.workspaces[`student:${sId}`];
    }

    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  // ==========================================
  // SENA CRUD: FICHAS / GRUPOS (Admin + Owning Instructor)
  // ==========================================
  app.post('/api/sena/fichas', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({
        error: 'Los estudiantes no pueden crear fichas ni grupos.',
      });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const payload = req.body as {
      code: string;
      name: string;
      schedule: string;
      program: string;
      instructorId?: string;
    };

    if (!payload.name?.trim()) {
      res.status(400).json({ error: 'El nombre de la ficha / clase es obligatorio.' });
      return;
    }

    const targetInstructorId =
      ctx.role === 'INSTRUCTOR'
        ? effectiveActorId
        : payload.instructorId || state.instructors[0]?.id || '';

    if (!state.instructors.some((i) => i.id === targetInstructorId)) {
      res.status(404).json({ error: 'Instructor asignado no encontrado.' });
      return;
    }

    const nextNum =
      state.fichas.reduce((max, f) => {
        const n = Number(f.id.replace('FIC-', ''));
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;

    const fichaId = `FIC-${String(nextNum).padStart(3, '0')}`;
    const code =
      payload.code?.trim() || String(2920000 + nextNum * 111);

    const newFicha: SenaFicha = {
      id: fichaId,
      code,
      name: payload.name.trim(),
      schedule: payload.schedule?.trim() || 'Mañana (06:00 - 12:00)',
      program: payload.program?.trim() || 'Técnico en Recursos Humanos',
      instructorId: targetInstructorId,
      createdAt: new Date().toISOString(),
    };

    state.fichas.push(newFicha);
    const workspaceId = `ficha:${newFicha.id}`;
    state.workspaces[workspaceId] = createBlankPayrollWorkspace({
      companyName: `Ficha ${newFicha.code} · ${newFicha.name}`,
    });

    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.put('/api/sena/fichas/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({ error: 'No autorizado.' });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const { id } = req.params;
    const idx = state.fichas.findIndex((f) => f.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Ficha no encontrada.' });
      return;
    }

    if (
      ctx.role === 'INSTRUCTOR' &&
      state.fichas[idx].instructorId !== effectiveActorId
    ) {
      res.status(403).json({
        error: 'Acceso denegado: esta ficha pertenece a otro instructor.',
      });
      return;
    }

    const patch = req.body as Partial<SenaFicha>;
    const nextInstructorId =
      ctx.role === 'INSTRUCTOR'
        ? effectiveActorId
        : patch.instructorId ?? state.fichas[idx].instructorId;

    state.fichas[idx] = {
      ...state.fichas[idx],
      ...patch,
      id,
      instructorId: nextInstructorId,
    };

    // Update student instructorId if admin reassigned the ficha
    if (ctx.role === 'ADMINISTRADOR' && patch.instructorId) {
      for (const st of state.students) {
        if (st.fichaId === id) st.instructorId = nextInstructorId;
      }
    }

    const ws = state.workspaces[`ficha:${id}`];
    if (ws) {
      ws.company.name = `Ficha ${state.fichas[idx].code} · ${state.fichas[idx].name}`;
    }

    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  app.delete('/api/sena/fichas/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({ error: 'No autorizado.' });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const { id } = req.params;
    const ficha = state.fichas.find((f) => f.id === id);
    if (!ficha) {
      res.status(404).json({ error: 'Ficha no encontrada.' });
      return;
    }

    if (ctx.role === 'INSTRUCTOR' && ficha.instructorId !== effectiveActorId) {
      res.status(403).json({
        error: 'Acceso denegado: no puedes eliminar fichas de otros profesores.',
      });
      return;
    }

    const removedStudentIds = state.students
      .filter((s) => s.fichaId === id)
      .map((s) => s.id);
    state.fichas = state.fichas.filter((f) => f.id !== id);
    state.students = state.students.filter((s) => s.fichaId !== id);
    delete state.workspaces[`ficha:${id}`];
    for (const sId of removedStudentIds) {
      delete state.workspaces[`student:${sId}`];
    }

    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  // ==========================================
  // SENA CRUD: ESTUDIANTES (Admin + Owning Instructor)
  // ==========================================
  app.post('/api/sena/students', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({
        error: 'Los estudiantes no pueden crear otros estudiantes.',
      });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const payload = req.body as {
      fullName: string;
      documentId: string;
      email: string;
      fichaId: string;
      active?: boolean;
    };

    if (!payload.fullName?.trim() || !payload.fichaId) {
      res.status(400).json({ error: 'Nombre y ficha asignada son obligatorios.' });
      return;
    }

    const ficha = state.fichas.find((f) => f.id === payload.fichaId);
    if (!ficha) {
      res.status(404).json({ error: 'Ficha no encontrada.' });
      return;
    }

    if (ctx.role === 'INSTRUCTOR' && ficha.instructorId !== effectiveActorId) {
      res.status(403).json({
        error: 'Acceso denegado: no puedes agregar estudiantes a fichas de otros profesores.',
      });
      return;
    }

    const nextNum =
      state.students.reduce((max, s) => {
        const n = Number(s.id.replace('EST-', ''));
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;

    const newStudent: SenaStudent = {
      id: `EST-${String(nextNum).padStart(3, '0')}`,
      fullName: payload.fullName.trim(),
      documentId: String(payload.documentId ?? '').trim() || '0000000000',
      email:
        payload.email?.trim() ||
        `aprendiz.${nextNum}@soy.sena.edu.co`,
      fichaId: ficha.id,
      instructorId: ficha.instructorId,
      active: payload.active ?? true,
      createdAt: new Date().toISOString(),
    };

    state.students.push(newStudent);
    // Every student starts with a completely blank payroll workspace
    state.workspaces[`student:${newStudent.id}`] = createBlankPayrollWorkspace({
      companyName: `Práctica SENA · ${newStudent.fullName}`,
    });

    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req));
  });

  app.put('/api/sena/students/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({
        error: 'Los estudiantes no pueden editar registros de otros compañeros.',
      });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const { id } = req.params;
    const idx = state.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Estudiante no encontrado.' });
      return;
    }

    const currentStudent = state.students[idx];
    const currentFicha = state.fichas.find((f) => f.id === currentStudent.fichaId);
    if (
      ctx.role === 'INSTRUCTOR' &&
      currentFicha?.instructorId !== effectiveActorId
    ) {
      res.status(403).json({
        error: 'Acceso denegado: este estudiante pertenece a otro instructor.',
      });
      return;
    }

    const patch = req.body as Partial<SenaStudent>;
    const targetFichaId = patch.fichaId ?? currentStudent.fichaId;
    const targetFicha = state.fichas.find((f) => f.id === targetFichaId);
    if (!targetFicha) {
      res.status(404).json({ error: 'Ficha de destino no encontrada.' });
      return;
    }
    if (
      ctx.role === 'INSTRUCTOR' &&
      targetFicha.instructorId !== effectiveActorId
    ) {
      res.status(403).json({
        error: 'Acceso denegado: no puedes mover un estudiante a otro instructor.',
      });
      return;
    }

    state.students[idx] = {
      ...currentStudent,
      ...patch,
      id,
      fichaId: targetFicha.id,
      instructorId: targetFicha.instructorId,
    };

    const ws = state.workspaces[`student:${id}`];
    if (ws && patch.fullName) {
      ws.company.name = `Práctica SENA · ${state.students[idx].fullName}`;
    }

    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  app.delete('/api/sena/students/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const ctx = parseActorContext(req);
    if (ctx.role === 'ESTUDIANTE') {
      res.status(403).json({
        error: 'Los estudiantes no pueden eliminar a sus compañeros.',
      });
      return;
    }

    const effectiveActorId = resolveEffectiveActorId(state, ctx.role, ctx.actorId);
    const { id } = req.params;
    const student = state.students.find((s) => s.id === id);
    if (!student) {
      res.status(404).json({ error: 'Estudiante no encontrado.' });
      return;
    }

    const ficha = state.fichas.find((f) => f.id === student.fichaId);
    if (ctx.role === 'INSTRUCTOR' && ficha?.instructorId !== effectiveActorId) {
      res.status(403).json({
        error: 'Acceso denegado: este estudiante pertenece a otro profesor.',
      });
      return;
    }

    state.students = state.students.filter((s) => s.id !== id);
    delete state.workspaces[`student:${id}`];

    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req));
  });

  // ==========================================
  // SCOPED PAYROLL WORKSPACE ENDPOINTS
  // ==========================================
  app.put('/api/company', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
    const prev = { ...db.company };
    const patch = req.body as Partial<CompanyConfig>;
    db.company = { ...db.company, ...patch };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: 'Empresa:Configuracion',
      datosAnteriores: prev,
      datosNuevos: db.company,
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.put('/api/legislation/:year', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `LegislacionAnual:${year}`,
      datosAnteriores: {
        smmlv: prev.smmlv,
        auxilio: prev.auxilioTransporte,
        uvt: prev.uvt,
      },
      datosNuevos: {
        smmlv: db.legislation[idx].smmlv,
        auxilio: db.legislation[idx].auxilioTransporte,
        uvt: db.legislation[idx].uvt,
      },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/employees', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'CREATE',
      entidadAfectada: `Empleado:${newEmployee.id}`,
      datosAnteriores: null,
      datosNuevos: { nombre: newEmployee.fullName, cargo: newEmployee.role },
    });
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.put('/api/employees/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `Empleado:${id}`,
      datosAnteriores: { salario: prev.baseSalary, estado: prev.status },
      datosNuevos: {
        salario: db.employees[idx].baseSalary,
        estado: db.employees[idx].status,
      },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.delete('/api/employees/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
    const { id } = req.params;
    const existing = db.employees.find((e) => e.id === id);
    db.employees = db.employees.filter((e) => e.id !== id);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, role, actorLabel, {
      accion: 'DELETE',
      entidadAfectada: `Empleado:${id}`,
      datosAnteriores: existing ? { nombre: existing.fullName } : null,
      datosNuevos: null,
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/benefits', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'CREATE',
      entidadAfectada: `Beneficio:${newBenefit.id}`,
      datosAnteriores: null,
      datosNuevos: { nombre: newBenefit.name, monto: newBenefit.monthlyAmount },
    });
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.put('/api/benefits/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
    const { id } = req.params;
    const idx = db.benefits.findIndex((b) => b.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Beneficio no encontrado' });
      return;
    }
    const prev = { ...db.benefits[idx] };
    db.benefits[idx] = {
      ...db.benefits[idx],
      ...(req.body as Partial<BenefitPlan>),
      id,
    };
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `Beneficio:${id}`,
      datosAnteriores: { monto: prev.monthlyAmount, activo: prev.active },
      datosNuevos: {
        monto: db.benefits[idx].monthlyAmount,
        activo: db.benefits[idx].active,
      },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/vacations', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
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
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.patch('/api/vacations/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `Vacacion:${id}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: { estado: status },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/eventualities', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
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
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.patch('/api/eventualities/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `Eventualidad:${id}`,
      datosAnteriores: prev,
      datosNuevos: { status: ev.status },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.delete('/api/eventualities/:id', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
    const { id } = req.params;
    const existing = db.eventualities.find((e) => e.id === id);
    db.eventualities = db.eventualities.filter((e) => e.id !== id);
    syncDraftPeriodsAndDocs(db);
    appendAudit(db, req, role, actorLabel, {
      accion: 'DELETE',
      entidadAfectada: `Eventualidad:${id}`,
      datosAnteriores: existing ? { tipo: existing.type } : null,
      datosNuevos: null,
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/payroll/periods', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'CREATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: null,
      datosNuevos: { label, periodicidad: freq },
    });
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.patch('/api/payroll/:periodKey/frequency', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: { periodicidad: prevFreq },
      datosNuevos: { periodicidad: frequency },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.patch('/api/payroll/:periodKey/adjustment', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'UPDATE',
      entidadAfectada: `NovedadNomina:${periodKey}:${employeeId}`,
      datosAnteriores: null,
      datosNuevos: adjustment,
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/payroll/:periodKey/process', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'LIQUIDATE',
      entidadAfectada: `NominaPeriodo:${periodKey}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: {
        estado: recalculated.status,
        recibos: recalculated.payslips.length,
      },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.patch('/api/payroll/:periodKey/payslips/:payslipId/pay', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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

    appendAudit(db, req, role, actorLabel, {
      accion: 'LIQUIDATE',
      entidadAfectada: `Desprendible:${slip.receiptNumber}`,
      datosAnteriores: { estado: 'Pendiente' },
      datosNuevos: { estado: 'Pagado', neto: slip.netPay },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/severances', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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
    appendAudit(db, req, role, actorLabel, {
      accion: 'LIQUIDATE',
      entidadAfectada: `LiquidacionDefinitiva:${record.id}`,
      datosAnteriores: { empleado: emp.fullName },
      datosNuevos: {
        causal: cause,
        totalLiquidacion: record.totalLiquidation,
      },
    });
    savePlatformDatabase(state);
    res.status(201).json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/electronic-payroll/:docId/emit', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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

    appendAudit(db, req, role, actorLabel, {
      accion: 'EMIT',
      entidadAfectada: `NominaElectronica:${doc.receiptNumber}`,
      datosAnteriores: { estado: prevStatus },
      datosNuevos: { estado: doc.status, cune: doc.cune },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
  });

  app.post('/api/electronic-payroll/period/:periodKey/emit-all', (req, res) => {
    const state = ensurePlatformDatabase();
    const resolved = resolveWorkspaceOrFail(req, res, state, 'write');
    if (!resolved) return;

    const { db, role, actorLabel, workspaceId } = resolved;
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

    appendAudit(db, req, role, actorLabel, {
      accion: 'EMIT',
      entidadAfectada: `NominaElectronicaLote:${periodKey}`,
      datosAnteriores: { pendientesORechazados: count },
      datosNuevos: { aprobadosEnLote: count },
    });
    savePlatformDatabase(state);
    res.json(buildScopedPlatformResponse(state, req, workspaceId));
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
    console.log(`SENA Formación Nómina server listening on port ${port}`);
  });
}

startServer();
