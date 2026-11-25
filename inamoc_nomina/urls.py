from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/empresas/", include("empresas.urls")),
    path("api/academico/", include("academico.urls")),
    path("api/nomina/", include("nomina.urls")),
]
