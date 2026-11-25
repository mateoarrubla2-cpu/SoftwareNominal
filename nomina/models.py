from django.db import models
from django.db.models import UniqueConstraint

from academico.models import EspacioTrabajo
from empresas.models import Empresa, ParametroLegislativo


class Empleado(models.Model):
    # Trazabilidad: antes Employee (SoftwareNominal)
    TIPO_CONTRATO_CHOICES = [
        ("Término Indefinido", "Término Indefinido"),
        ("Término Fijo", "Término Fijo"),
        ("Obra o Labor", "Obra o Labor"),
    ]
    ESTADO_CHOICES = [
        ("Activo", "Activo"),
        ("Vacaciones", "Vacaciones"),
        ("Retirado", "Retirado"),
    ]
    DEPARTAMENTO_CHOICES = [
        ("Investigación Textil", "Investigación Textil"),
        ("Diseño y Patronaje", "Diseño y Patronaje"),
        ("Confección Avanzada", "Confección Avanzada"),
        ("Innovación y Materiales", "Innovación y Materiales"),
        ("Gestión Administrativa", "Gestión Administrativa"),
        ("Calidad y Metrología", "Calidad y Metrología"),
    ]
    NIVEL_ARL_CHOICES = [
        (1, "Nivel 1"),
        (2, "Nivel 2"),
        (3, "Nivel 3"),
        (4, "Nivel 4"),
        (5, "Nivel 5"),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="empleados",
    )
    nombre_completo = models.CharField(max_length=200)
    correo = models.EmailField(blank=True, default="")
    documento_identidad = models.CharField(max_length=50, blank=True, default="")
    cargo = models.CharField(max_length=100, blank=True, default="")
    departamento = models.CharField(
        max_length=100, choices=DEPARTAMENTO_CHOICES, default="Gestión Administrativa"
    )
    tipo_contrato = models.CharField(
        max_length=50, choices=TIPO_CONTRATO_CHOICES, default="Término Indefinido"
    )
    fecha_contratacion = models.DateField()
    fecha_fin_contrato = models.DateField(null=True, blank=True)
    salario_base = models.PositiveIntegerField()
    nivel_arl = models.PositiveSmallIntegerField(choices=NIVEL_ARL_CHOICES, default=1)
    banco = models.CharField(max_length=100, blank=True, default="")
    numero_cuenta = models.CharField(max_length=50, blank=True, default="")
    dias_vacaciones_usados = models.PositiveIntegerField(default=0)
    dias_vacaciones_compensados = models.PositiveIntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="Activo")
    ids_beneficios = models.JSONField(default=list, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["id"]
        db_table = "nomina_empleado"

    def __str__(self):
        return self.nombre_completo


class PlanBeneficio(models.Model):
    # Trazabilidad: antes BenefitPlan (SoftwareNominal)
    CATEGORIA_CHOICES = [
        ("Alimentación", "Alimentación"),
        ("Salud", "Salud"),
        ("Movilidad", "Movilidad"),
        ("Bienestar", "Bienestar"),
        ("Formación", "Formación"),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="beneficios",
    )
    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=50, choices=CATEGORIA_CHOICES, default="Bienestar")
    monto_mensual = models.PositiveIntegerField()
    factor_salarial = models.BooleanField(default=False)
    descripcion = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Plan de beneficio"
        verbose_name_plural = "Planes de beneficio"
        ordering = ["id"]
        db_table = "nomina_planbeneficio"

    def __str__(self):
        return self.nombre


class PeriodoNomina(models.Model):
    # Trazabilidad: antes PayrollPeriod (SoftwareNominal)
    FRECUENCIA_CHOICES = [
        ("Mensual", "Mensual"),
        ("Quincenal", "Quincenal"),
    ]
    ESTADO_CHOICES = [
        ("Borrador", "Borrador"),
        ("Procesada", "Procesada"),
        ("Pagada", "Pagada"),
    ]

    clave_periodo = models.CharField(max_length=7, help_text="Formato YYYY-MM")
    etiqueta = models.CharField(max_length=100)
    ano = models.PositiveIntegerField()
    frecuencia = models.CharField(max_length=20, choices=FRECUENCIA_CHOICES, default="Mensual")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="Borrador")
    fecha_procesada = models.DateTimeField(null=True, blank=True)
    fecha_pagada = models.DateTimeField(null=True, blank=True)
    ajustes = models.JSONField(default=dict, blank=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="periodos",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Período de nómina"
        verbose_name_plural = "Períodos de nómina"
        ordering = ["-clave_periodo"]
        constraints = [
            UniqueConstraint(
                fields=["espacio_trabajo", "clave_periodo"],
                name="unique_clave_periodo_por_espacio",
            ),
        ]
        db_table = "nomina_periodonomina"

    def __str__(self):
        return f"{self.clave_periodo} ({self.estado})"


class ReciboNomina(models.Model):
    # Trazabilidad: antes Payslip (SoftwareNominal)
    ESTADO_PAGO_CHOICES = [
        ("Pendiente", "Pendiente"),
        ("Pagado", "Pagado"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    numero_recibo = models.CharField(max_length=100)
    periodo = models.ForeignKey(
        PeriodoNomina,
        on_delete=models.CASCADE,
        related_name="recibos",
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name="recibos",
    )
    etiqueta_periodo = models.CharField(max_length=100)
    frecuencia = models.CharField(max_length=20)
    nombre_empleado = models.CharField(max_length=200)
    documento_identidad_empleado = models.CharField(max_length=50)
    cargo_empleado = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100)
    banco = models.CharField(max_length=100, blank=True, default="")
    cuenta_bancaria_enmascarada = models.CharField(max_length=50, blank=True, default="")
    salario_base_periodo = models.PositiveIntegerField()
    auxilio_transporte = models.PositiveIntegerField(default=0)
    monto_horas_extra = models.PositiveIntegerField(default=0)
    detalle_horas_extra = models.JSONField(default=dict, blank=True)
    bono_desempeno = models.PositiveIntegerField(default=0)
    desglose_beneficios = models.JSONField(default=list, blank=True)
    total_beneficios = models.PositiveIntegerField(default=0)
    pago_bruto = models.PositiveIntegerField()
    deduccion_salud = models.PositiveIntegerField(default=0)
    deduccion_pension = models.PositiveIntegerField(default=0)
    deduccion_fsp = models.PositiveIntegerField(default=0)
    deduccion_retefuente = models.PositiveIntegerField(default=0)
    otras_deducciones = models.PositiveIntegerField(default=0)
    total_deducciones = models.PositiveIntegerField(default=0)
    pago_neto = models.PositiveIntegerField()
    aporte_empleador_salud = models.PositiveIntegerField(default=0)
    aporte_empleador_pension = models.PositiveIntegerField(default=0)
    aporte_empleador_arl = models.PositiveIntegerField(default=0)
    parafiscales_total = models.PositiveIntegerField(default=0)
    dias_vacaciones_tomados = models.PositiveIntegerField(default=0)
    estado_pago = models.CharField(max_length=20, choices=ESTADO_PAGO_CHOICES, default="Pendiente")
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    fecha_pago = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Recibo de nómina"
        verbose_name_plural = "Recibos de nómina"
        ordering = ["-fecha_generacion"]
        db_table = "nomina_recibonomina"

    def __str__(self):
        return self.numero_recibo


class SolicitudVacacion(models.Model):
    # Trazabilidad: antes VacationRequest (SoftwareNominal)
    TIPO_CHOICES = [
        ("Vacaciones Anuales", "Vacaciones Anuales"),
        ("Compensación en Dinero", "Compensación en Dinero"),
        ("Permiso Remunerado", "Permiso Remunerado"),
        ("Incapacidad / Licencia", "Incapacidad / Licencia"),
    ]
    ESTADO_CHOICES = [
        ("Aprobada", "Aprobada"),
        ("Pendiente", "Pendiente"),
        ("Rechazada", "Rechazada"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="vacaciones",
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name="vacaciones",
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    dias_habiles = models.PositiveIntegerField()
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="Pendiente")
    monto_compensado = models.PositiveIntegerField(default=0)
    notas = models.TextField(blank=True, default="")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Solicitud de vacaciones"
        verbose_name_plural = "Solicitudes de vacaciones"
        ordering = ["-fecha_creacion"]
        db_table = "nomina_solicitudvacacion"

    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.fecha_inicio} a {self.fecha_fin}"


class Eventualidad(models.Model):
    # Trazabilidad: antes Eventuality (SoftwareNominal)
    TIPO_CHOICES = [
        ("Incapacidad Médica (EPS/ARL)", "Incapacidad Médica (EPS/ARL)"),
        ("Licencia Maternidad / Paternidad", "Licencia Maternidad / Paternidad"),
        ("Calamidad Doméstica", "Calamidad Doméstica"),
        ("Permiso Académico / SENA", "Permiso Académico / SENA"),
        ("Ausencia Injustificada", "Ausencia Injustificada"),
        ("Bonificación Especial", "Bonificación Especial"),
    ]
    IMPACTO_CHOICES = [
        ("Sin impacto salarial", "Sin impacto salarial"),
        ("Descuento", "Descuento"),
        ("Bonificación", "Bonificación"),
        ("Incapacidad EPS/ARL", "Incapacidad EPS/ARL"),
    ]
    ESTADO_CHOICES = [
        ("Activa", "Activa"),
        ("Aplicada en Nómina", "Aplicada en Nómina"),
        ("Cerrada", "Cerrada"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="eventualidades",
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name="eventualidades",
    )
    tipo = models.CharField(max_length=100, choices=TIPO_CHOICES)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    dias = models.PositiveIntegerField()
    impacto_nomina = models.CharField(max_length=50, choices=IMPACTO_CHOICES)
    monto = models.PositiveIntegerField(default=0)
    estado = models.CharField(max_length=30, choices=ESTADO_CHOICES, default="Activa")
    descripcion = models.TextField(blank=True, default="")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Eventualidad"
        verbose_name_plural = "Eventualidades"
        ordering = ["-fecha_creacion"]
        db_table = "nomina_eventualidad"

    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.tipo}"


class LiquidacionDespido(models.Model):
    # Trazabilidad: antes SeveranceRecord (SoftwareNominal)
    CAUSA_CHOICES = [
        ("Renuncia Voluntaria", "Renuncia Voluntaria"),
        ("Despido con Justa Causa", "Despido con Justa Causa"),
        ("Despido sin Justa Causa", "Despido sin Justa Causa"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="liquidaciones",
    )
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name="liquidaciones",
    )
    nombre_empleado = models.CharField(max_length=200)
    documento_identidad_empleado = models.CharField(max_length=50)
    cargo_empleado = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100)
    tipo_contrato = models.CharField(max_length=50)
    fecha_contratacion = models.DateField()
    fecha_terminacion = models.DateField()
    causa = models.CharField(max_length=50, choices=CAUSA_CHOICES)
    salario_base = models.PositiveIntegerField()
    auxilio_transporte = models.PositiveIntegerField(default=0)
    dias_trabajados_total = models.PositiveIntegerField()
    dias_saldo_salario = models.PositiveIntegerField()
    monto_saldo_salario = models.PositiveIntegerField()
    prima_proporcional = models.PositiveIntegerField()
    cesantias_proporcional = models.PositiveIntegerField()
    intereses_cesantias = models.PositiveIntegerField()
    dias_vacaciones_pendientes = models.PositiveIntegerField()
    monto_vacaciones_pendientes = models.PositiveIntegerField()
    monto_indemnizacion = models.PositiveIntegerField()
    nota_formula_indemnizacion = models.TextField(blank=True, default="")
    total_liquidacion = models.PositiveIntegerField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Liquidación por despido"
        verbose_name_plural = "Liquidaciones por despido"
        ordering = ["-fecha_creacion"]
        db_table = "nomina_liquidaciondespido"

    def __str__(self):
        return f"{self.nombre_empleado} - {self.fecha_terminacion}"


class DocumentoNominaElectronica(models.Model):
    # Trazabilidad: antes ElectronicPayrollDoc (SoftwareNominal)
    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("APROBADO", "Aprobado"),
        ("RECHAZADO", "Rechazado"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    recibo = models.ForeignKey(
        ReciboNomina,
        on_delete=models.CASCADE,
        related_name="documentos_electronicos",
    )
    numero_recibo = models.CharField(max_length=100)
    clave_periodo = models.CharField(max_length=7)
    etiqueta_periodo = models.CharField(max_length=100)
    id_empleado = models.CharField(max_length=50)
    nombre_empleado = models.CharField(max_length=200)
    documento_identidad_empleado = models.CharField(max_length=50)
    cune = models.CharField(max_length=100, blank=True, default="")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE")
    mensaje_dian = models.TextField(blank=True, default="")
    contador_reintentos = models.PositiveIntegerField(default=0)
    contenido_xml = models.TextField(blank=True, default="")
    pago_neto = models.PositiveIntegerField(default=0)
    pago_bruto = models.PositiveIntegerField(default=0)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Documento nómina electrónica"
        verbose_name_plural = "Documentos nómina electrónica"
        ordering = ["-fecha_actualizacion"]
        db_table = "nomina_documentonominaelectronica"

    def __str__(self):
        return self.numero_recibo


class EntradaAuditoria(models.Model):
    # Trazabilidad: antes AuditLogEntry (SoftwareNominal)
    ACCION_CHOICES = [
        ("CREATE", "Crear"),
        ("UPDATE", "Actualizar"),
        ("DELETE", "Eliminar"),
        ("LIQUIDATE", "Liquidar"),
        ("EMIT", "Emitir"),
    ]
    ROL_CHOICES = [
        ("ADMINISTRADOR", "Administrador"),
        ("INSTRUCTOR", "Instructor"),
        ("ESTUDIANTE", "Estudiante"),
    ]

    id = models.CharField(max_length=50, primary_key=True)
    espacio_trabajo = models.ForeignKey(
        EspacioTrabajo,
        on_delete=models.CASCADE,
        related_name="auditorias",
    )
    usuario = models.CharField(max_length=200)
    rol = models.CharField(max_length=30, choices=ROL_CHOICES)
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    entidad_afectada = models.CharField(max_length=200)
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)
    ip_origen = models.CharField(max_length=100, blank=True, default="")
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Entrada de auditoría"
        verbose_name_plural = "Bitácora de auditoría"
        ordering = ["-fecha_registro"]
        db_table = "nomina_entradaauditoria"

    def __str__(self):
        return f"{self.id} - {self.accion}"
