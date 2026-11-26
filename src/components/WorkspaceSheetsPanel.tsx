import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import type { DriveFile } from '../lib/googleDrive.ts';
import {
  createPayrollGoogleSpreadsheet,
  getSpreadsheetMetadata,
  listGoogleSpreadsheets,
  readSpreadsheetSheetValues,
  updateExistingSpreadsheetTab,
  type SpreadsheetMetadata,
} from '../lib/googleSheets.ts';
import { formatShortDate } from '../lib/payrollEngine.ts';
import type { PayrollDatabase, PayrollPeriod } from '../types/payroll.ts';
import { WorkspaceApiErrorBanner } from './WorkspaceApiErrorBanner.tsx';

interface WorkspaceSheetsPanelProps {
  token: string;
  db: PayrollDatabase;
  period: PayrollPeriod;
  onAuthExpired: () => void;
  onNotify: (msg: string) => void;
}

export function WorkspaceSheetsPanel({
  token,
  db,
  period,
  onAuthExpired,
  onNotify,
}: WorkspaceSheetsPanelProps) {
  const [spreadsheets, setSpreadsheets] = useState<DriveFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<SpreadsheetMetadata | null>(
    null,
  );
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [rows, setRows] = useState<string[][]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await listGoogleSpreadsheets(token);
      setSpreadsheets(list);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron listar las hojas de cálculo.',
        );
      }
    } finally {
      setLoadingList(false);
    }
  }, [onAuthExpired, token]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openSpreadsheet(spreadsheetId: string) {
    setLoadingSheet(true);
    setError(null);
    try {
      const meta = await getSpreadsheetMetadata(token, spreadsheetId);
      setSelectedMeta(meta);
      const firstTitle = meta.sheets[0]?.title ?? '';
      setActiveTabTitle(firstTitle);
      if (firstTitle) {
        const values = await readSpreadsheetSheetValues(
          token,
          spreadsheetId,
          firstTitle,
        );
        setRows(values);
      } else {
        setRows([]);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo leer la hoja de cálculo.',
        );
      }
    } finally {
      setLoadingSheet(false);
    }
  }

  async function selectSheetTab(tabTitle: string) {
    if (!selectedMeta) return;
    setActiveTabTitle(tabTitle);
    setLoadingSheet(true);
    setError(null);
    try {
      const values = await readSpreadsheetSheetValues(
        token,
        selectedMeta.spreadsheetId,
        tabTitle,
      );
      setRows(values);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error ? err.message : 'Error al leer la pestaña.',
        );
      }
    } finally {
      setLoadingSheet(false);
    }
  }

  async function handleCreatePayrollSheet() {
    setCreating(true);
    setError(null);
    try {
      const created = await createPayrollGoogleSpreadsheet(token, db, period);
      onNotify(`Hoja "${created.properties.title}" creada en Google Sheets`);
      await loadList();
      await openSpreadsheet(created.spreadsheetId);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo crear la hoja de Google Sheets.',
        );
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmOverwriteTab() {
    if (!selectedMeta || !activeTabTitle) return;
    setUpdating(true);
    setError(null);
    try {
      const payrollValues: (string | number)[][] = [
        [
          'Comprobante',
          'Cédula',
          'Colaborador',
          'Cargo',
          'Área',
          'Periodicidad',
          'Salario Básico',
          'Aux. Transporte',
          'Total Devengado',
          'Total Deducciones',
          'Neto a Pagar',
          'Estado',
        ],
        ...period.payslips.map((p) => [
          p.receiptNumber,
          p.employeeDocumentId,
          p.employeeName,
          p.employeeRole,
          p.department,
          p.frequency,
          p.baseSalaryPeriod,
          p.auxilioTransporte,
          p.grossPay,
          p.totalDeductions,
          p.netPay,
          p.paymentStatus,
        ]),
      ];
      await updateExistingSpreadsheetTab(
        token,
        selectedMeta.spreadsheetId,
        activeTabTitle,
        payrollValues,
      );
      setConfirmOverwriteOpen(false);
      onNotify(
        `Pestaña "${activeTabTitle}" actualizada con la nómina de ${period.label}`,
      );
      await selectSheetTab(activeTabTitle);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al actualizar la hoja de Google Sheets.',
        );
      }
      setConfirmOverwriteOpen(false);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Exportar y Consultar en Google Sheets — {period.label}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Genera una hoja de cálculo nativa en Google Sheets con 4 pestañas (Nómina, Prestaciones, Vacaciones y Eventualidades) o inspecciona tus hojas existentes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadList}
            disabled={loadingList}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreatePayrollSheet}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {creating
                ? 'Creando en Sheets...'
                : 'Crear Hoja de Nómina en Sheets'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <WorkspaceApiErrorBanner
          error={error}
          serviceName="Google Sheets"
          apiSlug="sheets.googleapis.com"
          onRetry={loadList}
        />
      )}

      {/* Split Layout: Spreadsheet List + Sheet Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-700">
              Mis Hojas de Cálculo ({spreadsheets.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 max-h-[480px] overflow-y-auto">
            {loadingList ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Consultando Google Sheets...
              </div>
            ) : spreadsheets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No tienes hojas de cálculo aún. Usa el botón superior para generar la nómina en Google Sheets.
              </div>
            ) : (
              spreadsheets.map((sheet) => {
                const isSelected = selectedMeta?.spreadsheetId === sheet.id;
                return (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => openSpreadsheet(sheet.id)}
                    className={`w-full p-3.5 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {sheet.name}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {sheet.modifiedTime
                          ? formatShortDate(sheet.modifiedTime)
                          : '—'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {!selectedMeta ? (
            <div className="p-12 text-center space-y-2">
              <FileSpreadsheet className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">
                Selecciona una hoja de cálculo de la izquierda o crea una nueva con la nómina actual.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {selectedMeta.properties.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {selectedMeta.sheets.map((tab) => (
                      <button
                        key={tab.sheetId}
                        type="button"
                        onClick={() => selectSheetTab(tab.title)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${
                          activeTabTitle === tab.title
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {tab.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmOverwriteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Sincronizar Nómina aquí</span>
                  </button>
                  <a
                    href={selectedMeta.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en Sheets</span>
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                {loadingSheet ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Leyendo celdas...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    La pestaña "{activeTabTitle}" no tiene filas registradas.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-medium text-slate-600">
                        {rows[0].map((cell, idx) => (
                          <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.slice(1).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          {rows[0].map((_, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono tabular-nums"
                            >
                              {row[cIdx] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Overwriting Existing Sheet Tab */}
      {confirmOverwriteOpen && selectedMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Confirmar actualización en Google Sheets
              </h3>
              <button
                type="button"
                onClick={() => setConfirmOverwriteOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                ¿Confirmas sobrescribir el contenido desde la celda <code className="font-mono">A1</code> en la pestaña{' '}
                <strong className="text-slate-900">"{activeTabTitle}"</strong> del libro{' '}
                <strong className="text-slate-900">"{selectedMeta.properties.title}"</strong> con los datos actuales de{' '}
                <strong className="text-slate-900">{period.label}</strong>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmOverwriteOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleConfirmOverwriteTab}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer disabled:opacity-60"
                >
                  {updating ? 'Actualizando...' : 'Confirmar y Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
