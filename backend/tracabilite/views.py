# tracabilite/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import CanManageTracabilite
from django.db.models import Sum, Count, Q
from django.shortcuts import get_object_or_404

from .models import (
    Campagne,
    BonCollecte,
    FicheCollecte,
    BonTransport,
    LotTraitement,
    Colis,
    CommandeExport,
    TracabiliteChain,
    EstimationProduction,
    Magasin,
    BonLivraison,
    EntreeMagasin,
    FicheStock
)
from .serializers import (
    CampagneSerializer,
    BonCollecteListSerializer,
    BonCollecteDetailSerializer,
    BonCollecteCreateUpdateSerializer,
    FicheCollecteListSerializer,
    FicheCollecteDetailSerializer,
    FicheCollecteCreateUpdateSerializer,
    BonTransportListSerializer,
    BonTransportDetailSerializer,
    BonTransportCreateUpdateSerializer,
    LotTraitementListSerializer,
    LotTraitementDetailSerializer,
    LotTraitementCreateUpdateSerializer,
    ColisListSerializer,
    ColisDetailSerializer,
    ColisCreateUpdateSerializer,
    CommandeExportListSerializer,
    CommandeExportDetailSerializer,
    CommandeExportCreateUpdateSerializer,
    TracabiliteChainSerializer,
    TracabiliteChainListSerializer,
    EstimationProductionSerializer,
    MagasinSerializer,
    BonLivraisonSerializer,
    EntreeMagasinSerializer,
    FicheStockSerializer
)
from .engine.tracability_engine import TracabilityEngine


class CampagneViewSet(viewsets.ModelViewSet):
    """ViewSet pour les campagnes"""
    queryset = Campagne.objects.all()
    serializer_class = CampagneSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code']
    ordering = ['-annee_debut']


class BonCollecteViewSet(viewsets.ModelViewSet):
    """ViewSet pour les bons de collecte (FABC)"""
    queryset = BonCollecte.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_fabc', 'producteur__nom', 'producteur__code']
    ordering = ['-date_marche', '-numero_fabc']
    
    def get_serializer_class(self):
        """Retourner le serializer approprié selon l'action"""
        if self.action == 'list':
            return BonCollecteListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BonCollecteCreateUpdateSerializer
        return BonCollecteDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()

        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les bons des producteurs / coopératives de leur agence.
        # (Le bon porte à la fois un producteur et une coopérative directe.)
        from users.permissions import can_see_all_data, get_user_agence
        if not can_see_all_data(self.request.user):
            agence = get_user_agence(self.request.user)
            if agence:
                queryset = queryset.filter(
                    Q(producteur__cooperative__agence_id=agence.id)
                    | Q(cooperative__agence_id=agence.id)
                )

        # Filtres
        campagne_id = self.request.query_params.get('campagne')
        if campagne_id:
            queryset = queryset.filter(campagne_id=campagne_id)
        
        producteur_id = self.request.query_params.get('producteur')
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)

        producteur_code = self.request.query_params.get('producteur_code')
        if producteur_code:
            queryset = queryset.filter(producteur__code__icontains=producteur_code)
        
        cooperative_id = self.request.query_params.get('cooperative')
        if cooperative_id:
            queryset = queryset.filter(cooperative_id=cooperative_id)
        
        certification = self.request.query_params.get('certification')
        if certification:
            certifications = [c.strip() for c in str(certification).split(',') if c.strip()]
            cert_q = Q()
            for cert in certifications:
                cert_q |= (
                    Q(certification__iexact=cert) |
                    Q(certification__icontains=cert) |
                    Q(type_certification__code__iexact=cert) |
                    Q(type_certification__nom__icontains=cert)
                )
            queryset = queryset.filter(cert_q)

        type_certification = self.request.query_params.get('type_certification')
        if type_certification:
            type_ids = [t.strip() for t in str(type_certification).split(',') if t.strip().isdigit()]
            if type_ids:
                queryset = queryset.filter(type_certification_id__in=type_ids)

        village = self.request.query_params.get('village')
        if village:
            queryset = queryset.filter(
                Q(village_marche__icontains=village) | Q(producteur__village__icontains=village)
            )
        
        return queryset.select_related('campagne', 'producteur', 'cooperative', 'type_certification').prefetch_related('details_sacs')
    
    @action(detail=True, methods=['get'], url_path='trace')
    def trace(self, request, pk=None):
        """
        Traçabilité ascendante à partir d'un bon de collecte
        
        GET /api/tracabilite/bons-collecte/{id}/trace/
        """
        bon_collecte = self.get_object()
        
        try:
            engine = TracabilityEngine()
            chain = engine.trace_ascendante(bon_collecte.id)
            
            return Response({
                'success': True,
                'chain': chain
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Statistiques des bons de collecte
        
        GET /api/tracabilite/bons-collecte/statistics/
        """
        campagne_id = request.query_params.get('campagne')
        
        queryset = self.get_queryset()
        if campagne_id:
            queryset = queryset.filter(campagne_id=campagne_id)
        
        stats = queryset.aggregate(
            total_bons=Count('id'),
            poids_total=Sum('poids_accepte'),
            montant_total=Sum('montant_total_achat'),
            nombre_producteurs=Count('producteur', distinct=True)
        )
        
        # Répartition par type de produit
        by_produit = queryset.values('type_produit').annotate(
            count=Count('id'),
            poids=Sum('poids_accepte')
        ).order_by('-count')
        
        # Répartition par certification
        by_certification = queryset.values('certification').annotate(
            count=Count('id'),
            poids=Sum('poids_accepte')
        ).order_by('-count')
        
        return Response({
            'total_bons': stats['total_bons'] or 0,
            'poids_total_kg': float(stats['poids_total'] or 0),
            'montant_total_ar': float(stats['montant_total'] or 0),
            'nombre_producteurs': stats['nombre_producteurs'] or 0,
            'by_produit': list(by_produit),
            'by_certification': list(by_certification)
        })


class FicheCollecteViewSet(viewsets.ModelViewSet):
    """ViewSet pour les fiches de collecte (FC)"""
    queryset = FicheCollecte.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_fc', 'fokontany']
    ordering = ['-date_marche', '-numero_fc']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return FicheCollecteListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return FicheCollecteCreateUpdateSerializer
        return FicheCollecteDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()

        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les fiches liées à leur agence (coopérative directe ou bons rattachés).
        from users.permissions import can_see_all_data, get_user_agence
        if not can_see_all_data(self.request.user):
            agence = get_user_agence(self.request.user)
            if agence:
                queryset = queryset.filter(
                    Q(cooperative__agence_id=agence.id)
                    | Q(bons_collecte__producteur__cooperative__agence_id=agence.id)
                    | Q(bons_collecte__cooperative__agence_id=agence.id)
                ).distinct()

        campagne_id = self.request.query_params.get('campagne')
        if campagne_id:
            queryset = queryset.filter(campagne_id=campagne_id)
        
        cooperative_id = self.request.query_params.get('cooperative')
        if cooperative_id:
            queryset = queryset.filter(cooperative_id=cooperative_id)
        
        return queryset.select_related('campagne', 'cooperative').prefetch_related('bons_collecte')


class BonTransportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les bons de transport (BT)"""
    queryset = BonTransport.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_bt', 'lieu_depart', 'lieu_destination']
    ordering = ['-date_chargement', '-numero_bt']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return BonTransportListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BonTransportCreateUpdateSerializer
        return BonTransportDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        campagne_id = self.request.query_params.get('campagne')
        if campagne_id:
            queryset = queryset.filter(campagne_id=campagne_id)
        
        return queryset.select_related('campagne', 'fiche_collecte', 'cooperative').prefetch_related('details_sacs')
    
    @action(detail=True, methods=['post'], url_path='marquer-recu')
    def marquer_recu(self, request, pk=None):
        """
        Marquer un transport comme reçu
        
        POST /api/tracabilite/bons-transport/{id}/marquer-recu/
        Body: {
            "date_arrivee": "2025-11-17",
            "poids_total_arrivee": 1250.5,
            "agent_receptionnaire": "Jean Dupont"
        }
        """
        bon_transport = self.get_object()
        
        bon_transport.date_arrivee = request.data.get('date_arrivee')
        bon_transport.poids_total_arrivee = request.data.get('poids_total_arrivee')
        bon_transport.agent_receptionnaire = request.data.get('agent_receptionnaire')
        bon_transport.statut = 'recu'
        bon_transport.save()
        
        serializer = self.get_serializer(bon_transport)
        return Response({
            'success': True,
            'message': 'Transport marqué comme reçu',
            'bon_transport': serializer.data
        })


class LotTraitementViewSet(viewsets.ModelViewSet):
    """ViewSet pour les lots de traitement"""
    queryset = LotTraitement.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_lot', 'type_traitement']
    ordering = ['-date_debut', '-numero_lot']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LotTraitementListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return LotTraitementCreateUpdateSerializer
        return LotTraitementDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        type_traitement = self.request.query_params.get('type')
        if type_traitement:
            queryset = queryset.filter(type_traitement=type_traitement)
        
        return queryset.select_related('campagne', 'cooperative').prefetch_related('bons_transport')


class ColisViewSet(viewsets.ModelViewSet):
    """ViewSet pour les colis"""
    queryset = Colis.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_colis', 'qr_code', 'code_barres']
    ordering = ['-date_conditionnement', 'numero_colis']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ColisListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ColisCreateUpdateSerializer
        return ColisDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        qualite = self.request.query_params.get('qualite')
        if qualite:
            queryset = queryset.filter(qualite=qualite)
        
        return queryset.select_related('lot_traitement')
    
    @action(detail=True, methods=['get'], url_path='generate-qr')
    def generate_qr(self, request, pk=None):
        """
        Générer un QR code pour un colis (payload normalisé + image PNG base64).

        GET /api/tracabilite/colis/{id}/generate-qr/
        """
        import base64
        import io

        import qrcode

        colis = self.get_object()

        # Payload normalisé et déterministe : le même colis produit toujours
        # le même QR (reproductible, scannable, lisible par un humain).
        payload = f"RMX|COLIS|{colis.numero_colis}"
        if colis.lot_traitement_id and colis.lot_traitement:
            payload += f"|LOT|{colis.lot_traitement.numero_lot}"
        payload += f"|PDS|{colis.poids_net}kg|QUAL|{colis.qualite or 'N/A'}"

        # Normalise le champ stocké si vide ou au format ad-hoc historique
        reference = f"RMX|COLIS|{colis.numero_colis}"
        if not colis.qr_code or not colis.qr_code.startswith(reference):
            colis.qr_code = reference
            colis.save(update_fields=['qr_code'])

        img = qrcode.make(payload, box_size=8, border=2)
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        png_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'success': True,
            'numero_colis': colis.numero_colis,
            'payload': payload,
            'qr_code': colis.qr_code,
            'qr_png_base64': f"data:image/png;base64,{png_base64}",
        })


class CommandeExportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les commandes d'export"""
    queryset = CommandeExport.objects.all()
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_commande', 'nom_client', 'pays_destination']
    ordering = ['-date_commande', '-numero_commande']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CommandeExportListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CommandeExportCreateUpdateSerializer
        return CommandeExportDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        pays = self.request.query_params.get('pays')
        if pays:
            queryset = queryset.filter(pays_destination__icontains=pays)
        
        return queryset.select_related('campagne').prefetch_related('colis')
    
    @action(detail=True, methods=['get'], url_path='trace')
    def trace(self, request, pk=None):
        """
        Traçabilité descendante à partir d'une commande d'export
        
        GET /api/tracabilite/commandes-export/{id}/trace/
        """
        commande = self.get_object()
        
        try:
            engine = TracabilityEngine()
            chain = engine.trace_descendante(commande.id)
            
            return Response({
                'success': True,
                'chain': chain
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TracabiliteChainViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les chaînes de traçabilité (lecture seule)"""
    serializer_class = TracabiliteChainSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['uuid', 'producteur__nom', 'producteur__code']
    ordering = ['-date_creation']

    def get_queryset(self):
        queryset = TracabiliteChain.objects.select_related('producteur')
        type_trace = self.request.query_params.get('type')
        if type_trace:
            queryset = queryset.filter(type_tracabilite=type_trace)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return TracabiliteChainListSerializer
        return TracabiliteChainSerializer
# ==================== ESTIMATION DE PRODUCTION (Phase 5) ====================

class EstimationProductionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les estimations de production."""
    queryset = EstimationProduction.objects.select_related('producteur', 'campagne')
    serializer_class = EstimationProductionSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['producteur__code', 'producteur__nom']
    ordering = ['-date_estimation']

    def get_queryset(self):
        queryset = super().get_queryset()

        campagne = self.request.query_params.get('campagne')
        if campagne:
            queryset = queryset.filter(campagne_id=campagne)

        producteur = self.request.query_params.get('producteur')
        if producteur:
            queryset = queryset.filter(producteur_id=producteur)

        type_vanille = self.request.query_params.get('type_vanille')
        if type_vanille:
            queryset = queryset.filter(type_vanille=type_vanille)

        return queryset

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Statistiques : total estimé par campagne et type de vanille."""
        somme = EstimationProduction.objects.filter(
            campagne__statut='active'
        ).aggregate(total=Sum('quantite_estimee'))
        par_type = (
            EstimationProduction.objects.values('type_vanille')
            .annotate(total=Sum('quantite_estimee'), count=Count('id'))
        )
        par_campagne = (
            EstimationProduction.objects.values('campagne__code', 'campagne')
            .annotate(total=Sum('quantite_estimee'), count=Count('id'))
        )
        return Response({
            'total_estime': somme['total'] or 0,
            'par_type_vanille': par_type,
            'par_campagne': par_campagne,
        })


# ==================== MAGASIN ====================

class MagasinViewSet(viewsets.ModelViewSet):
    """ViewSet pour les magasins."""
    queryset = Magasin.objects.all()
    serializer_class = MagasinSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code', 'localisation']
    ordering = ['nom']

    def get_queryset(self):
        queryset = super().get_queryset()

        actif = self.request.query_params.get('actif')
        if actif is not None:
            queryset = queryset.filter(actif=actif.lower() == 'true')

        type_magasin = self.request.query_params.get('type')
        if type_magasin:
            queryset = queryset.filter(type=type_magasin)

        return queryset.order_by('nom')


# ==================== BON DE LIVRAISON ====================

class BonLivraisonViewSet(viewsets.ModelViewSet):
    """ViewSet pour les bons de livraison."""
    queryset = BonLivraison.objects.select_related(
        'commande_export', 'magasin_source', 'magasin_destination'
    )
    serializer_class = BonLivraisonSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero', 'magasin_destination__nom']
    ordering = ['-date']

    def get_queryset(self):
        queryset = super().get_queryset()

        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        magasin = self.request.query_params.get('magasin_destination')
        if magasin:
            queryset = queryset.filter(magasin_destination_id=magasin)

        return queryset


# ==================== ENTRÉE MAGASIN ====================

class EntreeMagasinViewSet(viewsets.ModelViewSet):
    """ViewSet pour les entrées magasin."""
    queryset = EntreeMagasin.objects.select_related('magasin', 'bon_livraison')
    serializer_class = EntreeMagasinSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_bon', 'magasin__nom']
    ordering = ['-date']

    def get_queryset(self):
        queryset = super().get_queryset()

        magasin = self.request.query_params.get('magasin')
        if magasin:
            queryset = queryset.filter(magasin_id=magasin)

        bon_livraison = self.request.query_params.get('bon_livraison')
        if bon_livraison:
            queryset = queryset.filter(bon_livraison_id=bon_livraison)

        return queryset


# ==================== FICHE DE STOCK ====================

class FicheStockViewSet(viewsets.ModelViewSet):
    """ViewSet pour les fiches de stock."""
    queryset = FicheStock.objects.select_related('magasin')
    serializer_class = FicheStockSerializer
    permission_classes = [IsAuthenticated, CanManageTracabilite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'magasin__nom']
    ordering = ['-date']

    def get_queryset(self):
        queryset = super().get_queryset()

        magasin = self.request.query_params.get('magasin')
        if magasin:
            queryset = queryset.filter(magasin_id=magasin)

        produit = self.request.query_params.get('produit')
        if produit:
            queryset = queryset.filter(produit=produit)

        return queryset
