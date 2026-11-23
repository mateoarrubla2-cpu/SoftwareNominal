import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileBarChart2,
  FileCheck2,
  FileCode2,
  Gift,
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
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { CompanySettingsModal } from './components/CompanySettingsModal.tsx';
import { ElectronicPayrollView } from './components/ElectronicPayrollView.tsx';
import { EmployeesView } from './components/EmployeesView.tsx';
import { EventualitiesView } from './components/EventualitiesView.tsx';
import { LegislationView } from './components/LegislationView.tsx';
import { PayrollView } from './components/PayrollView.tsx';
import { PayslipPreviewModal } from './components/PayslipPreviewModal.tsx';
import { PayslipsArchiveView } from './components/PayslipsArchiveView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SeveranceView } from './components/SeveranceView.tsx';
import { SocialBenefitsView } from './components/SocialBenefitsView.tsx';
import { VacationsView } from './components/VacationsView.tsx';
import { WorkerPortalView } from './components/WorkerPortalView.tsx';
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
  TerminationCause,
  UserRole,
  VacationStatus,
  VacationType,
} from './types/payroll.ts';

type AdminTab =
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
  | 'auditoria';

const ADMIN_NAV: { id: AdminTab; label: string; icon: typeof Receipt }[] = [
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
  { id: 'auditoria', label: 'Bitácora de Auditoría', icon: ShieldAlert },
];

export default function App() {
  const [db, setDb] = useState<PayrollDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<UserRole>('ADMINISTRADOR');
  const [workerEmployeeId, setWorkerEmployeeId] = useState<string>('EMP-001');
  const [activeTab, setActiveTab] = useState<AdminTab>('pagas');
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
    }, 3200);
  }

  async function fetchState() {
    try {
      setError(null);
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('No se pudo cargar la plataforma INAMOD');
      const data = (await res.json()) as PayrollDatabase;
      setDb(data);
      if (
        data.periods.length > 0 &&
        !data.periods.some((p) => p.periodKey === selectedPeriodKey)
      ) {
        setSelectedPeriodKey(data.periods[0].periodKey);
      }
      if (
        data.employees.length > 0 &&
        !data.employees.some((e) => e.id === workerEmployeeId)
      ) {
        setWorkerEmployeeId(data.employees[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchState();
  }, []);

  async function mutate(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
    successToast?: string,
  ) {
    const activeWorker = db?.employees.find((e) => e.id === workerEmployeeId);
    const demoUser =
      role === 'ADMINISTRADOR'
        ? 'admin.rrhh@inamod.sena.edu.co'
        : activeWorker?.email ?? 'trabajador@inamod.sena.edu.co';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-demo-role': role,
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
    const updated = (await res.json()) as PayrollDatabase;
    setDb(updated);
    if (previewPayslip) {
      const p = updated.periods.find((per) => per.periodKey === previewPayslip.periodKey);
      const s = p?.payslips.find((sl) => sl.id === previewPayslip.id);
      if (s) setPreviewPayslip(s);
    }
    if (successToast) showToast(successToast);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">
          Cargando Sistema Integral de Nómina INAMOD · SENA...
        </div>
      </div>
    );
  }

  if (error || !db) {
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
              fetchState();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activePeriod =
    db.periods.find((p) => p.periodKey === selectedPeriodKey) ?? db.periods[0];
  const activeLegislation =
    db.legislation.find((l) => l.year === activePeriod.year) ?? db.legislation[0];
  const pendingVacationsCount = db.vacations.filter(
    (v) => v.status === 'Pendiente',
  ).length;
  const activeEventualitiesCount = (db.eventualities ?? []).filter(
    (e) => e.status !== 'Cerrada',
  ).length;
  const activeWorker =
    db.employees.find((e) => e.id === workerEmployeeId) ?? db.employees[0];
  const activeTabLabel =
    role === 'TRABAJADOR'
      ? 'Portal del Trabajador'
      : ADMIN_NAV.find((i) => i.id === activeTab)?.label ?? 'Pagas y Nómina';

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
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
                INAMOD Nómina
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* RBAC Role Switcher Demo */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <p className="text-xs font-medium text-slate-500 px-1">
              Simulador de Rol (RBAC)
            </p>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setRole('ADMINISTRADOR')}
                className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  role === 'ADMINISTRADOR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('TRABAJADOR')}
                className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  role === 'TRABAJADOR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trabajador
              </button>
            </div>

            {role === 'TRABAJADOR' && (
              <select
                value={workerEmployeeId}
                onChange={(e) => setWorkerEmployeeId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Seleccionar trabajador"
              >
                {db.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Navigation */}
          {role === 'ADMINISTRADOR' ? (
            <nav className="p-3 space-y-0.5" aria-label="Módulos del Administrador">
              {ADMIN_NAV.map((item) => {
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
          ) : (
            <div className="p-4 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-900">
                Accesos habilitados (Trabajador)
              </p>
              <ul className="space-y-1 text-slate-500">
                <li>· Mi perfil y contrato</li>
                <li>· Descarga de desprendibles PDF</li>
                <li>· Solicitud e historial de vacaciones</li>
                <li>· Mi calendario de pagos y eventualidades</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {db.company.name}
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              NIT {db.company.nit} · {db.company.city}
            </p>
          </div>

          {role === 'ADMINISTRADOR' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Sede</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  mutate(
                    '/api/demo/reset',
                    'POST',
                    undefined,
                    'Datos de demostración restaurados',
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                title="Restaurar datos iniciales de demostración"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          )}
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
              <span className="hidden sm:inline truncate">SENA Antioquia · INAMOD</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {activeTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {role === 'ADMINISTRADOR' && (
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

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {role === 'TRABAJADOR' ? (
            <WorkerPortalView
              db={db}
              employee={activeWorker}
              periods={db.periods}
              vacations={db.vacations}
              legislation={activeLegislation}
              company={db.company}
              onPreviewPayslip={setPreviewPayslip}
              onCreateVacation={(req) =>
                mutate(
                  '/api/vacations',
                  'POST',
                  req,
                  'Solicitud de vacaciones enviada a RR. HH.',
                )
              }
            />
          ) : (
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
                    )
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
                    )
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
                    )
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
                    )
                  }
                  onDeleteEventuality={(id) =>
                    mutate(
                      `/api/eventualities/${id}`,
                      'DELETE',
                      undefined,
                      'Eventualidad eliminada',
                    )
                  }
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarView
                  db={db}
                  onQuickAddEventuality={(dateStr) => {
                    setCalendarEventualityDate(dateStr);
                    setActiveTab('eventualidades');
                  }}
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
                    )
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
                    mutate(`/api/employees/${id}`, 'DELETE', undefined, 'Trabajador eliminado')
                  }
                />
              )}

              {activeTab === 'reportes' && (
                <ReportsView
                  db={db}
                  period={activePeriod}
                  legislation={activeLegislation}
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
          role === 'ADMINISTRADOR'
            ? (slip) =>
                mutate(
                  `/api/payroll/${slip.periodKey}/payslips/${slip.id}/pay`,
                  'PATCH',
                  undefined,
                  'Pago confirmado en desprendible',
                )
            : undefined
        }
      />

      <CompanySettingsModal
        open={settingsOpen}
        company={db.company}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch: Partial<CompanyConfig>) =>
          mutate('/api/company', 'PUT', patch, 'Datos institucionales guardados')
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
