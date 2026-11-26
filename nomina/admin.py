from django.contrib import admin

from nomina.models import (
    DocumentoNominaElectronica,
    Empleado,
    EntradaAuditoria,
    Eventualidad,
    LiquidacionDespido,
    PlanBeneficio,
    PeriodoNomina,
    ReciboNomina,
    SolicitudVacacion,
)


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento_identidad", "departamento", "tipo_contrato", "salario_base", "estado", "espacio_trabajo")
    list_filter = ("estado", "tipo_contrato", "departamento", "espacio_trabajo")
    search_fields = ("id", "nombre_completo", "documento_identidad", "correo")


@admin.register(PlanBeneficio)
class PlanBeneficioAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "categoria", "monto_mensual", "factor_salarial", "activo", "espacio_trabajo")
    list_filter = ("categoria", "activo", "espacio_trabajo")
    search_fields = ("id", "nombre")


@admin.register(PeriodoNomina)
class PeriodoNominaAdmin(admin.ModelAdmin):
    list_display = ("clave_periodo", "etiqueta", "ano", "frecuencia", "estado", "espacio_trabajo")
    list_filter = ("estado", "frecuencia", "ano", "espacio_trabajo")
    search_fields = ("clave_periodo", "etiqueta")


@admin.register(ReciboNomina)
class ReciboNominaAdmin(admin.ModelAdmin):
    list_display = ("id", "numero_recibo", "empleado", "periodo", "pago_bruto", "pago_neto", "estado_pago")
    list_filter = ("estado_pago", "frecuencia", "periodo")
    search_fields = ("id", "numero_recibo", "empleado__nombre_completo", "documento_identidad_empleado")


@admin.register(SolicitudVacacion)
class SolicitudVacacionAdmin(admin.ModelAdmin):
    list_display = ("id", "empleado", "fecha_inicio", "fecha_fin", "tipo", "estado", "dias_habiles")
    list_filter = ("tipo", "estado")
    search_fields = ("id", "empleado__nombre_completo")


@admin.register(Eventualidad)
class EventualidadAdmin(admin.ModelAdmin):
    list_display = ("id", "empleado", "tipo", "fecha_inicio", "fecha_fin", "impacto_nomina", "estado", "monto")
    list_filter = ("tipo", "impacto_nomina", "estado")
    search_fields = ("id", "empleado__nombre_completo")


@admin.register(LiquidacionDespido)
class LiquidacionDespidoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_empleado", "fecha_terminacion", "causa", "total_liquidacion")
    list_filter = ("causa",)
    search_fields = ("id", "nombre_empleado", "documento_identidad_empleado")


@admin.register(DocumentoNominaElectronica)
class DocumentoNominaElectronicaAdmin(admin.ModelAdmin):
    list_display = ("id", "numero_recibo", "nombre_empleado", "estado", "clave_periodo")
    list_filter = ("estado",)
    search_fields = ("id", "numero_recibo", "nombre_empleado", "cune")


@admin.register(EntradaAuditoria)
class EntradaAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "rol", "accion", "entidad_afectada", "fecha_registro")
    list_filter = ("accion", "rol", "fecha_registro")
    search_fields = ("id", "usuario", "entidad_afectada")
