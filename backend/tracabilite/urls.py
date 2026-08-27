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
    TracabiliteChainViewSet,
    EstimationProductionViewSet,
    MagasinViewSet,
    BonLivraisonViewSet,
    EntreeMagasinViewSet,
    FicheStockViewSet
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
router.register(r'estimations-production', EstimationProductionViewSet, basename='estimation-production')
router.register(r'magasins', MagasinViewSet, basename='magasin')
router.register(r'bons-livraison', BonLivraisonViewSet, basename='bon-livraison')
router.register(r'entrees-magasin', EntreeMagasinViewSet, basename='entree-magasin')
router.register(r'fiches-stock', FicheStockViewSet, basename='fiche-stock')

urlpatterns = [
    path('', include(router.urls)),
]
