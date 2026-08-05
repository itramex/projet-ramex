from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CampagneViewSet,
    BonCollecteViewSet,
    FicheCollecteViewSet,
    BonTransportViewSet,
    LotTraitementViewSet,
    ColisViewSet,
    CommandeExportViewSet,
    TracabiliteChainViewSet
)

router = DefaultRouter()
router.register(r'campagnes', CampagneViewSet, basename='campagne')
router.register(r'bons-collecte', BonCollecteViewSet, basename='bon-collecte')
router.register(r'fiches-collecte', FicheCollecteViewSet, basename='fiche-collecte')
router.register(r'bons-transport', BonTransportViewSet, basename='bon-transport')
router.register(r'lots-traitement', LotTraitementViewSet, basename='lot-traitement')
router.register(r'colis', ColisViewSet, basename='colis')
router.register(r'commandes-export', CommandeExportViewSet, basename='commande-export')
router.register(r'tracabilite-chains', TracabiliteChainViewSet, basename='tracabilite-chain')

urlpatterns = [
    path('', include(router.urls)),
]
