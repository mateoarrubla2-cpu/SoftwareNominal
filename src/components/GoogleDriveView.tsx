import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  ChevronRight,
  CloudUpload,
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  generateAllPayslipsPDFBlob,
  generatePayrollReportPDFBlob,
  generatePayrollWorkbookExcelBlob,
  generateSocialBenefitsPDFBlob,
} from '../lib/exportEngine.ts';
import {
  getAccessToken,
  getCurrentGoogleUser,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from '../lib/googleAuth.ts';
import {
  createDriveFolder,
  deleteDriveFilePermanently,
  downloadDriveFile,
  DRIVE_FOLDER_MIME,
  ensureInamodFolder,
  getDriveAbout,
  listDriveFiles,
  renameDriveFile,
  trashDriveFile,
  uploadBlobToDrive,
  type DriveAboutResponse,
  type DriveFile,
} from '../lib/googleDrive.ts';
import { formatShortDate } from '../lib/payrollEngine.ts';
import type {
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
} from '../types/payroll.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { WorkspaceApiErrorBanner } from './WorkspaceApiErrorBanner.tsx';

interface GoogleDriveViewProps {
  db: PayrollDatabase;
  period: PayrollPeriod;
  legislation: LegislationParams;
  onNotify: (msg: string) => void;
  embeddedToken?: string;
  onEmbeddedAuthExpired?: () => void;
}

interface FolderCrumb {
  id: string | null;
  name: string;
}

type ConfirmActionState =
  | {
      kind: 'trash' | 'delete';
      file: DriveFile;
    }
  | {
      kind: 'rename';
      file: DriveFile;
      nextName: string;
    }
  | null;

function formatBytes(sizeStr?: string): string {
  if (!sizeStr) return '—';
  const bytes = Number(sizeStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getMimeLabel(mimeType: string): string {
  if (mimeType === DRIVE_FOLDER_MIME) return 'Carpeta';
  if (mimeType === 'application/pdf') return 'PDF';
  if (
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'Excel / Hoja';
  }
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/json') return 'JSON';
  if (mimeType.startsWith('image/')) return 'Imagen';
  return 'Archivo';
}

export function GoogleDriveView({
  db,
  period,
  legislation,
  onNotify,
  embeddedToken,
  onEmbeddedAuthExpired,
}: GoogleDriveViewProps) {
  const [needsAuth, setNeedsAuth] = useState(!embeddedToken);
  const [token, setToken] = useState<string | null>(embeddedToken ?? null);
  const [user, setUser] = useState<User | null>(null);
  const [about, setAbout] = useState<DriveAboutResponse | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [breadcrumbs, setBreadcrumbs] = useState<FolderCrumb[]>([
    { id: null, name: 'Mi Unidad' },
  ]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState<
    'all' | 'folders' | 'pdf' | 'spreadsheets'
  >('all');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id ?? undefined;

  useEffect(() => {
    if (embeddedToken) {
      setToken(embeddedToken);
      setNeedsAuth(false);
      return;
    }
    const unsub = initAuth(
      (signedUser, activeToken) => {
        setUser(signedUser);
        setToken(activeToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      },
    );
    return () => unsub();
  }, [embeddedToken]);

  const loadDriveData = useCallback(
    async (activeToken: string) => {
      setLoadingFiles(true);
      setDriveError(null);
      try {
        const [fileList, aboutInfo] = await Promise.all([
          listDriveFiles(activeToken, {
            folderId: currentFolderId,
            searchQuery,
            mimeFilter,
          }),
          about ? Promise.resolve(about) : getDriveAbout(activeToken).catch(() => null),
        ]);
        setFiles(fileList);
        if (aboutInfo) setAbout(aboutInfo);
      } catch (err) {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
          if (onEmbeddedAuthExpired) {
            onEmbeddedAuthExpired();
          } else {
            setNeedsAuth(true);
            setToken(null);
            setAuthError(
              'Tu sesión de Google Drive expiró. Inicia sesión nuevamente para continuar.',
            );
          }
        } else {
          setDriveError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los archivos de Google Drive.',
          );
        }
      } finally {
        setLoadingFiles(false);
      }
    },
    [about, currentFolderId, mimeFilter, onEmbeddedAuthExpired, searchQuery],
  );

  useEffect(() => {
    if (token && !needsAuth) {
      loadDriveData(token);
    }
  }, [token, needsAuth, loadDriveData]);

  async function resolveToken(): Promise<string | null> {
    const active = embeddedToken ?? token ?? (await getAccessToken());
    if (!active) {
      if (onEmbeddedAuthExpired) onEmbeddedAuthExpired();
      else setNeedsAuth(true);
      return null;
    }
    return active;
  }

  async function handleLogin() {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        onNotify('Conectado con Google Drive correctamente');
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo completar la autenticación con Google.';
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await logoutGoogle();
    setToken(null);
    setUser(null);
    setAbout(null);
    setFiles([]);
    setBreadcrumbs([{ id: null, name: 'Mi Unidad' }]);
    setNeedsAuth(true);
    onNotify('Sesión de Google Drive cerrada');
  }

  async function uploadGeneratedFile(
    label: string,
    generator: () => { blob: Blob; filename: string; mimeType: string },
  ) {
    const activeToken = await resolveToken();
    if (!activeToken) return;
    setBusyAction(label);
    setDriveError(null);
    try {
      const targetParentId =
        currentFolderId ?? (await ensureInamodFolder(activeToken)).id;
      const { blob, filename, mimeType } = generator();
      await uploadBlobToDrive(activeToken, {
        blob,
        filename,
        mimeType,
        parentId: targetParentId,
        description: `Generado desde INAMOD Nómina · ${period.label}`,
      });
      onNotify(`Archivo "${filename}" guardado en Google Drive`);
      await loadDriveData(activeToken);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
        setToken(null);
      } else {
        setDriveError(
          err instanceof Error
            ? err.message
            : 'Error al subir archivo a Google Drive.',
        );
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLocalFileUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const activeToken = await resolveToken();
    if (!activeToken) return;
    const file = fileList[0];
    setBusyAction('local-upload');
    setDriveError(null);
    try {
      const targetParentId =
        currentFolderId ?? (await ensureInamodFolder(activeToken)).id;
      await uploadBlobToDrive(activeToken, {
        blob: file,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        parentId: targetParentId,
        description: 'Soporte laboral cargado desde INAMOD Nómina',
      });
      onNotify(`"${file.name}" subido a Google Drive`);
      await loadDriveData(activeToken);
    } catch (err) {
      setDriveError(
        err instanceof Error
          ? err.message
          : 'No se pudo subir el archivo seleccionado.',
      );
    } finally {
      setBusyAction(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const activeToken = await resolveToken();
    if (!activeToken) return;
    setBusyAction('create-folder');
    try {
      await createDriveFolder(activeToken, trimmed, currentFolderId);
      setNewFolderModalOpen(false);
      setNewFolderName('');
      onNotify(`Carpeta "${trimmed}" creada en Google Drive`);
      await loadDriveData(activeToken);
    } catch (err) {
      setDriveError(
        err instanceof Error ? err.message : 'No se pudo crear la carpeta.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmMutation() {
    if (!confirmAction) return;
    const activeToken = await resolveToken();
    if (!activeToken) return;

    setBusyAction('mutate-file');
    try {
      if (confirmAction.kind === 'rename') {
        const cleanName = confirmAction.nextName.trim();
        if (!cleanName) return;
        await renameDriveFile(activeToken, confirmAction.file.id, cleanName);
        onNotify(`Archivo renombrado a "${cleanName}"`);
      } else if (confirmAction.kind === 'trash') {
        await trashDriveFile(activeToken, confirmAction.file.id);
        onNotify(`"${confirmAction.file.name}" movido a la papelera de Drive`);
      } else if (confirmAction.kind === 'delete') {
        await deleteDriveFilePermanently(activeToken, confirmAction.file.id);
        onNotify(`"${confirmAction.file.name}" eliminado permanentemente de Drive`);
      }
      setConfirmAction(null);
      await loadDriveData(activeToken);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
        setToken(null);
      } else {
        setDriveError(
          err instanceof Error
            ? err.message
            : 'No se pudo completar la operación en Google Drive.',
        );
      }
      setConfirmAction(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownload(file: DriveFile) {
    const activeToken = await resolveToken();
    if (!activeToken) return;
    setBusyAction(`download-${file.id}`);
    try {
      await downloadDriveFile(activeToken, file);
    } catch (err) {
      setDriveError(
        err instanceof Error ? err.message : 'Error al descargar desde Drive.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  const activeUser = user ?? getCurrentGoogleUser();

  if (needsAuth || !token) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Respaldo y Archivos en Google Drive
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Conecta tu cuenta de Google para respaldar reportes de nómina en PDF y Excel, organizar carpetas institucionales y gestionar documentos de respaldo directamente en Google Drive.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Conectar con Google Drive
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Inicia sesión con tu cuenta de Google para autorizar el acceso a tus archivos y carpetas, subir libros de nómina y administrar respaldos en la nube.
                </p>
              </div>

              {authError && (
                <div className="px-3.5 py-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {authError}
                </div>
              )}

              <div className="pt-1">
                <GoogleSignInButton
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embeddedToken && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Google Drive · Repositorio de Nómina INAMOD
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Sube reportes PDF/Excel de {period.label}, organiza carpetas de soporte laboral y gestiona archivos en la nube.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {about?.user?.displayName ?? activeUser?.displayName ?? 'Cuenta Google'}
              </p>
              <p className="text-xs text-slate-500 font-mono truncate">
                {about?.user?.emailAddress ?? activeUser?.email ?? ''}
                {about?.storageQuota?.usage
                  ? ` · ${formatBytes(about.storageQuota.usage)} usados`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDriveData(token)}
              disabled={loadingFiles}
              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
              title="Actualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Export to Drive */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Respaldo Directo del Período ({period.label}) a Google Drive
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentFolderId
                ? `Se guardará dentro de la carpeta actual (${breadcrumbs[breadcrumbs.length - 1]?.name}).`
                : 'Se guardará automáticamente en la carpeta institucional "INAMOD Nómina - SENA".'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              uploadGeneratedFile('excel-nomina', () => {
                const { blob, filename } = generatePayrollWorkbookExcelBlob(
                  db,
                  period,
                );
                return {
                  blob,
                  filename,
                  mimeType:
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                };
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {busyAction === 'excel-nomina'
                ? 'Subiendo...'
                : 'Subir Libro Nómina (.xlsx)'}
            </span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              uploadGeneratedFile('pdf-nomina', () => {
                const { blob, filename } = generatePayrollReportPDFBlob(
                  period,
                  db.company,
                );
                return { blob, filename, mimeType: 'application/pdf' };
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {busyAction === 'pdf-nomina'
                ? 'Subiendo...'
                : 'Subir Reporte Nómina (.pdf)'}
            </span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null || period.payslips.length === 0}
            onClick={() =>
              uploadGeneratedFile('pdf-desprendibles', () => {
                const { blob, filename } = generateAllPayslipsPDFBlob(
                  period,
                  db.company,
                );
                return { blob, filename, mimeType: 'application/pdf' };
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {busyAction === 'pdf-desprendibles'
                ? 'Subiendo...'
                : 'Subir Desprendibles (.pdf)'}
            </span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              uploadGeneratedFile('pdf-prestaciones', () => {
                const { blob, filename } = generateSocialBenefitsPDFBlob(
                  db.employees,
                  legislation,
                  db.company,
                );
                return { blob, filename, mimeType: 'application/pdf' };
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {busyAction === 'pdf-prestaciones'
                ? 'Subiendo...'
                : 'Subir Prestaciones (.pdf)'}
            </span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              uploadGeneratedFile('json-backup', () => ({
                blob: new Blob([JSON.stringify(db, null, 2)], {
                  type: 'application/json',
                }),
                filename: `Respaldo_INAMOD_${period.periodKey}.json`,
                mimeType: 'application/json',
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {busyAction === 'json-backup'
                ? 'Subiendo...'
                : 'Respaldo Datos (.json)'}
            </span>
          </button>
        </div>
      </div>

      {driveError && (
        <WorkspaceApiErrorBanner
          error={driveError}
          serviceName="Google Drive"
          apiSlug="drive.googleapis.com"
          onRetry={() => token && loadDriveData(token)}
        />
      )}

      {/* Drive File Explorer */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Toolbar & Breadcrumbs */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <nav
              aria-label="Ruta de carpetas en Drive"
              className="flex flex-wrap items-center gap-1 text-sm"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={crumb.id ?? 'root'} className="inline-flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setBreadcrumbs((prev) => prev.slice(0, idx + 1));
                      }}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer ${
                        isLast
                          ? 'text-slate-900 bg-slate-100 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewFolderName('');
                  setNewFolderModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nueva Carpeta</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleLocalFileUpload(e.target.files)}
              />
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>
                  {busyAction === 'local-upload' ? 'Subiendo...' : 'Subir Archivo'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en todo Google Drive por nombre..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'folders', label: 'Carpetas' },
                  { id: 'pdf', label: 'PDF' },
                  { id: 'spreadsheets', label: 'Excel / Hojas' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMimeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mimeFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Nombre</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipo</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Tamaño</th>
                <th className="py-3 px-4 whitespace-nowrap">Modificado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loadingFiles ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                    Consultando Google Drive...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                    No se encontraron archivos en esta ubicación.
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
                  const isPdf = file.mimeType === 'application/pdf';
                  const isSheet =
                    file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
                    file.mimeType ===
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        {isFolder ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setBreadcrumbs((prev) => [
                                ...prev,
                                { id: file.id, name: file.name },
                              ]);
                            }}
                            className="inline-flex items-center gap-2 font-medium text-slate-900 hover:text-teal-700 cursor-pointer text-left"
                          >
                            <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{file.name}</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 font-medium text-slate-900">
                            {isPdf ? (
                              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : isSheet ? (
                              <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0" />
                            ) : (
                              <File className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span>{file.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {getMimeLabel(file.mimeType)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {isFolder ? '—' : formatBytes(file.size)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {file.modifiedTime ? formatShortDate(file.modifiedTime) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                              title="Abrir en Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </a>
                          )}
                          {!isFolder && (
                            <button
                              type="button"
                              disabled={busyAction === `download-${file.id}`}
                              onClick={() => handleDownload(file)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                              title="Descargar archivo"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                kind: 'rename',
                                file,
                                nextName: file.name,
                              })
                            }
                            className="p-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                            title="Renombrar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                kind: 'trash',
                                file,
                              })
                            }
                            className="p-1 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                            title="Mover a la papelera o eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Folder Modal */}
      {newFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Crear Nueva Carpeta en Google Drive
              </h2>
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de la carpeta
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej. Soportes Nómina Noviembre 2026"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'create-folder'}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {busyAction === 'create-folder' ? 'Creando...' : 'Crear Carpeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Destructive / Mutating Drive Actions */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {confirmAction.kind === 'rename'
                  ? 'Confirmar cambio de nombre en Google Drive'
                  : confirmAction.kind === 'delete'
                    ? 'Confirmar eliminación permanente'
                    : 'Confirmar movimiento a papelera'}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {confirmAction.kind === 'rename' ? (
                <>
                  <p className="text-sm text-slate-600">
                    ¿Confirmas renombrar el archivo{' '}
                    <strong className="text-slate-900">
                      "{confirmAction.file.name}"
                    </strong>{' '}
                    en tu Google Drive?
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nuevo nombre
                    </label>
                    <input
                      type="text"
                      value={confirmAction.nextName}
                      onChange={(e) =>
                        setConfirmAction({
                          ...confirmAction,
                          nextName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {confirmAction.kind === 'delete' ? (
                      <>
                        ¿Estás seguro de eliminar{' '}
                        <strong className="text-rose-700">permanentemente</strong>{' '}
                        el elemento{' '}
                        <strong className="text-slate-900">
                          "{confirmAction.file.name}"
                        </strong>{' '}
                        de tu Google Drive? Esta acción no se puede deshacer.
                      </>
                    ) : (
                      <>
                        ¿Deseas mover el elemento{' '}
                        <strong className="text-slate-900">
                          "{confirmAction.file.name}"
                        </strong>{' '}
                        a la papelera de tu Google Drive?
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmAction.kind === 'delete'}
                        onChange={(e) =>
                          setConfirmAction({
                            kind: e.target.checked ? 'delete' : 'trash',
                            file: confirmAction.file,
                          })
                        }
                        className="accent-rose-700"
                      />
                      <span>Eliminar permanentemente sin pasar por la papelera</span>
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    busyAction === 'mutate-file' ||
                    (confirmAction.kind === 'rename' &&
                      !confirmAction.nextName.trim())
                  }
                  onClick={handleConfirmMutation}
                  className={`px-3.5 py-2 text-xs font-medium text-white rounded-md cursor-pointer disabled:opacity-60 ${
                    confirmAction.kind === 'rename'
                      ? 'bg-teal-700 hover:bg-teal-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {busyAction === 'mutate-file'
                    ? 'Procesando...'
                    : confirmAction.kind === 'rename'
                      ? 'Confirmar Cambio'
                      : confirmAction.kind === 'delete'
                        ? 'Eliminar Permanentemente'
                        : 'Mover a Papelera'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
