import { useState } from 'react';
import {
  AlertTriangle,
  Code2,
  Download,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { formatCOP } from '../lib/payrollEngine.ts';
import type { ElectronicPayrollDoc, PayrollPeriod } from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface ElectronicPayrollViewProps {
  docs: ElectronicPayrollDoc[];
  period: PayrollPeriod;
  onEmitDoc: (docId: string, simulateReject?: boolean) => Promise<void>;
  onEmitAllPeriod: (periodKey: string) => Promise<void>;
}

export function ElectronicPayrollView({
  docs,
  period,
  onEmitDoc,
  onEmitAllPeriod,
}: ElectronicPayrollViewProps) {
  const [inspectingDoc, setInspectingDoc] = useState<ElectronicPayrollDoc | null>(
    null,
  );
  const [emittingAll, setEmittingAll] = useState(false);

  const periodDocs = docs.filter((d) => d.periodKey === period.periodKey);
  const approvedCount = periodDocs.filter((d) => d.status === 'APROBADO').length;
  const pendingCount = periodDocs.filter((d) => d.status === 'PENDIENTE').length;
  const rejectedCount = periodDocs.filter((d) => d.status === 'RECHAZADO').length;

  function downloadXml(doc: ElectronicPayrollDoc) {
    const blob = new Blob([doc.xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DIAN_${doc.receiptNumber}_${doc.cune.slice(0, 8)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleEmitAll() {
    setEmittingAll(true);
    try {
      await onEmitAllPeriod(period.periodKey);
    } finally {
      setEmittingAll(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nómina Electrónica DIAN — {period.label}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Generación de XML estructurado (Anexo Técnico DIAN), cálculo de CUNE y transmisión mediante servicio Adapter REST.
          </p>
        </div>

        <button
          type="button"
          disabled={emittingAll || (pendingCount === 0 && rejectedCount === 0)}
          onClick={handleEmitAll}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 self-start"
        >
          <Send className="w-4 h-4" />
          <span>
            {emittingAll ? 'Transmitiendo...' : 'Transmitir Lote a DIAN'}
          </span>
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Aprobados DIAN</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            {approvedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Con CUNE validado</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Pendientes de Envío</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
            {pendingCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">XML listo para transmisión</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Rechazados / Reintento</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1.5">
            {rejectedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Disponibles para reenvío</p>
        </div>
      </div>

      {/* Electronic Docs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Comprobante</th>
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">CUNE (Código Único)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Neto XML</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado DIAN</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Reintentos</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {periodDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    Aún no hay documentos electrónicos XML en este período. Agrega trabajadores y liquida la nómina para generar sus CUNE automáticamente.
                  </td>
                </tr>
              ) : (
                periodDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-800 whitespace-nowrap">
                      {doc.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 whitespace-nowrap">
                        {doc.employeeName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        C.C. {doc.employeeDocumentId}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {doc.cune.slice(0, 18)}…
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatCOP(doc.netPay)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={doc.status} />
                      <p className="text-xs text-slate-500 max-w-xs truncate mt-0.5">
                        {doc.dianMessage}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {doc.retryCount}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>XML</span>
                        </button>

                        {doc.status === 'PENDIENTE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEmitDoc(doc.id, false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded hover:bg-teal-800 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Emitir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onEmitDoc(doc.id, true)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded hover:bg-amber-50 cursor-pointer"
                              title="Simular rechazo técnico DIAN para probar flujo de reintento"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {doc.status === 'RECHAZADO' && (
                          <button
                            type="button"
                            onClick={() => onEmitDoc(doc.id, false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reintentar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* XML Inspector Modal */}
      {inspectingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-300">
                  XML Anexo Técnico DIAN · CUNE: {inspectingDoc.cune}
                </p>
                <h2 className="text-base font-semibold truncate mt-0.5">
                  {inspectingDoc.receiptNumber} — {inspectingDoc.employeeName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto max-h-[60vh]">
              <pre className="whitespace-pre">{inspectingDoc.xmlContent}</pre>
            </div>

            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
              <span className="text-xs text-slate-600">{inspectingDoc.dianMessage}</span>
              <button
                type="button"
                onClick={() => downloadXml(inspectingDoc)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Descargar .XML</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
