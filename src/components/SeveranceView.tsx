import { useState, type FormEvent } from 'react';
import { Calculator, Download, FileCheck2 } from 'lucide-react';
import { exportSeverancePDF } from '../lib/exportEngine.ts';
import {
  calculateSeveranceLiquidation,
  formatCOP,
  formatShortDate,
} from '../lib/payrollEngine.ts';
import type {
  CompanyConfig,
  Employee,
  LegislationParams,
  SeveranceRecord,
  TerminationCause,
} from '../types/payroll.ts';

interface SeveranceViewProps {
  employees: Employee[];
  severances: SeveranceRecord[];
  legislation: LegislationParams;
  company: CompanyConfig;
  onCreateSeverance: (payload: {
    employeeId: string;
    terminationDate: string;
    cause: TerminationCause;
    pendingSalaryDays: number;
    markRetired: boolean;
  }) => Promise<void>;
}

export function SeveranceView({
  employees,
  severances,
  legislation,
  company,
  onCreateSeverance,
}: SeveranceViewProps) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [terminationDate, setTerminationDate] = useState('2026-11-30');
  const [cause, setCause] = useState<TerminationCause>('Despido sin Justa Causa');
  const [pendingSalaryDays, setPendingSalaryDays] = useState('15');
  const [markRetired, setMarkRetired] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedEmployee =
    employees.find((e) => e.id === employeeId) ?? employees[0];

  const livePreview = selectedEmployee
    ? calculateSeveranceLiquidation({
        id: 'SIMULACION',
        employee: selectedEmployee,
        terminationDate,
        cause,
        pendingSalaryDays: Number(pendingSalaryDays) || 0,
        legislation,
      })
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      await onCreateSeverance({
        employeeId: selectedEmployee.id,
        terminationDate,
        cause,
        pendingSalaryDays: Number(pendingSalaryDays) || 0,
        markRetired,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Despidos y Liquidaciones Definitivas
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Simulación y registro de liquidación final de contrato según causal y cálculo de indemnización legal (Art. 64 CST).
        </p>
      </div>

      {/* Calculator + Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Calculator className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Parámetros de Liquidación
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Trabajador
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.contractType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Causal de Terminación
            </label>
            <select
              value={cause}
              onChange={(e) => setCause(e.target.value as TerminationCause)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="Renuncia Voluntaria">Renuncia Voluntaria</option>
              <option value="Despido con Justa Causa">Despido con Justa Causa</option>
              <option value="Despido sin Justa Causa">
                Despido sin Justa Causa (con Indemnización)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fecha de Retiro
              </label>
              <input
                type="date"
                required
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Días Salario Pendientes
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={pendingSalaryDays}
                onChange={(e) => setPendingSalaryDays(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={markRetired}
              onChange={(e) => setMarkRetired(e.target.checked)}
              className="accent-teal-700"
            />
            <span>Marcar empleado como &quot;Retirado&quot; en nómina</span>
          </label>

          <button
            type="submit"
            disabled={saving || !selectedEmployee}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>
              {saving ? 'Registrando...' : 'Generar Liquidación Definitiva'}
            </span>
          </button>
        </form>

        {!livePreview && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
            Registra al menos un trabajador en la pestaña <span className="font-semibold text-slate-800">Trabajadores</span> para simular su liquidación definitiva y prestaciones proporcionales.
          </div>
        )}

        {/* Live Calculation Preview */}
        {livePreview && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-slate-300">Previsualización en Tiempo Real</p>
                <h2 className="text-base font-semibold">
                  {livePreview.employeeName} · {livePreview.contractType}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-300">
                Antigüedad: {livePreview.daysWorkedTotal} días
              </span>
            </div>

            <div className="p-6 space-y-4">
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-700">
                    Salarios pendientes ({livePreview.pendingSalaryDays} días)
                  </dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(livePreview.pendingSalaryAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-700">Prima de servicios proporcional</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(livePreview.primaProporcional)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-700">Cesantías proporcionales</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(livePreview.cesantiasProporcional)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-700">Intereses sobre cesantías (12%)</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(livePreview.interesesCesantias)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-700">
                    Vacaciones pendientes ({livePreview.vacacionesPendientesDias} días)
                  </dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(livePreview.vacacionesPendientesAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5 gap-4">
                  <dt className="text-slate-700">
                    <span className="font-medium text-slate-900">Indemnización Legal</span>
                    <span className="block text-xs text-slate-500">
                      {livePreview.indemnizacionFormulaNote}
                    </span>
                  </dt>
                  <dd className="font-mono tabular-nums font-semibold text-teal-700 shrink-0">
                    {formatCOP(livePreview.indemnizacionAmount)}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-900">
                  Total Liquidación Definitiva
                </span>
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {formatCOP(livePreview.totalLiquidation)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical Severances Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Historial de Liquidaciones Emitidas
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Radicado</th>
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Causal</th>
                <th className="py-3 px-4 whitespace-nowrap">Fecha Retiro</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Indemnización</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Liquidado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acta PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {severances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    No hay liquidaciones definitivas emitidas todavía.
                  </td>
                </tr>
              ) : (
                severances.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 whitespace-nowrap">
                        {s.employeeName}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {s.contractType} · {s.department}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {s.cause}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatShortDate(s.terminationDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                      {formatCOP(s.indemnizacionAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCOP(s.totalLiquidation)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => exportSeverancePDF(s, company)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Acta PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
