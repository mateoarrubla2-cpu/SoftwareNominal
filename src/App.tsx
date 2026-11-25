import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  Gift,
  GraduationCap,
  HardDrive,
  Layers,
  Receipt,
  RotateCcw,
  Scale,
  Settings,
  ShieldAlert,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  Empleado,
  FichaSENA,
  EstudianteSENA,
  InstructorSENA,
  PeriodoNomina,
  PlanBeneficio,
  ReciboNomina,
  SolicitudVacacion,
  Eventualidad,
  LiquidacionDespido,
  EspacioTrabajo,
  Empresa,
  ParametroLegislativo,
  EntradaAuditoria,
  Rol,
} from './types/payroll';
import { api } from './lib/api';

type AppTab =
  | 'dashboard'
  | 'empresa'
  | 'legislacion'
  | 'instructores'
  | 'fichas'
  | 'estudiantes'
  | 'espacios'
  | 'empleados'
  | 'beneficios'
  | 'periodos'
  | 'recibos'
  | 'vacaciones'
  | 'eventualidades'
  | 'liquidaciones'
  | 'auditorias';

const ROLE_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  INSTRUCTOR: 'Instructor',
  ESTUDIANTE: 'Estudiante',
};

const NAV_ITEMS: { id: AppTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Panel', icon: Building2 },
  { id: 'empresa', label: 'Empresa', icon: Settings },
  { id: 'legislacion', label: 'Legislación', icon: Scale },
  { id: 'instructores', label: 'Instructores', icon: GraduationCap },
  { id: 'fichas', label: 'Fichas', icon: Layers },
  { id: 'estudiantes', label: 'Estudiantes', icon: Users },
  { id: 'espacios', label: 'Espacios', icon: HardDrive },
  { id: 'empleados', label: 'Empleados', icon: Users },
  { id: 'beneficios', label: 'Beneficios', icon: Gift },
  { id: 'periodos', label: 'Períodos', icon: CalendarRange },
  { id: 'recibos', label: 'Recibos', icon: FileCheck2 },
  { id: 'vacaciones', label: 'Vacaciones', icon: CalendarDays },
  { id: 'eventualidades', label: 'Eventualidades', icon: ClipboardList },
  { id: 'liquidaciones', label: 'Liquidaciones', icon: UserMinus },
  { id: 'auditorias', label: 'Auditoría', icon: ShieldAlert },
];

export default function App() {
  const [rol, setRol] = useState<Rol>('ADMINISTRADOR');
  const [tab, setTab] = useState<AppTab>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [legislaciones, setLegislaciones] = useState<ParametroLegislativo[]>([]);
  const [instructores, setInstructores] = useState<InstructorSENA[]>([]);
  const [fichas, setFichas] = useState<FichaSENA[]>([]);
  const [estudiantes, setEstudiantes] = useState<EstudianteSENA[]>([]);
  const [espacios, setEspacios] = useState<EspacioTrabajo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [beneficios, setBeneficios] = useState<PlanBeneficio[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([]);
  const [recibos, setRecibos] = useState<ReciboNomina[]>([]);
  const [vacaciones, setVacaciones] = useState<SolicitudVacacion[]>([]);
  const [eventualidades, setEventualidades] = useState<Eventualidad[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionDespido[]>([]);
  const [auditorias, setAuditorias] = useState<EntradaAuditoria[]>([]);

  const espacioSeleccionado = useRef<string>('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [
        e, l, i, f, es, sp, emp, b, p, r, v, ev, li, a,
      ] = await Promise.allSettled([
        api.empresas.list(),
        api.legislacion.list(),
        api.instructores.list(),
        api.fichas.list(),
        api.estudiantes.list(),
        api.espaciosTrabajo.list(),
        api.empleados.list(),
        api.beneficios.list(),
        api.periodos.list(),
        api.recibos.list(),
        api.vacaciones.list(),
        api.eventualidades.list(),
        api.liquidaciones.list(),
        api.auditorias.list(),
      ]);

      if (e.status === 'fulfilled') setEmpresas(e.value.results ?? []);
      if (l.status === 'fulfilled') setLegislaciones(l.value.results ?? []);
      if (i.status === 'fulfilled') setInstructores(i.value.results ?? []);
      if (f.status === 'fulfilled') setFichas(f.value.results ?? []);
      if (es.status === 'fulfilled') setEstudiantes(es.value.results ?? []);
      if (sp.status === 'fulfilled') setEspacios(sp.value.results ?? []);
      if (emp.status === 'fulfilled') setEmpleados(emp.value.results ?? []);
      if (b.status === 'fulfilled') setBeneficios(b.value.results ?? []);
      if (p.status === 'fulfilled') setPeriodos(p.value.results ?? []);
      if (r.status === 'fulfilled') setRecibos(r.value.results ?? []);
      if (v.status === 'fulfilled') setVacaciones(v.value.results ?? []);
      if (ev.status === 'fulfilled') setEventualidades(ev.value.results ?? []);
      if (li.status === 'fulfilled') setLiquidaciones(li.value.results ?? []);
      if (a.status === 'fulfilled') setAuditorias(a.value.results ?? []);

      if (espacios.length > 0 && !espacioSeleccionado.current) {
        espacioSeleccionado.current = espacios[0].id;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const espacioActivo = useMemo(
    () => espacios.find((e) => e.id === espacioSeleccionado.current),
    [espacios, espacioSeleccionado.current]
  );

  const empleadosDelEspacio = useMemo(
    () => empleados.filter((e) => e.espacio_trabajo === espacioSeleccionado.current),
    [empleados, espacioSeleccionado.current]
  );

  const recibosDelEspacio = useMemo(
    () =>
      recibos.filter((r) => {
        const emp = empleados.find((e) => e.id === r.empleado);
        return emp && emp.espacio_trabajo === espacioSeleccionado.current;
      }),
    [recibos, empleados, espacioSeleccionado.current]
  );

  function handleRoleChange(next: Rol) {
    setRol(next);
    setTab('dashboard');
  }

  function handleTabChange(next: AppTab) {
    setTab(next);
  }

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600 font-medium">
          Cargando datos de INAMOC Nómina...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">Error</h1>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col lg:static lg:translate-x-0">
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-teal-700 text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-display text-sm font-bold tracking-tight text-slate-900 block truncate">
                  INAMOC Nómina
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  SENA - Gestión Humana
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <p className="text-xs font-medium text-slate-500 px-1">Rol (RBAC)</p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-md">
              {(['ADMINISTRADOR', 'INSTRUCTOR', 'ESTUDIANTE'] as Rol[]).map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      rol === r
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                )
              )}
            </div>
          </div>

          <nav className="p-3 space-y-0.5" aria-label="Navegación">
            {NAV_ITEMS.map((item) => {
              const isActive = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {espacioActivo && (
            <div className="p-4 border-t border-slate-200 space-y-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  Espacio: {espacioActivo.id}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {empleadosDelEspacio.length} empleados
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 truncate">
            <span className="font-medium text-slate-900 truncate">{ROLE_LABELS[rol]}</span>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
            <span className="font-medium text-slate-900 truncate">
              {NAV_ITEMS.find((i) => i.id === tab)?.label ?? 'Panel'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={espacioSeleccionado.current}
              onChange={(e) => (espacioSeleccionado.current = e.target.value as string)}
              className="hidden md:block px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 max-w-56"
              aria-label="Espacio de trabajo"
            >
              {espacios.map((e) => (
                <option key={e.id} value={e.id}>
                  Espacio {e.id}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">
              {NAV_ITEMS.find((i) => i.id === tab)?.label ?? 'Panel'}
            </h1>
            <button
              type="button"
              onClick={() => {
                loadData();
                showToast('Datos actualizados');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          {tab === 'dashboard' && (
            <DashboardView
              empresas={empresas}
              instructores={instructores}
              fichas={fichas}
              estudiantes={estudiantes}
              empleados={empleadosDelEspacio}
              beneficios={beneficios}
              periodos={periodos}
              recibos={recibosDelEspacio}
              vacaciones={vacaciones}
              eventualidades={eventualidades}
              liquidaciones={liquidaciones}
              formatCOP={formatCOP}
            />
          )}

          {tab === 'empresa' && (
            <EmpresaView
              empresas={empresas}
              onRefresh={loadData}
            />
          )}

          {tab === 'legislacion' && (
            <LegislacionView
              legislaciones={legislaciones}
              onRefresh={loadData}
            />
          )}

          {tab === 'instructores' && (
            <CatalogoView
              title="Instructores SENA"
              items={instructores.map((i) => ({
                id: i.id,
                nombre: i.nombre_completo,
                documento: i.documento_identidad,
                correo: i.correo,
                activo: i.activo,
              }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'fichas' && (
            <CatalogoView
              title="Fichas / Grupos"
              items={fichas.map((f) => ({
                id: f.id,
                nombre: `${f.codigo} · ${f.nombre}`,
                documento: f.programa,
                correo: f.horario,
                activo: true,
              }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'estudiantes' && (
            <CatalogoView
              title="Estudiantes SENA"
              items={estudiantes.map((e) => ({
                id: e.id,
                nombre: e.nombre_completo,
                documento: e.documento_identidad,
                correo: e.correo,
                activo: e.activo,
              }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'empleados' && (
            <EmpleadosView
              empleados={empleadosDelEspacio}
              onRefresh={loadData}
              formatCOP={formatCOP}
            />
          )}

          {tab === 'beneficios' && (
            <CatalogoView
              title="Planes de Beneficio"
              items={beneficios.map((b) => ({
                id: b.id,
                nombre: b.nombre,
                documento: b.categoria,
                correo: formatCOP(b.monto_mensual),
                activo: b.activo,
              }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'periodos' && (
            <CatalogoView
              title="Períodos de Nómina"
              items={periodos
                .filter((p) => p.espacio_trabajo === espacioSeleccionado.current)
                .map((p) => ({
                  id: String(p.id),
                  nombre: p.clave_periodo,
                  documento: p.etiqueta,
                  correo: p.estado,
                  activo: p.estado !== 'Pagada',
                }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'recibos' && (
            <RecibosView
              recibos={recibosDelEspacio}
              onRefresh={loadData}
              formatCOP={formatCOP}
            />
          )}

          {tab === 'vacaciones' && (
            <CatalogoView
              title="Solicitudes de Vacaciones"
              items={vacaciones
                .filter((v) => {
                  const emp = empleados.find((e) => e.id === v.empleado);
                  return emp && emp.espacio_trabajo === espacioSeleccionado.current;
                })
                .map((v) => ({
                  id: v.id,
                  nombre: v.empleado,
                  documento: v.tipo,
                  correo: v.estado,
                  activo: v.estado === 'Pendiente',
                }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'eventualidades' && (
            <CatalogoView
              title="Eventualidades"
              items={eventualidades
                .filter((ev) => {
                  const emp = empleados.find((e) => e.id === ev.empleado);
                  return emp && emp.espacio_trabajo === espacioSeleccionado.current;
                })
                .map((ev) => ({
                  id: ev.id,
                  nombre: ev.empleado,
                  documento: ev.tipo,
                  correo: formatCOP(ev.monto),
                  activo: ev.estado === 'Activa',
                }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'liquidaciones' && (
            <CatalogoView
              title="Liquidaciones por Despido"
              items={liquidaciones
                .filter((l) => {
                  const emp = empleados.find((e) => e.id === l.empleado);
                  return emp && emp.espacio_trabajo === espacioSeleccionado.current;
                })
                .map((l) => ({
                  id: l.id,
                  nombre: l.nombre_empleado,
                  documento: l.causa,
                  correo: formatCOP(l.total_liquidacion),
                  activo: true,
                }))}
              onRefresh={loadData}
            />
          )}

          {tab === 'auditorias' && (
            <CatalogoView
              title="Bitácora de Auditoría"
              items={auditorias
                .filter((a) => a.espacio_trabajo === espacioSeleccionado.current)
                .map((a) => ({
                  id: a.id,
                  nombre: a.usuario,
                  documento: a.accion,
                  correo: a.entidad_afectada,
                  activo: true,
                }))}
              onRefresh={loadData}
            />
          )}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md shadow-lg border border-slate-700"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function DashboardView(props: {
  empresas: Empresa[];
  instructores: InstructorSENA[];
  fichas: FichaSENA[];
  estudiantes: EstudianteSENA[];
  empleados: Empleado[];
  beneficios: PlanBeneficio[];
  periodos: PeriodoNomina[];
  recibos: ReciboNomina[];
  vacaciones: SolicitudVacacion[];
  eventualidades: Eventualidad[];
  liquidaciones: LiquidacionDespido[];
  formatCOP: (amount: number) => string;
}) {
  const {
    empresas,
    instructores,
    fichas,
    estudiantes,
    empleados,
    beneficios,
    periodos,
    recibos,
    vacaciones,
    eventualidades,
    liquidaciones,
    formatCOP,
  } = props;

  const totalPagoNeto = recibos.reduce((s, r) => s + r.pago_neto, 0);
  const totalPagoBruto = recibos.reduce((s, r) => s + r.pago_bruto, 0);
  const pendientes = recibos.filter((r) => r.estado_pago === 'Pendiente').length;
  const pagados = recibos.filter((r) => r.estado_pago === 'Pagado').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Empresas"
          value={empresas.length}
          icon={Building2}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Empleados"
          value={empleados.length}
          icon={Users}
          color="bg-teal-50 text-teal-700"
        />
        <StatCard
          title="Recibos Pendientes"
          value={pendientes}
          icon={FileCheck2}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Total Pagado Neto"
          value={formatCOP(totalPagoNeto)}
          icon={Receipt}
          color="bg-green-50 text-green-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Resumen General</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Instructores</span>
              <span className="font-medium">{instructores.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fichas</span>
              <span className="font-medium">{fichas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estudiantes</span>
              <span className="font-medium">{estudiantes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Períodos</span>
              <span className="font-medium">{periodos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Beneficios</span>
              <span className="font-medium">{beneficios.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Estado de Pagos</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Pagados</span>
              <span className="font-medium text-green-600">{pagados}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pendientes</span>
              <span className="font-medium text-amber-600">{pendientes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pago Bruto Total</span>
              <span className="font-medium">{formatCOP(totalPagoBruto)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Solicitudes Recientes</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Vacaciones</span>
              <span className="font-medium">{vacaciones.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Eventualidades</span>
              <span className="font-medium">{eventualidades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Liquidaciones</span>
              <span className="font-medium">{liquidaciones.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  const { title, value, icon: Icon, color } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EmpresaView(props: {
  empresas: Empresa[];
  onRefresh: () => void;
}) {
  const { empresas, onRefresh } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Empresas</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Nombre</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">NIT</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Ciudad</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Año Activo</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Frecuencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empresas.map((emp) => (
              <tr key={emp.id}>
                <td className="py-3 text-slate-900 font-medium">{emp.nombre}</td>
                <td className="py-3 text-slate-500">{emp.nit}</td>
                <td className="py-3 text-slate-500">{emp.ciudad}</td>
                <td className="py-3 text-slate-500">{emp.ano_activo}</td>
                <td className="py-3 text-slate-500">{emp.frecuencia_predeterminada}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No hay empresas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegislacionView(props: {
  legislaciones: ParametroLegislativo[];
  onRefresh: () => void;
}) {
  const { legislaciones, onRefresh } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Parámetros Legislativos</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Año</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">SMMLV</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Aux. Transporte</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">UVT</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Salud Emp. %</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Pensión Emp. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {legislaciones.map((l) => (
              <tr key={l.id}>
                <td className="py-3 text-slate-900 font-medium">{l.ano}</td>
                <td className="py-3 text-slate-500">{l.smmlv}</td>
                <td className="py-3 text-slate-500">{l.auxilio_transporte}</td>
                <td className="py-3 text-slate-500">{l.uvt}</td>
                <td className="py-3 text-slate-500">{l.salud_empleado_pct}%</td>
                <td className="py-3 text-slate-500">{l.pension_empleado_pct}%</td>
              </tr>
            ))}
            {legislaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No hay parámetros legislativos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmpleadosView(props: {
  empleados: Empleado[];
  onRefresh: () => void;
  formatCOP: (amount: number) => string;
}) {
  const { empleados, onRefresh, formatCOP } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Empleados</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">ID</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Nombre</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Documento</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Cargo</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Salario Base</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empleados.map((e) => (
              <tr key={e.id}>
                <td className="py-3 text-slate-500 font-mono">{e.id}</td>
                <td className="py-3 text-slate-900 font-medium">{e.nombre_completo}</td>
                <td className="py-3 text-slate-500">{e.documento_identidad}</td>
                <td className="py-3 text-slate-500">{e.cargo}</td>
                <td className="py-3 text-slate-500">{formatCOP(e.salario_base)}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    e.estado === 'Activo'
                      ? 'bg-green-100 text-green-700'
                      : e.estado === 'Vacaciones'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {e.estado}
                  </span>
                </td>
              </tr>
            ))}
            {empleados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No hay empleados registrados en este espacio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecibosView(props: {
  recibos: ReciboNomina[];
  onRefresh: () => void;
  formatCOP: (amount: number) => string;
}) {
  const { recibos, onRefresh, formatCOP } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Recibos de Nómina</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Número Recibo</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Empleado</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Período</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Pago Bruto</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Pago Neto</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recibos.map((r) => (
              <tr key={r.id}>
                <td className="py-3 text-slate-500 font-mono">{r.numero_recibo}</td>
                <td className="py-3 text-slate-900 font-medium">{r.nombre_empleado}</td>
                <td className="py-3 text-slate-500">{r.etiqueta_periodo}</td>
                <td className="py-3 text-slate-500">{formatCOP(r.pago_bruto)}</td>
                <td className="py-3 text-slate-500">{formatCOP(r.pago_neto)}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.estado_pago === 'Pagado'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.estado_pago}
                  </span>
                </td>
              </tr>
            ))}
            {recibos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No hay recibos de nómina registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogoView(props: {
  title: string;
  items: Array<{
    id: string;
    nombre: string;
    documento: string;
    correo: string;
    activo: boolean;
  }>;
  onRefresh: () => void;
}) {
  const { title, items, onRefresh } = props;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{title}</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          Actualizar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">ID</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Nombre</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Detalle 1</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Detalle 2</th>
              <th className="pb-3 text-slate-500 font-medium uppercase text-xs">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-slate-500 font-mono">{item.id}</td>
                <td className="py-3 text-slate-900 font-medium">{item.nombre}</td>
                <td className="py-3 text-slate-500">{item.documento}</td>
                <td className="py-3 text-slate-500">{item.correo}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
