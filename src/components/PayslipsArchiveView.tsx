import { useState } from 'react';
import { Check, Download, Eye, FileSpreadsheet, Search } from 'lucide-react';
import {
  exportAllPayslipsPDF,
  exportPayrollWorkbookExcel,
  exportPayslipPDF,
} from '../lib/exportEngine.ts';
import { formatCOP, formatShortDate } from '../lib/payrollEngine.ts';
import type { PayrollDatabase, PayrollPeriod, Payslip } from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface PayslipsArchiveViewProps {
  db: PayrollDatabase;
  period: PayrollPeriod;
  onPreviewPayslip: (payslip: Payslip) => void;
  onMarkPayslipPaid: (periodKey: string, payslipId: string) => Promise<void>;
}

export function PayslipsArchiveView({
  db,
  period,
  onPreviewPayslip,
  onMarkPayslipPaid,
}: PayslipsArchiveViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pagado' | 'Pendiente'>('Todos');

  const filtered = period.payslips.filter((p) => {
    const matchesSearch =
      p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'Todos' || p.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Desprendibles de Pago — {period.label}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Comprobantes individuales en PDF generados automáticamente por cada liquidación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportPayrollWorkbookExcel(db, period)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportAllPayslipsPDF(period, db.company)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Todos en PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio o trabajador..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['Todos', 'Pagado', 'Pendiente'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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
                <th className="py-3 px-4 whitespace-nowrap">Comprobante</th>
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Cuenta Abono</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Devengado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Deducciones</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Neto Pagado</th>
                <th className="py-3 px-4 whitespace-nowrap">Emisión</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 whitespace-nowrap">
                      {p.employeeName}
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {p.department} · {p.employeeRole}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {p.bankName} {p.bankAccountMasked}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCOP(p.grossPay)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                    -{formatCOP(p.totalDeductions)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {formatCOP(p.netPay)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {formatShortDate(p.generatedAt)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusIndicator status={p.paymentStatus} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {p.paymentStatus === 'Pendiente' && (
                        <button
                          type="button"
                          onClick={() => onMarkPayslipPaid(period.periodKey, p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded hover:bg-teal-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pagar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onPreviewPayslip(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Vista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPayslipPDF(p, db.company)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
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
    </div>
  );
}
