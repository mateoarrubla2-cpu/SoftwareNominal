const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(
      errorText || `Error ${res.status} al llamar ${path}`
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export function get<T>(path: string, headers?: HeadersInit) {
  return request<T>(path, { method: 'GET', headers });
}

export function post<T>(
  path: string,
  body: unknown,
  headers?: HeadersInit
) {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

export function put<T>(
  path: string,
  body: unknown,
  headers?: HeadersInit
) {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers,
  });
}

export function patch<T>(
  path: string,
  body: unknown,
  headers?: HeadersInit
) {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers,
  });
}

export function del(path: string, headers?: HeadersInit) {
  return request<void>(path, { method: 'DELETE', headers });
}

export const api = {
  empresas: {
    list: () => get<{ results: Empresa[] }>('/empresas/empresas/'),
    create: (body: Partial<Empresa>) =>
      post<Empresa>('/empresas/empresas/', body),
    update: (id: number, body: Partial<Empresa>) =>
      put<Empresa>(`/empresas/empresas/${id}/`, body),
    remove: (id: number) => del(`/empresas/empresas/${id}/`),
  },
  legislacion: {
    list: () => get<{ results: ParametroLegislativo[] }>('/empresas/legislacion/'),
    create: (body: Partial<ParametroLegislativo>) =>
      post<ParametroLegislativo>('/empresas/legislacion/', body),
    update: (id: number, body: Partial<ParametroLegislativo>) =>
      put<ParametroLegislativo>(`/empresas/legislacion/${id}/`, body),
    remove: (id: number) => del(`/empresas/legislacion/${id}/`),
  },
  instructores: {
    list: () => get<{ results: InstructorSENA[] }>('/academico/instructores/'),
    create: (body: Partial<InstructorSENA>) =>
      post<InstructorSENA>('/academico/instructores/', body),
    update: (id: string, body: Partial<InstructorSENA>) =>
      put<InstructorSENA>(`/academico/instructores/${id}/`, body),
    remove: (id: string) => del(`/academico/instructores/${id}/`),
  },
  fichas: {
    list: () => get<{ results: FichaSENA[] }>('/academico/fichas/'),
    create: (body: Partial<FichaSENA>) =>
      post<FichaSENA>('/academico/fichas/', body),
    update: (id: string, body: Partial<FichaSENA>) =>
      put<FichaSENA>(`/academico/fichas/${id}/`, body),
    remove: (id: string) => del(`/academico/fichas/${id}/`),
  },
  estudiantes: {
    list: () => get<{ results: EstudianteSENA[] }>('/academico/estudiantes/'),
    create: (body: Partial<EstudianteSENA>) =>
      post<EstudianteSENA>('/academico/estudiantes/', body),
    update: (id: string, body: Partial<EstudianteSENA>) =>
      put<EstudianteSENA>(`/academico/estudiantes/${id}/`, body),
    remove: (id: string) => del(`/academico/estudiantes/${id}/`),
  },
  espaciosTrabajo: {
    list: () => get<{ results: EspacioTrabajo[] }>('/academico/espacios-trabajo/'),
    create: (body: Partial<EspacioTrabajo>) =>
      post<EspacioTrabajo>('/academico/espacios-trabajo/', body),
    update: (id: string, body: Partial<EspacioTrabajo>) =>
      put<EspacioTrabajo>(`/academico/espacios-trabajo/${id}/`, body),
    remove: (id: string) => del(`/academico/espacios-trabajo/${id}/`),
  },
  empleados: {
    list: () => get<{ results: Empleado[] }>('/nomina/empleados/'),
    create: (body: Partial<Empleado>) =>
      post<Empleado>('/nomina/empleados/', body),
    update: (id: string, body: Partial<Empleado>) =>
      put<Empleado>(`/nomina/empleados/${id}/`, body),
    remove: (id: string) => del(`/nomina/empleados/${id}/`),
  },
  beneficios: {
    list: () => get<{ results: PlanBeneficio[] }>('/nomina/beneficios/'),
    create: (body: Partial<PlanBeneficio>) =>
      post<PlanBeneficio>('/nomina/beneficios/', body),
    update: (id: string, body: Partial<PlanBeneficio>) =>
      put<PlanBeneficio>(`/nomina/beneficios/${id}/`, body),
    remove: (id: string) => del(`/nomina/beneficios/${id}/`),
  },
  periodos: {
    list: () => get<{ results: PeriodoNomina[] }>('/nomina/periodos/'),
    create: (body: Partial<PeriodoNomina>) =>
      post<PeriodoNomina>('/nomina/periodos/', body),
    update: (id: number, body: Partial<PeriodoNomina>) =>
      put<PeriodoNomina>(`/nomina/periodos/${id}/`, body),
    remove: (id: number) => del(`/nomina/periodos/${id}/`),
  },
  recibos: {
    list: () => get<{ results: ReciboNomina[] }>('/nomina/recibos/'),
    create: (body: Partial<ReciboNomina>) =>
      post<ReciboNomina>('/nomina/recibos/', body),
    update: (id: string, body: Partial<ReciboNomina>) =>
      put<ReciboNomina>(`/nomina/recibos/${id}/`, body),
    remove: (id: string) => del(`/nomina/recibos/${id}/`),
  },
  vacaciones: {
    list: () => get<{ results: SolicitudVacacion[] }>('/nomina/vacaciones/'),
    create: (body: Partial<SolicitudVacacion>) =>
      post<SolicitudVacacion>('/nomina/vacaciones/', body),
    update: (id: string, body: Partial<SolicitudVacacion>) =>
      put<SolicitudVacacion>(`/nomina/vacaciones/${id}/`, body),
    remove: (id: string) => del(`/nomina/vacaciones/${id}/`),
  },
  eventualidades: {
    list: () => get<{ results: Eventualidad[] }>('/nomina/eventualidades/'),
    create: (body: Partial<Eventualidad>) =>
      post<Eventualidad>('/nomina/eventualidades/', body),
    update: (id: string, body: Partial<Eventualidad>) =>
      put<Eventualidad>(`/nomina/eventualidades/${id}/`, body),
    remove: (id: string) => del(`/nomina/eventualidades/${id}/`),
  },
  liquidaciones: {
    list: () => get<{ results: LiquidacionDespido[] }>('/nomina/liquidaciones/'),
    create: (body: Partial<LiquidacionDespido>) =>
      post<LiquidacionDespido>('/nomina/liquidaciones/', body),
    remove: (id: string) => del(`/nomina/liquidaciones/${id}/`),
  },
  documentos: {
    list: () =>
      get<{ results: DocumentoNominaElectronica[] }>(
        '/nomina/documentos-electronicos/'
      ),
  },
  auditorias: {
    list: () => get<{ results: EntradaAuditoria[] }>('/nomina/auditorias/'),
  },
};

import type {
  Empresa,
  ParametroLegislativo,
  Empleado,
  PlanBeneficio,
  PeriodoNomina,
  ReciboNomina,
  SolicitudVacacion,
  Eventualidad,
  LiquidacionDespido,
  InstructorSENA,
  FichaSENA,
  EstudianteSENA,
  EspacioTrabajo,
  DocumentoNominaElectronica,
  EntradaAuditoria,
  Rol,
} from '../types/payroll';

export type {
  Empresa,
  ParametroLegislativo,
  Empleado,
  PlanBeneficio,
  PeriodoNomina,
  ReciboNomina,
  SolicitudVacacion,
  Eventualidad,
  LiquidacionDespido,
  InstructorSENA,
  FichaSENA,
  EstudianteSENA,
  EspacioTrabajo,
  DocumentoNominaElectronica,
  EntradaAuditoria,
  Rol,
};
