import { useState, type FormEvent } from 'react';
import {
  Briefcase,
  Building2,
  Eye,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  SenaFicha,
  SenaGlobalStats,
  SenaInstructor,
  SenaStudent,
  WorkspaceSummary,
} from '../types/payroll.ts';
import { StatusIndicator } from './StatusBadge.tsx';

interface AdminSenaViewProps {
  stats: SenaGlobalStats;
  instructors: SenaInstructor[];
  fichas: SenaFicha[];
  students: SenaStudent[];
  workspaceSummaries: Record<string, WorkspaceSummary>;
  onCreateInstructor: (payload: {
    fullName: string;
    documentId: string;
    email: string;
    specialty: string;
    active: boolean;
  }) => Promise<void>;
  onUpdateInstructor: (
    id: string,
    patch: Partial<SenaInstructor>,
  ) => Promise<void>;
  onDeleteInstructor: (id: string) => Promise<void>;
  onCreateFicha: (payload: {
    code: string;
    name: string;
    schedule: string;
    program: string;
    instructorId: string;
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
  onInspectWorkspace: (workspaceId: string) => void;
}

type AdminSubTab = 'instructores' | 'estudiantes' | 'fichas';

export function AdminSenaView({
  stats,
  instructors,
  fichas,
  students,
  workspaceSummaries,
  onCreateInstructor,
  onUpdateInstructor,
  onDeleteInstructor,
  onCreateFicha,
  onUpdateFicha,
  onDeleteFicha,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onInspectWorkspace,
}: AdminSenaViewProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('instructores');
  const [search, setSearch] = useState('');
  const [fichaFilter, setFichaFilter] = useState<string>('TODAS');
  const [saving, setSaving] = useState(false);

  // Inline delete confirmation state (no window.confirm)
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'instructor' | 'ficha' | 'student';
    id: string;
    label: string;
  } | null>(null);

  // Instructor modal
  const [instModalOpen, setInstModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<SenaInstructor | null>(null);
  const [instName, setInstName] = useState('');
  const [instDoc, setInstDoc] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instSpecialty, setInstSpecialty] = useState('');
  const [instActive, setInstActive] = useState(true);

  // Ficha modal
  const [fichaModalOpen, setFichaModalOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<SenaFicha | null>(null);
  const [fichaCode, setFichaCode] = useState('');
  const [fichaName, setFichaName] = useState('');
  const [fichaSchedule, setFichaSchedule] = useState('Mañana (06:00 - 12:00)');
  const [fichaProgram, setFichaProgram] = useState('Técnico en Recursos Humanos');
  const [fichaInstructorId, setFichaInstructorId] = useState(
    instructors[0]?.id ?? '',
  );

  // Student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<SenaStudent | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentDoc, setStudentDoc] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentFichaId, setStudentFichaId] = useState(fichas[0]?.id ?? '');
  const [studentActive, setStudentActive] = useState(true);

  const instructorMap = new Map(instructors.map((i) => [i.id, i]));
  const fichaMap = new Map(fichas.map((f) => [f.id, f]));

  const filteredInstructors = instructors.filter(
    (i) =>
      i.fullName.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.documentId.includes(search),
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.documentId.includes(search);
    const matchesFicha = fichaFilter === 'TODAS' || s.fichaId === fichaFilter;
    return matchesSearch && matchesFicha;
  });

  const filteredFichas = fichas.filter((f) => {
    const instNameVal = instructorMap.get(f.instructorId)?.fullName ?? '';
    return (
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.includes(search) ||
      instNameVal.toLowerCase().includes(search.toLowerCase())
    );
  });

  function openNewInstructor() {
    setEditingInst(null);
    setInstName('');
    setInstDoc('');
    setInstEmail('');
    setInstSpecialty('Gestión del Talento Humano y Nómina');
    setInstActive(true);
    setInstModalOpen(true);
  }

  function openEditInstructor(inst: SenaInstructor) {
    setEditingInst(inst);
    setInstName(inst.fullName);
    setInstDoc(inst.documentId);
    setInstEmail(inst.email);
    setInstSpecialty(inst.specialty);
    setInstActive(inst.active);
    setInstModalOpen(true);
  }

  async function handleSaveInstructor(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: instName.trim(),
        documentId: instDoc.trim(),
        email: instEmail.trim(),
        specialty: instSpecialty.trim(),
        active: instActive,
      };
      if (editingInst) {
        await onUpdateInstructor(editingInst.id, payload);
      } else {
        await onCreateInstructor(payload);
      }
      setInstModalOpen(false);
    } catch {
      // El toast global muestra el mensaje de error
    } finally {
      setSaving(false);
    }
  }

  function openNewFicha() {
    setEditingFicha(null);
    setFichaCode('');
    setFichaName('');
    setFichaSchedule('Mañana (06:00 - 12:00)');
    setFichaProgram('Técnico en Recursos Humanos');
    setFichaInstructorId(instructors[0]?.id ?? '');
    setFichaModalOpen(true);
  }

  function openEditFicha(f: SenaFicha) {
    setEditingFicha(f);
    setFichaCode(f.code);
    setFichaName(f.name);
    setFichaSchedule(f.schedule);
    setFichaProgram(f.program);
    setFichaInstructorId(f.instructorId);
    setFichaModalOpen(true);
  }

  async function handleSaveFicha(e: FormEvent) {
    e.preventDefault();
    if (!fichaInstructorId) return;
    setSaving(true);
    try {
      const payload = {
        code: fichaCode.trim(),
        name: fichaName.trim(),
        schedule: fichaSchedule.trim(),
        program: fichaProgram.trim(),
        instructorId: fichaInstructorId,
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

  function openNewStudent() {
    setEditingStudent(null);
    setStudentName('');
    setStudentDoc('');
    setStudentEmail('');
    setStudentFichaId(fichas[0]?.id ?? '');
    setStudentActive(true);
    setStudentModalOpen(true);
  }

  function openEditStudent(st: SenaStudent) {
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
      if (confirmDelete.kind === 'instructor') {
        await onDeleteInstructor(confirmDelete.id);
      } else if (confirmDelete.kind === 'ficha') {
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
            Administración General SENA · Formación en Nómina
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Control centralizado de instructores, grupos/fichas, aprendices matriculados y total de trabajadores simulados en el centro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewInstructor}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Instructor</span>
          </button>
          <button
            type="button"
            onClick={openNewFicha}
            disabled={instructors.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Grupo / Ficha</span>
          </button>
          <button
            type="button"
            onClick={openNewStudent}
            disabled={fichas.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Estudiante</span>
          </button>
        </div>
      </div>

      {/* Global Center KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Instructores</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {stats.totalInstructors}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.activeInstructors} activos en plataforma
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Grupos / Fichas</span>
            <Layers className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1.5">
            {stats.totalFichas}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Paneles de clase configurados
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Estudiantes (Aprendices)</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {stats.totalStudents}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.activeStudents} con panel individual aislado
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Trabajadores en Prácticas</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {stats.totalWorkersAcrossWorkspaces}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {stats.totalPayslipsAcrossWorkspaces} desprendibles generados
          </p>
        </div>
      </div>

      {/* Main Directory Container */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border-b border-slate-200">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => {
                setSubTab('instructores');
                setSearch('');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'instructores'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Instructores ({instructors.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab('estudiantes');
                setSearch('');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'estudiantes'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estudiantes ({students.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab('fichas');
                setSearch('');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'fichas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grupos / Fichas ({fichas.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, correo o cédula..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {subTab === 'estudiantes' && (
              <select
                value={fichaFilter}
                onChange={(e) => setFichaFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="TODAS">Todas las fichas</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} · {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Instructores */}
        {subTab === 'instructores' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Instructor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Documento</th>
                  <th className="py-3 px-4 whitespace-nowrap">Especialidad</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Grupos / Fichas</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Estudiantes</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredInstructors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                      No hay instructores registrados con ese criterio.
                    </td>
                  </tr>
                ) : (
                  filteredInstructors.map((inst) => {
                    const instFichas = fichas.filter((f) => f.instructorId === inst.id);
                    const instStudents = students.filter((s) =>
                      instFichas.some((f) => f.id === s.fichaId),
                    );
                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 whitespace-nowrap">
                            {inst.fullName}
                          </div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {inst.email}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {inst.documentId}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                          {inst.specialty}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {instFichas.length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 font-medium whitespace-nowrap">
                          {instStudents.length}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusIndicator status={inst.active ? 'Activo' : 'Pausado'} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditInstructor(inst)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                              title="Editar instructor"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  kind: 'instructor',
                                  id: inst.id,
                                  label: inst.fullName,
                                })
                              }
                              className="p-1.5 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                              title="Eliminar instructor"
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
        )}

        {/* Tab 2: Estudiantes */}
        {subTab === 'estudiantes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Estudiante</th>
                  <th className="py-3 px-4 whitespace-nowrap">Documento</th>
                  <th className="py-3 px-4 whitespace-nowrap">Grupo / Ficha</th>
                  <th className="py-3 px-4 whitespace-nowrap">Instructor</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Trabajadores</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Recibos</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                      No hay estudiantes registrados bajo este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const ficha = fichaMap.get(st.fichaId);
                    const inst = ficha ? instructorMap.get(ficha.instructorId) : undefined;
                    const wsKey = `student:${st.id}`;
                    const summary = workspaceSummaries[wsKey];
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">
                            {ficha?.name ?? 'Sin ficha'}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            Ficha {ficha?.code ?? '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {inst?.fullName ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {summary?.employeeCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                          {summary?.payslipCount ?? 0}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusIndicator status={st.active ? 'Activo' : 'Pausado'} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectWorkspace(wsKey)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Panel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditStudent(st)}
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
        )}

        {/* Tab 3: Grupos / Fichas */}
        {subTab === 'fichas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Ficha / Clase</th>
                  <th className="py-3 px-4 whitespace-nowrap">Programa y Jornada</th>
                  <th className="py-3 px-4 whitespace-nowrap">Instructor</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Estudiantes</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Trabajadores (Panel)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredFichas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                      No hay grupos o fichas registradas.
                    </td>
                  </tr>
                ) : (
                  filteredFichas.map((f) => {
                    const inst = instructorMap.get(f.instructorId);
                    const fichaStudents = students.filter((s) => s.fichaId === f.id);
                    const wsKey = `ficha:${f.id}`;
                    const summary = workspaceSummaries[wsKey];
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 whitespace-nowrap">
                            {f.name}
                          </div>
                          <div className="text-xs font-mono text-slate-500 whitespace-nowrap">
                            Ficha {f.code} · {f.id}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 whitespace-nowrap">{f.program}</div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {f.schedule}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {inst?.fullName ?? 'Sin asignar'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {fichaStudents.length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 whitespace-nowrap">
                          {summary?.employeeCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectWorkspace(wsKey)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Abrir Panel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditFicha(f)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
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
                              className="p-1.5 text-slate-500 hover:text-rose-700 border border-slate-200 rounded hover:bg-rose-50 cursor-pointer"
                              title="Eliminar ficha"
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
        )}
      </div>

      {/* Instructor Modal */}
      {instModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingInst ? 'Editar Instructor' : 'Registrar Nuevo Instructor'}
              </h2>
              <button
                type="button"
                onClick={() => setInstModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveInstructor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="Ej. Prof. Carlos Andrés Pérez"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cédula
                  </label>
                  <input
                    type="text"
                    required
                    value={instDoc}
                    onChange={(e) => setInstDoc(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correo SENA
                  </label>
                  <input
                    type="email"
                    required
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    placeholder="usuario@misena.edu.co"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Área / Especialidad
                </label>
                <input
                  type="text"
                  required
                  value={instSpecialty}
                  onChange={(e) => setInstSpecialty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instActive}
                  onChange={(e) => setInstActive(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Instructor activo</span>
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInstModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                {editingFicha ? 'Editar Grupo / Ficha' : 'Crear Grupo / Ficha SENA'}
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
                    placeholder="2920111"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre del Panel / Clase
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Instructor Responsable
                </label>
                <select
                  value={fichaInstructorId}
                  onChange={(e) => setFichaInstructorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.fullName}
                    </option>
                  ))}
                </select>
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
                {editingStudent ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
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
                  Nombre Completo del Aprendiz
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
                    Correo SENA
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
                  Grupo / Ficha Asignada
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
              ¿Deseas eliminar a <span className="font-semibold text-slate-900">{confirmDelete.label}</span>? Esta acción también eliminará los espacios de práctica asociados.
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
