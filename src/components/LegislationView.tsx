import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { formatCOP } from '../lib/payrollEngine.ts';
import type { ArlRiskLevel, LegislationParams } from '../types/payroll.ts';

interface LegislationViewProps {
  legislationList: LegislationParams[];
  onSaveLegislation: (year: number, patch: Partial<LegislationParams>) => Promise<void>;
}

export function LegislationView({
  legislationList,
  onSaveLegislation,
}: LegislationViewProps) {
  const [selectedYear, setSelectedYear] = useState(legislationList[0]?.year ?? 2026);
  const current =
    legislationList.find((l) => l.year === selectedYear) ?? legislationList[0];

  const [smmlv, setSmmlv] = useState(String(current.smmlv));
  const [auxilio, setAuxilio] = useState(String(current.auxilioTransporte));
  const [uvt, setUvt] = useState(String(current.uvt));
  const [saludEmp, setSaludEmp] = useState(String(current.saludEmpleadoPct));
  const [saludEmpr, setSaludEmpr] = useState(String(current.saludEmpleadorPct));
  const [pensionEmp, setPensionEmp] = useState(String(current.pensionEmpleadoPct));
  const [pensionEmpr, setPensionEmpr] = useState(String(current.pensionEmpleadorPct));
  const [fspPct, setFspPct] = useState(String(current.fspPct));
  const [cajaPct, setCajaPct] = useState(String(current.cajaCompensacionPct));
  const [senaPct, setSenaPct] = useState(String(current.senaPct));
  const [icbfPct, setIcbfPct] = useState(String(current.icbfPct));
  const [arlRates, setArlRates] = useState(current.arlRates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSmmlv(String(current.smmlv));
    setAuxilio(String(current.auxilioTransporte));
    setUvt(String(current.uvt));
    setSaludEmp(String(current.saludEmpleadoPct));
    setSaludEmpr(String(current.saludEmpleadorPct));
    setPensionEmp(String(current.pensionEmpleadoPct));
    setPensionEmpr(String(current.pensionEmpleadorPct));
    setFspPct(String(current.fspPct));
    setCajaPct(String(current.cajaCompensacionPct));
    setSenaPct(String(current.senaPct));
    setIcbfPct(String(current.icbfPct));
    setArlRates(current.arlRates);
  }, [current]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveLegislation(current.year, {
        smmlv: Number(smmlv) || current.smmlv,
        auxilioTransporte: Number(auxilio) || current.auxilioTransporte,
        uvt: Number(uvt) || current.uvt,
        saludEmpleadoPct: Number(saludEmp) || 4,
        saludEmpleadorPct: Number(saludEmpr) || 8.5,
        pensionEmpleadoPct: Number(pensionEmp) || 4,
        pensionEmpleadorPct: Number(pensionEmpr) || 12,
        fspPct: Number(fspPct) || 1,
        cajaCompensacionPct: Number(cajaPct) || 4,
        senaPct: Number(senaPct) || 2,
        icbfPct: Number(icbfPct) || 3,
        arlRates,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Legislación Actual y Parametrización Anual
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configura SMMLV, Auxilio de Transporte, UVT, Seguridad Social y Parafiscales por vigencia fiscal sin editar código fuente.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {legislationList.map((l) => (
            <button
              key={l.year}
              type="button"
              onClick={() => setSelectedYear(l.year)}
              className={`px-3.5 py-1.5 text-xs font-medium font-mono rounded-md transition-colors cursor-pointer ${
                selectedYear === l.year
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vigencia {l.year}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Base Monetary Constants */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
            Valores Base de Ley ({current.year})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                SMMLV (Salario Mínimo COP)
              </label>
              <input
                type="number"
                required
                value={smmlv}
                onChange={(e) => setSmmlv(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Tope 2 SMMLV: {formatCOP((Number(smmlv) || 0) * 2)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Auxilio de Transporte (COP)
              </label>
              <input
                type="number"
                required
                value={auxilio}
                onChange={(e) => setAuxilio(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Aplica automáticamente si salario ≤ 2 SMMLV
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Valor UVT (COP)
              </label>
              <input
                type="number"
                required
                value={uvt}
                onChange={(e) => setUvt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Base exenta Retefuente (95 UVT): {formatCOP((Number(uvt) || 0) * 95)}
              </p>
            </div>
          </div>
        </div>

        {/* Social Security & Parafiscales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
              Seguridad Social y Fondo de Solidaridad (%)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Salud Trabajador (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={saludEmp}
                  onChange={(e) => setSaludEmp(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Salud Empleador (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={saludEmpr}
                  onChange={(e) => setSaludEmpr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pensión Trabajador (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pensionEmp}
                  onChange={(e) => setPensionEmp(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pensión Empleador (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pensionEmpr}
                  onChange={(e) => setPensionEmpr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fondo Solidaridad Pensional (≥ 4 SMMLV) (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fspPct}
                  onChange={(e) => setFspPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
              Parafiscales y Niveles de Riesgo ARL (%)
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Caja Comp. (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cajaPct}
                  onChange={(e) => setCajaPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SENA (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={senaPct}
                  onChange={(e) => setSenaPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ICBF (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={icbfPct}
                  onChange={(e) => setIcbfPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {([1, 2, 3, 4, 5] as ArlRiskLevel[]).map((level) => (
                <div key={level}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ARL N.{level}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={arlRates[level]}
                    onChange={(e) =>
                      setArlRates({
                        ...arlRates,
                        [level]: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? 'Actualizando cálculos...'
                : `Guardar Parámetros ${current.year} y Recalcular Nómina`}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
