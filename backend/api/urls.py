from django.urls import path, include
from rest_framework.routers import DefaultRouter
from producteurs.views import ProducteurViewSet, DotationViewSet, AGRViewSet
from cooperatives.views import CooperativeViewSet
from chatbot.views import ChatbotView
from parcelles.views import ParcelleViewSet
from dashboard.views import dashboard_decisionnel_export

router = DefaultRouter()
router.register(r'producteurs', ProducteurViewSet, basename='producteur')
router.register(r'dotations', DotationViewSet, basename='dotation')
router.register(r'agr', AGRViewSet, basename='agr')
router.register(r'cooperatives', CooperativeViewSet, basename='cooperative')
router.register(r'parcelles', ParcelleViewSet, basename='parcelle')

urlpatterns = [
    path('', include(router.urls)),
    path('chatbot/', ChatbotView.as_view(), name='chatbot'),
    path('dashboard/decisionnel/export/', dashboard_decisionnel_export, name='api_dashboard_decisionnel_export'),
    path('dashboard/', include('dashboard.urls')),
    path('cooperatives/', include('cooperatives.urls')),
    path('tracabilite/', include('tracabilite.urls')),
    path('formations/', include('formations.urls')),
    path('', include('users.urls')),
    path('', include('recommandations.urls')),
]
