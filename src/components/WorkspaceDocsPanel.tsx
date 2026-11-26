import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  ScrollText,
  X,
} from 'lucide-react';
import {
  appendNoteToGoogleDoc,
  createLaborCertificateGoogleDoc,
  createPayrollMinutesGoogleDoc,
  getGoogleDoc,
  listGoogleDocs,
  type GoogleDocContent,
} from '../lib/googleDocs.ts';
import type { DriveFile } from '../lib/googleDrive.ts';
import { formatShortDate } from '../lib/payrollEngine.ts';
import type {
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
} from '../types/payroll.ts';
import { WorkspaceApiErrorBanner } from './WorkspaceApiErrorBanner.tsx';

interface WorkspaceDocsPanelProps {
  token: string;
  db: PayrollDatabase;
  period: PayrollPeriod;
  legislation: LegislationParams;
  onAuthExpired: () => void;
  onNotify: (msg: string) => void;
}

export function WorkspaceDocsPanel({
  token,
  db,
  period,
  legislation,
  onAuthExpired,
  onNotify,
}: WorkspaceDocsPanelProps) {
  const [docs, setDocs] = useState<DriveFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GoogleDocContent | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    db.employees[0]?.id ?? '',
  );
  const [generating, setGenerating] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [confirmAppendOpen, setConfirmAppendOpen] = useState(false);
  const [appending, setAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await listGoogleDocs(token);
      setDocs(list);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron listar los documentos de Google Docs.',
        );
      }
    } finally {
      setLoadingList(false);
    }
  }, [onAuthExpired, token]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openDoc(docId: string) {
    setLoadingDoc(true);
    setError(null);
    try {
      const content = await getGoogleDoc(token, docId);
      setSelectedDoc(content);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo leer el documento de Google Docs.',
        );
      }
    } finally {
      setLoadingDoc(false);
    }
  }

  async function handleGenerateCertificate() {
    const emp = db.employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;
    setGenerating('cert');
    setError(null);
    try {
      const doc = await createLaborCertificateGoogleDoc(
        token,
        emp,
        db,
        legislation,
      );
      setSelectedDoc(doc);
      onNotify(`Certificado laboral "${doc.title}" creado en Google Docs`);
      await loadList();
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al generar certificado en Google Docs.',
        );
      }
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateMinutes() {
    setGenerating('minutes');
    setError(null);
    try {
      const doc = await createPayrollMinutesGoogleDoc(token, db, period);
      setSelectedDoc(doc);
      onNotify(`Acta "${doc.title}" creada en Google Docs`);
      await loadList();
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al generar acta de nómina en Google Docs.',
        );
      }
    } finally {
      setGenerating(null);
    }
  }

  async function handleConfirmAppend() {
    if (!selectedDoc || !noteInput.trim()) return;
    setAppending(true);
    setError(null);
    try {
      const updated = await appendNoteToGoogleDoc(
        token,
        selectedDoc.documentId,
        selectedDoc.endIndex,
        noteInput.trim(),
      );
      setSelectedDoc(updated);
      setNoteInput('');
      setConfirmAppendOpen(false);
      onNotify(`Nota agregada al documento "${updated.title}"`);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el documento de Google Docs.',
        );
      }
      setConfirmAppendOpen(false);
    } finally {
      setAppending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Generators Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Generador de Documentos Oficiales en Google Docs
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Crea certificados laborales y actas de liquidación editables directamente en Google Docs, o consulta tus documentos existentes.
            </p>
          </div>
          <button
            type="button"
            onClick={loadList}
            disabled={loadingList}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
            aria-label="Seleccionar trabajador para certificado"
          >
            {db.employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} — {emp.role}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={generating !== null || !selectedEmployeeId}
            onClick={handleGenerateCertificate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {generating === 'cert'
                ? 'Creando...'
                : 'Crear Certificado Laboral (Doc)'}
            </span>
          </button>

          <button
            type="button"
            disabled={generating !== null}
            onClick={handleGenerateMinutes}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>
              {generating === 'minutes'
                ? 'Creando...'
                : `Crear Acta Nómina ${period.label} (Doc)`}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <WorkspaceApiErrorBanner
          error={error}
          serviceName="Google Docs"
          apiSlug="docs.googleapis.com"
          onRetry={loadList}
        />
      )}

      {/* Split Layout: Doc List + Reader/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-700">
              Mis Documentos de Google Docs ({docs.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 max-h-[480px] overflow-y-auto">
            {loadingList ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Consultando Google Docs...
              </div>
            ) : docs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No se encontraron documentos de Google Docs en tu cuenta.
              </div>
            ) : (
              docs.map((doc) => {
                const isSelected = selectedDoc?.documentId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => openDoc(doc.id)}
                    className={`w-full p-3.5 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {doc.modifiedTime ? formatShortDate(doc.modifiedTime) : '—'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loadingDoc ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Cargando contenido del documento...
            </div>
          ) : !selectedDoc ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">
                Selecciona un documento de la lista o genera un certificado laboral / acta en Google Docs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              <div className="p-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {selectedDoc.title}
                </h3>
                <a
                  href={selectedDoc.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Docs</span>
                </a>
              </div>

              <div className="p-5 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
                  {selectedDoc.bodyText || '(Documento vacío)'}
                </pre>
              </div>

              <div className="p-4 space-y-2.5">
                <label className="block text-xs font-medium text-slate-700">
                  Anexar nota o firma al final del documento
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Ej. Verificado por Coordinación INAMOD..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    disabled={!noteInput.trim()}
                    onClick={() => setConfirmAppendOpen(true)}
                    className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    Agregar al Documento
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explicit Confirmation Modal for Appending to Existing Google Doc */}
      {confirmAppendOpen && selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Confirmar modificación en Google Docs
              </h3>
              <button
                type="button"
                onClick={() => setConfirmAppendOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                ¿Confirmas agregar el siguiente texto al final del documento{' '}
                <strong className="text-slate-900">"{selectedDoc.title}"</strong>?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800">
                {noteInput}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmAppendOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={appending}
                  onClick={handleConfirmAppend}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer disabled:opacity-60"
                >
                  {appending ? 'Guardando...' : 'Confirmar y Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
