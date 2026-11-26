import uuid

from django.db import models
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


class GeneraIdSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        pk_field = self.Meta.model._meta.pk
        if isinstance(pk_field, models.CharField):
            validated_data.setdefault(pk_field.attname, uuid.uuid4().hex[:pk_field.max_length])
        return super().create(validated_data)


class EmpleadoSerializer(GeneraIdSerializer):
    class Meta:
        model = Empleado
        fields = "__all__"


class PlanBeneficioSerializer(GeneraIdSerializer):
    class Meta:
        model = PlanBeneficio
        fields = "__all__"


class PeriodoNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoNomina
        fields = "__all__"


class ReciboNominaSerializer(GeneraIdSerializer):
    class Meta:
        model = ReciboNomina
        fields = "__all__"


class SolicitudVacacionSerializer(GeneraIdSerializer):
    class Meta:
        model = SolicitudVacacion
        fields = "__all__"


class EventualidadSerializer(GeneraIdSerializer):
    class Meta:
        model = Eventualidad
        fields = "__all__"


class LiquidacionDespidoSerializer(GeneraIdSerializer):
    class Meta:
        model = LiquidacionDespido
        fields = "__all__"


class DocumentoNominaElectronicaSerializer(GeneraIdSerializer):
    class Meta:
        model = DocumentoNominaElectronica
        fields = "__all__"


class EntradaAuditoriaSerializer(GeneraIdSerializer):
    class Meta:
        model = EntradaAuditoria
        fields = "__all__"
