import { useState, type FormEvent } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  exportBenefitsExcel,
  exportBenefitsPDF,
  exportSocialBenefitsPDF,
} from '../lib/exportEngine.ts';
import {
  calculateSocialBenefitsForEmployee,
  formatCOP,
} from '../lib/payrollEngine.ts';
import type {
  BenefitCategory,
  BenefitPlan,
  CompanyConfig,
  Employee,
  LegislationParams,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface SocialBenefitsViewProps {
  employees: Employee[];
  benefits: BenefitPlan[];
  legislation: LegislationParams;
  company: CompanyConfig;
  onCreateBenefit: (b: Omit<BenefitPlan, 'id'>) => Promise<void>;
  onUpdateBenefit: (id: string, patch: Partial<BenefitPlan>) => Promise<void>;
  onUpdateEmployeeBenefits: (empId: string, benefitIds: string[]) => Promise<void>;
}

const CATEGORIES: BenefitCategory[] = [
  'Alimentación',
  'Salud',
  'Movilidad',
  'Bienestar',
  'Formación',
];

export function SocialBenefitsView({
  employees,
  benefits,
  legislation,
  company,
  onCreateBenefit,
  onUpdateBenefit,
  onUpdateEmployeeBenefits,
}: SocialBenefitsViewProps) {
  const [subTab, setSubTab] = useState<'prestaciones' | 'adicionales'>('prestaciones');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<BenefitPlan | null>(null);
  const [assigningBenefit, setAssigningBenefit] = useState<BenefitPlan | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BenefitCategory>('Bienestar');
  const [monthlyAmount, setMonthlyAmount] = useState('150000');
  const [salarialFactor, setSalarialFactor] = useState(false);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeEmployees = employees.filter((e) => e.status !== 'Retirado');
  const calcs = activeEmployees.map((emp) =>
    calculateSocialBenefitsForEmployee(emp, legislation),
  );

  const totalPrima = calcs.reduce((s, c) => s + c.primaServicios, 0);
  const totalCesantias = calcs.reduce((s, c) => s + c.cesantias, 0);
  const totalIntereses = calcs.reduce((s, c) => s + c.interesesCesantias, 0);
  const dotacionCount = calcs.filter((c) => c.aplicaDotacion).length;

  function openNewBenefit() {
    setEditingBenefit(null);
    setName('');
    setCategory('Bienestar');
    setMonthlyAmount('150000');
    setSalarialFactor(false);
    setDescription('');
    setActive(true);
    setEditModalOpen(true);
  }

  function openEditBenefit(b: BenefitPlan) {
    setEditingBenefit(b);
    setName(b.name);
    setCategory(b.category);
    setMonthlyAmount(String(b.monthlyAmount));
    setSalarialFactor(b.salarialFactor);
    setDescription(b.description);
    setActive(b.active);
    setEditModalOpen(true);
  }

  async function handleSaveBenefit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        monthlyAmount: Math.max(0, Number(monthlyAmount) || 0),
        salarialFactor,
        description: description.trim(),
        active,
      };
      if (editingBenefit) {
        await onUpdateBenefit(editingBenefit.id, payload);
      } else {
        await onCreateBenefit(payload);
      }
      setEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleEmployeeBenefit(emp: Employee, benefitId: string) {
    const hasIt = emp.benefitIds.includes(benefitId);
    const updated = hasIt
      ? emp.benefitIds.filter((id) => id !== benefitId)
      : [...emp.benefitIds, benefitId];
    await onUpdateEmployeeBenefits(emp.id, updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Prestaciones Sociales y Beneficios
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Cálculo proporcional de Prima de Servicios, Cesantías, Intereses (12%), Dotación y planes adicionales de bienestar.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubTab('prestaciones')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'prestaciones'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prestaciones de Ley
          </button>
          <button
            type="button"
            onClick={() => setSubTab('adicionales')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'adicionales'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Beneficios Adicionales
          </button>
        </div>
      </div>

      {subTab === 'prestaciones' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Prima de Servicios (Semestre)</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {formatCOP(totalPrima)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Base: Salario + Aux. Transporte
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Cesantías Acumuladas ({legislation.year})</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
                {formatCOP(totalCesantias)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Proporcional a días laborados
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Intereses sobre Cesantías ({legislation.interesesCesantiasPct}%)</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {formatCOP(totalIntereses)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Pago directo al trabajador
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Elegibles para Dotación</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {dotacionCount} de {activeEmployees.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tope ≤ 2 SMMLV ({formatCOP(legislation.smmlv * 2)})
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Cálculo Proporcional por Trabajador — Vigencia {legislation.year}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  SMMLV vigente: {formatCOP(legislation.smmlv)} · Auxilio Transporte: {formatCOP(legislation.auxilioTransporte)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportSocialBenefitsPDF(employees, legislation, company)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap self-start"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Exportar Prestaciones PDF</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Base Prestacional</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Días Sem.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Prima Servicios</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Días Año</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Cesantías</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Intereses (12%)</th>
                    <th className="py-3 px-4 whitespace-nowrap">Dotación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {calcs.map((c) => (
                    <tr key={c.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {c.employeeName}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {c.department}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatCOP(c.basePrestacional)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {c.daysSemester} d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                        {formatCOP(c.primaServicios)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {c.daysYear} d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-teal-700 whitespace-nowrap">
                        {formatCOP(c.cesantias)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatCOP(c.interesesCesantias)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.aplicaDotacion ? (
                          <StatusIndicator status="Sí aplica" />
                        ) : (
                          <span className="text-xs text-slate-500">{c.motivoDotacion}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => exportBenefitsPDF(benefits, employees, company)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportBenefitsExcel(benefits, employees)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={openNewBenefit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Beneficio</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4 whitespace-nowrap">Beneficio</th>
                    <th className="py-3 px-4 whitespace-nowrap">Categoría</th>
                    <th className="py-3 px-4 whitespace-nowrap">Naturaleza</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Valor Mensual</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Inscritos</th>
                    <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {benefits.map((b) => {
                    const count = employees.filter((e) =>
                      e.benefitIds.includes(b.id),
                    ).length;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{b.name}</div>
                          <div className="text-xs text-slate-500">{b.description}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {b.category}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {b.salarialFactor ? 'Factor Salarial' : 'No constitutivo (Art. 128)'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                          {formatCOP(b.monthlyAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {count}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusIndicator status={b.active ? 'Activo' : 'Pausado'} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAssigningBenefit(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Asignar ({count})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditBenefit(b)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Benefit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingBenefit ? `Editar ${editingBenefit.name}` : 'Nuevo Beneficio'}
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBenefit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BenefitCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valor Mensual (COP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salarialFactor}
                    onChange={(e) => setSalarialFactor(e.target.checked)}
                    className="accent-teal-700"
                  />
                  <span>Constitutivo de salario (suma al IBC)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-teal-700"
                  />
                  <span>Activo en nómina</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {assigningBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Asignar — {assigningBenefit.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {formatCOP(assigningBenefit.monthlyAmount)} / mes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningBenefit(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {employees.map((emp) => {
                const enrolled = emp.benefitIds.includes(assigningBenefit.id);
                return (
                  <label key={emp.id} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-slate-50 cursor-pointer">
                    <span className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={enrolled}
                        onChange={() => toggleEmployeeBenefit(emp, assigningBenefit.id)}
                        className="accent-teal-700 w-4 h-4"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">{emp.fullName}</span>
                        <span className="block text-xs text-slate-500 truncate">{emp.role}</span>
                      </span>
                    </span>
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {enrolled ? 'Asignado' : 'Sin asignar'}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAssigningBenefit(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
