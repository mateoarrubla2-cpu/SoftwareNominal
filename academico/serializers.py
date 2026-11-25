from rest_framework import serializers

from academico.models import InstructorSENA, FichaSENA, EstudianteSENA, EspacioTrabajo


class InstructorSENASerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorSENA
        fields = "__all__"


class FichaSENASerializer(serializers.ModelSerializer):
    class Meta:
        model = FichaSENA
        fields = "__all__"


class EstudianteSENASerializer(serializers.ModelSerializer):
    class Meta:
        model = EstudianteSENA
        fields = "__all__"


class EspacioTrabajoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspacioTrabajo
        fields = "__all__"
