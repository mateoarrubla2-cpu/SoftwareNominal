import { useState, type FormEvent } from 'react';
import {
  Briefcase,
  Eye,
  FolderPlus,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  SenaFicha,
  SenaInstructor,
  SenaStudent,
  WorkspaceSummary,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface InstructorPanelViewProps {
  instructor: SenaInstructor | undefined;
  fichas: SenaFicha[];
  students: SenaStudent[];
  selectedFichaId: string;
  workspaceSummaries: Record<string, WorkspaceSummary>;
  onSelectFicha: (fichaId: string) => void;
  onOpenFichaPayrollPanel: (fichaId: string) => void;
  onInspectStudentWorkspace: (studentId: string) => void;
  onCreateFicha: (payload: {
    code: string;
    name: string;
    schedule: string;
    program: string;
  }) => Promise<void>;
  onUpdateFicha: (id: string, patch: Partial<SenaFicha>) => Promise<void>;
  onDeleteFicha: (id: string) => Promise<void>;
  onCreateStudent: (payload: {
    fullName: string;
    documentId: string;
    email: string;
    fichaId: string;
    active: boolean;
  }) => Promise<void>;
  onUpdateStudent: (id: string, patch: Partial<SenaStudent>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
}

export function InstructorPanelView({
  instructor,
  fichas,
  students,
  selectedFichaId,
  workspaceSummaries,
  onSelectFicha,
  onOpenFichaPayrollPanel,
  onInspectStudentWorkspace,
  onCreateFicha,
  onUpdateFicha,
  onDeleteFicha,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
}: InstructorPanelViewProps) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'ficha' | 'student';
    id: string;
    label: string;
  } | null>(null);

  // Ficha modal
  const [fichaModalOpen, setFichaModalOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<SenaFicha | null>(null);
  const [fichaCode, setFichaCode] = useState('');
  const [fichaName, setFichaName] = useState('');
  const [fichaSchedule, setFichaSchedule] = useState('Mañana (06:00 - 12:00)');
  const [fichaProgram, setFichaProgram] = useState('Técnico en Recursos Humanos');

  // Student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<SenaStudent | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentDoc, setStudentDoc] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentFichaId, setStudentFichaId] = useState(selectedFichaId);
  const [studentActive, setStudentActive] = useState(true);

  const activeFicha = fichas.find((f) => f.id === selectedFichaId) ?? fichas[0];
  const fichaStudents = activeFicha
    ? students.filter((s) => s.fichaId === activeFicha.id)
    : [];

  const filteredStudents = fichaStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.documentId.includes(search),
  );

  const fichaSummary = activeFicha
    ? workspaceSummaries[`ficha:${activeFicha.id}`]
    : undefined;

  const studentWorkersInFicha = fichaStudents.reduce(
    (sum, s) => sum + (workspaceSummaries[`student:${s.id}`]?.employeeCount ?? 0),
    0,
  );
  const studentPayslipsInFicha = fichaStudents.reduce(
    (sum, s) => sum + (workspaceSummaries[`student:${s.id}`]?.payslipCount ?? 0),
    0,
  );

  function openNewFichaModal() {
    setEditingFicha(null);
    setFichaCode('');
    setFichaName('');
    setFichaSchedule('Mañana (06:00 - 12:00)');
    setFichaProgram('Técnico en Recursos Humanos');
    setFichaModalOpen(true);
  }

  function openEditFichaModal(f: SenaFicha) {
    setEditingFicha(f);
    setFichaCode(f.code);
    setFichaName(f.name);
    setFichaSchedule(f.schedule);
    setFichaProgram(f.program);
    setFichaModalOpen(true);
  }

  async function handleSaveFicha(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: fichaCode.trim(),
        name: fichaName.trim(),
        schedule: fichaSchedule.trim(),
        program: fichaProgram.trim(),
      };
      if (editingFicha) {
        await onUpdateFicha(editingFicha.id, payload);
      } else {
        await onCreateFicha(payload);
      }
      setFichaModalOpen(false);
    } catch {
      // El toast global muestra el mensaje de error
    } finally {
      setSaving(false);
    }
  }

  function openNewStudentModal() {
    setEditingStudent(null);
    setStudentName('');
    setStudentDoc('');
    setStudentEmail('');
    setStudentFichaId(activeFicha?.id ?? fichas[0]?.id ?? '');
    setStudentActive(true);
    setStudentModalOpen(true);
  }

  function openEditStudentModal(st: SenaStudent) {
    setEditingStudent(st);
    setStudentName(st.fullName);
    setStudentDoc(st.documentId);
    setStudentEmail(st.email);
    setStudentFichaId(st.fichaId);
    setStudentActive(st.active);
    setStudentModalOpen(true);
  }

  async function handleSaveStudent(e: FormEvent) {
    e.preventDefault();
    if (!studentFichaId) return;
    setSaving(true);
    try {
      const payload = {
        fullName: studentName.trim(),
        documentId: studentDoc.trim(),
        email: studentEmail.trim(),
        fichaId: studentFichaId,
        active: studentActive,
      };
      if (editingStudent) {
        await onUpdateStudent(editingStudent.id, payload);
      } else {
        await onCreateStudent(payload);
      }
      setStudentModalOpen(false);
    } catch {
      // El toast global muestra el mensaje de error
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      if (confirmDelete.kind === 'ficha') {
        await onDeleteFicha(confirmDelete.id);
      } else {
        await onDeleteStudent(confirmDelete.id);
      }
      setConfirmDelete(null);
    } catch {
      // El toast global muestra el mensaje de error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Panel del Instructor — {instructor?.fullName ?? 'Docente SENA'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Crea y administra tus fichas o clases (ej. Recursos Humanos Mañana, Recursos Humanos Tarde), gestiona tus estudiantes y supervisa sus prácticas de nómina.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewFichaModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap self-start shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Crear Nueva Ficha / Panel</span>
        </button>
      </div>

      {/* Instructor Fichas Selector Grid */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Mis Fichas y Clases ({fichas.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Solo ves y administras tus propias fichas
          </span>
        </div>

        {fichas.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-300 rounded-lg space-y-3">
            <p className="text-sm text-slate-600">
              Aún no has creado ninguna ficha o clase. Crea tu primer panel (ej. Recursos Humanos Mañana).
            </p>
            <button
              type="button"
              onClick={openNewFichaModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Ficha</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {fichas.map((f) => {
              const isSelected = activeFicha?.id === f.id;
              const countStudents = students.filter((s) => s.fichaId === f.id).length;
              const wsSum = workspaceSummaries[`ficha:${f.id}`];
              return (
                <div
                  key={f.id}
                  onClick={() => onSelectFicha(f.id)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-500">
                        Ficha {f.code} · {f.schedule}
                      </p>
                      <h3 className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                        {f.name}
                      </h3>
                      <p className="text-xs text-slate-600 truncate">{f.program}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditFichaModal(f)}
                        className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white rounded cursor-pointer"
                        title="Editar ficha"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            kind: 'ficha',
                            id: f.id,
                            label: `${f.code} · ${f.name}`,
                          })
                        }
                        className="p-1 text-slate-500 hover:text-rose-700 border border-slate-200 bg-white rounded cursor-pointer"
                        title="Eliminar ficha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 text-xs">
                    <span className="font-mono tabular-nums text-slate-700">
                      {countStudents} estudiantes · {wsSum?.employeeCount ?? 0} trab.
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFichaPayrollPanel(f.id);
                      }}
                      className="font-medium text-teal-800 hover:text-teal-950 cursor-pointer"
                    >
                      Abrir Nómina →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Ficha Details & Student Roster */}
      {activeFicha && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Estudiantes en {activeFicha.name}</span>
                <GraduationCap className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {fichaStudents.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cada aprendiz con su panel en blanco
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Trabajadores (Panel Ficha)</span>
                <Briefcase className="w-4 h-4 text-teal-700" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
                {fichaSummary?.employeeCount ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tu panel demostrativo de clase
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Trabajadores de Aprendices</span>
                <Briefcase className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {studentWorkersInFicha}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Creados por tus estudiantes en práctica
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Recibos de Aprendices</span>
                <Receipt className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {studentPayslipsInFicha}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Liquidaciones generadas en la ficha
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Estudiantes de Ficha {activeFicha.code} — {activeFicha.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agrega, edita o elimina aprendices y revisa en tiempo real sus operaciones de nómina.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onOpenFichaPayrollPanel(activeFicha.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 cursor-pointer whitespace-nowrap"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ir a Mi Panel de Nómina</span>
                </button>

                <button
                  type="button"
                  onClick={openNewStudentModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Agregar Estudiante</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4 whitespace-nowrap">Estudiante</th>
                    <th className="py-3 px-4 whitespace-nowrap">Documento</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Trabajadores</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Desprendibles</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Vac. / Event.</th>
                    <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                        Esta ficha aún no tiene estudiantes registrados con ese filtro. Usa &quot;Agregar Estudiante&quot; para matricular un aprendiz.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const summary = workspaceSummaries[`student:${st.id}`];
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 whitespace-nowrap">
                              {st.fullName}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap">
                              {st.email}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                            {st.documentId}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                            {summary?.employeeCount ?? 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                            {summary?.payslipCount ?? 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {summary?.vacationCount ?? 0} / {summary?.eventualityCount ?? 0}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <StatusIndicator status={st.active ? 'Activo' : 'Pausado'} />
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onInspectStudentWorkspace(st.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Práctica</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditStudentModal(st)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                                title="Editar estudiante"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    kind: 'student',
                                    id: st.id,
                                    label: st.fullName,
                                  })
                                }
                                className="p-1.5 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                                title="Eliminar estudiante"
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
        </>
      )}

      {/* Ficha Modal */}
      {fichaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingFicha ? 'Editar Ficha / Clase' : 'Crear Nueva Ficha / Clase'}
              </h2>
              <button
                type="button"
                onClick={() => setFichaModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFicha} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Código Ficha
                  </label>
                  <input
                    type="text"
                    required
                    value={fichaCode}
                    onChange={(e) => setFichaCode(e.target.value)}
                    placeholder="2920555"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre de la Clase / Panel
                  </label>
                  <input
                    type="text"
                    required
                    value={fichaName}
                    onChange={(e) => setFichaName(e.target.value)}
                    placeholder="Ej. Recursos Humanos Mañana"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Programa de Formación
                </label>
                <input
                  type="text"
                  required
                  value={fichaProgram}
                  onChange={(e) => setFichaProgram(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jornada / Horario
                </label>
                <input
                  type="text"
                  required
                  value={fichaSchedule}
                  onChange={(e) => setFichaSchedule(e.target.value)}
                  placeholder="Ej. Tarde (12:30 - 18:30)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFichaModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {studentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingStudent ? 'Editar Estudiante' : 'Agregar Estudiante a Ficha'}
              </h2>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Documento
                  </label>
                  <input
                    type="text"
                    required
                    value={studentDoc}
                    onChange={(e) => setStudentDoc(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correo Aprendiz
                  </label>
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="aprendiz@soy.sena.edu.co"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ficha / Clase
                </label>
                <select
                  value={studentFichaId}
                  onChange={(e) => setStudentFichaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {fichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} · {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={studentActive}
                  onChange={(e) => setStudentActive(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Estudiante activo</span>
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg overflow-hidden p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Confirmar eliminación
            </h2>
            <p className="text-sm text-slate-600">
              ¿Deseas eliminar a <span className="font-semibold text-slate-900">{confirmDelete.label}</span>? Se eliminará también su panel de práctica asociado.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={executeDelete}
                className="px-3.5 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 cursor-pointer"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
