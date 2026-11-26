from django.db import models
from django.db.models import UniqueConstraint

from empresas.models import Empresa

ROL_CHOICES = [
    ("ADMINISTRADOR", "Administrador"),
    ("INSTRUCTOR", "Instructor"),
    ("ESTUDIANTE", "Estudiante"),
]


class InstructorSENA(models.Model):
    # Trazabilidad: antes SenaInstructor (SoftwareNominal)
    id = models.CharField(max_length=20, primary_key=True)
    nombre_completo = models.CharField(max_length=200)
    documento_identidad = models.CharField(max_length=50, blank=True, default="")
    correo = models.EmailField(blank=True, default="")
    especialidad = models.CharField(max_length=200, blank=True, default="Gestión Humana y Nómina")
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Instructor SENA"
        verbose_name_plural = "Instructores SENA"
        ordering = ["id"]
        db_table = "academico_instructorsena"

    def __str__(self):
        return self.nombre_completo


class FichaSENA(models.Model):
    # Trazabilidad: antes SenaFicha (SoftwareNominal)
    id = models.CharField(max_length=20, primary_key=True)
    codigo = models.CharField(max_length=50, blank=True, default="")
    nombre = models.CharField(max_length=200)
    horario = models.CharField(max_length=100, blank=True, default="Mañana (06:00 - 12:00)")
    programa = models.CharField(max_length=200, blank=True, default="Técnico en Recursos Humanos")
    instructor = models.ForeignKey(
        InstructorSENA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fichas",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ficha / Grupo"
        verbose_name_plural = "Fichas / Grupos"
        ordering = ["id"]
        db_table = "academico_fichasena"

    def __str__(self):
        return f"{self.codigo} · {self.nombre}"


class EstudianteSENA(models.Model):
    # Trazabilidad: antes SenaStudent (SoftwareNominal)
    id = models.CharField(max_length=20, primary_key=True)
    nombre_completo = models.CharField(max_length=200)
    documento_identidad = models.CharField(max_length=50, blank=True, default="")
    correo = models.EmailField(blank=True, default="")
    ficha = models.ForeignKey(
        FichaSENA,
        on_delete=models.CASCADE,
        related_name="estudiantes",
    )
    instructor = models.ForeignKey(
        InstructorSENA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="estudiantes",
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Estudiante SENA"
        verbose_name_plural = "Estudiantes SENA"
        ordering = ["id"]
        db_table = "academico_estudantesena"

    def __str__(self):
        return self.nombre_completo


class EspacioTrabajo(models.Model):
    # Trazabilidad: antes Workspace (SoftwareNominal)
    id = models.CharField(max_length=100, primary_key=True)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name="espacios_trabajo",
    )
    ficha = models.ForeignKey(
        FichaSENA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="espacios_trabajo",
    )
    estudiante = models.ForeignKey(
        EstudianteSENA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="espacios_trabajo",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Espacio de trabajo"
        verbose_name_plural = "Espacios de trabajo"
        constraints = [
            UniqueConstraint(
                fields=["ficha", "estudiante"],
                name="unique_espacio_por_ficha_estudiante",
            ),
        ]
        db_table = "academico_espaciotrabajo"

    def __str__(self):
        return self.id
