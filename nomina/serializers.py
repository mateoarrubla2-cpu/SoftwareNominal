from rest_framework import serializers

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


class EmpleadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = "__all__"


class PlanBeneficioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanBeneficio
        fields = "__all__"


class PeriodoNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoNomina
        fields = "__all__"


class ReciboNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReciboNomina
        fields = "__all__"


class SolicitudVacacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudVacacion
        fields = "__all__"


class EventualidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Eventualidad
        fields = "__all__"


class LiquidacionDespidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiquidacionDespido
        fields = "__all__"


class DocumentoNominaElectronicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoNominaElectronica
        fields = "__all__"


class EntradaAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntradaAuditoria
        fields = "__all__"
