from rest_framework import viewsets

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
from nomina.serializers import (
    DocumentoNominaElectronicaSerializer,
    EmpleadoSerializer,
    EntradaAuditoriaSerializer,
    EventualidadSerializer,
    LiquidacionDespidoSerializer,
    PlanBeneficioSerializer,
    PeriodoNominaSerializer,
    ReciboNominaSerializer,
    SolicitudVacacionSerializer,
)


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer


class PlanBeneficioViewSet(viewsets.ModelViewSet):
    queryset = PlanBeneficio.objects.all()
    serializer_class = PlanBeneficioSerializer


class PeriodoNominaViewSet(viewsets.ModelViewSet):
    queryset = PeriodoNomina.objects.all()
    serializer_class = PeriodoNominaSerializer


class ReciboNominaViewSet(viewsets.ModelViewSet):
    queryset = ReciboNomina.objects.all()
    serializer_class = ReciboNominaSerializer


class SolicitudVacacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudVacacion.objects.all()
    serializer_class = SolicitudVacacionSerializer


class EventualidadViewSet(viewsets.ModelViewSet):
    queryset = Eventualidad.objects.all()
    serializer_class = EventualidadSerializer


class LiquidacionDespidoViewSet(viewsets.ModelViewSet):
    queryset = LiquidacionDespido.objects.all()
    serializer_class = LiquidacionDespidoSerializer


class DocumentoNominaElectronicaViewSet(viewsets.ModelViewSet):
    queryset = DocumentoNominaElectronica.objects.all()
    serializer_class = DocumentoNominaElectronicaSerializer


class EntradaAuditoriaViewSet(viewsets.ModelViewSet):
    queryset = EntradaAuditoria.objects.all()
    serializer_class = EntradaAuditoriaSerializer
