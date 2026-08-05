from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ParcelleViewSet

router = DefaultRouter()
router.register(r'', ParcelleViewSet, basename='parcelle')

urlpatterns = [
    path('', include(router.urls)),
]
