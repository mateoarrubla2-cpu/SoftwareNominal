import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  calculateAccruedVacationDays,
  formatCOP,
  formatShortDate,
  maskBankAccount,
  maskDocumentId,
} from '../lib/payrollEngine.ts';
import type {
  ArlRiskLevel,
  BenefitPlan,
  ContractType,
  Department,
  Employee,
  EmployeeStatus,
  LegislationParams,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface EmployeesViewProps {
  employees: Employee[];
  benefits: BenefitPlan[];
  legislation: LegislationParams;
  onCreateEmployee: (emp: Omit<Employee, 'id'>) => Promise<void>;
  onUpdateEmployee: (id: string, patch: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

const DEPARTMENTS: Department[] = [
  'Investigación Textil',
  'Diseño y Patronaje',
  'Confección Avanzada',
  'Innovación y Materiales',
  'Gestión Administrativa',
  'Calidad y Metrología',
];

export function EmployeesView({
  employees,
  benefits,
  legislation,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: EmployeesViewProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<'Todos' | Department>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState<Department>('Investigación Textil');
  const [contractType, setContractType] = useState<ContractType>('Término Indefinido');
  const [hireDate, setHireDate] = useState('2026-01-15');
  const [contractEndDate, setContractEndDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('3200000');
  const [arlRiskLevel, setArlRiskLevel] = useState<ArlRiskLevel>(1);
  const [bankName, setBankName] = useState('Bancolombia');
  const [bankAccountNumber, setBankAccountNumber] = useState('23400001234');
  const [status, setStatus] = useState<EmployeeStatus>('Activo');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>(['BEN-01']);

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.documentId.includes(search);
    const matchesDept = deptFilter === 'Todos' || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  function openNewModal() {
    setEditingEmployee(null);
    setFullName('');
    setEmail('');
    setDocumentId('');
    setRole('');
    setDepartment('Investigación Textil');
    setContractType('Término Indefinido');
    setHireDate(new Date().toISOString().split('T')[0]);
    setContractEndDate('');
    setBaseSalary('3200000');
    setArlRiskLevel(1);
    setBankName('Bancolombia');
    setBankAccountNumber('23400001234');
    setStatus('Activo');
    setSelectedBenefits(['BEN-01']);
    setModalOpen(true);
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setEmail(emp.email);
    setDocumentId(emp.documentId);
    setRole(emp.role);
    setDepartment(emp.department);
    setContractType(emp.contractType);
    setHireDate(emp.hireDate);
    setContractEndDate(emp.contractEndDate ?? '');
    setBaseSalary(String(emp.baseSalary));
    setArlRiskLevel(emp.arlRiskLevel);
    setBankName(emp.bankName);
    setBankAccountNumber(emp.bankAccountNumber);
    setStatus(emp.status);
    setSelectedBenefits(emp.benefitIds);
    setModalOpen(true);
  }

  function toggleBenefit(id: string) {
    setSelectedBenefits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Omit<Employee, 'id'> = {
        fullName: fullName.trim(),
        email: email.trim(),
        documentId: documentId.trim(),
        role: role.trim(),
        department,
        contractType,
        hireDate,
        contractEndDate:
          contractType === 'Término Fijo' && contractEndDate
            ? contractEndDate
            : null,
        baseSalary: Math.max(0, Number(baseSalary) || 0),
        arlRiskLevel,
        bankName: bankName.trim() || 'Bancolombia',
        bankAccountNumber: bankAccountNumber.trim() || '0000',
        usedVacationDays: editingEmployee?.usedVacationDays ?? 0,
        compensatedVacationDays: editingEmployee?.compensatedVacationDays ?? 0,
        status,
        benefitIds: selectedBenefits,
      };
      if (editingEmployee) {
        await onUpdateEmployee(editingEmployee.id, payload);
      } else {
        await onCreateEmployee(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Directorio de Trabajadores y Contratos
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestión de personal INAMOD · SENA, nivel de riesgo ARL, cuentas enmascaradas y beneficios asignados.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Trabajador</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cédula o cargo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as 'Todos' | Department)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="Todos">Todas las áreas</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <div className="sm:ml-auto text-xs text-slate-500 font-mono tabular-nums">
            {filtered.length} de {employees.length} trabajadores
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Trabajador</th>
                <th className="py-3 px-4 whitespace-nowrap">Contrato / Área</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Salario Básico</th>
                <th className="py-3 px-4 whitespace-nowrap">ARL / Cuenta</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Vac. Disponibles</th>
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((emp) => {
                const accrued = calculateAccruedVacationDays(
                  emp.hireDate,
                  '2026-11-17',
                  legislation.vacacionesDiasPorAno,
                );
                const avail = Math.max(
                  0,
                  Math.round(
                    (accrued - emp.usedVacationDays - emp.compensatedVacationDays) * 10,
                  ) / 10,
                );
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 whitespace-nowrap">
                        {emp.fullName}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        <span className="font-mono">C.C. {maskDocumentId(emp.documentId)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{emp.role}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-800">{emp.department}</div>
                      <div className="text-xs text-slate-500">
                        {emp.contractType} · {formatShortDate(emp.hireDate)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatCOP(emp.baseSalary)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-slate-800">
                        Riesgo ARL N.{emp.arlRiskLevel} ({legislation.arlRates[emp.arlRiskLevel]}%)
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {emp.bankName} {maskBankAccount(emp.bankAccountNumber)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-teal-700 whitespace-nowrap">
                      {avail} d
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusIndicator status={emp.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                          title="Editar trabajador"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                          title="Eliminar trabajador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingEmployee
                  ? `Editar Trabajador · ${editingEmployee.id}`
                  : 'Registrar Nuevo Trabajador'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cédula de Ciudadanía
                  </label>
                  <input
                    type="text"
                    required
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Área / Línea INAMOD
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de Contrato
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as ContractType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Término Indefinido">Término Indefinido</option>
                    <option value="Término Fijo">Término Fijo</option>
                    <option value="Obra o Labor">Obra o Labor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    required
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                {contractType === 'Término Fijo' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vencimiento Contrato
                    </label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Vacaciones">Vacaciones</option>
                      <option value="Retirado">Retirado</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Salario Básico Mensual (COP)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nivel de Riesgo ARL
                  </label>
                  <select
                    value={arlRiskLevel}
                    onChange={(e) => setArlRiskLevel(Number(e.target.value) as ArlRiskLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    {([1, 2, 3, 4, 5] as ArlRiskLevel[]).map((n) => (
                      <option key={n} value={n}>
                        Nivel {n} ({legislation.arlRates[n]}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Número de Cuenta
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Beneficios Adicionales Asignados
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benefits.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-slate-200 text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedBenefits.includes(b.id)}
                          onChange={() => toggleBenefit(b.id)}
                          className="accent-teal-700"
                        />
                        <span className="truncate">{b.name}</span>
                      </span>
                      <span className="font-mono text-xs text-slate-600 shrink-0">
                        {formatCOP(b.monthlyAmount)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Trabajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
