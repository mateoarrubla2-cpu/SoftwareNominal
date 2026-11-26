import { Check, Download, X } from 'lucide-react';
import { exportPayslipPDF } from '../lib/exportEngine.ts';
import { formatCOP, formatShortDate } from '../lib/payrollEngine.ts';
import type { CompanyConfig, Payslip } from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface PayslipPreviewModalProps {
  payslip: Payslip | null;
  company: CompanyConfig;
  onClose: () => void;
  onMarkPaid?: (payslip: Payslip) => void;
}

export function PayslipPreviewModal({
  payslip,
  company,
  onClose,
  onMarkPaid,
}: PayslipPreviewModalProps) {
  if (!payslip) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payslip-modal-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg overflow-hidden my-auto">
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-900 text-white">
          <div className="min-w-0">
            <p className="text-xs text-slate-300 font-mono tabular-nums">
              Desprendible de Pago · {payslip.receiptNumber} · {payslip.frequency}
            </p>
            <h2
              id="payslip-modal-title"
              className="text-lg font-semibold truncate mt-0.5"
            >
              {payslip.employeeName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar vista previa"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Entidad Empleadora</p>
              <p className="font-semibold text-slate-900">{company.name}</p>
              <p className="text-xs text-slate-600 font-mono">
                NIT {company.nit} · {company.city}
              </p>
              <p className="text-xs text-slate-500">{company.address}</p>
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="text-xs font-medium text-slate-500">Trabajador y Período</p>
              <p className="font-semibold text-slate-900">
                {payslip.periodLabel} ({payslip.frequency})
              </p>
              <p className="text-xs text-slate-600">
                {payslip.employeeRole} · C.C. {payslip.employeeDocumentId}
              </p>
              <div className="flex sm:justify-end items-center gap-3 pt-1">
                <span className="text-xs text-slate-500 font-mono">
                  {payslip.bankName} {payslip.bankAccountMasked}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <StatusIndicator status={payslip.paymentStatus} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Devengos
              </h3>
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-2 gap-3">
                  <dt className="text-slate-700">Salario Básico</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCOP(payslip.baseSalaryPeriod)}
                  </dd>
                </div>

                {payslip.auxilioTransporte > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Auxilio de Transporte</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatCOP(payslip.auxilioTransporte)}
                    </dd>
                  </div>
                )}

                {payslip.overtimeAmount > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Horas Extras y Recargos</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatCOP(payslip.overtimeAmount)}
                    </dd>
                  </div>
                )}

                {payslip.performanceBonus > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Bonificación</dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatCOP(payslip.performanceBonus)}
                    </dd>
                  </div>
                )}

                {payslip.benefitsBreakdown.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 gap-3"
                  >
                    <dt className="text-slate-700">
                      <span>{b.name}</span>
                      <span className="block text-xs text-slate-400">
                        {b.salarialFactor ? 'Factor salarial' : 'No salarial'}
                      </span>
                    </dt>
                    <dd className="font-mono tabular-nums font-medium text-slate-900">
                      {formatCOP(b.amount)}
                    </dd>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 pb-1 font-semibold text-slate-900">
                  <dt>Total Devengado</dt>
                  <dd className="font-mono tabular-nums">
                    {formatCOP(payslip.grossPay)}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Deducciones de Ley
              </h3>
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-2 gap-3">
                  <dt className="text-slate-700">Aporte Salud (4%)</dt>
                  <dd className="font-mono tabular-nums font-medium text-rose-700">
                    -{formatCOP(payslip.saludDeduction)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2 gap-3">
                  <dt className="text-slate-700">Aporte Pensión (4%)</dt>
                  <dd className="font-mono tabular-nums font-medium text-rose-700">
                    -{formatCOP(payslip.pensionDeduction)}
                  </dd>
                </div>
                {payslip.fspDeduction > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Fondo Solidaridad Pensional</dt>
                    <dd className="font-mono tabular-nums font-medium text-rose-700">
                      -{formatCOP(payslip.fspDeduction)}
                    </dd>
                  </div>
                )}
                {payslip.retefuenteDeduction > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Retención en la Fuente (UVT)</dt>
                    <dd className="font-mono tabular-nums font-medium text-rose-700">
                      -{formatCOP(payslip.retefuenteDeduction)}
                    </dd>
                  </div>
                )}
                {payslip.otherDeductions > 0 && (
                  <div className="flex items-center justify-between py-2 gap-3">
                    <dt className="text-slate-700">Otras Deducciones</dt>
                    <dd className="font-mono tabular-nums font-medium text-rose-700">
                      -{formatCOP(payslip.otherDeductions)}
                    </dd>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 pb-1 font-semibold text-slate-900">
                  <dt>Total Deducciones</dt>
                  <dd className="font-mono tabular-nums text-rose-700">
                    -{formatCOP(payslip.totalDeductions)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <p>
                  Aportes empleador: Salud{' '}
                  <span className="font-mono text-slate-700">
                    {formatCOP(payslip.employerHealth)}
                  </span>{' '}
                  · Pensión{' '}
                  <span className="font-mono text-slate-700">
                    {formatCOP(payslip.employerPension)}
                  </span>{' '}
                  · ARL{' '}
                  <span className="font-mono text-slate-700">
                    {formatCOP(payslip.employerArl)}
                  </span>
                </p>
                <p>
                  Emisión:{' '}
                  <span className="font-mono text-slate-700">
                    {formatShortDate(payslip.generatedAt)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-slate-900 text-white rounded-lg">
            <div>
              <p className="text-xs text-slate-300">Neto Líquido a Pagar</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {payslip.bankName} · Cuenta {payslip.bankAccountMasked}
              </p>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {formatCOP(payslip.netPay)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          {payslip.paymentStatus === 'Pendiente' && onMarkPaid && (
            <button
              type="button"
              onClick={() => onMarkPaid(payslip)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-white border border-teal-300 rounded-md hover:bg-teal-50 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>Marcar Pagado</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportPayslipPDF(payslip, company)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Desprendible PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
