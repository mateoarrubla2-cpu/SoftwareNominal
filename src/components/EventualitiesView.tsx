import { useState, type FormEvent } from 'react';
import { Check, Plus, Search, Trash2, X } from 'lucide-react';
import {
  calculateCalendarDaysInclusive,
  formatCOP,
  formatShortDate,
} from '../lib/payrollEngine.ts';
import type {
  Employee,
  Eventuality,
  EventualityImpact,
  EventualityStatus,
  EventualityType,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface EventualitiesViewProps {
  employees: Employee[];
  eventualities: Eventuality[];
  onCreateEventuality: (payload: {
    employeeId: string;
    type: EventualityType;
    startDate: string;
    endDate: string;
    payrollImpact: EventualityImpact;
    amount: number;
    status: EventualityStatus;
    description: string;
  }) => Promise<void>;
  onUpdateStatus: (id: string, status: EventualityStatus) => Promise<void>;
  onDeleteEventuality: (id: string) => Promise<void>;
  initialDateForModal?: string | null;
  onClearInitialDate?: () => void;
}

const EVENTUALITY_TYPES: EventualityType[] = [
  'Incapacidad Médica (EPS/ARL)',
  'Licencia Maternidad / Paternidad',
  'Calamidad Doméstica',
  'Permiso Académico / SENA',
  'Ausencia Injustificada',
  'Bonificación Especial',
];

export function EventualitiesView({
  employees,
  eventualities,
  onCreateEventuality,
  onUpdateStatus,
  onDeleteEventuality,
  initialDateForModal,
  onClearInitialDate,
}: EventualitiesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | EventualityStatus>('Todas');
  const [modalOpen, setModalOpen] = useState(Boolean(initialDateForModal));

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [type, setType] = useState<EventualityType>('Incapacidad Médica (EPS/ARL)');
  const [startDate, setStartDate] = useState(initialDateForModal ?? '2026-11-20');
  const [endDate, setEndDate] = useState(initialDateForModal ?? '2026-11-21');
  const [payrollImpact, setPayrollImpact] = useState<EventualityImpact>('Incapacidad EPS/ARL');
  const [amountInput, setAmountInput] = useState('0');
  const [description, setDescription] = useState('');
  const [applyToPayroll, setApplyToPayroll] = useState(true);
  const [saving, setSaving] = useState(false);

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const calculatedDays = Math.max(
    1,
    calculateCalendarDaysInclusive(startDate, endDate),
  );

  const filtered = eventualities.filter((ev) => {
    const empName = empMap.get(ev.employeeId)?.fullName ?? '';
    const matchesSearch =
      empName.toLowerCase().includes(search.toLowerCase()) ||
      ev.type.toLowerCase().includes(search.toLowerCase()) ||
      ev.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'Todas' || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = eventualities.filter((e) => e.status !== 'Cerrada').length;
  const medicalCount = eventualities.filter(
    (e) =>
      e.type === 'Incapacidad Médica (EPS/ARL)' ||
      e.type === 'Licencia Maternidad / Paternidad',
  ).length;
  const totalBonuses = eventualities
    .filter((e) => e.status !== 'Cerrada' && e.payrollImpact === 'Bonificación')
    .reduce((s, e) => s + e.amount, 0);
  const totalDiscounts = eventualities
    .filter((e) => e.status !== 'Cerrada' && e.payrollImpact === 'Descuento')
    .reduce((s, e) => s + e.amount, 0);

  function handleTypeChange(nextType: EventualityType, targetEmpId = employeeId, s = startDate, e = endDate) {
    setType(nextType);
    const emp = empMap.get(targetEmpId);
    const days = Math.max(1, calculateCalendarDaysInclusive(s, e));
    if (nextType === 'Ausencia Injustificada') {
      setPayrollImpact('Descuento');
      setAmountInput(emp ? String(Math.round((emp.baseSalary / 30) * days)) : '0');
    } else if (nextType === 'Bonificación Especial') {
      setPayrollImpact('Bonificación');
      setAmountInput('250000');
    } else if (nextType === 'Incapacidad Médica (EPS/ARL)') {
      setPayrollImpact('Incapacidad EPS/ARL');
      setAmountInput('0');
    } else {
      setPayrollImpact('Sin impacto salarial');
      setAmountInput('0');
    }
  }

  function openNewModal() {
    setEmployeeId(employees[0]?.id ?? '');
    const defaultDate = initialDateForModal ?? '2026-11-20';
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    handleTypeChange('Incapacidad Médica (EPS/ARL)', employees[0]?.id ?? '', defaultDate, defaultDate);
    setDescription('');
    setApplyToPayroll(true);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    if (onClearInitialDate) onClearInitialDate();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateEventuality({
        employeeId,
        type,
        startDate,
        endDate,
        payrollImpact,
        amount: Math.max(0, Number(amountInput) || 0),
        status: applyToPayroll ? 'Aplicada en Nómina' : 'Activa',
        description: description.trim() || `${type} registrada`,
      });
      closeModal();
    } catch {
      // El toast global muestra el mensaje de error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Eventualidades y Novedades Laborales
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Registro de incapacidades EPS/ARL, licencias, calamidades, permisos académicos, ausencias y bonificaciones especiales con impacto en nómina y calendario.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Eventualidad</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Novedades Vigentes</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {activeCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Activas o aplicadas al período</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Incapacidades y Licencias</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
            {medicalCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">EPS / ARL / Maternidad</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Bonificaciones por Eventualidad</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            +{formatCOP(totalBonuses)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sumadas automáticamente a nómina</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Descuentos por Ausencias</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1.5">
            -{formatCOP(totalDiscounts)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Deducidos en período borrador</p>
        </div>
      </div>

      {/* Eventualities Table */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por trabajador o tipo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['Todas', 'Activa', 'Aplicada en Nómina', 'Cerrada'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Eventualidad</th>
                <th className="py-3 px-4 whitespace-nowrap">Fechas</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Días</th>
                <th className="py-3 px-4 whitespace-nowrap">Impacto en Nómina</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Valor (COP)</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                    No hay eventualidades registradas bajo este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const emp = empMap.get(ev.employeeId);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {emp?.fullName ?? ev.employeeId}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{ev.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 whitespace-nowrap">
                          {ev.type}
                        </div>
                        <div className="text-xs text-slate-500 max-w-xs truncate">
                          {ev.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatShortDate(ev.startDate)} — {formatShortDate(ev.endDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {ev.days} d
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {ev.payrollImpact}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {ev.amount > 0 ? (
                          <span
                            className={
                              ev.payrollImpact === 'Descuento'
                                ? 'text-rose-700 font-medium'
                                : 'text-teal-700 font-medium'
                            }
                          >
                            {ev.payrollImpact === 'Descuento' ? '-' : '+'}
                            {formatCOP(ev.amount)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusIndicator status={ev.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {ev.status === 'Activa' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(ev.id, 'Aplicada en Nómina')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aplicar</span>
                            </button>
                          )}
                          {ev.status !== 'Cerrada' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(ev.id, 'Cerrada')}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              Cerrar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteEventuality(ev.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                            title="Eliminar eventualidad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Registrar Eventualidad Laboral
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Trabajador
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    handleTypeChange(type, e.target.value, startDate, endDate);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tipo de Eventualidad
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as EventualityType)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {EVENTUALITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                      handleTypeChange(type, employeeId, e.target.value, e.target.value > endDate ? e.target.value : endDate);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      handleTypeChange(type, employeeId, startDate, e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Impacto en Nómina
                  </label>
                  <select
                    value={payrollImpact}
                    onChange={(e) => setPayrollImpact(e.target.value as EventualityImpact)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Sin impacto salarial">Sin impacto salarial</option>
                    <option value="Incapacidad EPS/ARL">Incapacidad EPS/ARL</option>
                    <option value="Bonificación">Bonificación (+)</option>
                    <option value="Descuento">Descuento (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Valor en Nómina (COP · {calculatedDays} d)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    disabled={
                      payrollImpact === 'Sin impacto salarial' ||
                      payrollImpact === 'Incapacidad EPS/ARL'
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Soporte / Descripción
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Certificado médico EPS, resolución permiso académico SENA..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToPayroll}
                  onChange={(e) => setApplyToPayroll(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Aplicar automáticamente en la nómina del período</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Eventualidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
