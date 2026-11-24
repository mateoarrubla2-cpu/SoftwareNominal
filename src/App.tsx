import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Eye,
  FileBarChart2,
  FileCheck2,
  FileCode2,
  Gift,
  GraduationCap,
  HardDrive,
  Layers,
  Menu,
  Receipt,
  RotateCcw,
  Scale,
  Settings,
  ShieldAlert,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { AdminSenaView } from './components/AdminSenaView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { CompanySettingsModal } from './components/CompanySettingsModal.tsx';
import { ElectronicPayrollView } from './components/ElectronicPayrollView.tsx';
import { EmployeesView } from './components/EmployeesView.tsx';
import { EventualitiesView } from './components/EventualitiesView.tsx';
import { GoogleWorkspaceView } from './components/GoogleWorkspaceView.tsx';
import { InstructorPanelView } from './components/InstructorPanelView.tsx';
import { LegislationView } from './components/LegislationView.tsx';
import { PayrollView } from './components/PayrollView.tsx';
import { PayslipPreviewModal } from './components/PayslipPreviewModal.tsx';
import { PayslipsArchiveView } from './components/PayslipsArchiveView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SeveranceView } from './components/SeveranceView.tsx';
import { SocialBenefitsView } from './components/SocialBenefitsView.tsx';
import { VacationsView } from './components/VacationsView.tsx';
import { createBlankPayrollWorkspace } from './data/seedData.ts';
import { setExportDriveNotifier } from './lib/exportEngine.ts';
import type {
  BenefitPlan,
  CompanyConfig,
  Employee,
  EventualityImpact,
  EventualityStatus,
  EventualityType,
  LegislationParams,
  PayrollDatabase,
  PayrollFrequency,
  Payslip,
  PeriodAdjustment,
  ScopedPlatformResponse,
  SenaFicha,
  SenaInstructor,
  SenaStudent,
  TerminationCause,
  UserRole,
  VacationStatus,
  VacationType,
} from './types/payroll.ts';

type PayrollTab =
  | 'pagas'
  | 'desprendibles'
  | 'prestaciones'
  | 'vacaciones'
  | 'eventualidades'
  | 'calendario'
  | 'despidos'
  | 'electronica'
  | 'legislacion'
  | 'empleados'
  | 'reportes'
  | 'drive'
  | 'auditoria';

type AppTab = 'admin-sena' | 'instructor-fichas' | PayrollTab;

const PAYROLL_NAV: { id: PayrollTab; label: string; icon: typeof Receipt }[] = [
  { id: 'pagas', label: 'Pagas y Nómina', icon: Receipt },
  { id: 'desprendibles', label: 'Desprendibles PDF', icon: FileCheck2 },
  { id: 'prestaciones', label: 'Prestaciones y Beneficios', icon: Gift },
  { id: 'vacaciones', label: 'Vacaciones', icon: CalendarDays },
  { id: 'eventualidades', label: 'Eventualidades', icon: ClipboardList },
  { id: 'calendario', label: 'Calendario Laboral', icon: CalendarRange },
  { id: 'despidos', label: 'Despidos y Liquidación', icon: UserMinus },
  { id: 'electronica', label: 'Nómina Electrónica XML', icon: FileCode2 },
  { id: 'legislacion', label: 'Legislación Actual', icon: Scale },
  { id: 'empleados', label: 'Trabajadores', icon: Users },
  { id: 'reportes', label: 'Reportes PDF / Excel', icon: FileBarChart2 },
  { id: 'drive', label: 'Google Workspace', icon: HardDrive },
  { id: 'auditoria', label: 'Bitácora de Auditoría', icon: ShieldAlert },
];

const EMPTY_FALLBACK_WORKSPACE: PayrollDatabase = createBlankPayrollWorkspace();

export default function App() {
  const [platform, setPlatform] = useState<ScopedPlatformResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RBAC Simulator state (Admin / Instructor / Estudiante)
  const [role, setRole] = useState<UserRole>('ADMINISTRADOR');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('INST-001');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('EST-001');

  // Known actors cache for RBAC switcher dropdowns (server still strictly scopes /api/platform)
  const [knownInstructors, setKnownInstructors] = useState<{ id: string; fullName: string }[]>([]);
  const [knownStudents, setKnownStudents] = useState<{ id: string; fullName: string }[]>([]);

  const [activeTab, setActiveTab] = useState<AppTab>('admin-sena');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('2026-11');

  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [calendarEventualityDate, setCalendarEventualityDate] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }

  function getActorIdForRole(targetRole: UserRole): string {
    if (targetRole === 'ADMINISTRADOR') return 'ADMIN';
    if (targetRole === 'INSTRUCTOR') return selectedInstructorId;
    return selectedStudentId;
  }

  function getDemoEmail(
    targetRole: UserRole,
    actorId: string,
    plat: ScopedPlatformResponse | null,
  ): string {
    if (targetRole === 'ADMINISTRADOR') return 'admin.centro@misena.edu.co';
    if (targetRole === 'INSTRUCTOR') {
      return (
        plat?.instructors.find((i) => i.id === actorId)?.email ??
        'instructor@misena.edu.co'
      );
    }
    return (
      plat?.students.find((s) => s.id === actorId)?.email ??
      'aprendiz@soy.sena.edu.co'
    );
  }

  async function fetchPlatform(
    targetRole: UserRole = role,
    targetActorId: string = getActorIdForRole(targetRole),
    targetWorkspaceId: string = selectedWorkspaceId,
  ) {
    try {
      setError(null);
      const params = new URLSearchParams({
        role: targetRole,
        actorId: targetActorId,
      });
      if (targetWorkspaceId && targetRole !== 'ESTUDIANTE') {
        params.set('workspaceId', targetWorkspaceId);
      }

      const res = await fetch(`/api/platform?${params.toString()}`, {
        headers: {
          'x-demo-role': targetRole,
          'x-actor-id': targetActorId,
          ...(targetWorkspaceId && targetRole !== 'ESTUDIANTE'
            ? { 'x-workspace-id': targetWorkspaceId }
            : {}),
        },
      });
      if (!res.ok) {
        const errPayload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errPayload.error ?? 'No se pudo cargar la plataforma SENA');
      }
      const data = (await res.json()) as ScopedPlatformResponse;
      setPlatform(data);

      const actorsRes = await fetch('/api/demo/actors');
      if (actorsRes.ok) {
        const actorsData = (await actorsRes.json()) as {
          instructors: { id: string; fullName: string }[];
          students: { id: string; fullName: string }[];
        };
        setKnownInstructors(actorsData.instructors);
        setKnownStudents(actorsData.students);
      } else if (targetRole === 'ADMINISTRADOR') {
        setKnownInstructors(
          data.instructors.map((i) => ({ id: i.id, fullName: i.fullName })),
        );
        setKnownStudents(
          data.students.map((s) => ({ id: s.id, fullName: s.fullName })),
        );
      }

      const effectiveWsId =
        data.activeWorkspaceId || Object.keys(data.workspaces)[0] || '';
      setSelectedWorkspaceId(effectiveWsId);

      const wsDb = data.workspaces[effectiveWsId];
      if (wsDb && wsDb.periods.length > 0) {
        if (!wsDb.periods.some((p) => p.periodKey === selectedPeriodKey)) {
          setSelectedPeriodKey(wsDb.periods[0].periodKey);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlatform('ADMINISTRADOR', 'ADMIN', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setExportDriveNotifier((msg) => showToast(msg));
    return () => setExportDriveNotifier(null);
  }, []);

  async function handleSwitchRole(nextRole: UserRole) {
    setRole(nextRole);
    setPreviewPayslip(null);
    const nextActorId =
      nextRole === 'ADMINISTRADOR'
        ? 'ADMIN'
        : nextRole === 'INSTRUCTOR'
          ? selectedInstructorId || knownInstructors[0]?.id || 'INST-001'
          : selectedStudentId || knownStudents[0]?.id || 'EST-001';

    if (nextRole === 'INSTRUCTOR') {
      setSelectedInstructorId(nextActorId);
      setActiveTab('instructor-fichas');
    } else if (nextRole === 'ESTUDIANTE') {
      setSelectedStudentId(nextActorId);
      setActiveTab('pagas');
    } else {
      setActiveTab('admin-sena');
    }

    await fetchPlatform(nextRole, nextActorId, '');
  }

  async function handleSwitchInstructor(instId: string) {
    setSelectedInstructorId(instId);
    setActiveTab('instructor-fichas');
    await fetchPlatform('INSTRUCTOR', instId, '');
  }

  async function handleSwitchStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setActiveTab('pagas');
    await fetchPlatform('ESTUDIANTE', studentId, `student:${studentId}`);
  }

  async function mutate(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
    successToast?: string,
    overrideWorkspaceId?: string,
  ) {
    const actorId = getActorIdForRole(role);
    const workspaceId = overrideWorkspaceId ?? selectedWorkspaceId;
    const demoUser = getDemoEmail(role, actorId, platform);

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-demo-role': role,
        'x-actor-id': actorId,
        'x-workspace-id': workspaceId,
        'x-demo-user': demoUser,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      const errMsg = payload.error ?? 'Error al procesar operación';
      showToast(errMsg);
      throw new Error(errMsg);
    }

    const updated = (await res.json()) as ScopedPlatformResponse;
    setPlatform(updated);

    const actorsRes = await fetch('/api/demo/actors');
    if (actorsRes.ok) {
      const actorsData = (await actorsRes.json()) as {
        instructors: { id: string; fullName: string }[];
        students: { id: string; fullName: string }[];
      };
      setKnownInstructors(actorsData.instructors);
      setKnownStudents(actorsData.students);
    }

    const nextWsId =
      updated.activeWorkspaceId || Object.keys(updated.workspaces)[0] || '';
    if (nextWsId) {
      setSelectedWorkspaceId(nextWsId);
    }

    const activeWsDb = updated.workspaces[nextWsId];
    if (previewPayslip && activeWsDb) {
      const p = activeWsDb.periods.find(
        (per) => per.periodKey === previewPayslip.periodKey,
      );
      const s = p?.payslips.find((sl) => sl.id === previewPayslip.id);
      if (s) setPreviewPayslip(s);
    }

    if (successToast) showToast(successToast);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">
          Cargando Plataforma SENA de Formación en Nómina...
        </div>
      </div>
    );
  }

  if (error || !platform) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Error de Conexión
          </h1>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchPlatform();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const db =
    platform.workspaces[selectedWorkspaceId] ??
    platform.workspaces[platform.activeWorkspaceId] ??
    Object.values(platform.workspaces)[0] ??
    EMPTY_FALLBACK_WORKSPACE;

  const activePeriod =
    db.periods.find((p) => p.periodKey === selectedPeriodKey) ?? db.periods[0];
  const activeLegislation =
    db.legislation.find((l) => l.year === activePeriod?.year) ?? db.legislation[0];

  const pendingVacationsCount = db.vacations.filter(
    (v) => v.status === 'Pendiente',
  ).length;
  const activeEventualitiesCount = (db.eventualities ?? []).filter(
    (e) => e.status !== 'Cerrada',
  ).length;

  const activeInstructor = platform.instructors.find(
    (i) => i.id === selectedInstructorId,
  ) ?? platform.instructors[0];

  const activeStudent = platform.students.find(
    (s) => s.id === selectedStudentId,
  ) ?? platform.students[0];

  const selectedFichaId = selectedWorkspaceId.startsWith('ficha:')
    ? selectedWorkspaceId.slice('ficha:'.length)
    : platform.fichas[0]?.id ?? '';

  const isInstructorSupervisingStudent =
    role === 'INSTRUCTOR' && selectedWorkspaceId.startsWith('student:');
  const supervisedStudent = isInstructorSupervisingStudent
    ? platform.students.find(
        (s) => `student:${s.id}` === selectedWorkspaceId,
      )
    : undefined;

  const isViewingPayrollWorkspace =
    activeTab !== 'admin-sena' && activeTab !== 'instructor-fichas';

  const activeTabLabel =
    activeTab === 'admin-sena'
      ? 'Panel Administrador SENA'
      : activeTab === 'instructor-fichas'
        ? 'Mis Fichas y Estudiantes'
        : PAYROLL_NAV.find((i) => i.id === activeTab)?.label ?? 'Pagas y Nómina';

  const roleSubtitle =
    role === 'ADMINISTRADOR'
      ? 'Administrador SENA'
      : role === 'INSTRUCTOR'
        ? activeInstructor?.fullName ?? 'Instructor SENA'
        : activeStudent?.fullName ?? 'Estudiante SENA';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Brand Wordmark */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-teal-700 text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-display text-sm font-bold tracking-tight text-slate-900 block truncate">
                  SENA Nómina Lab
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Formación en Gestión Humana
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* RBAC Role Switcher Demo (3 Roles) */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <p className="text-xs font-medium text-slate-500 px-1">
              Simulador de Rol SENA (RBAC)
            </p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => handleSwitchRole('ADMINISTRADOR')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  role === 'ADMINISTRADOR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole('INSTRUCTOR')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  role === 'INSTRUCTOR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Instructor
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole('ESTUDIANTE')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  role === 'ESTUDIANTE'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Estudiante
              </button>
            </div>

            {role === 'INSTRUCTOR' && knownInstructors.length > 0 && (
              <select
                value={selectedInstructorId}
                onChange={(e) => handleSwitchInstructor(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Seleccionar instructor"
              >
                {knownInstructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.fullName}
                  </option>
                ))}
              </select>
            )}

            {role === 'ESTUDIANTE' && knownStudents.length > 0 && (
              <select
                value={selectedStudentId}
                onChange={(e) => handleSwitchStudent(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Seleccionar estudiante"
              >
                {knownStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Primary Role Navigation */}
          <nav className="p-3 space-y-0.5" aria-label="Navegación SENA">
            {role === 'ADMINISTRADOR' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin-sena');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'admin-sena'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      activeTab === 'admin-sena' ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">Gestión Centro SENA</span>
                </button>
                <div className="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Módulos del Panel Activo
                </div>
              </>
            )}

            {role === 'INSTRUCTOR' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('instructor-fichas');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'instructor-fichas'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers
                    className={`w-4 h-4 shrink-0 ${
                      activeTab === 'instructor-fichas'
                        ? 'text-teal-700'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">Mis Fichas y Estudiantes</span>
                </button>
                <div className="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isInstructorSupervisingStudent
                    ? 'Supervisión Aprendiz'
                    : 'Panel de Nómina (Ficha)'}
                </div>
              </>
            )}

            {role === 'ESTUDIANTE' && (
              <div className="pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mi Panel de Práctica
              </div>
            )}

            {PAYROLL_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'vacaciones' && pendingVacationsCount > 0 && (
                    <span className="font-mono text-xs tabular-nums text-amber-700 font-semibold">
                      {pendingVacationsCount}
                    </span>
                  )}
                  {item.id === 'eventualidades' && activeEventualitiesCount > 0 && (
                    <span className="font-mono text-xs tabular-nums text-teal-700 font-semibold">
                      {activeEventualitiesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {db.company.name}
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              {role === 'ESTUDIANTE' && platform.fichas[0]
                ? `Ficha ${platform.fichas[0].code} · ${platform.fichas[0].name}`
                : `${db.employees.length} trabajadores en panel`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {!isInstructorSupervisingStudent && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Empresa</span>
              </button>
            )}

            {role === 'ADMINISTRADOR' ? (
              <button
                type="button"
                onClick={() =>
                  mutate(
                    '/api/demo/reset',
                    'POST',
                    undefined,
                    'Plataforma SENA restaurada a estado inicial',
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                title="Restaurar plataforma inicial SENA"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            ) : !isInstructorSupervisingStudent && selectedWorkspaceId ? (
              <button
                type="button"
                onClick={() =>
                  mutate(
                    `/api/sena/workspaces/${encodeURIComponent(selectedWorkspaceId)}/reset-blank`,
                    'POST',
                    undefined,
                    'Panel limpiado a estado en blanco',
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                title="Vaciar este panel para iniciar una nueva práctica desde cero"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 border border-slate-200 rounded-md cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 truncate">
              <span className="hidden sm:inline truncate">{roleSubtitle}</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {activeTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {role === 'INSTRUCTOR' &&
              isViewingPayrollWorkspace &&
              !isInstructorSupervisingStudent &&
              platform.fichas.length > 0 && (
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="hidden md:block px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 max-w-56"
                  aria-label="Ficha activa"
                >
                  {platform.fichas.map((f) => (
                    <option key={f.id} value={`ficha:${f.id}`}>
                      Ficha {f.code} · {f.name}
                    </option>
                  ))}
                </select>
              )}

            {isViewingPayrollWorkspace && activePeriod && (
              <select
                value={activePeriod.periodKey}
                onChange={(e) => setSelectedPeriodKey(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 whitespace-nowrap"
                aria-label="Período de nómina"
              >
                {db.periods.map((p) => (
                  <option key={p.periodKey} value={p.periodKey}>
                    {p.label} ({p.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* Supervision Banner when Instructor inspects a Student's panel */}
        {isInstructorSupervisingStudent && supervisedStudent && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Supervisando práctica de{' '}
                <strong className="font-semibold">{supervisedStudent.fullName}</strong>{' '}
                ({db.employees.length} trabajadores ·{' '}
                {db.periods.reduce((s, p) => s + p.payslips.length, 0)} recibos) ·{' '}
                <span className="font-mono">Solo lectura</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const ownFicha = platform.fichas.find(
                  (f) => f.id === supervisedStudent.fichaId,
                );
                if (ownFicha) setSelectedWorkspaceId(`ficha:${ownFicha.id}`);
                setActiveTab('instructor-fichas');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded hover:bg-amber-100 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Mis Fichas</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {activeTab === 'admin-sena' && role === 'ADMINISTRADOR' && (
            <AdminSenaView
              stats={platform.globalStats}
              instructors={platform.instructors}
              fichas={platform.fichas}
              students={platform.students}
              workspaceSummaries={platform.workspaceSummaries}
              onCreateInstructor={(payload: Omit<SenaInstructor, 'id' | 'createdAt'>) =>
                mutate(
                  '/api/sena/instructors',
                  'POST',
                  payload,
                  'Instructor registrado en el centro SENA',
                )
              }
              onUpdateInstructor={(id, patch) =>
                mutate(
                  `/api/sena/instructors/${id}`,
                  'PUT',
                  patch,
                  'Datos del instructor actualizados',
                )
              }
              onDeleteInstructor={(id) =>
                mutate(
                  `/api/sena/instructors/${id}`,
                  'DELETE',
                  undefined,
                  'Instructor eliminado',
                )
              }
              onCreateFicha={(payload) =>
                mutate(
                  '/api/sena/fichas',
                  'POST',
                  payload,
                  'Grupo / ficha creada con su panel de nómina',
                )
              }
              onUpdateFicha={(id, patch: Partial<SenaFicha>) =>
                mutate(
                  `/api/sena/fichas/${id}`,
                  'PUT',
                  patch,
                  'Grupo / ficha actualizada',
                )
              }
              onDeleteFicha={(id) =>
                mutate(
                  `/api/sena/fichas/${id}`,
                  'DELETE',
                  undefined,
                  'Grupo / ficha eliminada',
                )
              }
              onCreateStudent={(payload) =>
                mutate(
                  '/api/sena/students',
                  'POST',
                  payload,
                  'Estudiante creado con su panel en blanco',
                )
              }
              onUpdateStudent={(id, patch: Partial<SenaStudent>) =>
                mutate(
                  `/api/sena/students/${id}`,
                  'PUT',
                  patch,
                  'Estudiante actualizado',
                )
              }
              onDeleteStudent={(id) =>
                mutate(
                  `/api/sena/students/${id}`,
                  'DELETE',
                  undefined,
                  'Estudiante eliminado',
                )
              }
              onInspectWorkspace={(workspaceId) => {
                setSelectedWorkspaceId(workspaceId);
                setActiveTab('pagas');
              }}
            />
          )}

          {activeTab === 'instructor-fichas' && role === 'INSTRUCTOR' && (
            <InstructorPanelView
              instructor={activeInstructor}
              fichas={platform.fichas}
              students={platform.students}
              selectedFichaId={selectedFichaId}
              workspaceSummaries={platform.workspaceSummaries}
              onSelectFicha={(fichaId) =>
                setSelectedWorkspaceId(`ficha:${fichaId}`)
              }
              onOpenFichaPayrollPanel={(fichaId) => {
                setSelectedWorkspaceId(`ficha:${fichaId}`);
                setActiveTab('pagas');
              }}
              onInspectStudentWorkspace={(studentId) => {
                setSelectedWorkspaceId(`student:${studentId}`);
                setActiveTab('pagas');
              }}
              onCreateFicha={(payload) =>
                mutate(
                  '/api/sena/fichas',
                  'POST',
                  payload,
                  'Nueva ficha / clase creada con su panel de nómina',
                )
              }
              onUpdateFicha={(id, patch) =>
                mutate(
                  `/api/sena/fichas/${id}`,
                  'PUT',
                  patch,
                  'Ficha actualizada',
                )
              }
              onDeleteFicha={(id) =>
                mutate(
                  `/api/sena/fichas/${id}`,
                  'DELETE',
                  undefined,
                  'Ficha eliminada',
                )
              }
              onCreateStudent={(payload) =>
                mutate(
                  '/api/sena/students',
                  'POST',
                  payload,
                  'Estudiante agregado con su panel en blanco',
                )
              }
              onUpdateStudent={(id, patch) =>
                mutate(
                  `/api/sena/students/${id}`,
                  'PUT',
                  patch,
                  'Estudiante actualizado',
                )
              }
              onDeleteStudent={(id) =>
                mutate(
                  `/api/sena/students/${id}`,
                  'DELETE',
                  undefined,
                  'Estudiante eliminado',
                )
              }
            />
          )}

          {isViewingPayrollWorkspace && (
            <>
              {activeTab === 'pagas' && (
                <PayrollView
                  db={db}
                  period={activePeriod}
                  onSelectPeriod={setSelectedPeriodKey}
                  onCreatePeriod={(periodKey, frequency: PayrollFrequency) =>
                    mutate(
                      '/api/payroll/periods',
                      'POST',
                      { periodKey, frequency },
                      'Nuevo período creado',
                    )
                  }
                  onChangeFrequency={(periodKey, frequency: PayrollFrequency) =>
                    mutate(
                      `/api/payroll/${periodKey}/frequency`,
                      'PATCH',
                      { frequency },
                      `Periodicidad cambiada a ${frequency}`,
                    )
                  }
                  onSaveAdjustment={(periodKey, employeeId, adjustment: PeriodAdjustment) =>
                    mutate(
                      `/api/payroll/${periodKey}/adjustment`,
                      'PATCH',
                      { employeeId, adjustment },
                      'Novedades y horas extras recalculadas',
                    )
                  }
                  onProcessPeriod={(periodKey, markPaid) =>
                    mutate(
                      `/api/payroll/${periodKey}/process`,
                      'POST',
                      { markPaid },
                      markPaid
                        ? 'Nómina liquidada y desprendibles pagados'
                        : 'Desprendibles generados automáticamente',
                    )
                  }
                  onPreviewPayslip={setPreviewPayslip}
                />
              )}

              {activeTab === 'desprendibles' && (
                <PayslipsArchiveView
                  db={db}
                  period={activePeriod}
                  onPreviewPayslip={setPreviewPayslip}
                  onMarkPayslipPaid={(periodKey, payslipId) =>
                    mutate(
                      `/api/payroll/${periodKey}/payslips/${payslipId}/pay`,
                      'PATCH',
                      undefined,
                      'Desprendible marcado como pagado',
                    ).catch(() => {})
                  }
                />
              )}

              {activeTab === 'prestaciones' && (
                <SocialBenefitsView
                  employees={db.employees}
                  benefits={db.benefits}
                  legislation={activeLegislation}
                  company={db.company}
                  onCreateBenefit={(b: Omit<BenefitPlan, 'id'>) =>
                    mutate('/api/benefits', 'POST', b, 'Beneficio creado')
                  }
                  onUpdateBenefit={(id, patch) =>
                    mutate(`/api/benefits/${id}`, 'PUT', patch, 'Beneficio actualizado')
                  }
                  onUpdateEmployeeBenefits={(empId, benefitIds) =>
                    mutate(
                      `/api/employees/${empId}`,
                      'PUT',
                      { benefitIds },
                      'Asignación de beneficios actualizada',
                    ).catch(() => {})
                  }
                />
              )}

              {activeTab === 'vacaciones' && (
                <VacationsView
                  employees={db.employees}
                  vacations={db.vacations}
                  legislation={activeLegislation}
                  company={db.company}
                  onCreateVacation={(req: {
                    employeeId: string;
                    startDate: string;
                    endDate: string;
                    type: VacationType;
                    status: VacationStatus;
                    compensatedDays?: number;
                    notes: string;
                  }) =>
                    mutate('/api/vacations', 'POST', req, 'Solicitud registrada')
                  }
                  onUpdateVacationStatus={(id, status: VacationStatus) =>
                    mutate(
                      `/api/vacations/${id}`,
                      'PATCH',
                      { status },
                      `Solicitud ${status.toLowerCase()}`,
                    ).catch(() => {})
                  }
                />
              )}

              {activeTab === 'eventualidades' && (
                <EventualitiesView
                  employees={db.employees}
                  eventualities={db.eventualities ?? []}
                  initialDateForModal={calendarEventualityDate}
                  onClearInitialDate={() => setCalendarEventualityDate(null)}
                  onCreateEventuality={(payload: {
                    employeeId: string;
                    type: EventualityType;
                    startDate: string;
                    endDate: string;
                    payrollImpact: EventualityImpact;
                    amount: number;
                    status: EventualityStatus;
                    description: string;
                  }) =>
                    mutate(
                      '/api/eventualities',
                      'POST',
                      payload,
                      'Eventualidad registrada y sincronizada con nómina',
                    )
                  }
                  onUpdateStatus={(id, status: EventualityStatus) =>
                    mutate(
                      `/api/eventualities/${id}`,
                      'PATCH',
                      { status },
                      `Eventualidad marcada como ${status}`,
                    ).catch(() => {})
                  }
                  onDeleteEventuality={(id) =>
                    mutate(
                      `/api/eventualities/${id}`,
                      'DELETE',
                      undefined,
                      'Eventualidad eliminada',
                    ).catch(() => {})
                  }
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarView
                  db={db}
                  onQuickAddEventuality={
                    isInstructorSupervisingStudent
                      ? undefined
                      : (dateStr) => {
                          setCalendarEventualityDate(dateStr);
                          setActiveTab('eventualidades');
                        }
                  }
                />
              )}

              {activeTab === 'despidos' && (
                <SeveranceView
                  employees={db.employees}
                  severances={db.severances}
                  legislation={activeLegislation}
                  company={db.company}
                  onCreateSeverance={(payload: {
                    employeeId: string;
                    terminationDate: string;
                    cause: TerminationCause;
                    pendingSalaryDays: number;
                    markRetired: boolean;
                  }) =>
                    mutate(
                      '/api/severances',
                      'POST',
                      payload,
                      'Liquidación definitiva calculada y guardada',
                    )
                  }
                />
              )}

              {activeTab === 'electronica' && (
                <ElectronicPayrollView
                  docs={db.electronicDocs}
                  period={activePeriod}
                  onEmitDoc={(docId, simulateReject) =>
                    mutate(
                      `/api/electronic-payroll/${docId}/emit`,
                      'POST',
                      { simulateReject },
                      simulateReject
                        ? 'Rechazo DIAN simulado (listo para reintento)'
                        : 'Documento XML aprobado por DIAN',
                    ).catch(() => {})
                  }
                  onEmitAllPeriod={(periodKey) =>
                    mutate(
                      `/api/electronic-payroll/period/${periodKey}/emit-all`,
                      'POST',
                      undefined,
                      'Lote de Nómina Electrónica transmitido a DIAN',
                    )
                  }
                />
              )}

              {activeTab === 'legislacion' && (
                <LegislationView
                  legislationList={db.legislation}
                  onSaveLegislation={(year, patch: Partial<LegislationParams>) =>
                    mutate(
                      `/api/legislation/${year}`,
                      'PUT',
                      patch,
                      `Parámetros legales ${year} actualizados en toda la nómina`,
                    )
                  }
                />
              )}

              {activeTab === 'empleados' && (
                <EmployeesView
                  employees={db.employees}
                  benefits={db.benefits}
                  legislation={activeLegislation}
                  onCreateEmployee={(emp: Omit<Employee, 'id'>) =>
                    mutate('/api/employees', 'POST', emp, 'Trabajador registrado')
                  }
                  onUpdateEmployee={(id, patch) =>
                    mutate(`/api/employees/${id}`, 'PUT', patch, 'Trabajador actualizado')
                  }
                  onDeleteEmployee={(id) =>
                    mutate(`/api/employees/${id}`, 'DELETE', undefined, 'Trabajador eliminado').catch(
                      () => {},
                    )
                  }
                />
              )}

              {activeTab === 'reportes' && (
                <ReportsView
                  db={db}
                  period={activePeriod}
                  legislation={activeLegislation}
                  onOpenGoogleDrive={() => setActiveTab('drive')}
                />
              )}

              {activeTab === 'drive' && (
                <GoogleWorkspaceView
                  db={db}
                  period={activePeriod}
                  legislation={activeLegislation}
                  onNotify={showToast}
                />
              )}

              {activeTab === 'auditoria' && (
                <AuditLogsView logs={db.auditLogs} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Preview Modal */}
      <PayslipPreviewModal
        payslip={previewPayslip}
        company={db.company}
        onClose={() => setPreviewPayslip(null)}
        onMarkPaid={
          !isInstructorSupervisingStudent
            ? (slip) =>
                mutate(
                  `/api/payroll/${slip.periodKey}/payslips/${slip.id}/pay`,
                  'PATCH',
                  undefined,
                  'Pago confirmado en desprendible',
                ).catch(() => {})
            : undefined
        }
      />

      <CompanySettingsModal
        open={settingsOpen}
        company={db.company}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch: Partial<CompanyConfig>) =>
          mutate('/api/company', 'PUT', patch, 'Datos del espacio guardados')
        }
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md shadow-lg border border-slate-700"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
