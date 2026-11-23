import { ExternalLink, RefreshCw } from 'lucide-react';

interface WorkspaceApiErrorBannerProps {
  error: string;
  serviceName: 'Google Drive' | 'Google Sheets' | 'Google Docs' | 'Gmail';
  apiSlug:
    | 'drive.googleapis.com'
    | 'sheets.googleapis.com'
    | 'docs.googleapis.com'
    | 'gmail.googleapis.com';
  onRetry?: () => void;
}

export function WorkspaceApiErrorBanner({
  error,
  serviceName,
  apiSlug,
  onRetry,
}: WorkspaceApiErrorBannerProps) {
  const isDisabledApiError =
    error.includes('has not been used in project') ||
    error.includes('is disabled');

  if (!isDisabledApiError) {
    return (
      <div className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <span>{error}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-rose-800 bg-white border border-rose-300 rounded hover:bg-rose-100 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    );
  }

  const projectMatch = error.match(/project[=\s]+(\d+)/i);
  const projectNumber = projectMatch?.[1] ?? '1092265636021';
  const enableUrl = `https://console.developers.google.com/apis/api/${apiSlug}/overview?project=${projectNumber}`;

  return (
    <div className="p-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
      <div>
        <p className="font-semibold">
          Habilita la API de {serviceName} en Google Cloud
        </p>
        <p className="text-xs text-amber-800 mt-1">
          Tu proyecto de Google Cloud (<span className="font-mono">{projectNumber}</span>) aún no tiene activada la API <span className="font-mono">{apiSlug}</span>. Ábrela, haz clic en <strong>Habilitar / Enable</strong>, espera unos segundos a que propague y pulsa <strong>Reintentar</strong>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={enableUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-700 rounded-md hover:bg-amber-800"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Habilitar {serviceName} API en Google Cloud</span>
        </a>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded-md hover:bg-amber-100 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    </div>
  );
}
