from django.db import models


class Empresa(models.Model):
    # Trazabilidad: antes Company (SoftwareNominal)
    nombre = models.CharField(max_length=200)
    nit = models.CharField(max_length=50, blank=True, default="")
    direccion = models.CharField(max_length=200, blank=True, default="")
    ciudad = models.CharField(max_length=100, blank=True, default="")
    ano_activo = models.PositiveIntegerField(default=2026)
    frecuencia_predeterminada = models.CharField(
        max_length=20,
        choices=[("Mensual", "Mensual"), ("Quincenal", "Quincenal")],
        default="Mensual",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        db_table = "empresas_empresa"

    def __str__(self):
        return self.nombre


class ParametroLegislativo(models.Model):
    # Trazabilidad: antes LegislationParams (SoftwareNominal)
    ano = models.PositiveIntegerField()
    smmlv = models.PositiveIntegerField(help_text="Salario mínimo mensual vigente")
    auxilio_transporte = models.PositiveIntegerField(default=0)
    uvt = models.PositiveIntegerField(default=0)
    salud_empleado_pct = models.DecimalField(max_digits=5, decimal_places=2, default=4.00)
    salud_empleador_pct = models.DecimalField(max_digits=5, decimal_places=2, default=8.50)
    pension_empleado_pct = models.DecimalField(max_digits=5, decimal_places=2, default=4.00)
    pension_empleador_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    fsp_umbral_smmlv = models.DecimalField(max_digits=5, decimal_places=2, default=4.00)
    fsp_pct = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    arl_rates = models.JSONField(default=dict, help_text="Tarifas ARL por nivel de riesgo 1-5")
    caja_compensacion_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    sena_pct = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    icbf_pct = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    vacaciones_dias_por_ano = models.PositiveIntegerField(default=15)
    intereses_cesantias_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    retefuente_umbral_uvt = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Parámetro legislativo"
        verbose_name_plural = "Parámetros legislativos"
        ordering = ["-ano"]
        db_table = "empresas_parametrolegislativo"

    def __str__(self):
        return f"Legislación {self.ano}"
