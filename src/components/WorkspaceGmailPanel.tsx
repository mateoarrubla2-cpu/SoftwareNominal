import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Inbox,
  Mail,
  Paperclip,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  generatePayrollReportPDFBlob,
  generatePayslipPDFBlob,
} from '../lib/exportEngine.ts';
import {
  createGmailDraft,
  listGmailMessages,
  sendGmailMessage,
  trashGmailMessage,
  type GmailMessageSummary,
} from '../lib/googleGmail.ts';
import { formatCOP } from '../lib/payrollEngine.ts';
import type { PayrollDatabase, PayrollPeriod } from '../types/payroll.ts';
import { WorkspaceApiErrorBanner } from './WorkspaceApiErrorBanner.tsx';

interface WorkspaceGmailPanelProps {
  token: string;
  db: PayrollDatabase;
  period: PayrollPeriod;
  onAuthExpired: () => void;
  onNotify: (msg: string) => void;
}

type AttachmentChoice = 'none' | 'payslip' | 'payroll-report';

export function WorkspaceGmailPanel({
  token,
  db,
  period,
  onAuthExpired,
  onNotify,
}: WorkspaceGmailPanelProps) {
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] =
    useState<GmailMessageSummary | null>(null);

  const [selectedEmpId, setSelectedEmpId] = useState(
    db.employees[0]?.id ?? '',
  );
  const [toEmail, setToEmail] = useState(db.employees[0]?.email ?? '');
  const [subject, setSubject] = useState(
    `Desprendible de Pago Nómina - ${period.label}`,
  );
  const [bodyText, setBodyText] = useState('');
  const [attachmentChoice, setAttachmentChoice] =
    useState<AttachmentChoice>('payslip');

  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [confirmTrashMsg, setConfirmTrashMsg] =
    useState<GmailMessageSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoadingInbox(true);
    setError(null);
    try {
      const list = await listGmailMessages(token, searchQuery, 12);
      setMessages(list);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron consultar los correos de Gmail.',
        );
      }
    } finally {
      setLoadingInbox(false);
    }
  }, [onAuthExpired, searchQuery, token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function applyEmployeeTemplate(empId: string) {
    setSelectedEmpId(empId);
    const emp = db.employees.find((e) => e.id === empId);
    const slip = period.payslips.find((p) => p.employeeId === empId);
    if (!emp) return;
    setToEmail(emp.email);
    setSubject(`Desprendible de Pago - ${period.label} (${emp.fullName})`);
    setAttachmentChoice(slip ? 'payslip' : 'payroll-report');
    setBodyText(
      [
        `Cordial saludo, ${emp.fullName}:`,
        '',
        `Adjunto remitimos su desprendible de pago correspondiente al período ${period.label} (${period.frequency}) del ${db.company.name}.`,
        slip
          ? `Resumen: Devengado ${formatCOP(slip.grossPay)} | Deducciones ${formatCOP(slip.totalDeductions)} | Neto a pagar ${formatCOP(slip.netPay)}.`
          : '',
        '',
        'Atentamente,',
        'Área de Talento Humano y Nómina · INAMOD SENA',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  useEffect(() => {
    if (selectedEmpId && !bodyText) {
      applyEmployeeTemplate(selectedEmpId);
    }
  }, [selectedEmpId]);

  function buildSelectedAttachment():
    | { filename: string; mimeType: string; blob: Blob }
    | undefined {
    if (attachmentChoice === 'none') return undefined;
    if (attachmentChoice === 'payroll-report') {
      const { blob, filename } = generatePayrollReportPDFBlob(
        period,
        db.company,
      );
      return { blob, filename, mimeType: 'application/pdf' };
    }
    const slip =
      period.payslips.find((p) => p.employeeId === selectedEmpId) ??
      period.payslips[0];
    if (!slip) return undefined;
    const { blob, filename } = generatePayslipPDFBlob(slip, db.company);
    return { blob, filename, mimeType: 'application/pdf' };
  }

  async function handleConfirmSend() {
    if (!toEmail.trim() || !subject.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const attachment = buildSelectedAttachment();
      await sendGmailMessage(token, {
        to: toEmail.trim(),
        subject: subject.trim(),
        bodyText,
        attachment,
      });
      setConfirmSendOpen(false);
      onNotify(`Correo enviado a ${toEmail.trim()} desde tu cuenta Gmail`);
      await loadMessages();
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error ? err.message : 'Error al enviar correo.',
        );
      }
      setConfirmSendOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!toEmail.trim() || !subject.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const attachment = buildSelectedAttachment();
      await createGmailDraft(token, {
        to: toEmail.trim(),
        subject: subject.trim(),
        bodyText,
        attachment,
      });
      onNotify('Borrador guardado en tu cuenta de Gmail');
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error ? err.message : 'Error al guardar borrador.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmTrash() {
    if (!confirmTrashMsg) return;
    setBusy(true);
    setError(null);
    try {
      await trashGmailMessage(token, confirmTrashMsg.id);
      onNotify('Correo movido a la papelera de Gmail');
      if (selectedMessage?.id === confirmTrashMsg.id) {
        setSelectedMessage(null);
      }
      setConfirmTrashMsg(null);
      await loadMessages();
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo mover el correo a la papelera.',
        );
      }
      setConfirmTrashMsg(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <WorkspaceApiErrorBanner
          error={error}
          serviceName="Gmail"
          apiSlug="gmail.googleapis.com"
          onRetry={loadMessages}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Send Payslip / Notification Composer */}
        <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Mail className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Enviar Desprendible o Notificación por Gmail
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Plantilla rápida por trabajador ({period.label})
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => applyEmployeeTemplate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              {db.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Destinatario (Para)
              </label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adjunto PDF automático
              </label>
              <select
                value={attachmentChoice}
                onChange={(e) =>
                  setAttachmentChoice(e.target.value as AttachmentChoice)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="payslip">Desprendible Individual PDF</option>
                <option value="payroll-report">Reporte General Nómina PDF</option>
                <option value="none">Sin adjunto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Asunto
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mensaje
            </label>
            <textarea
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Paperclip className="w-3.5 h-3.5" />
              <span>
                {attachmentChoice === 'payslip'
                  ? 'Se adjuntará el PDF del desprendible'
                  : attachmentChoice === 'payroll-report'
                    ? 'Se adjuntará la sábana PDF'
                    : 'Solo texto'}
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !toEmail.trim() || !subject.trim()}
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Borrador</span>
              </button>
              <button
                type="button"
                disabled={busy || !toEmail.trim() || !subject.trim()}
                onClick={() => setConfirmSendOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar por Gmail</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recent Gmail Messages */}
        <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">
                  Bandeja de Gmail
                </h2>
              </div>
              <button
                type="button"
                onClick={loadMessages}
                disabled={loadingInbox}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingInbox ? 'animate-spin' : ''}`}
                />
                <span>Actualizar</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadMessages();
                }}
                placeholder="Buscar correos (ej. nómina, desprendible, from:...) y presionar Enter"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[460px] overflow-y-auto">
            {loadingInbox ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Consultando Gmail...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se encontraron correos con este criterio.
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 transition-colors ${
                      isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMessage(isSelected ? null : msg)
                        }
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {msg.from}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {msg.snippet}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmTrashMsg(msg)}
                        className="p-1.5 text-slate-400 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer shrink-0"
                        title="Mover a la papelera de Gmail"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Modal Before Sending Email */}
      {confirmSendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Confirmar envío de correo por Gmail
              </h3>
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p className="text-slate-600">
                ¿Confirmas enviar este correo electrónico desde tu cuenta de Gmail?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5 text-xs">
                <p>
                  <span className="text-slate-500">Para:</span>{' '}
                  <strong className="text-slate-900 font-mono">{toEmail}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Asunto:</span>{' '}
                  <strong className="text-slate-900">{subject}</strong>
                </p>
                {attachmentChoice !== 'none' && (
                  <p className="inline-flex items-center gap-1 text-teal-800 font-medium pt-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      Adjunto:{' '}
                      {attachmentChoice === 'payslip'
                        ? 'Desprendible de Pago PDF'
                        : 'Reporte General de Nómina PDF'}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmSendOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConfirmSend}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{busy ? 'Enviando...' : 'Confirmar y Enviar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal Before Trashing Email */}
      {confirmTrashMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Mover correo a la papelera
              </h3>
              <button
                type="button"
                onClick={() => setConfirmTrashMsg(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                ¿Confirmas mover el correo{' '}
                <strong className="text-slate-900">
                  "{confirmTrashMsg.subject}"
                </strong>{' '}
                a la papelera de Gmail?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmTrashMsg(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConfirmTrash}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-rose-700 rounded-md hover:bg-rose-800 cursor-pointer disabled:opacity-60"
                >
                  {busy ? 'Moviendo...' : 'Mover a Papelera'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
