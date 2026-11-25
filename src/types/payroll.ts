export type Rol = 'ADMINISTRADOR' | 'INSTRUCTOR' | 'ESTUDIANTE';

export type TipoContrato = 'Término Indefinido' | 'Término Fijo' | 'Obra o Labor';
export type EstadoEmpleado = 'Activo' | 'Vacaciones' | 'Retirado';
export type FrecuenciaNomina = 'Mensual' | 'Quincenal';
export type Departamento =
  | 'Investigación Textil'
  | 'Diseño y Patronaje'
  | 'Confección Avanzada'
  | 'Innovación y Materiales'
  | 'Gestión Administrativa'
  | 'Calidad y Metrología';
export type NivelARL = 1 | 2 | 3 | 4 | 5;

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  ano_activo: number;
  frecuencia_predeterminada: FrecuenciaNomina;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ParametroLegislativo {
  id: number;
  ano: number;
  smmlv: number;
  auxilio_transporte: number;
  uvt: number;
  salud_empleado_pct: number;
  salud_empleador_pct: number;
  pension_empleado_pct: number;
  pension_empleador_pct: number;
  fsp_umbral_smmlv: number;
  fsp_pct: number;
  arl_rates: Record<string, number>;
  caja_compensacion_pct: number;
  sena_pct: number;
  icbf_pct: number;
  vacaciones_dias_por_ano: number;
  intereses_cesantias_pct: number;
  retefuente_umbral_uvt: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface InstructorSENA {
  id: string;
  nombre_completo: string;
  documento_identidad: string;
  correo: string;
  especialidad: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface FichaSENA {
  id: string;
  codigo: string;
  nombre: string;
  horario: string;
  programa: string;
  instructor: string | null;
  fecha_creacion: string;
}

export interface EstudianteSENA {
  id: string;
  nombre_completo: string;
  documento_identidad: string;
  correo: string;
  ficha: string;
  instructor: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface EspacioTrabajo {
  id: string;
  empresa: number;
  ficha: string | null;
  estudiante: string | null;
  fecha_creacion: string;
}

export interface Empleado {
  id: string;
  espacio_trabajo: string;
  nombre_completo: string;
  correo: string;
  documento_identidad: string;
  cargo: string;
  departamento: Departamento;
  tipo_contrato: TipoContrato;
  fecha_contratacion: string;
  fecha_fin_contrato: string | null;
  salario_base: number;
  nivel_arl: NivelARL;
  banco: string;
  numero_cuenta: string;
  dias_vacaciones_usados: number;
  dias_vacaciones_compensados: number;
  estado: EstadoEmpleado;
  ids_beneficios: string[];
  fecha_creacion: string;
}

export interface PlanBeneficio {
  id: string;
  espacio_trabajo: string;
  nombre: string;
  categoria: string;
  monto_mensual: number;
  factor_salarial: boolean;
  descripcion: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface PeriodoNomina {
  id: number;
  clave_periodo: string;
  etiqueta: string;
  ano: number;
  frecuencia: FrecuenciaNomina;
  estado: 'Borrador' | 'Procesada' | 'Pagada';
  fecha_procesada: string | null;
  fecha_pagada: string | null;
  ajustes: Record<string, any>;
  espacio_trabajo: string;
  fecha_creacion: string;
}

export interface ReciboNomina {
  id: string;
  numero_recibo: string;
  periodo: number;
  empleado: string;
  etiqueta_periodo: string;
  frecuencia: FrecuenciaNomina;
  nombre_empleado: string;
  documento_identidad_empleado: string;
  cargo_empleado: string;
  departamento: Departamento;
  banco: string;
  cuenta_bancaria_enmascarada: string;
  salario_base_periodo: number;
  auxilio_transporte: number;
  monto_horas_extra: number;
  detalle_horas_extra: any;
  bono_desempeno: number;
  desglose_beneficios: any[];
  total_beneficios: number;
  pago_bruto: number;
  deduccion_salud: number;
  deduccion_pension: number;
  deduccion_fsp: number;
  deduccion_retefuente: number;
  otras_deducciones: number;
  total_deducciones: number;
  pago_neto: number;
  aporte_empleador_salud: number;
  aporte_empleador_pension: number;
  aporte_empleador_arl: number;
  parafiscales_total: number;
  dias_vacaciones_tomados: number;
  estado_pago: 'Pendiente' | 'Pagado';
  fecha_generacion: string;
  fecha_pago: string | null;
}

export interface SolicitudVacacion {
  id: string;
  espacio_trabajo: string;
  empleado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  tipo: 'Vacaciones Anuales' | 'Compensación en Dinero' | 'Permiso Remunerado' | 'Incapacidad / Licencia';
  estado: 'Aprobada' | 'Pendiente' | 'Rechazada';
  monto_compensado: number;
  notas: string;
  fecha_creacion: string;
}

export interface Eventualidad {
  id: string;
  espacio_trabajo: string;
  empleado: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  impacto_nomina: string;
  monto: number;
  estado: 'Activa' | 'Aplicada en Nómina' | 'Cerrada';
  descripcion: string;
  fecha_creacion: string;
}

export interface LiquidacionDespido {
  id: string;
  espacio_trabajo: string;
  empleado: string;
  nombre_empleado: string;
  documento_identidad_empleado: string;
  cargo_empleado: string;
  departamento: Departamento;
  tipo_contrato: TipoContrato;
  fecha_contratacion: string;
  fecha_terminacion: string;
  causa: string;
  salario_base: number;
  auxilio_transporte: number;
  dias_trabajados_total: number;
  dias_saldo_salario: number;
  monto_saldo_salario: number;
  prima_proporcional: number;
  cesantias_proporcional: number;
  intereses_cesantias: number;
  dias_vacaciones_pendientes: number;
  monto_vacaciones_pendientes: number;
  monto_indemnizacion: number;
  nota_formula_indemnizacion: string;
  total_liquidacion: number;
  fecha_creacion: string;
}

export interface DocumentoNominaElectronica {
  id: string;
  recibo: string;
  numero_recibo: string;
  clave_periodo: string;
  etiqueta_periodo: string;
  id_empleado: string;
  nombre_empleado: string;
  documento_identidad_empleado: string;
  cune: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  mensaje_dian: string;
  contador_reintentos: number;
  contenido_xml: string;
  pago_neto: number;
  pago_bruto: number;
  fecha_actualizacion: string;
}

export interface EntradaAuditoria {
  id: string;
  espacio_trabajo: string;
  usuario: string;
  rol: Rol;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'LIQUIDATE' | 'EMIT';
  entidad_afectada: string;
  datos_anteriores: any;
  datos_nuevos: any;
  ip_origen: string;
  fecha_registro: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
