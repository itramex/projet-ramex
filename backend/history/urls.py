"""
URL Configuration for the Annual History System API

This module configures the DRF router and registers all ViewSets
for the history API endpoints.

Requirements: 6.5
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductionHistoryViewSet,
    AGRHistoryViewSet,
    SocialIndicatorHistoryViewSet,
    TrendAnalysisViewSet,
    AnnualSnapshotViewSet,
    HistoryExportViewSet,
    ProducteurSnapshotViewSet
)


# Create the DRF router
router = DefaultRouter()

# Register all ViewSets
router.register(r'production-history', ProductionHistoryViewSet, basename='production-history')
router.register(r'agr-history', AGRHistoryViewSet, basename='agr-history')
router.register(r'social-indicator-history', SocialIndicatorHistoryViewSet, basename='social-indicator-history')
router.register(r'trends', TrendAnalysisViewSet, basename='trends')
router.register(r'snapshots', AnnualSnapshotViewSet, basename='snapshots')
router.register(r'export', HistoryExportViewSet, basename='export')
router.register(r'producteur-snapshots', ProducteurSnapshotViewSet, basename='producteur-snapshots')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
