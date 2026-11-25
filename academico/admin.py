from django.contrib import admin

from academico.models import InstructorSENA, FichaSENA, EstudianteSENA, EspacioTrabajo


@admin.register(InstructorSENA)
class InstructorSENAAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento_identidad", "correo", "especialidad", "activo")
    list_filter = ("activo", "especialidad")
    search_fields = ("id", "nombre_completo", "documento_identidad", "correo")


@admin.register(FichaSENA)
class FichaSENAAdmin(admin.ModelAdmin):
    list_display = ("id", "codigo", "nombre", "programa", "horario", "instructor")
    list_filter = ("programa", "instructor")
    search_fields = ("id", "codigo", "nombre")


@admin.register(EstudianteSENA)
class EstudianteSENAAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento_identidad", "correo", "ficha", "instructor", "activo")
    list_filter = ("activo", "ficha", "instructor")
    search_fields = ("id", "nombre_completo", "documento_identidad", "correo")


@admin.register(EspacioTrabajo)
class EspacioTrabajoAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "ficha", "estudiante")
    list_filter = ("empresa", "ficha", "estudiante")
    search_fields = ("id",)
