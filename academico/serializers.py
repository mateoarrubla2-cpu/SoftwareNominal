import uuid

from django.db import models
from rest_framework import serializers

from academico.models import InstructorSENA, FichaSENA, EstudianteSENA, EspacioTrabajo


class GeneraIdSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        pk_field = self.Meta.model._meta.pk
        if isinstance(pk_field, models.CharField):
            validated_data.setdefault(pk_field.attname, uuid.uuid4().hex[:pk_field.max_length])
        return super().create(validated_data)


class InstructorSENASerializer(GeneraIdSerializer):
    class Meta:
        model = InstructorSENA
        fields = "__all__"


class FichaSENASerializer(GeneraIdSerializer):
    class Meta:
        model = FichaSENA
        fields = "__all__"


class EstudianteSENASerializer(GeneraIdSerializer):
    class Meta:
        model = EstudianteSENA
        fields = "__all__"


class EspacioTrabajoSerializer(GeneraIdSerializer):
    class Meta:
        model = EspacioTrabajo
        fields = "__all__"
