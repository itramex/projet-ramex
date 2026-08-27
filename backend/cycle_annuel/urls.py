from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PhaseAgricoleViewSet,
    PhaseCampagneViewSet,
    IndicateurCampagneViewSet,
    rapport_campagne,
)

router = DefaultRouter()
router.register(r'phases-agricoles', PhaseAgricoleViewSet, basename='phase-agricole')
router.register(r'phases-campagne', PhaseCampagneViewSet, basename='phase-campagne')
router.register(r'indicateurs', IndicateurCampagneViewSet, basename='indicateur-campagne')

urlpatterns = [
    path('', include(router.urls)),
    path('rapports/', rapport_campagne, name='rapport-campagne'),
]