from rest_framework import serializers

from empresas.models import Empresa, ParametroLegislativo


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = "__all__"


class ParametroLegislativoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametroLegislativo
        fields = "__all__"
