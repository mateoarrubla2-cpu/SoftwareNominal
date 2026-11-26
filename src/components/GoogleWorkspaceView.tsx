import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  FileText,
  HardDrive,
  LogOut,
  Mail,
} from 'lucide-react';
import {
  getAccessToken,
  getCurrentGoogleUser,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from '../lib/googleAuth.ts';
import type {
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
} from '../types/payroll.ts';
import { GoogleDriveView } from './GoogleDriveView.tsx';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { WorkspaceDocsPanel } from './WorkspaceDocsPanel.tsx';
import { WorkspaceGmailPanel } from './WorkspaceGmailPanel.tsx';
import { WorkspaceSheetsPanel } from './WorkspaceSheetsPanel.tsx';

type WorkspaceTab = 'drive' | 'sheets' | 'docs' | 'gmail';

interface GoogleWorkspaceViewProps {
  db: PayrollDatabase;
  period: PayrollPeriod;
  legislation: LegislationParams;
  onNotify: (msg: string) => void;
}

export function GoogleWorkspaceView({
  db,
  period,
  legislation,
  onNotify,
}: GoogleWorkspaceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<WorkspaceTab>('drive');
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void getAccessToken().then((existing) => {
      if (existing) {
        setToken(existing);
        setUser(getCurrentGoogleUser());
        setNeedsAuth(false);
      }
    });

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
  }, []);

  async function handleLogin() {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        onNotify('Conectado con Google Workspace (Drive, Sheets, Docs y Gmail)');
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el inicio de sesión con Google.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await logoutGoogle();
    setToken(null);
    setUser(null);
    setNeedsAuth(true);
    onNotify('Sesión de Google Workspace cerrada');
  }

  function handleAuthExpired() {
    setNeedsAuth(true);
    setToken(null);
    setAuthError(
      'Tu sesión de Google expiró. Inicia sesión nuevamente para continuar.',
    );
  }

  const activeUser = user ?? getCurrentGoogleUser();

  if (needsAuth || !token) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Google Workspace · Drive, Sheets, Docs y Gmail
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Conecta tu cuenta de Google para respaldar archivos en Drive, generar hojas de cálculo en Google Sheets, emitir certificados laborales en Google Docs y enviar desprendibles PDF por Gmail.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-2xl">
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Conectar con Google Workspace
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Al iniciar sesión con tu cuenta de Google, autorizas de forma segura el acceso desde el navegador para trabajar con tus documentos de nómina en:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <HardDrive className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Google Drive</p>
                  <p className="text-slate-500 mt-0.5">
                    Carpetas institucionales y respaldo automático de Excel/PDF.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Google Sheets</p>
                  <p className="text-slate-500 mt-0.5">
                    Libros nativos de nómina, prestaciones, vacaciones y eventualidades.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <FileText className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Google Docs</p>
                  <p className="text-slate-500 mt-0.5">
                    Certificados laborales y actas de nómina editables.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <Mail className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Gmail</p>
                  <p className="text-slate-500 mt-0.5">
                    Envío de desprendibles PDF a trabajadores y consulta de bandeja.
                  </p>
                </div>
              </div>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Unified Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Google Workspace · Centro Integrado INAMOD
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Administra archivos en Drive, genera libros en Sheets, emite actas/certificados en Docs y envía desprendibles por Gmail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {activeUser?.displayName ?? 'Cuenta Google Conectada'}
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              {activeUser?.email ?? ''}
            </p>
          </div>
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

      {/* Sub-navigation Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        {(
          [
            { id: 'drive', label: 'Google Drive', icon: HardDrive },
            { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
            { id: 'docs', label: 'Google Docs', icon: FileText },
            { id: 'gmail', label: 'Gmail', icon: Mail },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  active ? 'text-teal-700' : 'text-slate-500'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Workspace Service */}
      {activeSubTab === 'drive' && (
        <GoogleDriveView
          db={db}
          period={period}
          legislation={legislation}
          onNotify={onNotify}
          embeddedToken={token}
          onEmbeddedAuthExpired={handleAuthExpired}
        />
      )}

      {activeSubTab === 'sheets' && (
        <WorkspaceSheetsPanel
          token={token}
          db={db}
          period={period}
          onAuthExpired={handleAuthExpired}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'docs' && (
        <WorkspaceDocsPanel
          token={token}
          db={db}
          period={period}
          legislation={legislation}
          onAuthExpired={handleAuthExpired}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'gmail' && (
        <WorkspaceGmailPanel
          token={token}
          db={db}
          period={period}
          onAuthExpired={handleAuthExpired}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
