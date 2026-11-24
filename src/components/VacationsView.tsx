import { useState, type FormEvent } from 'react';
import {
  Check,
  FileSpreadsheet,
  FileText,
  Plus,
  X,
} from 'lucide-react';
import { exportVacationsExcel, exportVacationsPDF } from '../lib/exportEngine.ts';
import {
  calculateAccruedVacationDays,
  calculateBusinessDays,
  formatCOP,
  formatShortDate,
} from '../lib/payrollEngine.ts';
import type {
  CompanyConfig,
  Employee,
  LegislationParams,
  VacationRequest,
  VacationStatus,
  VacationType,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface VacationsViewProps {
  employees: Employee[];
  vacations: VacationRequest[];
  legislation: LegislationParams;
  company: CompanyConfig;
  onCreateVacation: (req: {
    employeeId: string;
    startDate: string;
    endDate: string;
    type: VacationType;
    status: VacationStatus;
    compensatedDays?: number;
    notes: string;
  }) => Promise<void>;
  onUpdateVacationStatus: (id: string, status: VacationStatus) => Promise<void>;
}

export function VacationsView({
  employees,
  vacations,
  legislation,
  company,
  onCreateVacation,
  onUpdateVacationStatus,
}: VacationsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Todas' | VacationStatus>('Todas');
  const [modalOpen, setModalOpen] = useState(false);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [type, setType] = useState<VacationType>('Vacaciones Anuales');
  const [startDate, setStartDate] = useState('2026-12-14');
  const [endDate, setEndDate] = useState('2026-12-18');
  const [compensatedDays, setCompensatedDays] = useState('5');
  const [approveNow, setApproveNow] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const isCompensation = type === 'Compensación en Dinero';
  const estimatedDays = isCompensation
    ? Math.max(0, Number(compensatedDays) || 0)
    : calculateBusinessDays(startDate, endDate);

  const selectedEmp = empMap.get(employeeId);
  const estimatedCompAmount =
    isCompensation && selectedEmp
      ? Math.round((selectedEmp.baseSalary / 30) * estimatedDays)
      : 0;

  const filteredRequests = vacations.filter((v) =>
    statusFilter === 'Todas' ? true : v.status === statusFilter,
  );

  const pendingCount = vacations.filter((v) => v.status === 'Pendiente').length;
  const approvedCount = vacations.filter((v) => v.status === 'Aprobada').length;

  function openNewModal(preselectedEmpId?: string) {
    setEmployeeId(preselectedEmpId ?? employees[0]?.id ?? '');
    setType('Vacaciones Anuales');
    setStartDate('2026-12-14');
    setEndDate('2026-12-18');
    setCompensatedDays('5');
    setApproveNow(false);
    setNotes('');
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (estimatedDays <= 0) return;
    setSaving(true);
    try {
      await onCreateVacation({
        employeeId,
        type,
        startDate,
        endDate: isCompensation ? startDate : endDate,
        status: approveNow ? 'Aprobada' : 'Pendiente',
        compensatedDays: isCompensation ? estimatedDays : undefined,
        notes: notes.trim(),
      });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gestión de Vacaciones y Compensación
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Causación automática ({legislation.vacacionesDiasPorAno} días hábiles/año Art. 186 CST), aprobación de solicitudes y compensación en dinero.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportVacationsPDF(employees, vacations, company)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportVacationsExcel(employees, vacations)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            disabled={employees.length === 0}
            onClick={() => openNewModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Solicitud / Compensación</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Solicitudes Pendientes</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
            {pendingCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Por aprobar o rechazar</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Aprobadas y Compensadas</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            {approvedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Descontadas del saldo causado</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Causación Legal Anual</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {legislation.vacacionesDiasPorAno} días / año
          </p>
          <p className="text-xs text-slate-500 mt-1">Calculado desde fecha de ingreso</p>
        </div>
      </div>

      {/* Requests Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Solicitudes de Disfrute y Compensación
          </h2>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['Todas', 'Pendiente', 'Aprobada', 'Rechazada'] as const).map((tab) => (
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
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Modalidad</th>
                <th className="py-3 px-4 whitespace-nowrap">Período</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Días Hábiles</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Compensación</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    No hay solicitudes de vacaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((v) => {
                  const emp = empMap.get(v.employeeId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {emp?.fullName ?? v.employeeId}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {v.id} · {v.notes || 'Sin observaciones'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {v.type}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {formatShortDate(v.startDate)} — {formatShortDate(v.endDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {v.businessDays}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                        {v.compensatedAmount > 0 ? formatCOP(v.compensatedAmount) : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusIndicator status={v.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {v.status === 'Pendiente' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateVacationStatus(v.id, 'Aprobada')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded hover:bg-teal-800 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprobar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateVacationStatus(v.id, 'Rechazada')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Resuelta</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automatic Accrual Balance Table */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Causación Automática de Vacaciones (15 días hábiles/año)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Ingreso</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Causados</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Disfrutados</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Compensados</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Saldo Disponible</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    Agrega trabajadores para visualizar su causación de vacaciones.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const accrued = calculateAccruedVacationDays(
                    emp.hireDate,
                    '2026-11-17',
                    legislation.vacacionesDiasPorAno,
                  );
                  const avail = Math.max(
                    0,
                    Math.round(
                      (accrued - emp.usedVacationDays - emp.compensatedVacationDays) * 10,
                    ) / 10,
                  );
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {emp.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatShortDate(emp.hireDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {accrued} d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {emp.usedVacationDays} d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {emp.compensatedVacationDays} d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-teal-700 whitespace-nowrap">
                        {avail} d
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openNewModal(emp.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          Solicitar
                        </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Registrar Solicitud de Vacaciones
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Modalidad
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VacationType)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="Vacaciones Anuales">Vacaciones Anuales (Disfrute)</option>
                  <option value="Compensación en Dinero">
                    Compensación en Dinero (Art. 189 CST)
                  </option>
                  <option value="Permiso Remunerado">Permiso Remunerado</option>
                  <option value="Incapacidad / Licencia">Incapacidad / Licencia</option>
                </select>
              </div>

              {isCompensation ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Días a Compensar
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={compensatedDays}
                      onChange={(e) => setCompensatedDays(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fecha Registro
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
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
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                <span className="text-slate-600">
                  {isCompensation ? 'Valor compensación:' : 'Días hábiles:'}
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {isCompensation
                    ? `${estimatedDays} d · ${formatCOP(estimatedCompAmount)}`
                    : `${estimatedDays} días`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approveNow}
                  onChange={(e) => setApproveNow(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Aprobar inmediatamente</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || estimatedDays <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
