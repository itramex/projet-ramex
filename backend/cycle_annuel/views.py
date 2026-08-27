from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count

from .models import PhaseAgricole, PhaseCampagne, IndicateurCampagne
from .serializers import (
    PhaseAgricoleSerializer,
    PhaseCampagneSerializer,
    IndicateurCampagneSerializer,
)

MOIS_NOMS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]


class PhaseAgricoleViewSet(viewsets.ModelViewSet):
    """CRUD du référentiel des phases agricoles + calendrier annuel."""
    queryset = PhaseAgricole.objects.all()
    serializer_class = PhaseAgricoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code', 'description']
    ordering = ['pilier', 'ordre', 'mois_debut']

    def get_queryset(self):
        queryset = super().get_queryset()

        pilier = self.request.query_params.get('pilier')
        if pilier:
            queryset = queryset.filter(pilier=pilier)

        actif = self.request.query_params.get('actif')
        if actif is not None:
            queryset = queryset.filter(actif=actif.lower() == 'true')

        return queryset

    @action(detail=False, methods=['get'], url_path='calendrier')
    def calendrier(self, request):
        """Calendrier agricole annuel : les 12 mois, avec phases actives par mois."""
        pilier = request.query_params.get('pilier')
        phases_qs = self.get_queryset()
        if pilier:
            phases_qs = phases_qs.filter(pilier=pilier)
        phases = list(phases_qs.filter(actif=True))

        mois = []
        for m in range(1, 13):
            phases_du_mois = [
                {
                    'id': p.id,
                    'code': p.code,
                    'nom': p.nom,
                    'pilier': p.pilier,
                    'type_phase': p.type_phase,
                    'couleur': p.couleur,
                    'toute_annee': p.toute_annee,
                }
                for p in phases
                if m in p.mois_actifs()
            ]
            mois.append({
                'numero': m,
                'nom': MOIS_NOMS[m - 1],
                'phases': phases_du_mois,
            })

        return Response({
            'mois': mois,
            'par_pilier': {
                'tracabilite': sum(1 for p in phases if p.pilier == 'tracabilite'),
                'certification': sum(1 for p in phases if p.pilier == 'certification'),
                'developpement_durable': sum(1 for p in phases if p.pilier == 'developpement_durable'),
            },
            'total': len(phases),
        })


class PhaseCampagneViewSet(viewsets.ModelViewSet):
    """CRUD de la planification des phases par campagne (cycle annuel)."""
    queryset = PhaseCampagne.objects.select_related('campagne', 'phase')
    serializer_class = PhaseCampagneSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['campagne__code', 'phase__nom', 'responsable']
    ordering = ['date_debut']

    def get_queryset(self):
        queryset = super().get_queryset()

        campagne = self.request.query_params.get('campagne')
        if campagne:
            queryset = queryset.filter(campagne_id=campagne)

        phase = self.request.query_params.get('phase')
        if phase:
            queryset = queryset.filter(phase_id=phase)

        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        return queryset


class IndicateurCampagneViewSet(viewsets.ModelViewSet):
    """CRUD des indicateurs d'une campagne pour les rapports annuels."""
    queryset = IndicateurCampagne.objects.select_related('campagne')
    serializer_class = IndicateurCampagneSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['libelle', 'campagne__code']

    def get_queryset(self):
        queryset = super().get_queryset()

        campagne = self.request.query_params.get('campagne')
        if campagne:
            queryset = queryset.filter(campagne_id=campagne)

        pilier = self.request.query_params.get('pilier')
        if pilier:
            queryset = queryset.filter(pilier=pilier)

        return queryset
# ==================== RAPPORT PAR CAMPAGNE ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rapport_campagne(request):
    """
    Rapport consolidé d'une campagne par pilier (Traçabilité / Certification / DD).
    GET /api/cycle-annuel/rapports/?campagne=<id>
    """
    from django.shortcuts import get_object_or_404
    from tracabilite.models import Campagne, BonCollecte, CommandeExport

    campagne_id = request.query_params.get('campagne')
    if not campagne_id:
        return Response({'error': 'Paramètre campagne requis.'}, status=400)
    campagne = get_object_or_404(Campagne, pk=campagne_id)

    # --- Traçabilité : agrégats sur données réelles ---
    agg_collectes = BonCollecte.objects.filter(campagne=campagne).aggregate(
        total=Count('id'), poids=Sum('poids_accepte'), montant=Sum('montant_total_achat')
    )
    agg_commandes = CommandeExport.objects.filter(campagne=campagne).aggregate(
        total=Count('id'), poids_net=Sum('poids_total_net'), valeur=Sum('valeur_commande')
    )
    agg_estimations = campagne.estimations_production.aggregate(total_estime=Sum('quantite_estimee'))

    # --- Phases planifiées & indicateurs (tous piliers) ---
    phases_qs = PhaseCampagne.objects.filter(campagne=campagne)
    indicateurs_qs = IndicateurCampagne.objects.filter(campagne=campagne)

    indicateurs = IndicateurCampagneSerializer(indicateurs_qs, many=True).data
    phases = {
        'planifiees': phases_qs.filter(statut='planifiee').count(),
        'en_cours': phases_qs.filter(statut='en_cours').count(),
        'terminees': phases_qs.filter(statut='terminee').count(),
        'liste': PhaseCampagneSerializer(phases_qs, many=True).data,
    }

    def _somme(pilier):
        return indicateurs_qs.filter(pilier=pilier).aggregate(
            cible=Sum('objectif'), real=Sum('realise')
        )

    cert = _somme('certification')
    dd = _somme('developpement_durable')

    return Response({
        'campagne': {
            'id': campagne.id,
            'code': campagne.code,
            'annee_debut': campagne.annee_debut,
            'annee_fin': campagne.annee_fin,
            'type': campagne.get_type_display() if hasattr(campagne, 'get_type_display') else None,
            'statut': campagne.statut,
        },
        'tracabilite': {
            'bons_collecte': agg_collectes['total'] or 0,
            'poids_total_kg': agg_collectes['poids'] or 0,
            'montant_total_ar': agg_collectes['montant'] or 0,
            'estimation_kg': agg_estimations['total_estime'] or 0,
            'commandes_export': agg_commandes['total'] or 0,
            'poids_export_kg': agg_commandes['poids_net'] or 0,
            'valeur_export_usd': agg_commandes['valeur'] or 0,
        },
        'certification': {
            'cible_objectif': cert['cible'] or 0,
            'realise_objectif': cert['real'] or 0,
        },
        'developpement_durable': {
            'cible_objectif': dd['cible'] or 0,
            'realise_objectif': dd['real'] or 0,
        },
        'phases': phases,
        'indicateurs': indicateurs,
    })