from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Region, District, Commune, Fokontany, Village, Agence, StructureIntermediaire
from .serializers import (
    RegionSerializer,
    DistrictSerializer,
    CommuneSerializer,
    FokontanySerializer,
    VillageSerializer,
    AgenceSerializer,
    StructureIntermediaireSerializer,
)


class RegionViewSet(viewsets.ModelViewSet):
    """API pour les régions"""
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class DistrictViewSet(viewsets.ModelViewSet):
    """API pour les districts"""
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['region']
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class CommuneViewSet(viewsets.ModelViewSet):
    """API pour les communes"""
    queryset = Commune.objects.all()
    serializer_class = CommuneSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['district']
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class FokontanyViewSet(viewsets.ModelViewSet):
    """API pour les fokontany"""
    queryset = Fokontany.objects.all()
    serializer_class = FokontanySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['commune']
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class VillageViewSet(viewsets.ModelViewSet):
    """API pour les villages"""
    queryset = Village.objects.all()
    serializer_class = VillageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['fokontany']
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class AgenceViewSet(viewsets.ModelViewSet):
    """API pour les agences RAMEX"""
    queryset = Agence.objects.all()
    serializer_class = AgenceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['district', 'actif']
    search_fields = ['nom', 'code']
    ordering_fields = ['nom']


class StructureIntermediaireViewSet(viewsets.ModelViewSet):
    """API pour les structures intermédiaires"""
    queryset = StructureIntermediaire.objects.all()
    serializer_class = StructureIntermediaireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['fokontany', 'cooperative', 'actif']
    search_fields = ['nom', 'telephone']
    ordering_fields = ['nom']