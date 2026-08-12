from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegionViewSet,
    DistrictViewSet,
    CommuneViewSet,
    FokontanyViewSet,
    VillageViewSet,
    AgenceViewSet,
    StructureIntermediaireViewSet,
)

router = DefaultRouter()
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'districts', DistrictViewSet, basename='district')
router.register(r'communes', CommuneViewSet, basename='commune')
router.register(r'fokontanys', FokontanyViewSet, basename='fokontany')
router.register(r'villages', VillageViewSet, basename='village')
router.register(r'agences', AgenceViewSet, basename='agence')
router.register(r'structures-intermediaires', StructureIntermediaireViewSet, basename='structure-intermediaire')

urlpatterns = [
    path('', include(router.urls)),
]