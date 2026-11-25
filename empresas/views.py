from rest_framework import viewsets

from empresas.models import Empresa, ParametroLegislativo
from empresas.serializers import EmpresaSerializer, ParametroLegislativoSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer


class ParametroLegislativoViewSet(viewsets.ModelViewSet):
    queryset = ParametroLegislativo.objects.all()
    serializer_class = ParametroLegislativoSerializer
