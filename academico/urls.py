from django.urls import path, include
from rest_framework.routers import DefaultRouter

from academico.views import (
    InstructorSENAViewSet,
    FichaSENAViewSet,
    EstudianteSENAViewSet,
    EspacioTrabajoViewSet,
)

router = DefaultRouter()
router.register(r"instructores", InstructorSENAViewSet, basename="instructor")
router.register(r"fichas", FichaSENAViewSet, basename="ficha")
router.register(r"estudiantes", EstudianteSENAViewSet, basename="estudiante")
router.register(r"espacios-trabajo", EspacioTrabajoViewSet, basename="espaciotrabajo")

urlpatterns = [
    path("", include(router.urls)),
]
