import { useState, type FormEvent } from 'react';
import {
  CheckCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  exportAllPayslipsPDF,
  exportPayrollReportPDF,
  exportPayrollWorkbookExcel,
  exportPayslipPDF,
} from '../lib/exportEngine.ts';
import {
  calculateOvertimeAmount,
  EMPTY_OVERTIME,
  formatCOP,
} from '../lib/payrollEngine.ts';
import type {
  Department,
  OvertimeHours,
  PayrollDatabase,
  PayrollFrequency,
  PayrollPeriod,
  Payslip,
  PeriodAdjustment,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface PayrollViewProps {
  db: PayrollDatabase;
  period: PayrollPeriod;
  onSelectPeriod: (periodKey: string) => void;
  onCreatePeriod: (periodKey: string, frequency: PayrollFrequency) => Promise<void>;
  onChangeFrequency: (periodKey: string, frequency: PayrollFrequency) => Promise<void>;
  onSaveAdjustment: (
    periodKey: string,
    employeeId: string,
    adjustment: PeriodAdjustment,
  ) => Promise<void>;
  onProcessPeriod: (periodKey: string, markPaid: boolean) => Promise<void>;
  onPreviewPayslip: (payslip: Payslip) => void;
}

const DEPARTMENTS: ('Todos' | Department)[] = [
  'Todos',
  'Investigación Textil',
  'Diseño y Patronaje',
  'Confección Avanzada',
  'Innovación y Materiales',
  'Gestión Administrativa',
  'Calidad y Metrología',
];

export function PayrollView({
  db,
  period,
  onSelectPeriod,
  onCreatePeriod,
  onChangeFrequency,
  onSaveAdjustment,
  onProcessPeriod,
  onPreviewPayslip,
}: PayrollViewProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<'Todos' | Department>('Todos');
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [overtime, setOvertime] = useState<OvertimeHours>(EMPTY_OVERTIME);
  const [bonusInput, setBonusInput] = useState('0');
  const [deductionInput, setDeductionInput] = useState('0');
  const [savingAdj, setSavingAdj] = useState(false);

  const [newPeriodModal, setNewPeriodModal] = useState(false);
  const [newPeriodKey, setNewPeriodKey] = useState('2026-12');
  const [newPeriodFreq, setNewPeriodFreq] = useState<PayrollFrequency>('Mensual');
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [processing, setProcessing] = useState(false);

  const filtered = period.payslips.filter((p) => {
    const matchesSearch =
      p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.employeeDocumentId.includes(search);
    const matchesDept = deptFilter === 'Todos' || p.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const totalNet = period.payslips.reduce((s, p) => s + p.netPay, 0);
  const totalGross = period.payslips.reduce((s, p) => s + p.grossPay, 0);
  const totalEmployerCost = period.payslips.reduce(
    (s, p) =>
      s + p.employerHealth + p.employerPension + p.employerArl + p.parafiscalesTotal,
    0,
  );
  const totalDeductions = period.payslips.reduce((s, p) => s + p.totalDeductions, 0);
  const paidCount = period.payslips.filter((p) => p.paymentStatus === 'Pagado').length;

  const editingEmployee = editingPayslip
    ? db.employees.find((e) => e.id === editingPayslip.employeeId)
    : null;
  const previewOvertimeValue = editingEmployee
    ? calculateOvertimeAmount(editingEmployee.baseSalary, overtime)
    : 0;

  function openAdjustmentModal(p: Payslip) {
    setEditingPayslip(p);
    setOvertime({ ...p.overtimeDetail });
    setBonusInput(String(p.performanceBonus));
    setDeductionInput(String(p.otherDeductions));
  }

  async function handleSaveAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!editingPayslip) return;
    setSavingAdj(true);
    try {
      await onSaveAdjustment(period.periodKey, editingPayslip.employeeId, {
        overtime,
        performanceBonus: Math.max(0, Number(bonusInput) || 0),
        otherDeductions: Math.max(0, Number(deductionInput) || 0),
      });
      setEditingPayslip(null);
    } finally {
      setSavingAdj(false);
    }
  }

  async function handleCreatePeriod(e: FormEvent) {
    e.preventDefault();
    setCreatingPeriod(true);
    try {
      await onCreatePeriod(newPeriodKey, newPeriodFreq);
      onSelectPeriod(newPeriodKey);
      setNewPeriodModal(false);
    } finally {
      setCreatingPeriod(false);
    }
  }

  async function handleProcess(markPaid: boolean) {
    setProcessing(true);
    try {
      await onProcessPeriod(period.periodKey, markPaid);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pagas y Nómina — {period.label}
            </h1>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <StatusIndicator status={period.status} />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Liquidación {period.frequency.toLowerCase()} bajo legislación colombiana (Auxilio Transporte ≤ 2 SMMLV, Salud 4%, Pensión 4%, FSP y Retefuente UVT).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {period.status !== 'Pagada' && (
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Mensual', 'Quincenal'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onChangeFrequency(period.periodKey, freq)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    period.frequency === freq
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setNewPeriodModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Período</span>
          </button>

          {period.status === 'Borrador' && (
            <button
              type="button"
              disabled={processing}
              onClick={() => handleProcess(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Generar Desprendibles</span>
            </button>
          )}

          {period.status !== 'Pagada' && (
            <button
              type="button"
              disabled={processing}
              onClick={() => handleProcess(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Liquidar y Pagar</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Flat KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Neto a Dispersar</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCOP(totalNet)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {paidCount} de {period.payslips.length} desprendibles pagados
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Total Devengado</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCOP(totalGross)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Básico, auxilio transporte, extras y beneficios
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Deducciones Trabajadores</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1.5">
            {formatCOP(totalDeductions)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Salud 4%, Pensión 4%, FSP y Retefuente
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Seguridad Social + Parafiscales Empleador</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            {formatCOP(totalEmployerCost)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Salud, Pensión, ARL, Caja, SENA e ICBF
          </p>
        </div>
      </div>

      {/* Ledger Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cédula o folio..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as 'Todos' | Department)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d === 'Todos' ? 'Todas las áreas' : d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportPayrollReportPDF(period, db.company)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Nómina PDF</span>
            </button>

            <button
              type="button"
              onClick={() => exportAllPayslipsPDF(period, db.company)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Desprendibles PDF</span>
            </button>

            <button
              type="button"
              onClick={() => exportPayrollWorkbookExcel(db, period)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Básico</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aux. Transp.</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Extras / Bonos</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Beneficios</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Salud + Pensión</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">FSP / Retefuente</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Neto a Pagar</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 px-4 text-center text-slate-500">
                    {period.payslips.length === 0
                      ? 'La nómina de este período está en blanco. Registra trabajadores en la pestaña "Trabajadores" para liquidar automáticamente.'
                      : 'No se encontraron desprendibles con ese filtro.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const extras = p.overtimeAmount + p.performanceBonus;
                  const ss = p.saludDeduction + p.pensionDeduction;
                  const taxes = p.fspDeduction + p.retefuenteDeduction + p.otherDeductions;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {p.employeeName}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          <span className="font-mono">{p.receiptNumber}</span> · {p.department}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatCOP(p.baseSalaryPeriod)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {p.auxilioTransporte > 0 ? formatCOP(p.auxilioTransporte) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {extras > 0 ? `+${formatCOP(extras)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                        {p.benefitsTotal > 0 ? `+${formatCOP(p.benefitsTotal)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                        -{formatCOP(ss)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                        {taxes > 0 ? `-${formatCOP(taxes)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatCOP(p.netPay)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusIndicator status={p.paymentStatus} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {period.status !== 'Pagada' && (
                            <button
                              type="button"
                              onClick={() => openAdjustmentModal(p)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
                              Novedades
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onPreviewPayslip(p)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            Desprendible
                          </button>
                          <button
                            type="button"
                            onClick={() => exportPayslipPDF(p, db.company)}
                            className="px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
                          >
                            PDF
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

      {/* Colombian Overtime & Novedades Modal */}
      {editingPayslip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Novedades y Horas Extras (Ley Colombia)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingPayslip.employeeName} · {period.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayslip(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    H. Extra Diurna (+25%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtime.extraDiurna}
                    onChange={(e) =>
                      setOvertime({ ...overtime, extraDiurna: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    H. Extra Nocturna (+75%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtime.extraNocturna}
                    onChange={(e) =>
                      setOvertime({ ...overtime, extraNocturna: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    H. Extra Dominical/Festiva Diurna (+100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtime.extraDominicalDiurna}
                    onChange={(e) =>
                      setOvertime({
                        ...overtime,
                        extraDominicalDiurna: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    H. Extra Dominical Nocturna (+150%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtime.extraDominicalNocturna}
                    onChange={(e) =>
                      setOvertime({
                        ...overtime,
                        extraDominicalNocturna: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Horas Recargo Nocturno (+35%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overtime.recargoNocturno}
                    onChange={(e) =>
                      setOvertime({
                        ...overtime,
                        recargoNocturno: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs">
                    <span className="text-slate-500 block">Valor calculado extras:</span>
                    <span className="font-mono font-semibold text-teal-700 text-sm">
                      {formatCOP(previewOvertimeValue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bonificación Salarial (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Otras Deducciones / Libranza (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deductionInput}
                    onChange={(e) => setDeductionInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPayslip(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdj}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
                >
                  {savingAdj ? 'Recalculando...' : 'Aplicar y Recalcular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Period Modal */}
      {newPeriodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Abrir Nuevo Período
              </h3>
              <button
                type="button"
                onClick={() => setNewPeriodModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mes y Año
                </label>
                <input
                  type="month"
                  required
                  value={newPeriodKey}
                  onChange={(e) => setNewPeriodKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Periodicidad
                </label>
                <select
                  value={newPeriodFreq}
                  onChange={(e) => setNewPeriodFreq(e.target.value as PayrollFrequency)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Quincenal">Quincenal</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewPeriodModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
                >
                  {creatingPeriod ? 'Creando...' : 'Crear Período'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
