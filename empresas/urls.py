from django.urls import path, include
from rest_framework.routers import DefaultRouter

from empresas.views import EmpresaViewSet, ParametroLegislativoViewSet

router = DefaultRouter()
router.register(r"empresas", EmpresaViewSet, basename="empresa")
router.register(r"legislacion", ParametroLegislativoViewSet, basename="legislacion")

urlpatterns = [
    path("", include(router.urls)),
]
