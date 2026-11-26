import { CheckCircle2, Clock, FileEdit, Plane, XCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  switch (status) {
    case 'Pagado':
    case 'Pagada':
    case 'Aprobada':
    case 'APROBADO':
    case 'Activo':
    case 'Sí aplica':
    case 'Aplicada en Nómina':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Procesada':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Pendiente':
    case 'PENDIENTE':
    case 'Activa':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Borrador':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <FileEdit className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Cerrada':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Vacaciones':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 whitespace-nowrap">
          <Plane className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Rechazada':
    case 'RECHAZADO':
    case 'Retirado':
    case 'Inactivo':
    case 'Pausado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
          {status}
        </span>
      );
  }
}
