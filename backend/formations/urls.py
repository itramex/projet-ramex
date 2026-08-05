from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TypeFormationViewSet, FormationViewSet,
    TypeCertificationViewSet, CertificationViewSet,
    AuditCertificationViewSet, NonConformiteViewSet
)

router = DefaultRouter()
router.register(r'types-formations', TypeFormationViewSet, basename='type-formation')
router.register(r'formations', FormationViewSet, basename='formation')
router.register(r'types-certifications', TypeCertificationViewSet, basename='type-certification')
router.register(r'certifications', CertificationViewSet, basename='certification')
router.register(r'audits', AuditCertificationViewSet, basename='audit-certification')
router.register(r'nonconformites', NonConformiteViewSet, basename='nonconformite')

urlpatterns = [
    path('', include(router.urls)),
]
