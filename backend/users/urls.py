from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ActivityLogViewSet, validate_token

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    path('', include(router.urls)),
    path('validate-token/', validate_token, name='validate-token'),
]
