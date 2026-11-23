import { useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Download,
  Eye,
  Lock,
  Plus,
  UserCheck,
} from 'lucide-react';
import { exportPayslipPDF } from '../lib/exportEngine.ts';
import {
  calculateAccruedVacationDays,
  calculateBusinessDays,
  formatCOP,
  formatShortDate,
  maskBankAccount,
} from '../lib/payrollEngine.ts';
import type {
  CompanyConfig,
  Employee,
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
  Payslip,
  VacationRequest,
  VacationType,
} from '../types/payroll.ts';
import { CalendarView } from './CalendarView.tsx';
import { StatusIndicator } from './StatusBadge.tsx';

interface WorkerPortalViewProps {
  db: PayrollDatabase;
  employee: Employee;
  periods: PayrollPeriod[];
  vacations: VacationRequest[];
  legislation: LegislationParams;
  company: CompanyConfig;
  onPreviewPayslip: (payslip: Payslip) => void;
  onCreateVacation: (req: {
    employeeId: string;
    startDate: string;
    endDate: string;
    type: VacationType;
    status: 'Pendiente';
    notes: string;
  }) => Promise<void>;
}

export function WorkerPortalView({
  db,
  employee,
  periods,
  vacations,
  legislation,
  company,
  onPreviewPayslip,
  onCreateVacation,
}: WorkerPortalViewProps) {
  const [workerTab, setWorkerTab] = useState<'resumen' | 'calendario'>('resumen');
  const [startDate, setStartDate] = useState('2026-12-14');
  const [endDate, setEndDate] = useState('2026-12-18');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const myPayslips = periods
    .flatMap((p) => p.payslips)
    .filter((s) => s.employeeId === employee.id);

  const myVacations = vacations.filter((v) => v.employeeId === employee.id);
  const myEventualities = (db.eventualities ?? []).filter(
    (e) => e.employeeId === employee.id,
  );

  const accrued = calculateAccruedVacationDays(
    employee.hireDate,
    '2026-11-17',
    legislation.vacacionesDiasPorAno,
  );
  const available = Math.max(
    0,
    Math.round(
      (accrued - employee.usedVacationDays - employee.compensatedVacationDays) * 10,
    ) / 10,
  );
  const requestedDays = calculateBusinessDays(startDate, endDate);

  async function handleRequestVacation(e: FormEvent) {
    e.preventDefault();
    if (requestedDays <= 0) return;
    setSaving(true);
    try {
      await onCreateVacation({
        employeeId: employee.id,
        startDate,
        endDate,
        type: 'Vacaciones Anuales',
        status: 'Pendiente',
        notes: notes.trim() || 'Solicitud enviada desde Portal del Trabajador',
      });
      setNotes('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Restricted RBAC Banner + View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white rounded-lg">
        <div className="flex items-center gap-2.5 text-sm">
          <Lock className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Modo Trabajador (RBAC Restringido):</strong> Acceso limitado exclusivamente al registro propio de {employee.fullName}.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-300">
            C.C. {employee.documentId}
          </span>
          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-800 rounded-md border border-slate-700">
            <button
              type="button"
              onClick={() => setWorkerTab('resumen')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                workerTab === 'resumen'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mi Portal
            </button>
            <button
              type="button"
              onClick={() => setWorkerTab('calendario')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                workerTab === 'calendario'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Mi Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {workerTab === 'calendario' ? (
        <CalendarView db={db} restrictedEmployeeId={employee.id} />
      ) : (
        <>

      {/* Personal Profile Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>Mi Cargo y Contrato</span>
          </div>
          <p className="text-base font-semibold text-slate-900 mt-1.5">
            {employee.role}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {employee.contractType} · Ingreso {formatShortDate(employee.hireDate)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Salario Básico Mensual</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCOP(employee.baseSalary)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {employee.bankName} {maskBankAccount(employee.bankAccountNumber)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Saldo de Vacaciones</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            {available} días
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Causados: {accrued} d · Usados: {employee.usedVacationDays} d
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Mis Desprendibles</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {myPayslips.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Disponibles en PDF</p>
        </div>
      </div>

      {/* My Payslips */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Mis Desprendibles de Pago
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4 text-right">Devengado</th>
                <th className="py-3 px-4 text-right">Deducciones</th>
                <th className="py-3 px-4 text-right">Neto Pagado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {myPayslips.map((slip) => (
                <tr key={slip.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {slip.periodLabel} ({slip.frequency})
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {slip.receiptNumber}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCOP(slip.grossPay)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">
                    -{formatCOP(slip.totalDeductions)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatCOP(slip.netPay)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusIndicator status={slip.paymentStatus} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreviewPayslip(slip)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPayslipPDF(slip, company)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded hover:bg-teal-800 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Vacation + History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleRequestVacation}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <CalendarDays className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Solicitar Vacaciones
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Desde
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
                Hasta
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

          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs">
            <span className="text-slate-600">Días hábiles a solicitar:</span>
            <span className="font-mono font-semibold text-slate-900">
              {requestedDays} días
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Comentarios
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Empalme cubierto con el equipo..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={saving || requestedDays <= 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Enviando...' : 'Enviar Solicitud a RR. HH.'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Mi Historial de Vacaciones
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Solicitud</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4 text-right">Días</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {myVacations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                      No tienes solicitudes registradas aún.
                    </td>
                  </tr>
                ) : (
                  myVacations.map((v) => (
                    <tr key={v.id}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{v.type}</div>
                        <div className="text-xs text-slate-500">{v.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {formatShortDate(v.startDate)} — {formatShortDate(v.endDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {v.businessDays}
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator status={v.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* My Eventualities */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Mis Eventualidades y Novedades Reportadas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Fechas</th>
                <th className="py-3 px-4 text-right">Días</th>
                <th className="py-3 px-4">Impacto en Nómina</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {myEventualities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500">
                    No tienes eventualidades registradas en el período actual.
                  </td>
                </tr>
              ) : (
                myEventualities.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{ev.type}</div>
                      <div className="text-xs text-slate-500">{ev.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {formatShortDate(ev.startDate)} — {formatShortDate(ev.endDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {ev.days}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {ev.payrollImpact}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {ev.amount > 0 ? formatCOP(ev.amount) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={ev.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
