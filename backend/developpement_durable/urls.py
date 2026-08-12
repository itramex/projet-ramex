from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartenaireDDViewSet, ActiviteDDViewSet

router = DefaultRouter()
router.register(r'partenaires', PartenaireDDViewSet, basename='partenaire-dd')
router.register(r'activites', ActiviteDDViewSet, basename='activite-dd')

urlpatterns = [
    path('', include(router.urls)),
]