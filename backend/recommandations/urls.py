# recommandations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecommendationViewSet, ActiviteViewSet

router = DefaultRouter()
router.register(r'recommendations', RecommendationViewSet, basename='recommendation')
router.register(r'activites', ActiviteViewSet, basename='activite')

urlpatterns = [
    path('', include(router.urls)),
]
