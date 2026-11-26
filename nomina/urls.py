from django.urls import path, include
from rest_framework.routers import DefaultRouter

from nomina.views import (
    DocumentoNominaElectronicaViewSet,
    EmpleadoViewSet,
    EntradaAuditoriaViewSet,
    EventualidadViewSet,
    LiquidacionDespidoViewSet,
    PlanBeneficioViewSet,
    PeriodoNominaViewSet,
    ReciboNominaViewSet,
    SolicitudVacacionViewSet,
)

router = DefaultRouter()
router.register(r"empleados", EmpleadoViewSet, basename="empleado")
router.register(r"beneficios", PlanBeneficioViewSet, basename="beneficio")
router.register(r"periodos", PeriodoNominaViewSet, basename="periodo")
router.register(r"recibos", ReciboNominaViewSet, basename="recibo")
router.register(r"vacaciones", SolicitudVacacionViewSet, basename="vacacion")
router.register(r"eventualidades", EventualidadViewSet, basename="eventualidad")
router.register(r"liquidaciones", LiquidacionDespidoViewSet, basename="liquidacion")
router.register(r"documentos-electronicos", DocumentoNominaElectronicaViewSet, basename="documentoelectronico")
router.register(r"auditorias", EntradaAuditoriaViewSet, basename="auditoria")

urlpatterns = [
    path("", include(router.urls)),
]
