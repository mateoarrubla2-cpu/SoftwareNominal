import * as React from 'react';
import { CatalogPage } from './CatalogPage';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, CalendarDays, X } from 'lucide-react';

export function BeneficiosPage() {
  return (
    <CatalogPage
      entityName="Beneficio"
      entityNamePlural="Beneficios"
      listFn={api.beneficios.list}
      createFn={api.beneficios.create}
      updateFn={(id, body) => api.beneficios.update(String(id), body)}
      deleteFn={(id) => api.beneficios.remove(String(id))}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'monto_mensual', label: 'Monto mensual', render: (item) => `$${Number(item.monto_mensual || 0).toLocaleString('es-CO')}` },
        { key: 'activo', label: 'Estado', render: (item) => <Badge variant={item.activo ? 'success' : 'slate'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge> },
      ]}
      createFields={[
        { label: 'Espacio de trabajo', key: 'espacio_trabajo', type: 'select', required: true, optionsSource: api.espaciosTrabajo.list, optionLabel: (item) => item.nombre || item.empresa_nombre || 'Espacio de trabajo' },
        { label: 'Nombre', key: 'nombre', required: true },
        { label: 'Categoría', key: 'categoria', type: 'select', required: true, options: [
          { label: 'Alimentación', value: 'Alimentación' }, { label: 'Salud', value: 'Salud' },
          { label: 'Movilidad', value: 'Movilidad' }, { label: 'Bienestar', value: 'Bienestar' },
          { label: 'Formación', value: 'Formación' },
        ] },
        { label: 'Monto mensual', key: 'monto_mensual', type: 'number', required: true },
        { label: 'Aplica factor salarial', key: 'factor_salarial', type: 'select', options: [{ label: 'Sí', value: 'true' }, { label: 'No', value: 'false' }] },
        { label: 'Descripción', key: 'descripcion' },
        { label: 'Activo', key: 'activo', type: 'select', required: true, options: [{ label: 'Sí', value: 'true' }, { label: 'No', value: 'false' }] },
      ]}
      itemToFormData={(item) => ({ espacio_trabajo: item.espacio_trabajo, nombre: item.nombre, categoria: item.categoria, monto_mensual: item.monto_mensual, factor_salarial: String(item.factor_salarial), descripcion: item.descripcion, activo: String(item.activo) })}
    />
  );
}

export function PeriodosPage() {
  return (
    <CatalogPage
      entityName="Período"
      entityNamePlural="Períodos"
      listFn={api.periodos.list}
      createFn={api.periodos.create}
      updateFn={(id, body) => api.periodos.update(Number(id), body)}
      deleteFn={(id) => api.periodos.remove(Number(id))}
      columns={[
        { key: 'clave_periodo', label: 'Periodo' }, { key: 'etiqueta', label: 'Descripción' },
        { key: 'ano', label: 'Año' }, { key: 'frecuencia', label: 'Frecuencia' },
        { key: 'estado', label: 'Estado', render: (item) => <Badge variant={item.estado === 'Pagada' ? 'success' : item.estado === 'Procesada' ? 'info' : 'warning'}>{item.estado}</Badge> },
      ]}
      createFields={[
        { label: 'Espacio de trabajo', key: 'espacio_trabajo', type: 'select', required: true, optionsSource: api.espaciosTrabajo.list, optionLabel: (item) => item.nombre || item.empresa_nombre || 'Espacio de trabajo' },
        { label: 'Clave periodo (AAAA-MM)', key: 'clave_periodo', required: true },
        { label: 'Descripción', key: 'etiqueta', required: true },
        { label: 'Año', key: 'ano', type: 'number', required: true },
        { label: 'Frecuencia', key: 'frecuencia', type: 'select', required: true, options: [{ label: 'Mensual', value: 'Mensual' }, { label: 'Quincenal', value: 'Quincenal' }] },
        { label: 'Estado', key: 'estado', type: 'select', required: true, options: [{ label: 'Borrador', value: 'Borrador' }, { label: 'Procesada', value: 'Procesada' }, { label: 'Pagada', value: 'Pagada' }] },
      ]}
      itemToFormData={(item) => ({ espacio_trabajo: item.espacio_trabajo, clave_periodo: item.clave_periodo, etiqueta: item.etiqueta, ano: item.ano, frecuencia: item.frecuencia, estado: item.estado })}
    />
  );
}

export function VacacionesPage() {
  return (
    <CatalogPage
      entityName="Solicitud de Vacación"
      entityNamePlural="Vacaciones"
      listFn={api.vacaciones.list}
      createFn={api.vacaciones.create}
      updateFn={(id, body) => api.vacaciones.update(String(id), body)}
      deleteFn={(id) => api.vacaciones.remove(String(id))}
      columns={[
        { key: 'empleado', label: 'Empleado', render: (item) => String(item.nombre_empleado || item.empleado_nombre || item.empleado || '—') }, { key: 'fecha_inicio', label: 'Desde' }, { key: 'fecha_fin', label: 'Hasta' },
        { key: 'dias_habiles', label: 'Días' }, { key: 'tipo', label: 'Tipo' },
        { key: 'estado', label: 'Estado', render: (item) => <Badge variant={item.estado === 'Aprobada' ? 'success' : item.estado === 'Rechazada' ? 'danger' : 'warning'}>{item.estado}</Badge> },
      ]}
      createFields={[
        { label: 'Espacio de trabajo', key: 'espacio_trabajo', type: 'select', required: true, optionsSource: api.espaciosTrabajo.list, optionLabel: (item) => item.nombre || item.empresa_nombre || 'Espacio de trabajo' },
        { label: 'Empleado', key: 'empleado', type: 'select', required: true, optionsSource: api.empleados.list, optionLabel: (item) => item.nombre_completo },
        { label: 'Fecha inicio', key: 'fecha_inicio', type: 'date', required: true },
        { label: 'Fecha fin', key: 'fecha_fin', type: 'date', required: true },
        { label: 'Días hábiles', key: 'dias_habiles', type: 'number', required: true },
        { label: 'Tipo', key: 'tipo', type: 'select', required: true, options: [{ label: 'Vacaciones Anuales', value: 'Vacaciones Anuales' }, { label: 'Compensación en Dinero', value: 'Compensación en Dinero' }, { label: 'Permiso Remunerado', value: 'Permiso Remunerado' }, { label: 'Incapacidad / Licencia', value: 'Incapacidad / Licencia' }] },
        { label: 'Estado', key: 'estado', type: 'select', required: true, options: [{ label: 'Pendiente', value: 'Pendiente' }, { label: 'Aprobada', value: 'Aprobada' }, { label: 'Rechazada', value: 'Rechazada' }] },
        { label: 'Monto compensado', key: 'monto_compensado', type: 'number' },
        { label: 'Notas', key: 'notas' },
      ]}
      itemToFormData={(item) => ({ espacio_trabajo: item.espacio_trabajo, empleado: item.empleado, fecha_inicio: item.fecha_inicio, fecha_fin: item.fecha_fin, dias_habiles: item.dias_habiles, tipo: item.tipo, estado: item.estado, monto_compensado: item.monto_compensado, notas: item.notas })}
    />
  );
}

export function EventualidadesPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [spaces, setSpaces] = React.useState<any[]>([]);
  const [month, setMonth] = React.useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [form, setForm] = React.useState<Record<string, any>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ev, emp, sp] = await Promise.all([api.eventualidades.list(), api.empleados.list(), api.espaciosTrabajo.list()]);
      setItems(ev.results || []); setEmployees(emp.results || []); setSpaces(sp.results || []);
    } catch (err: any) { setError(err.message || 'Error al cargar eventualidades'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const dateKey = (value: string) => value?.slice(0, 10) || '';
  const inRange = (item: any, date: string) => date >= dateKey(item.fecha_inicio) && date <= dateKey(item.fecha_fin);
  const dayItems = items.filter((item) => inRange(item, selectedDate));
  const monthName = month.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const openCreate = (date = selectedDate) => {
    setEditing(null);
    setForm({ fecha_inicio: date, fecha_fin: date, dias: 1, estado: 'Activa', impacto_nomina: 'Sin impacto salarial', monto: 0 });
    setError(''); setSuccess(''); setShowForm(true);
  };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ espacio_trabajo: item.espacio_trabajo, empleado: item.empleado, tipo: item.tipo, fecha_inicio: dateKey(item.fecha_inicio), fecha_fin: dateKey(item.fecha_fin), dias: item.dias, impacto_nomina: item.impacto_nomina, monto: item.monto, estado: item.estado, descripcion: item.descripcion });
    setError(''); setSuccess(''); setShowForm(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (editing) await api.eventualidades.update(editing.id, form);
      else await api.eventualidades.create(form);
      setSuccess(editing ? 'Eventualidad actualizada' : 'Eventualidad creada'); setShowForm(false); setEditing(null); await load();
    } catch (err: any) { setError(err.message || 'No se pudo guardar'); }
    finally { setLoading(false); }
  };
  const remove = async (item: any) => {
    if (!confirm('¿Eliminar esta eventualidad?')) return;
    try { await api.eventualidades.remove(item.id); setSuccess('Eventualidad eliminada'); await load(); }
    catch (err: any) { setError(err.message || 'No se pudo eliminar'); }
  };
  const employeeName = (id: string) => employees.find((e) => String(e.id) === String(id))?.nombre_completo || id;
  const statusVariant = (state: string) => state === 'Activa' ? 'warning' : state === 'Aplicada en Nómina' ? 'success' : 'slate';

  const setMonthOffset = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const selectDay = (day: number) => {
    const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(date);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Eventualidades</h1><p className="text-sm text-slate-500">Calendario de novedades laborales y nómina</p></div>
        <Button variant="primary" onClick={() => openCreate()}><Plus className="w-4 h-4" />Nueva eventualidad</Button>
      </div>
      {success && <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,.75fr)] gap-6">
        <Card hover={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button type="button" onClick={() => setMonthOffset(-1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes anterior">‹</button>
            <h2 className="font-semibold text-slate-900 capitalize">{monthName}</h2>
            <button type="button" onClick={() => setMonthOffset(1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente">›</button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((name) => <div key={name} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">{name}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`blank-${i}`} className="h-24 border-b border-r border-slate-100 bg-slate-50/40" />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayList = items.filter((item) => inRange(item, date));
              const isSelected = selectedDate === date;
              const isToday = new Date().toISOString().slice(0, 10) === date;
              return (
                <button type="button" key={day} onClick={() => selectDay(day)} onDoubleClick={() => openCreate(date)} className={`h-24 min-w-0 border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors ${isSelected ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500' : 'hover:bg-slate-50'}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}>{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayList.slice(0, 2).map((item) => <div key={item.id} className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${item.estado === 'Activa' ? 'bg-amber-100 text-amber-800' : item.estado === 'Aplicada en Nómina' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{item.tipo}</div>)}
                    {dayList.length > 2 && <div className="text-[10px] text-slate-500">+{dayList.length - 2} más</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card hover={false}>
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha seleccionada</p>
            <h2 className="mt-1 font-semibold text-slate-900">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">● Activa</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">● Aplicada</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">● Cerrada</span></div>
          </div>
          <div className="p-4 space-y-3">
            {dayItems.length === 0 ? <div className="py-8 text-center"><CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">Sin novedades en esta fecha</p><Button variant="ghost" size="sm" className="mt-2" onClick={() => openCreate(selectedDate)}><Plus className="w-3 h-3" />Agregar</Button></div> : dayItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3 hover:border-emerald-200 hover:bg-emerald-50/30">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.tipo}</p><p className="text-xs text-slate-500">{employeeName(item.empleado)}</p></div><Badge variant={statusVariant(item.estado)}>{item.estado}</Badge></div>
                <p className="mt-2 text-xs text-slate-500">{dateKey(item.fecha_inicio)} → {dateKey(item.fecha_fin)} · {item.dias} días</p>
                <div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" onClick={() => openEdit(item)}><Edit className="w-3 h-3" />Editar</Button><Button variant="danger" size="sm" onClick={() => remove(item)}><Trash2 className="w-3 h-3" />Eliminar</Button></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} /><div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl animate-slide-up"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Editar eventualidad' : 'Nueva eventualidad'}</h2><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
        <form onSubmit={save} className="p-6"><div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Espacio de trabajo</label><select required value={form.espacio_trabajo || ''} onChange={(e) => setForm({...form,espacio_trabajo:e.target.value})} className="input"><option value="">Seleccionar...</option>{spaces.map((s) => <option key={s.id} value={s.id}>{s.nombre || s.empresa_nombre || 'Espacio de trabajo'}</option>)}</select></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Empleado</label><select required value={form.empleado || ''} onChange={(e) => setForm({...form,empleado:e.target.value})} className="input"><option value="">Seleccionar...</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}</select></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Tipo</label><select required value={form.tipo || ''} onChange={(e) => setForm({...form,tipo:e.target.value})} className="input"><option value="">Seleccionar...</option>{['Incapacidad Médica (EPS/ARL)','Licencia Maternidad / Paternidad','Calamidad Doméstica','Permiso Académico / SENA','Ausencia Injustificada','Bonificación Especial'].map((v)=><option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Fecha inicio</label><input required type="date" value={form.fecha_inicio || ''} onChange={(e) => setForm({...form,fecha_inicio:e.target.value})} className="input" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Fecha fin</label><input required type="date" value={form.fecha_fin || ''} onChange={(e) => setForm({...form,fecha_fin:e.target.value})} className="input" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Días</label><input required type="number" min="1" value={form.dias || 1} onChange={(e) => setForm({...form,dias:Number(e.target.value)})} className="input" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Impacto nómina</label><select required value={form.impacto_nomina || ''} onChange={(e) => setForm({...form,impacto_nomina:e.target.value})} className="input"><option value="Sin impacto salarial">Sin impacto salarial</option><option value="Descuento">Descuento</option><option value="Bonificación">Bonificación</option><option value="Incapacidad EPS/ARL">Incapacidad EPS/ARL</option></select></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Monto</label><input type="number" min="0" value={form.monto || 0} onChange={(e) => setForm({...form,monto:Number(e.target.value)})} className="input" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Estado</label><select required value={form.estado || 'Activa'} onChange={(e) => setForm({...form,estado:e.target.value})} className="input"><option value="Activa">Activa</option><option value="Aplicada en Nómina">Aplicada en Nómina</option><option value="Cerrada">Cerrada</option></select></div>
          <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-slate-600">Descripción</label><textarea value={form.descripcion || ''} onChange={(e) => setForm({...form,descripcion:e.target.value})} className="input min-h-20" /></div>
        </div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button><Button variant="primary" type="submit" isLoading={loading}>{editing ? 'Actualizar' : 'Crear eventualidad'}</Button></div></form>
      </div></div>}
    </div>
  );
}

export function LiquidacionesPage() {
  return (
    <CatalogPage
      entityName="Liquidación"
      entityNamePlural="Liquidaciones"
      listFn={api.liquidaciones.list}
      createFn={api.liquidaciones.create}
      deleteFn={(id) => api.liquidaciones.remove(String(id))}
      columns={[
        { key: 'nombre_empleado', label: 'Empleado' }, { key: 'causa', label: 'Causa' },
        { key: 'fecha_terminacion', label: 'Terminación' },
        { key: 'total_liquidacion', label: 'Total', render: (item) => `$${Number(item.total_liquidacion || 0).toLocaleString('es-CO')}` },
      ]}
      createFields={[
        { label: 'Espacio de trabajo', key: 'espacio_trabajo', type: 'select', required: true, optionsSource: api.espaciosTrabajo.list, optionLabel: (item) => item.nombre || item.empresa_nombre || 'Espacio de trabajo' },
        { label: 'Empleado', key: 'empleado', type: 'select', required: true, optionsSource: api.empleados.list, optionLabel: (item) => item.nombre_completo },
        { label: 'Nombre del empleado', key: 'nombre_empleado', required: true },
        { label: 'Documento', key: 'documento_identidad_empleado', required: true },
        { label: 'Cargo', key: 'cargo_empleado', required: true },
        { label: 'Departamento', key: 'departamento', required: true },
        { label: 'Tipo de contrato', key: 'tipo_contrato', required: true },
        { label: 'Fecha contratación', key: 'fecha_contratacion', type: 'date', required: true },
        { label: 'Fecha terminación', key: 'fecha_terminacion', type: 'date', required: true },
        { label: 'Causa', key: 'causa', type: 'select', required: true, options: [{ label: 'Renuncia voluntaria', value: 'Renuncia Voluntaria' }, { label: 'Despido con justa causa', value: 'Despido con Justa Causa' }, { label: 'Despido sin justa causa', value: 'Despido sin Justa Causa' }] },
        { label: 'Salario base', key: 'salario_base', type: 'number', required: true },
        { label: 'Total liquidación', key: 'total_liquidacion', type: 'number', required: true },
      ]}
      itemToFormData={(item) => ({ espacio_trabajo: item.espacio_trabajo, empleado: item.empleado, nombre_empleado: item.nombre_empleado, documento_identidad_empleado: item.documento_identidad_empleado, cargo_empleado: item.cargo_empleado, departamento: item.departamento, tipo_contrato: item.tipo_contrato, fecha_contratacion: item.fecha_contratacion, fecha_terminacion: item.fecha_terminacion, causa: item.causa, salario_base: item.salario_base, total_liquidacion: item.total_liquidacion })}
    />
  );
}

export function RecibosPage() {
  return <ReadOnlyPayrollTable title="Recibos de Nómina" loader={api.recibos.list} columns={[
    { key: 'numero_recibo', label: 'Recibo' }, { key: 'nombre_empleado', label: 'Empleado' },
    { key: 'etiqueta_periodo', label: 'Periodo' },
    { key: 'pago_neto', label: 'Pago neto', render: (item: any) => `$${Number(item.pago_neto || 0).toLocaleString('es-CO')}` },
    { key: 'estado_pago', label: 'Estado', render: (item: any) => <Badge variant={item.estado_pago === 'Pagado' ? 'success' : 'warning'}>{item.estado_pago}</Badge> },
  ]} />;
}

export function AuditoriasPage() {
  return <ReadOnlyPayrollTable title="Auditoría" loader={api.auditorias.list} columns={[
    { key: 'usuario', label: 'Usuario' }, { key: 'rol', label: 'Rol' },
    { key: 'accion', label: 'Acción', render: (item: any) => <Badge variant="info">{item.accion}</Badge> },
    { key: 'entidad_afectada', label: 'Entidad' }, { key: 'fecha_registro', label: 'Fecha', render: (item: any) => item.fecha_registro ? new Date(item.fecha_registro).toLocaleString('es-CO') : '—' },
  ]} />;
}

function ReadOnlyPayrollTable({ title, loader, columns }: { title: string; loader: () => Promise<{ results: any[] }>; columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[] }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loader().then((response) => setItems(response.results || [])).catch((err) => setError(err.message || 'Error al cargar')); 
  }, [loader]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="text-sm text-slate-500">Consulta la información registrada en el sistema</p></div>
      {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card><div className="overflow-x-auto"><Table><Thead><Tr>{columns.map((column) => <Th key={column.key}>{column.label}</Th>)}</Tr></Thead><Tbody>
        {items.length === 0 ? <Tr><Td colSpan={columns.length} className="py-10 text-center text-slate-500">No hay registros disponibles</Td></Tr> : items.map((item) => <Tr key={String(item.id)}>{columns.map((column) => <Td key={column.key}>{column.render ? column.render(item) : String(item[column.key] ?? '—')}</Td>)}</Tr>)}
      </Tbody></Table></div></Card>
    </div>
  );
}
