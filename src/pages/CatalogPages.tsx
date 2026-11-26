import * as React from 'react';
import { CatalogPage } from './CatalogPage';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export function EmpresaPage() {
  return (
    <CatalogPage
      entityName="Empresa"
      entityNamePlural="Empresas"
      listFn={api.empresas.list}
      createFn={api.empresas.create}
      updateFn={(id, body) => api.empresas.update(Number(id), body)}
      deleteFn={(id) => api.empresas.remove(Number(id))}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'nit', label: 'NIT' },
        { key: 'ciudad', label: 'Ciudad' },
        { key: 'ano_activo', label: 'Año Activo' },
        { key: 'frecuencia_predeterminada', label: 'Frecuencia' },
      ]}
      createFields={[
        { label: 'Nombre', key: 'nombre' },
        { label: 'NIT', key: 'nit' },
        { label: 'Ciudad', key: 'ciudad' },
        { label: 'Año Activo', key: 'ano_activo', type: 'number' },
        {
          label: 'Frecuencia',
          key: 'frecuencia_predeterminada',
          type: 'select',
          options: [
            { label: 'Mensual', value: 'Mensual' },
            { label: 'Quincenal', value: 'Quincenal' },
          ],
        },
      ]}
      itemToFormData={(item) => ({
        nombre: item.nombre,
        nit: item.nit,
        ciudad: item.ciudad,
        ano_activo: item.ano_activo,
        frecuencia_predeterminada: item.frecuencia_predeterminada,
      })}
    />
  );
}

export function LegislacionPage() {
  return (
    <CatalogPage
      entityName="Parámetro Legislativo"
      entityNamePlural="Legislación"
      listFn={api.legislacion.list}
      createFn={api.legislacion.create}
      updateFn={(id, body) => api.legislacion.update(Number(id), body)}
      deleteFn={(id) => api.legislacion.remove(Number(id))}
      columns={[
        { key: 'ano', label: 'Año' },
        { key: 'smmlv', label: 'SMMLV' },
        { key: 'auxilio_transporte', label: 'Aux. Transporte' },
        { key: 'uvt', label: 'UVT' },
        { key: 'salud_empleado_pct', label: 'Salud Emp. %' },
        { key: 'pension_empleado_pct', label: 'Pensión Emp. %' },
      ]}
      createFields={[
        { label: 'Año', key: 'ano', type: 'number' },
        { label: 'SMMLV', key: 'smmlv', type: 'number' },
        { label: 'Auxilio Transporte', key: 'auxilio_transporte', type: 'number' },
        { label: 'UVT', key: 'uvt', type: 'number' },
        { label: 'Salud Empleado %', key: 'salud_empleado_pct', type: 'number' },
        { label: 'Pensión Empleado %', key: 'pension_empleado_pct', type: 'number' },
      ]}
      itemToFormData={(item) => ({
        ano: item.ano,
        smmlv: item.smmlv,
        auxilio_transporte: item.auxilio_transporte,
        uvt: item.uvt,
        salud_empleado_pct: item.salud_empleado_pct,
        pension_empleado_pct: item.pension_empleado_pct,
      })}
    />
  );
}

export function InstructoresPage() {
  return (
    <CatalogPage
      entityName="Instructor"
      entityNamePlural="Instructores"
      listFn={api.instructores.list}
      createFn={api.instructores.create}
      updateFn={api.instructores.update}
      deleteFn={(id) => api.instructores.remove(String(id))}
      columns={[
        { key: 'nombre_completo', label: 'Nombre' },
        { key: 'documento_identidad', label: 'Documento' },
        { key: 'correo', label: 'Correo' },
        { key: 'especialidad', label: 'Especialidad' },
        { key: 'activo', label: 'Estado', render: (item) => (
          <Badge variant={item.activo ? 'success' : 'slate'}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        )},
      ]}
      createFields={[
        { label: 'Nombre Completo', key: 'nombre_completo', required: true },
        { label: 'Documento', key: 'documento_identidad' },
        { label: 'Correo', key: 'correo', type: 'email' },
        { label: 'Especialidad', key: 'especialidad' },
        {
          label: 'Activo',
          key: 'activo',
          type: 'select',
          options: [
            { label: 'Sí', value: 'true' },
            { label: 'No', value: 'false' },
          ],
        },
      ]}
      itemToFormData={(item) => ({
        nombre_completo: item.nombre_completo,
        documento_identidad: item.documento_identidad,
        correo: item.correo,
        especialidad: item.especialidad,
        activo: item.activo ? 'true' : 'false',
      })}
    />
  );
}

export function FichasPage() {
  return (
    <CatalogPage
      entityName="Ficha"
      entityNamePlural="Fichas"
      listFn={api.fichas.list}
      createFn={api.fichas.create}
      updateFn={api.fichas.update}
      deleteFn={(id) => api.fichas.remove(String(id))}
      columns={[
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'programa', label: 'Programa' },
        { key: 'horario', label: 'Horario' },
      ]}
      createFields={[
        { label: 'Código', key: 'codigo' },
        { label: 'Nombre', key: 'nombre' },
        { label: 'Programa', key: 'programa' },
        { label: 'Horario', key: 'horario' },
      ]}
      itemToFormData={(item) => ({
        codigo: item.codigo,
        nombre: item.nombre,
        programa: item.programa,
        horario: item.horario,
      })}
    />
  );
}

export function EstudiantesPage() {
  return (
    <CatalogPage
      entityName="Estudiante"
      entityNamePlural="Estudiantes"
      listFn={api.estudiantes.list}
      createFn={api.estudiantes.create}
      updateFn={api.estudiantes.update}
      deleteFn={(id) => api.estudiantes.remove(String(id))}
      columns={[
        { key: 'nombre_completo', label: 'Nombre' },
        { key: 'documento_identidad', label: 'Documento' },
        { key: 'correo', label: 'Correo' },
        { key: 'ficha', label: 'Ficha', render: (item) => String(item.ficha_nombre || item.ficha || '—') },
        { key: 'activo', label: 'Estado', render: (item) => (
          <Badge variant={item.activo ? 'success' : 'slate'}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        )},
      ]}
      createFields={[
        { label: 'Nombre Completo', key: 'nombre_completo', required: true },
        { label: 'Documento', key: 'documento_identidad' },
        { label: 'Correo', key: 'correo', type: 'email' },
        { label: 'Ficha', key: 'ficha', type: 'select', required: true, optionsSource: api.fichas.list, optionLabel: (item) => item.nombre || item.codigo || 'Ficha' },
        {
          label: 'Activo',
          key: 'activo',
          type: 'select',
          options: [
            { label: 'Sí', value: 'true' },
            { label: 'No', value: 'false' },
          ],
        },
      ]}
      itemToFormData={(item) => ({
        nombre_completo: item.nombre_completo,
        documento_identidad: item.documento_identidad,
        correo: item.correo,
        ficha: item.ficha,
        activo: item.activo ? 'true' : 'false',
      })}
    />
  );
}

export function EmpleadosPage() {
  return (
    <CatalogPage
      entityName="Empleado"
      entityNamePlural="Empleados"
      listFn={api.empleados.list}
      createFn={api.empleados.create}
      updateFn={api.empleados.update}
      deleteFn={api.empleados.remove}
      columns={[
        { key: 'nombre_completo', label: 'Nombre' },
        { key: 'documento_identidad', label: 'Documento' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'salario_base', label: 'Salario Base', render: (item) => `$${Number(item.salario_base).toLocaleString()}` },
        { key: 'estado', label: 'Estado', render: (item) => (
          <Badge variant={item.estado === 'Activo' ? 'success' : item.estado === 'Vacaciones' ? 'warning' : 'danger'}>
            {item.estado}
          </Badge>
        )},
      ]}
      createFields={[
        { label: 'Espacio de Trabajo', key: 'espacio_trabajo', type: 'select', required: true, optionsSource: api.espaciosTrabajo.list, optionLabel: (item) => item.nombre || item.empresa_nombre || item.id },
        { label: 'Nombre Completo', key: 'nombre_completo', required: true },
        { label: 'Correo', key: 'correo', type: 'email' },
        { label: 'Documento', key: 'documento_identidad' },
        { label: 'Cargo', key: 'cargo' },
        { label: 'Departamento', key: 'departamento', type: 'select', required: true, options: [
          { label: 'Investigación Textil', value: 'Investigación Textil' },
          { label: 'Diseño y Patronaje', value: 'Diseño y Patronaje' },
          { label: 'Confección Avanzada', value: 'Confección Avanzada' },
          { label: 'Innovación y Materiales', value: 'Innovación y Materiales' },
          { label: 'Gestión Administrativa', value: 'Gestión Administrativa' },
          { label: 'Calidad y Metrología', value: 'Calidad y Metrología' },
        ] },
        { label: 'Tipo de Contrato', key: 'tipo_contrato', type: 'select', required: true, options: [
          { label: 'Término Indefinido', value: 'Término Indefinido' },
          { label: 'Término Fijo', value: 'Término Fijo' },
          { label: 'Obra o Labor', value: 'Obra o Labor' },
        ] },
        { label: 'Fecha de Contratación', key: 'fecha_contratacion', type: 'date', required: true },
        { label: 'Salario Base', key: 'salario_base', type: 'number', required: true },
        { label: 'Estado', key: 'estado', type: 'select', required: true, options: [
          { label: 'Activo', value: 'Activo' },
          { label: 'Vacaciones', value: 'Vacaciones' },
          { label: 'Retirado', value: 'Retirado' },
        ] },
        { label: 'Nivel ARL', key: 'nivel_arl', type: 'select', required: true, options: [
          { label: 'Nivel 1', value: '1' },
          { label: 'Nivel 2', value: '2' },
          { label: 'Nivel 3', value: '3' },
          { label: 'Nivel 4', value: '4' },
          { label: 'Nivel 5', value: '5' },
        ] },
      ]}
      itemToFormData={(item) => ({
        espacio_trabajo: item.espacio_trabajo,
        nombre_completo: item.nombre_completo,
        correo: item.correo,
        documento_identidad: item.documento_identidad,
        cargo: item.cargo,
        departamento: item.departamento,
        tipo_contrato: item.tipo_contrato,
        fecha_contratacion: item.fecha_contratacion,
        salario_base: item.salario_base,
        nivel_arl: String(item.nivel_arl),
        estado: item.estado,
      })}
    />
  );
}

export function EspaciosTrabajoPage() {
  return (
    <CatalogPage
      entityName="Espacio de Trabajo"
      entityNamePlural="Espacios de Trabajo"
      listFn={api.espaciosTrabajo.list}
      createFn={api.espaciosTrabajo.create}
      updateFn={api.espaciosTrabajo.update}
      deleteFn={(id) => api.espaciosTrabajo.remove(String(id))}
      columns={[
        { key: 'empresa', label: 'Empresa', render: (item) => String(item.empresa_nombre || item.empresa || '—') },
        { key: 'ficha', label: 'Ficha', render: (item) => String(item.ficha_nombre || item.ficha || '—') },
        { key: 'estudiante', label: 'Estudiante', render: (item) => String(item.estudiante_nombre || item.estudiante || '—') },
      ]}
      createFields={[
        { label: 'Empresa', key: 'empresa', type: 'select', required: true, optionsSource: api.empresas.list, optionLabel: (item) => item.nombre },
        { label: 'Ficha', key: 'ficha', type: 'select', optionsSource: api.fichas.list, optionLabel: (item) => item.nombre },
        { label: 'Estudiante', key: 'estudiante', type: 'select', optionsSource: api.estudiantes.list, optionLabel: (item) => item.nombre_completo },
      ]}
      itemToFormData={(item) => ({
        empresa: String(item.empresa),
        ficha: item.ficha ? String(item.ficha) : '',
        estudiante: item.estudiante ? String(item.estudiante) : '',
      })}
    />
  );
}
