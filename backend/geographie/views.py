from django.db import transaction
from django.db.models import Count
from rest_framework import decorators, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cooperatives.models import Cooperative
from users.permissions import IsAdmin

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

    def get_queryset(self):
        # G-3b — compteurs de rattachements (alias des related_name
        # Cooperative.agence et UserProfile.agence), sans N+1.
        return Agence.objects.annotate(
            nb_cooperatives=Count('cooperatives', distinct=True),
            nb_utilisateurs=Count('users', distinct=True),
        )

    def destroy(self, request, *args, **kwargs):
        """G-3a — suppression protégée : le SET_NULL de la FK casserait le
        rattachement de ou des coopératives/utilisateurs → 409 et invitation
        à désactiver (D-5 : fin de vie = actif=False)."""
        agence = self.get_object()
        if agence.nb_cooperatives or agence.nb_utilisateurs:
            detail = (
                f"Suppression impossible : {agence.nb_cooperatives} coopérative(s) et "
                f"{agence.nb_utilisateurs} utilisateur(s) sont rattachés à « {agence.nom} ». "
                "Désactivez plutôt l'agence (actif = False) : le rattachement et "
                "l'historique sont conservés."
            )
            return Response({'detail': detail}, status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def fusionner(self, request, pk=None):
        """G-4 — fusion d'agences (réorganisation territoriale) :
        réaffecte les coopératives de l'agence source vers l'agence cible,
        puis désactive la source. Admin uniquement, transactionnel."""
        source = self.get_object()

        cible_id = request.data.get('cible')
        if cible_id in (None, ''):
            return Response({'detail': "Paramètre 'cible' manquant (id de l'agence cible)."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            cible_id = int(cible_id)
        except (TypeError, ValueError):
            return Response({'detail': "'cible' doit être un identifiant numérique."},
                            status=status.HTTP_400_BAD_REQUEST)
        if cible_id == source.id:
            return Response({'detail': "L'agence cible doit être différente de la source."},
                            status=status.HTTP_400_BAD_REQUEST)

        cible = Agence.objects.filter(pk=cible_id).first()
        if cible is None:
            return Response({'detail': 'Agence cible introuvable.'},
                            status=status.HTTP_404_NOT_FOUND)
        if not cible.actif:
            return Response({'detail': "L'agence cible est désactivée : réactivez-la d'abord."},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            coop_reaffectees = Cooperative.objects.filter(agence=source).update(agence=cible)
            source.actif = False
            source.save(update_fields=['actif', 'date_modification'])

        return Response({
            'detail': (
                f"{coop_reaffectees} coopérative(s) réaffectée(s) vers « {cible.nom} » ; "
                f"« {source.nom} » est désormais désactivée."
            ),
            'coop_reaffectees': coop_reaffectees,
            'source_id': source.id,
            'cible_id': cible.id,
        })


class StructureIntermediaireViewSet(viewsets.ModelViewSet):
    """API pour les structures intermédiaires"""
    queryset = StructureIntermediaire.objects.all()
    serializer_class = StructureIntermediaireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['fokontany', 'cooperative', 'actif']
    search_fields = ['nom', 'telephone']
    ordering_fields = ['nom']