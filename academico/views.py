from rest_framework import viewsets

from academico.models import InstructorSENA, FichaSENA, EstudianteSENA, EspacioTrabajo
from academico.serializers import (
    InstructorSENASerializer,
    FichaSENASerializer,
    EstudianteSENASerializer,
    EspacioTrabajoSerializer,
)


class InstructorSENAViewSet(viewsets.ModelViewSet):
    queryset = InstructorSENA.objects.all()
    serializer_class = InstructorSENASerializer


class FichaSENAViewSet(viewsets.ModelViewSet):
    queryset = FichaSENA.objects.all()
    serializer_class = FichaSENASerializer


class EstudianteSENAViewSet(viewsets.ModelViewSet):
    queryset = EstudianteSENA.objects.all()
    serializer_class = EstudianteSENASerializer


class EspacioTrabajoViewSet(viewsets.ModelViewSet):
    queryset = EspacioTrabajo.objects.all()
    serializer_class = EspacioTrabajoSerializer
