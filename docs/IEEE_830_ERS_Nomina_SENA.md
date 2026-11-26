# Especificación de Requisitos de Software (ERS) — Estándar IEEE 830
## Plataforma Académica de Gestión de Nómina, Prestaciones y Nómina Electrónica SENA (Cuadra Nómina)

| Campo | Detalle |
| :--- | :--- |
| **Nombre del Proyecto** | Cuadra Nómina — Plataforma de Formación SENA (INAMOD) |
| **Estándar de Referencia** | IEEE Std 830-1998 (Especificación de Requisitos de Software) |
| **Versión del Documento** | 1.0 |
| **Fecha de Elaboración** | 25 de noviembre de 2026 |
| **Ámbito de Aplicación** | Formación Técnica y Tecnológica SENA · Gestión de Talento Humano y Nómina Colombiana |
| **Autores / Responsable** | Equipo de Arquitectura y Desarrollo |

---

## 1. Introducción

### 1.1 Propósito
El presente documento define de forma completa, verificable y trazable los **Requisitos Funcionales (RF)** y **Requisitos No Funcionales (RNF)** del sistema **Cuadra Nómina**, siguiendo los lineamientos del estándar **IEEE 830-1998**. Está dirigido a instructores, aprendices, administradores académicos del SENA, analistas funcionales, desarrolladores y evaluadores de calidad del software.

### 1.2 Alcance del Sistema
**Cuadra Nómina** es una aplicación web full-stack orientada a la **formación práctica en nómina y gestión laboral bajo legislación colombiana vigente**, manteniendo la estructura real de un software empresarial de nómina distribuido en tres niveles de acceso aislados:
1. **Administrador:** Control global del centro de formación, visualización de métricas consolidadas y gestión integral (CRUD) de instructores, grupos/fichas y estudiantes.
2. **Instructor:** Creación y administración de múltiples fichas o clases (por ejemplo, *Recursos Humanos Mañana*, *Recursos Humanos Tarde*), gestión de sus estudiantes asignados, operación de su propio panel de nómina por ficha y supervisión en modo **solo lectura** del trabajo práctico de sus aprendices.
3. **Estudiante (Aprendiz):** Acceso exclusivo a un **panel de nómina propio completamente en blanco**, donde practica todo el ciclo de liquidación (trabajadores, novedades, horas extras, prestaciones, vacaciones, eventualidades, despidos, nómina electrónica XML, reportes PDF/Excel, calendario y Google Workspace) sin visibilidad ni interferencia sobre el trabajo de otros compañeros o fichas.

### 1.3 Definiciones, Acrónimos y Abreviaturas
| Término / Sigla | Definición |
| :--- | :--- |
| **ERS / SRS** | Especificación de Requisitos de Software (*Software Requirements Specification*). |
| **RF / RNF** | Requisito Funcional / Requisito No Funcional. |
| **SENA** | Servicio Nacional de Aprendizaje (Colombia). |
| **Ficha** | Grupo o cohorte de formación académica asignada a un instructor (ej. Ficha 2894510). |
| **RBAC** | Control de Acceso Basado en Roles (*Role-Based Access Control*). |
| **CST** | Código Sustantivo del Trabajo de la República de Colombia. |
| **SMMLV** | Salario Mínimo Mensual Legal Vigente en Colombia. |
| **UVT** | Unidad de Valor Tributario usada para retención en la fuente. |
| **ARL** | Administradora de Riesgos Laborales (niveles de riesgo I al V). |
| **FSP** | Fondo de Solidaridad Pensional (aplica a salarios ≥ 4 SMMLV). |
| **DIAN** | Dirección de Impuestos y Aduanas Nacionales de Colombia. |
| **CUNE** | Código Único de Nómina Electrónica. |
| **XML** | Lenguaje de Marcado Extensible usado en documentos electrónicos DIAN. |
| **Workspace** | Espacio de trabajo lógico aislado (`ficha:<id>` o `student:<id>`). |

### 1.4 Referencias
- Estándar **IEEE Std 830-1998**: *IEEE Recommended Practice for Software Requirements Specifications*.
- **Código Sustantivo del Trabajo (CST)** de Colombia y normatividad vigente de Seguridad Social, Parafiscales y Prestaciones Sociales.
- **Anexo Técnico de Nómina Electrónica DIAN** (estructura XML y CUNE).
- Estándar de calidad de software **ISO/IEC 25010** y buenas prácticas de seguridad **OWASP Top 10**.

### 1.5 Apreciación General del Documento
- La **Sección 2** describe el contexto arquitectónico, roles de usuario, restricciones y supuestos de operación del sistema.
- La **Sección 3** consolida el levantamiento formal de interfaces externas, requisitos funcionales (**RF-01** a **RF-19**), requisitos no funcionales (**RNF-01** a **RNF-11**) y la matriz de permisos por rol.

---

## 2. Descripción General del Producto

### 2.1 Perspectiva del Producto
El sistema opera como una aplicación web cliente-servidor autocontenida:
- **Frontend (SPA):** Desarrollado en **React 19 + TypeScript + Vite + Tailwind CSS v4**, con componentes modulares para los paneles académicos SENA y los 13 módulos operativos de nómina y exportación.
- **Backend (API REST):** Servidor **Node.js + Express** que expone rutas `/api/*`, valida el contexto de rol y actor (`x-demo-role`, `x-actor-id`, `x-workspace-id`), aplica aislamiento estricto multi-espacio y persiste el estado estructurado en almacenamiento local JSON (`/data/payroll-db.json`).
- **Servicios Externos:** Integración opcional del lado cliente mediante **OAuth 2.0** con **Google Workspace** (Google Drive, Google Docs, Google Sheets y Gmail) y generación local de documentos **PDF** (`jsPDF` + `jspdf-autotable`) y **Excel** (`xlsx`).

### 2.2 Funciones Principales del Producto
1. Administración académica SENA (instructores, fichas múltiples, aprendices y estadísticas globales).
2. Aislamiento multi-espacio por ficha y por aprendiz con inicio en blanco garantizado para cada estudiante.
3. Parametrización legal anual colombiana (SMMLV, Auxilio de Transporte, UVT, aportes, parafiscales, ARL).
4. Gestión integral de trabajadores, contratos, beneficios adicionales y eventualidades.
5. Liquidación de nómina mensual o quincenal, horas extras, recargos y emisión automática de desprendibles PDF.
6. Control de vacaciones, calendario laboral unificado y cálculo de liquidaciones definitivas por despido o renuncia.
7. Generación y simulación de transmisión XML de Nómina Electrónica DIAN con CUNE y estados.
8. Exportación directa a PDF/Excel, integración con Google Workspace y bitácora de auditoría inmutable.

### 2.3 Características de los Usuarios
| Rol | Perfil del Usuario | Nivel Técnico | Responsabilidades Clave |
| :--- | :--- | :--- | :--- |
| **Administrador** | Coordinación académica / administración del centro SENA. | Medio | Crear, editar y eliminar instructores, fichas y estudiantes; supervisar cifras globales del centro y reiniciar el entorno de demostración. |
| **Instructor** | Docente SENA de áreas administrativas o contables. | Medio | Crear múltiples fichas/clases, gestionar aprendices de sus fichas, operar la nómina de cada ficha y revisar en solo lectura las prácticas de sus estudiantes. |
| **Estudiante** | Aprendiz SENA en formación práctica. | Básico-Medio | Realizar prácticas completas de nómina desde cero en su propio panel aislado sin acceder a datos de compañeros u otros grupos. |

### 2.4 Restricciones de Diseño y Operación
- **Aislamiento obligatorio:** Ningún endpoint de escritura o lectura puede exponer datos fuera del alcance autorizado para el rol y actor solicitante.
- **Supervisión no intrusiva:** Cuando un instructor inspecciona el espacio de un estudiante (`student:<id>`), toda operación de modificación debe ser bloqueada por el servidor (`HTTP 403`).
- **Integración OAuth en navegador:** Las credenciales y tokens de Google Workspace se gestionan exclusivamente en el flujo OAuth del cliente sin almacenar secretos en el código fuente.
- **Idioma e interfaz:** Toda la interfaz, validaciones, reportes y mensajes de error se presentan en español colombiano.

### 2.5 Suposiciones y Dependencias
- El usuario accede mediante un navegador web moderno con JavaScript habilitado y conectividad hacia el servidor Express en el puerto `3000`.
- Para usar las funciones de respaldo o envío con Google Drive, Docs, Sheets y Gmail, la cuenta del usuario debe autorizar los permisos OAuth correspondientes y el proyecto Google Cloud debe tener habilitadas dichas APIs.
- Los valores legales de Colombia (SMMLV, UVT y porcentajes) se mantienen actualizables por año fiscal desde el módulo de legislación sin modificar código fuente.

---

## 3. Levantamiento de Requisitos Específicos

### 3.1 Requisitos de Interfaces Externas

#### 3.1.1 Interfaz de Usuario (UI)
- Navegación lateral fija por rol con selector rápido de **Simulador de Rol SENA** (`Admin`, `Instructor`, `Estudiante`), selector de ficha activa para instructores y barra superior contextual.
- Indicadores claros de solo lectura cuando un instructor supervisa la práctica de un aprendiz (`"Supervisando práctica de ... · Solo lectura"`).
- Tablas financieras con tipografía tabular monoespaciada para valores en pesos colombianos (COP), modales con confirmación explícita para eliminaciones y estados vacíos explicativos cuando un panel inicia en blanco.

#### 3.1.2 Interfaces de Software y API REST
- **Autenticación/Contexto de demostración:** `GET /api/demo/actors`, `GET /api/platform`, `POST /api/demo/reset`.
- **Gestión Académica SENA:** CRUD sobre `/api/sena/instructors`, `/api/sena/fichas`, `/api/sena/students` y reinicio individual `/api/sena/workspaces/:workspaceId/reset-blank`.
- **Operación de Nómina por Espacio:** `/api/company`, `/api/legislation/:year`, `/api/employees`, `/api/benefits`, `/api/vacations`, `/api/eventualities`, `/api/payroll/periods`, `/api/payroll/:periodKey/*`, `/api/severances`, `/api/electronic-payroll/*`.
- **Interfaces Externas Google Workspace:** APIs REST v3 de Google Drive, v1 de Google Docs, v4 de Google Sheets y v1 de Gmail mediante token Bearer OAuth 2.0.

---

### 3.2 Levantamiento de Requisitos Funcionales (RF)

| ID | Módulo | Nombre del Requisito | Actores | Prioridad | Descripción y Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-01** | RBAC / Navegación | Selector y Simulación de los 3 Roles SENA | Administrador, Instructor, Estudiante | Alta | **Descripción:** El sistema debe permitir operar con los tres roles definidos (`ADMINISTRADOR`, `INSTRUCTOR`, `ESTUDIANTE`), adaptando la navegación, datos visibles y permisos en tiempo real.<br>**Criterio de aceptación:** Al cambiar de rol o usuario, la API devuelve únicamente los instructores, fichas, estudiantes y espacios autorizados para dicho actor. |
| **RF-02** | Panel Administrador | Gestión Global de Instructores, Fichas y Estudiantes | Administrador | Alta | **Descripción:** El Administrador debe visualizar métricas globales (total de instructores activos, total de grupos/fichas, total de estudiantes, trabajadores simulados y desprendibles) y ejecutar operaciones completas de consulta, creación, edición y eliminación sobre instructores, fichas y estudiantes.<br>**Criterio de aceptación:** Al eliminar un instructor o ficha/estudiante, se mantienen íntegras las referencias o se depura el espacio asociado según corresponda, reflejándose inmediatamente en los contadores globales. |
| **RF-03** | Panel Instructor | Gestión de Múltiples Fichas y Estudiantes Propios | Instructor | Alta | **Descripción:** Cada Instructor debe poder crear, editar y eliminar múltiples fichas o clases propias (ej. *Recursos Humanos Mañana*, *Recursos Humanos Tarde*) y agregar, editar o eliminar estudiantes dentro de sus fichas.<br>**Criterio de aceptación:** Un instructor no puede visualizar, editar ni eliminar fichas ni estudiantes pertenecientes a otro instructor (respuesta `HTTP 403`). |
| **RF-04** | Supervisión Académica | Inspección en Solo Lectura del Panel de Estudiantes | Instructor | Alta | **Descripción:** El Instructor debe poder abrir el espacio de práctica de cualquiera de los estudiantes de sus fichas para revisar sus avances en todos los módulos de nómina.<br>**Criterio de aceptación:** La vista muestra un banner de supervisión en solo lectura y cualquier intento de mutación sobre `student:<id>` desde un rol `INSTRUCTOR` es rechazado con `HTTP 403`. |
| **RF-05** | Panel Estudiante | Espacio de Trabajo en Blanco y Aislado por Aprendiz | Estudiante | Alta | **Descripción:** Al crear un estudiante, el sistema debe aprovisionar automáticamente un espacio de trabajo (`student:<id>`) completamente en blanco (`0` trabajadores, `0` beneficios, `0` vacaciones, `0` eventualidades, `0` liquidaciones y `1` período borrador vacío).<br>**Criterio de aceptación:** El estudiante solo puede leer y modificar su propio espacio; todo intento de acceder o alterar el panel de otro compañero devuelve `HTTP 403`. |
| **RF-06** | Legislación Actual | Parametrización Legal Anual Configurable | Administrador, Instructor, Estudiante | Alta | **Descripción:** El módulo de legislación debe almacenar parámetros por año fiscal (`SMMLV`, `Auxilio de Transporte`, `UVT`, porcentajes de Salud/Pensión empleado y empleador, FSP, ARL niveles 1–5, Caja, SENA, ICBF, días de vacaciones e intereses de cesantías) editables sin tocar código fuente.<br>**Criterio de aceptación:** Al guardar cambios legales en un año, los períodos en estado `Borrador` del espacio activo se recalculan automáticamente. |
| **RF-07** | Configuración | Parametrización de Entidad / Empresa del Espacio | Administrador, Instructor, Estudiante | Media | **Descripción:** Cada espacio debe permitir editar razón social, NIT, dirección, ciudad, año activo y periodicidad por defecto (`Mensual` o `Quincenal`).<br>**Criterio de aceptación:** Los datos actualizados aparecen en los encabezados de desprendibles PDF, actas y documentos XML. |
| **RF-08** | Trabajadores | CRUD de Empleados y Contratos | Administrador, Instructor, Estudiante | Alta | **Descripción:** Permitir registrar, editar, filtrar y retirar/eliminar trabajadores indicando documento, correo, cargo, departamento, tipo de contrato (`Término Indefinido`, `Término Fijo`, `Obra o Labor`), salario base, nivel de riesgo ARL (1–5), banco, número de cuenta y beneficios asignados.<br>**Criterio de aceptación:** Cada alta o edición actualiza automáticamente la nómina en borrador vigente. |
| **RF-09** | Pagas y Nómina | Gestión de Períodos, Periodicidad y Prevención de Duplicados | Administrador, Instructor, Estudiante | Alta | **Descripción:** Permitir abrir nuevos períodos (`YYYY-MM`), alternar periodicidad (`Mensual` / `Quincenal`) mientras no esté pagado, preseleccionar el siguiente mes disponible y validar que no existan períodos repetidos.<br>**Criterio de aceptación:** El sistema bloquea la creación de un período duplicado con aviso en línea en la interfaz y respuesta `HTTP 409` en servidor sin generar fallos no controlados. |
| **RF-10** | Pagas y Nómina | Cálculo de Nómina, Horas Extras y Novedades | Administrador, Instructor, Estudiante | Alta | **Descripción:** Calcular automáticamente salario del período, auxilio de transporte (si salario ≤ 2 SMMLV), horas extras diurnas/nocturnas/dominicales/festivas y recargos nocturnos, bonificaciones, beneficios, salud (4%), pensión (4%), FSP (≥ 4 SMMLV), retención en la fuente por UVT, deducciones adicionales y aportes patronales (salud, pensión, ARL y parafiscales).<br>**Criterio de aceptación:** Al guardar novedades por empleado o procesar/pagar el período, los totales netos y costos patronales cuadran exactamente según la legislación del año. |
| **RF-11** | Desprendibles PDF | Generación y Descarga de Desprendibles de Pago | Administrador, Instructor, Estudiante | Alta | **Descripción:** Permitir previsualizar cada desprendible individual, marcar pagos individuales o masivos, y descargar desprendibles individuales o por lote en formato PDF.<br>**Criterio de aceptación:** El PDF incluye empresa, trabajador, cuenta bancaria enmascarada, detalle de devengados, deducciones, neto a pagar y estado de pago. |
| **RF-12** | Prestaciones y Beneficios | Cálculo de Prestaciones Sociales y Gestión de Beneficios | Administrador, Instructor, Estudiante | Alta | **Descripción:** Calcular de forma automática y proporcional por trabajador la prima de servicios, cesantías, intereses sobre cesantías (12% anual) y validación de dotación (tope ≤ 2 SMMLV); además permitir crear, editar y asignar planes de beneficios adicionales (alimentación, salud, movilidad, bienestar, formación) marcando si constituyen factor salarial.<br>**Criterio de aceptación:** La asignación de beneficios activos se refleja directamente en la liquidación de nómina del trabajador. |
| **RF-13** | Vacaciones | Solicitud, Aprobación y Compensación de Vacaciones | Administrador, Instructor, Estudiante | Alta | **Descripción:** Calcular días causados (15 días hábiles por año laborado) vs. disfrutados/compensados, registrar solicitudes de vacaciones o compensación en dinero, calcular días hábiles excluyendo fines de semana y permitir aprobar o rechazar solicitudes pendientes.<br>**Criterio de aceptación:** Al aprobar una solicitud de vacaciones o compensación, se actualizan los días usados/compensados del trabajador y se sincroniza el período borrador. |
| **RF-14** | Eventualidades | Registro e Impacto Salarial de Novedades Laborales | Administrador, Instructor, Estudiante | Alta | **Descripción:** Permitir registrar eventualidades (incapacidad médica EPS/ARL, licencia de maternidad/paternidad, calamidad doméstica, permiso académico/SENA, ausencia injustificada, bonificación especial) con rango de fechas, estado (`Activa`, `Aplicada en Nómina`, `Cerrada`) e impacto salarial (`Sin impacto`, `Descuento`, `Bonificación`, `Incapacidad EPS/ARL`).<br>**Criterio de aceptación:** Las eventualidades en estado `Aplicada en Nómina` impactan automáticamente el devengado o deducción del período borrador correspondiente. |
| **RF-15** | Calendario Laboral | Calendario Mensual Integrado de Nómina y Novedades | Administrador, Instructor, Estudiante | Media | **Descripción:** Mostrar en una vista calendario mensual las fechas de corte/pago de nómina, vacaciones programadas y eventualidades registradas, con filtros y acceso rápido para crear una eventualidad en una fecha seleccionada.<br>**Criterio de aceptación:** Seleccionar un día con eventos muestra el detalle de pagos, vacaciones o novedades asociadas. |
| **RF-16** | Despidos y Liquidaciones | Liquidación Definitiva de Contrato e Indemnización | Administrador, Instructor, Estudiante | Alta | **Descripción:** Calcular liquidación final considerando causal (`Renuncia Voluntaria`, `Despido con Justa Causa`, `Despido sin Justa Causa`), salarios pendientes, prima proporcional, cesantías, intereses de cesantías, vacaciones pendientes e indemnización legal automática según tipo de contrato y antigüedad, con opción de marcar al trabajador como `Retirado` y exportar acta en PDF.<br>**Criterio de aceptación:** Solo en `Despido sin Justa Causa` se liquida indemnización automática (tiempo restante en Término Fijo o días según tabla legal CST en Término Indefinido). |
| **RF-17** | Nómina Electrónica | Generación XML, CUNE y Transmisión DIAN Simulada | Administrador, Instructor, Estudiante | Alta | **Descripción:** Generar el documento electrónico estructurado en formato **XML** por cada desprendible con cálculo de **CUNE**, permitiendo emitir individualmente o en lote, simular rechazo DIAN (`RECHAZADO`), reintentar transmisión incrementando `retryCount` y consultar/descargar el XML.<br>**Criterio de aceptación:** Todo documento emitido cambia de `PENDIENTE` a `APROBADO` o `RECHAZADO` y registra el evento en la bitácora de auditoría. |
| **RF-18** | Reportes y Google Workspace | Exportación PDF/Excel e Integración Drive, Docs, Sheets y Gmail | Administrador, Instructor, Estudiante | Alta | **Descripción:** Exportar reportes generales de nómina, prestaciones y desprendibles en PDF y libros Excel (`.xlsx`) multi-hoja directamente desde el sistema; conectar con Google Workspace para subir archivos/reportes a Drive, crear actas o certificados en Google Docs, exportar tablas a Google Sheets y enviar desprendibles por Gmail.<br>**Criterio de aceptación:** Los archivos PDF/XLSX se descargan localmente y, cuando el usuario autentica Google Drive, pueden respaldarse en su carpeta en la nube. |
| **RF-19** | Auditoría | Bitácora Inmutable de Auditoría del Espacio | Administrador, Instructor, Estudiante | Media | **Descripción:** Registrar automáticamente en la bitácora del espacio cada acción relevante (`CREATE`, `UPDATE`, `DELETE`, `LIQUIDATE`, `EMIT`) con usuario, rol, entidad afectada, estado anterior, estado nuevo, dirección IP y marca temporal ISO.<br>**Criterio de aceptación:** Las entradas de auditoría son de solo consulta desde la interfaz y no permiten edición ni borrado individual. |

---

### 3.3 Levantamiento de Requisitos No Funcionales (RNF)

| ID | Categoría (ISO 25010) | Nombre del Requisito | Descripción y Criterio Verificable |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Seguridad (Control de Acceso) | Aislamiento Multi-Espacio Estricto en Backend | Todas las rutas `/api/*` deben validar en el servidor el rol (`ADMINISTRADOR`, `INSTRUCTOR`, `ESTUDIANTE`) y el propietario del recurso solicitado; ningún acceso cruzado entre instructores o entre estudiantes debe prosperar (`HTTP 403`). |
| **RNF-02** | Seguridad (Privacidad de Datos) | Enmascaramiento de Datos Bancarios | Los números de cuenta bancaria en los desprendibles de pago (`bankAccountMasked`) y reportes deben mostrarse enmascarados preservando únicamente los últimos 4 dígitos visibles. |
| **RNF-03** | Seguridad (Autenticación Externa) | Flujo OAuth 2.0 Client-Side para Google Workspace | La autenticación con Google Drive, Docs, Sheets y Gmail debe ejecutarse exclusivamente en el navegador mediante tokens de sesión OAuth sin exponer secretos de cliente ni claves privadas en el repositorio. |
| **RNF-04** | Seguridad (Validación de Entradas) | Validación Estructural y Sanitización en Servidor | El backend debe validar campos obligatorios, formatos de fecha/período (`YYYY-MM`), rangos numéricos y existencia de entidades referenciadas, respondiendo códigos HTTP semánticos (`400`, `403`, `404`, `409`) con mensajes claros en español. |
| **RNF-05** | Usabilidad | Interfaz Clara en Español y Soporte de Estados Vacíos | Todos los módulos deben operar correctamente con `0` trabajadores o `0` registros (caso inicial del estudiante), mostrando mensajes orientadores y evitando errores de cálculo por división entre cero o valores nulos. |
| **RNF-06** | Usabilidad | Diseño Responsivo y Retroalimentación Inmediata | La aplicación debe adaptarse a pantallas de escritorio, portátiles y tabletas/móviles, mostrando confirmaciones modales antes de eliminaciones destructivas y notificaciones toast ante cada operación exitosa o fallida. |
| **RNF-07** | Fiabilidad | Manejo Controlado de Errores y Estado Consistente | Las acciones asíncronas de formularios y botones deben capturar fallos HTTP sin producir excepciones no manejadas en consola ni cerrar modales con datos sin guardar. |
| **RNF-08** | Rendimiento | Recálculo Síncrono y Respuesta Ágil | Las liquidaciones de nómina, recálculo de borradores, filtros de tablas y generación local de PDF/Excel deben ejecutarse en menos de 1 segundo para grupos académicos estándar (hasta 100 trabajadores por espacio). |
| **RNF-09** | Mantenibilidad | Arquitectura Modular y Tipado Estricto | El proyecto debe compilar sin errores ni advertencias de tipos bajo TypeScript (`tsc --noEmit`) y mantener separados el motor de cálculo legal (`payrollEngine.ts`), el motor de exportación (`exportEngine.ts`), los conectores Google y las vistas React. |
| **RNF-10** | Portabilidad / Despliegue | Configuración por Variables de Entorno y Puerto Estándar | El servidor unificado (`server.ts`) debe servir API y frontend compilado en el puerto `3000`, documentando variables requeridas en `.env.example` y excluyendo datos temporales (`/data/`) del control de versiones. |
| **RNF-11** | Cumplimiento Normativo | Apego a Legislación Laboral Colombiana | Los cálculos de auxilio de transporte, porcentajes de seguridad social, parafiscales, prestaciones sociales, recargos nocturnos/dominicales e indemnizaciones deben ajustarse a las reglas del Código Sustantivo del Trabajo parametrizadas por año fiscal. |

---

### 3.4 Matriz de Trazabilidad de Permisos por Rol

| Operación / Recurso | Administrador | Instructor (Ficha Propia) | Instructor (Supervisando Estudiante Propio) | Instructor (Ficha/Estudiante Ajeno) | Estudiante (Panel Propio) | Estudiante (Otro Compañero) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Ver métricas globales SENA | Sí | No | No | No | No | No |
| CRUD Instructores | Sí | No | No | No | No | No |
| CRUD Fichas / Grupos | Todos | Solo propias | N/A | Bloqueado (`403`) | No | No |
| CRUD Estudiantes | Todos | Solo en fichas propias | N/A | Bloqueado (`403`) | No | No |
| Ver módulos de nómina del espacio | Sí | Sí | Sí (Solo lectura) | Bloqueado (`403`) | Sí | Bloqueado (`403`) |
| Crear/editar/liquidar nómina, empleados, vacaciones y XML | Sí | Sí | Bloqueado (`403`) | Bloqueado (`403`) | Sí | Bloqueado (`403`) |
| Exportar PDF / Excel y usar Google Workspace | Sí | Sí | Solo lectura/exportar | Bloqueado (`403`) | Sí | Bloqueado (`403`) |
| Reiniciar espacio de trabajo en blanco | Sí | Solo ficha propia | Bloqueado (`403`) | Bloqueado (`403`) | Solo propio | Bloqueado (`403`) |
| Reiniciar toda la plataforma demo | Sí | Bloqueado (`403`) | Bloqueado (`403`) | Bloqueado (`403`) | Bloqueado (`403`) | Bloqueado (`403`) |
