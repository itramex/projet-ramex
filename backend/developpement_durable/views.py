from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import CanManageCertificationDD
from .models import PartenaireDD, ActiviteDD
from .serializers import PartenaireDDSerializer, ActiviteDDSerializer


class PartenaireDDViewSet(viewsets.ModelViewSet):
    """API pour les partenaires du Développement Durable"""
    queryset = PartenaireDD.objects.all()
    serializer_class = PartenaireDDSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filterset_fields = ['type', 'actif']
    search_fields = ['nom', 'contact', 'telephone', 'email']
    ordering_fields = ['nom']


class ActiviteDDViewSet(viewsets.ModelViewSet):
    """API pour les activités du Développement Durable"""
    queryset = ActiviteDD.objects.select_related('cooperative', 'producteur', 'partenaire', 'responsable').all()
    serializer_class = ActiviteDDSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filterset_fields = ['type_activite', 'cooperative', 'producteur', 'partenaire', 'objectif_client']
    search_fields = ['description', 'resultat', 'notes']
    ordering_fields = ['date', 'date_creation']