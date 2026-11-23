import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  exportAllPayslipsPDF,
  exportBenefitsExcel,
  exportBenefitsPDF,
  exportPayrollReportPDF,
  exportPayrollWorkbookExcel,
  exportSocialBenefitsPDF,
  exportVacationsExcel,
  exportVacationsPDF,
} from '../lib/exportEngine.ts';
import { formatCOP } from '../lib/payrollEngine.ts';
import type { LegislationParams, PayrollDatabase, PayrollPeriod } from '../types/payroll.ts';

interface ReportsViewProps {
  db: PayrollDatabase;
  period: PayrollPeriod;
  legislation: LegislationParams;
}

export function ReportsView({ db, period, legislation }: ReportsViewProps) {
  const deptMap = new Map<
    string,
    { count: number; base: number; aux: number; gross: number; deductions: number; net: number }
  >();

  for (const p of period.payslips) {
    const cur = deptMap.get(p.department) ?? {
      count: 0,
      base: 0,
      aux: 0,
      gross: 0,
      deductions: 0,
      net: 0,
    };
    cur.count += 1;
    cur.base += p.baseSalaryPeriod;
    cur.aux += p.auxilioTransporte;
    cur.gross += p.grossPay;
    cur.deductions += p.totalDeductions;
    cur.net += p.netPay;
    deptMap.set(p.department, cur);
  }

  const departmentRows = Array.from(deptMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Centro de Reportes PDF y Excel — {period.label}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Exportación directa para contabilidad SENA / INAMOD, dispersión bancaria y revisión de prestaciones sociales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Libro Integral de Nómina (Excel .xlsx)</span>
            </div>
            <p className="text-sm text-slate-600 mt-1.5">
              Archivo multi-hoja con nómina del período {period.label}, prestaciones sociales acumuladas (Prima, Cesantías, Intereses) y vacaciones.
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-mono text-slate-500">3 hojas · .xlsx</span>
            <button
              type="button"
              onClick={() => exportPayrollWorkbookExcel(db, period)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Excel</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Reporte General de Nómina (PDF)</span>
            </div>
            <p className="text-sm text-slate-600 mt-1.5">
              Sábana consolidada horizontal con devengos, auxilio de transporte, salud, pensión, FSP, retefuente y neto a pagar.
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-mono text-slate-500">A4 Horizontal · .pdf</span>
            <button
              type="button"
              onClick={() => exportPayrollReportPDF(period, db.company)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Lote de Desprendibles + Prestaciones (PDF)</span>
            </div>
            <p className="text-sm text-slate-600 mt-1.5">
              Descarga todos los desprendibles individuales de {period.label} en un solo PDF o el informe de provisiones prestacionales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => exportAllPayslipsPDF(period, db.company)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
            >
              Desprendibles PDF
            </button>
            <button
              type="button"
              onClick={() => exportSocialBenefitsPDF(db.employees, legislation, db.company)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              Prestaciones PDF
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Vacaciones y Beneficios Adicionales</span>
            </div>
            <p className="text-sm text-slate-600 mt-1.5">
              Exporta en PDF o Excel el control de vacaciones, compensaciones aprobadas y beneficios del personal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => exportVacationsPDF(db.employees, db.vacations, db.company)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              Vacaciones PDF
            </button>
            <button
              type="button"
              onClick={() => exportVacationsExcel(db.employees, db.vacations)}
              className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
            >
              Vacaciones Excel
            </button>
            <button
              type="button"
              onClick={() => exportBenefitsPDF(db.benefits, db.employees, db.company)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              Beneficios PDF
            </button>
            <button
              type="button"
              onClick={() => exportBenefitsExcel(db.benefits, db.employees)}
              className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
            >
              Beneficios Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Resumen por Área de Investigación — {period.label}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Área INAMOD</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Personas</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Básico</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aux. Transp.</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Devengado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Deducciones</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Neto a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {departmentRows.map(([dept, stats]) => (
                <tr key={dept} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {dept}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {stats.count}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCOP(stats.base)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCOP(stats.aux)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCOP(stats.gross)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                    -{formatCOP(stats.deductions)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {formatCOP(stats.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
