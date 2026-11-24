import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatShortDate } from '../lib/payrollEngine.ts';
import type { AuditAction, AuditLogEntry } from '../types/payroll.ts';

interface AuditLogsViewProps {
  logs: AuditLogEntry[];
}

export function AuditLogsView({ logs }: AuditLogsViewProps) {
  const [actionFilter, setActionFilter] = useState<'TODAS' | AuditAction>('TODAS');

  const filtered = logs.filter((l) =>
    actionFilter === 'TODAS' ? true : l.accion === actionFilter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bitácora Inmutable de Auditoría
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Registro automático de trazabilidad por usuario, rol, entidad afectada, IP de origen y cambios de estado.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-teal-800 bg-teal-50 border border-teal-200 px-3 py-2 rounded-md self-start">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Registro inmutable · Cuentas bancarias enmascaradas en vistas</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['TODAS', 'CREATE', 'UPDATE', 'DELETE', 'LIQUIDATE', 'EMIT'] as const).map(
              (act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setActionFilter(act)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                    actionFilter === act
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {act}
                </button>
              ),
            )}
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filtered.length} eventos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Fecha / Hora</th>
                <th className="py-3 px-4 whitespace-nowrap">Usuario y Rol</th>
                <th className="py-3 px-4 whitespace-nowrap">Acción</th>
                <th className="py-3 px-4 whitespace-nowrap">Entidad Afectada</th>
                <th className="py-3 px-4 whitespace-nowrap">Datos Anteriores → Nuevos</th>
                <th className="py-3 px-4 whitespace-nowrap">IP Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-slate-500">
                    Aún no hay movimientos registrados en la bitácora de auditoría de este espacio.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortDate(log.timestamp)} ·{' '}
                      {log.timestamp.slice(11, 19)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{log.usuario}</div>
                      <div className="font-mono text-slate-500">{log.rol}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-700 whitespace-nowrap">
                      {log.accion}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                      {log.entidadAfectada}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 max-w-md">
                      <div className="truncate" title={log.datosAnteriores}>
                        Ant: {log.datosAnteriores}
                      </div>
                      <div className="truncate text-slate-900" title={log.datosNuevos}>
                        Nvo: {log.datosNuevos}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.ipOrigen}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
