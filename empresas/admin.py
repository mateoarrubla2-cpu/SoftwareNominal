from django.contrib import admin

from empresas.models import Empresa, ParametroLegislativo


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "nit", "ciudad", "ano_activo", "frecuencia_predeterminada")
    list_filter = ("ano_activo", "frecuencia_predeterminada")
    search_fields = ("nombre", "nit", "ciudad")


@admin.register(ParametroLegislativo)
class ParametroLegislativoAdmin(admin.ModelAdmin):
    list_display = ("ano", "smmlv", "auxilio_transporte", "uvt")
    list_filter = ("ano",)
    search_fields = ("ano",)
