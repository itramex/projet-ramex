"""
ViewSets for the Annual History System API

This module provides DRF ViewSets for historical data models,
including filtering, custom actions, and trend analysis.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db.models import Sum, Avg, Count, Q, Min, Max, F
from django.db import models
from decimal import Decimal
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from users.permissions import IsAdminOrManagerOrReadOnly

from .models import (
    ProductionHistory,
    AGRHistory,
    SocialIndicatorHistory,
    AnnualSnapshot,
    ProducteurSnapshot
)
from .serializers import (
    ProductionHistorySerializer,
    AGRHistorySerializer,
    SocialIndicatorHistorySerializer,
    AnnualSnapshotSerializer,
    ProducteurSnapshotSerializer
)
from .calculators import TrendCalculator
from .managers import SnapshotManager


@extend_schema_view(
    list=extend_schema(
        summary="Liste des productions historiques",
        description="Retourne la liste paginée de toutes les productions historiques avec filtrage et tri.",
        tags=['Production History'],
        parameters=[
            OpenApiParameter(
                name='annee',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par année'
            ),
            OpenApiParameter(
                name='parcelle',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par ID de parcelle'
            ),
            OpenApiParameter(
                name='culture',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par type de culture (vanille, cafe, girofle, etc.)'
            ),
            OpenApiParameter(
                name='parcelle__producteur',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par ID de producteur'
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Trier par champ (annee, quantite_kg, date_enregistrement). Préfixer avec - pour ordre décroissant.'
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Détails d'une production historique",
        description="Retourne les détails complets d'une production historique spécifique.",
        tags=['Production History']
    ),
    create=extend_schema(
        summary="Créer une production historique",
        description="Enregistre une nouvelle production historique. Nécessite les permissions de gestionnaire.",
        tags=['Production History']
    ),
    update=extend_schema(
        summary="Mettre à jour une production historique",
        description="Met à jour une production historique existante. Nécessite les permissions de gestionnaire.",
        tags=['Production History']
    ),
    partial_update=extend_schema(
        summary="Mise à jour partielle d'une production",
        description="Met à jour partiellement une production historique. Nécessite les permissions de gestionnaire.",
        tags=['Production History']
    ),
    destroy=extend_schema(
        summary="Supprimer une production historique",
        description="Supprime une production historique. Nécessite les permissions de gestionnaire.",
        tags=['Production History']
    ),
)
class ProductionHistoryViewSet(viewsets.ModelViewSet):
    """
    API pour l'historique des productions agricoles.
    
    Fournit les opérations CRUD standard plus des actions personnalisées
    pour l'analyse des tendances et le filtrage par parcelle.
    
    Requirements: 1.4, 5.1, 6.1, 6.2, 6.3
    """
    
    queryset = ProductionHistory.objects.select_related(
        'parcelle__producteur',
        'enregistre_par'
    )
    serializer_class = ProductionHistorySerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['annee', 'parcelle', 'culture', 'parcelle__producteur']
    ordering_fields = ['annee', 'quantite_kg', 'date_enregistrement']
    ordering = ['-annee']

    @extend_schema(
        summary="Productions par parcelle",
        description="Retourne l'historique complet des productions pour une parcelle donnée, trié par année.",
        tags=['Production History'],
        parameters=[
            OpenApiParameter(
                name='parcelle_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
                description='ID de la parcelle'
            ),
        ],
        responses={
            200: ProductionHistorySerializer(many=True),
            400: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Exemple de réponse',
                value=[
                    {
                        'id': 1,
                        'parcelle': 1,
                        'annee': 2023,
                        'culture': 'vanille',
                        'quantite_kg': 150.50,
                        'prix_vente_kg': 80000.00,
                        'revenu_total': 12040000.00,
                        'date_enregistrement': '2024-01-15T10:30:00Z'
                    }
                ],
                response_only=True
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def by_parcelle(self, request):
        """
        Retourne l'historique de production pour une parcelle donnée.
        
        Query Parameters:
            parcelle_id (int): ID de la parcelle
            
        Returns:
            Liste des productions historiques triées par année
        """
        parcelle_id = request.query_params.get('parcelle_id')
        
        if not parcelle_id:
            return Response(
                {'error': 'Le paramètre parcelle_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(parcelle_id=parcelle_id).order_by('annee')
        serializer = self.get_serializer(queryset, many=True)
        
        return Response(serializer.data)
    
    @extend_schema(
        summary="Analyse des tendances de production",
        description="Calcule et retourne l'analyse des tendances de production avec taux de croissance, anomalies et ligne de tendance.",
        tags=['Production History'],
        parameters=[
            OpenApiParameter(
                name='parcelle_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par ID de parcelle'
            ),
            OpenApiParameter(
                name='culture',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par type de culture'
            ),
            OpenApiParameter(
                name='annee_debut',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de début de la période d\'analyse'
            ),
            OpenApiParameter(
                name='annee_fin',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de fin de la période d\'analyse'
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Exemple de réponse',
                value={
                    'data_points': [[2020, 100.0], [2021, 120.0], [2022, 150.0]],
                    'growth_rate': 22.47,
                    'anomalies': [],
                    'trend_line': {
                        'slope': 25.0,
                        'intercept': -50350.0,
                        'r_squared': 0.98
                    },
                    'filters': {
                        'parcelle_id': '1',
                        'culture': 'vanille',
                        'annee_debut': '2020',
                        'annee_fin': '2022'
                    }
                },
                response_only=True
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Analyse des tendances de production.
        
        Query Parameters:
            parcelle_id (int, optional): Filtrer par parcelle
            culture (str, optional): Filtrer par culture
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse des tendances avec taux de croissance, anomalies, ligne de tendance
        """
        # Récupérer les paramètres de filtrage
        parcelle_id = request.query_params.get('parcelle_id')
        culture = request.query_params.get('culture')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        # Construire le queryset filtré
        queryset = self.get_queryset()
        
        if parcelle_id:
            queryset = queryset.filter(parcelle_id=parcelle_id)
        if culture:
            queryset = queryset.filter(culture=culture)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Extraire les données pour l'analyse
        data_points = [
            (prod.annee, float(prod.quantite_kg))
            for prod in queryset.order_by('annee')
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'parcelle_id': parcelle_id,
                'culture': culture,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })



@extend_schema_view(
    list=extend_schema(
        summary="Liste des revenus AGR historiques",
        description="Retourne la liste paginée de tous les revenus AGR historiques avec filtrage et tri.",
        tags=['AGR History']
    ),
    retrieve=extend_schema(
        summary="Détails d'un revenu AGR historique",
        description="Retourne les détails complets d'un revenu AGR historique spécifique.",
        tags=['AGR History']
    ),
    create=extend_schema(
        summary="Créer un revenu AGR historique",
        description="Enregistre un nouveau revenu AGR historique. Nécessite les permissions de gestionnaire.",
        tags=['AGR History']
    ),
    update=extend_schema(
        summary="Mettre à jour un revenu AGR",
        description="Met à jour un revenu AGR historique existant. Nécessite les permissions de gestionnaire.",
        tags=['AGR History']
    ),
    partial_update=extend_schema(
        summary="Mise à jour partielle d'un revenu AGR",
        description="Met à jour partiellement un revenu AGR historique. Nécessite les permissions de gestionnaire.",
        tags=['AGR History']
    ),
    destroy=extend_schema(
        summary="Supprimer un revenu AGR historique",
        description="Supprime un revenu AGR historique. Nécessite les permissions de gestionnaire.",
        tags=['AGR History']
    ),
)
class AGRHistoryViewSet(viewsets.ModelViewSet):
    """
    API pour l'historique des revenus AGR.
    
    Fournit les opérations CRUD standard plus des actions personnalisées
    pour l'analyse des revenus et l'agrégation par année.
    
    Requirements: 2.4, 5.1, 6.1, 6.2, 6.3
    """
    
    queryset = AGRHistory.objects.select_related(
        'producteur',
        'enregistre_par'
    )
    serializer_class = AGRHistorySerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['annee', 'producteur', 'type_agr', 'ordre']
    ordering_fields = ['annee', 'revenu_annuel', 'date_enregistrement']
    ordering = ['-annee']
    
    @action(detail=False, methods=['get'])
    def by_producteur(self, request):
        """
        Retourne l'historique AGR pour un producteur donné.
        
        Query Parameters:
            producteur_id (int): ID du producteur
            
        Returns:
            Liste des revenus AGR historiques triés par année
        """
        producteur_id = request.query_params.get('producteur_id')
        
        if not producteur_id:
            return Response(
                {'error': 'Le paramètre producteur_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(producteur_id=producteur_id).order_by('annee', 'ordre')
        serializer = self.get_serializer(queryset, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Analyse des tendances des revenus AGR.
        
        Query Parameters:
            producteur_id (int, optional): Filtrer par producteur
            type_agr (str, optional): Filtrer par type d'AGR
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse des tendances avec taux de croissance, anomalies, ligne de tendance
        """
        # Récupérer les paramètres de filtrage
        producteur_id = request.query_params.get('producteur_id')
        type_agr = request.query_params.get('type_agr')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        # Construire le queryset filtré
        queryset = self.get_queryset()
        
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)
        if type_agr:
            queryset = queryset.filter(type_agr=type_agr)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Agréger les revenus par année (somme de tous les AGR)
        revenus_par_annee = queryset.values('annee').annotate(
            revenu_total=Sum('revenu_annuel')
        ).order_by('annee')
        
        # Extraire les données pour l'analyse
        data_points = [
            (item['annee'], float(item['revenu_total']))
            for item in revenus_par_annee
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'producteur_id': producteur_id,
                'type_agr': type_agr,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })
    
    @action(detail=False, methods=['get'])
    def total_by_year(self, request):
        """
        Agrège les revenus AGR par année.
        
        Query Parameters:
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            type_agr (str, optional): Filtrer par type d'AGR
            
        Returns:
            Liste des totaux par année avec statistiques
        """
        # Récupérer les paramètres de filtrage
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        type_agr = request.query_params.get('type_agr')
        
        # Construire le queryset filtré
        queryset = self.get_queryset()
        
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        if type_agr:
            queryset = queryset.filter(type_agr=type_agr)
        
        # Agréger par année
        totaux = queryset.values('annee').annotate(
            revenu_total=Sum('revenu_annuel'),
            nb_producteurs=Count('producteur', distinct=True),
            nb_agr=Count('id'),
            revenu_moyen=Avg('revenu_annuel')
        ).order_by('annee')
        
        return Response(list(totaux))



@extend_schema_view(
    list=extend_schema(
        summary="Liste des indicateurs sociaux historiques",
        description="Retourne la liste paginée de tous les indicateurs sociaux historiques avec filtrage et tri.",
        tags=['Social Indicators']
    ),
    retrieve=extend_schema(
        summary="Détails d'un indicateur social",
        description="Retourne les détails complets d'un indicateur social historique spécifique.",
        tags=['Social Indicators']
    ),
    create=extend_schema(
        summary="Créer un indicateur social",
        description="Enregistre un nouvel indicateur social historique. Nécessite les permissions de gestionnaire.",
        tags=['Social Indicators']
    ),
    update=extend_schema(
        summary="Mettre à jour un indicateur social",
        description="Met à jour un indicateur social historique existant. Nécessite les permissions de gestionnaire.",
        tags=['Social Indicators']
    ),
    partial_update=extend_schema(
        summary="Mise à jour partielle d'un indicateur",
        description="Met à jour partiellement un indicateur social historique. Nécessite les permissions de gestionnaire.",
        tags=['Social Indicators']
    ),
    destroy=extend_schema(
        summary="Supprimer un indicateur social",
        description="Supprime un indicateur social historique. Nécessite les permissions de gestionnaire.",
        tags=['Social Indicators']
    ),
)
class SocialIndicatorHistoryViewSet(viewsets.ModelViewSet):
    """
    API pour l'historique des indicateurs sociaux.
    
    Fournit les opérations CRUD standard plus des actions personnalisées
    pour l'analyse des indicateurs et le calcul de moyennes par village.
    
    Requirements: 3.3, 5.1, 6.1, 6.2, 6.3
    """
    
    queryset = SocialIndicatorHistory.objects.select_related(
        'producteur',
        'enregistre_par'
    )
    serializer_class = SocialIndicatorHistorySerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['annee', 'producteur', 'type_indicateur']
    ordering_fields = ['annee', 'type_indicateur', 'date_enregistrement']
    ordering = ['-annee']
    
    @action(detail=False, methods=['get'])
    def by_producteur(self, request):
        """
        Retourne l'historique des indicateurs sociaux pour un producteur donné.
        
        Query Parameters:
            producteur_id (int): ID du producteur
            
        Returns:
            Liste des indicateurs historiques triés par année
        """
        producteur_id = request.query_params.get('producteur_id')
        
        if not producteur_id:
            return Response(
                {'error': 'Le paramètre producteur_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(producteur_id=producteur_id).order_by('annee', 'type_indicateur')
        serializer = self.get_serializer(queryset, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        Analyse des tendances des indicateurs sociaux.
        
        Query Parameters:
            producteur_id (int, optional): Filtrer par producteur
            type_indicateur (str, optional): Filtrer par type d'indicateur
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse des tendances (pour indicateurs numériques uniquement)
        """
        # Récupérer les paramètres de filtrage
        producteur_id = request.query_params.get('producteur_id')
        type_indicateur = request.query_params.get('type_indicateur')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        # Construire le queryset filtré
        queryset = self.get_queryset()
        
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)
        if type_indicateur:
            queryset = queryset.filter(type_indicateur=type_indicateur)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Filtrer uniquement les indicateurs numériques
        queryset = queryset.filter(valeur_numerique__isnull=False).order_by('annee')
        
        # Extraire les données pour l'analyse
        data_points = [
            (ind.annee, float(ind.valeur_numerique))
            for ind in queryset
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée numérique trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'producteur_id': producteur_id,
                'type_indicateur': type_indicateur,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })
    
    @action(detail=False, methods=['get'])
    def averages_by_village(self, request):
        """
        Calcule les moyennes des indicateurs par village.
        
        Query Parameters:
            annee (int, optional): Filtrer par année
            type_indicateur (str, optional): Filtrer par type d'indicateur
            
        Returns:
            Moyennes par village pour les indicateurs numériques
        """
        # Récupérer les paramètres de filtrage
        annee = request.query_params.get('annee')
        type_indicateur = request.query_params.get('type_indicateur')
        
        # Construire le queryset filtré
        queryset = self.get_queryset().filter(valeur_numerique__isnull=False)
        
        if annee:
            queryset = queryset.filter(annee=annee)
        if type_indicateur:
            queryset = queryset.filter(type_indicateur=type_indicateur)
        
        # Agréger par village
        moyennes = queryset.values(
            'producteur__village',
            'type_indicateur'
        ).annotate(
            moyenne=Avg('valeur_numerique'),
            nb_producteurs=Count('producteur', distinct=True),
            valeur_min=Min('valeur_numerique'),
            valeur_max=Max('valeur_numerique')
        ).order_by('producteur__village', 'type_indicateur')
        
        return Response(list(moyennes))



@extend_schema(tags=['Trend Analysis'])
class TrendAnalysisViewSet(viewsets.ViewSet):
    """
    API pour l'analyse des tendances (pas de modèle sous-jacent).
    
    Fournit des endpoints pour analyser les tendances de production,
    AGR et indicateurs sociaux avec des paramètres flexibles.
    
    Requirements: 5.1, 5.2, 5.3, 5.4
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def production_trends(self, request):
        """
        Analyse des tendances de production.
        
        Query Parameters:
            parcelle_id (int, optional): ID de la parcelle
            culture (str, optional): Type de culture
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse complète avec growth_rate, anomalies, trend_line
        """
        # Récupérer les paramètres
        parcelle_id = request.query_params.get('parcelle_id')
        culture = request.query_params.get('culture')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        # Construire le queryset
        queryset = ProductionHistory.objects.all()
        
        if parcelle_id:
            queryset = queryset.filter(parcelle_id=parcelle_id)
        if culture:
            queryset = queryset.filter(culture=culture)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Extraire les données
        data_points = [
            (prod.annee, float(prod.quantite_kg))
            for prod in queryset.order_by('annee')
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points, threshold=0.5)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'type': 'production',
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'parcelle_id': parcelle_id,
                'culture': culture,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })
    
    @action(detail=False, methods=['get'])
    def agr_trends(self, request):
        """
        Analyse des tendances des revenus AGR.
        
        Query Parameters:
            producteur_id (int, optional): ID du producteur
            type_agr (str, optional): Type d'AGR
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse complète avec growth_rate, anomalies, trend_line
        """
        # Récupérer les paramètres
        producteur_id = request.query_params.get('producteur_id')
        type_agr = request.query_params.get('type_agr')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        # Construire le queryset
        queryset = AGRHistory.objects.all()
        
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)
        if type_agr:
            queryset = queryset.filter(type_agr=type_agr)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Agréger par année
        revenus_par_annee = queryset.values('annee').annotate(
            revenu_total=Sum('revenu_annuel')
        ).order_by('annee')
        
        # Extraire les données
        data_points = [
            (item['annee'], float(item['revenu_total']))
            for item in revenus_par_annee
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points, threshold=0.5)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'type': 'agr',
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'producteur_id': producteur_id,
                'type_agr': type_agr,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })
    
    @action(detail=False, methods=['get'])
    def social_trends(self, request):
        """
        Analyse des tendances des indicateurs sociaux.
        
        Query Parameters:
            type_indicateur (str, required): Type d'indicateur
            village (str, optional): Filtrer par village
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            
        Returns:
            Analyse complète avec growth_rate, anomalies, trend_line
        """
        # Récupérer les paramètres
        type_indicateur = request.query_params.get('type_indicateur')
        village = request.query_params.get('village')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        if not type_indicateur:
            return Response(
                {'error': 'Le paramètre type_indicateur est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construire le queryset (uniquement indicateurs numériques)
        queryset = SocialIndicatorHistory.objects.filter(
            type_indicateur=type_indicateur,
            valeur_numerique__isnull=False
        )
        
        if village:
            queryset = queryset.filter(producteur__village=village)
        if annee_debut:
            queryset = queryset.filter(annee__gte=annee_debut)
        if annee_fin:
            queryset = queryset.filter(annee__lte=annee_fin)
        
        # Calculer la moyenne par année
        moyennes_par_annee = queryset.values('annee').annotate(
            moyenne=Avg('valeur_numerique')
        ).order_by('annee')
        
        # Extraire les données
        data_points = [
            (item['annee'], float(item['moyenne']))
            for item in moyennes_par_annee
        ]
        
        if not data_points:
            return Response(
                {'error': 'Aucune donnée numérique trouvée pour les critères spécifiés'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculer les tendances
        growth_rate = TrendCalculator.calculate_growth_rate(data_points)
        anomalies = TrendCalculator.detect_anomalies(data_points, threshold=0.5)
        trend_line = TrendCalculator.calculate_trend_line(data_points)
        
        return Response({
            'type': 'social',
            'data_points': data_points,
            'growth_rate': growth_rate,
            'anomalies': anomalies,
            'trend_line': trend_line,
            'filters': {
                'type_indicateur': type_indicateur,
                'village': village,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })



@extend_schema_view(
    list=extend_schema(
        summary="Liste des snapshots annuels",
        description="Retourne la liste de tous les snapshots annuels créés.",
        tags=['Snapshots']
    ),
    retrieve=extend_schema(
        summary="Détails d'un snapshot",
        description="Retourne les détails complets d'un snapshot annuel spécifique.",
        tags=['Snapshots']
    ),
    create=extend_schema(
        summary="Créer un snapshot",
        description="Crée un nouveau snapshot annuel. Nécessite les permissions de gestionnaire.",
        tags=['Snapshots']
    ),
)
class AnnualSnapshotViewSet(viewsets.ModelViewSet):
    """
    API pour les snapshots annuels.
    
    Fournit des opérations limitées (list, retrieve, create uniquement)
    avec protection contre la modification des snapshots verrouillés.
    
    Requirements: 4.1, 4.3, 4.5
    """
    
    queryset = AnnualSnapshot.objects.select_related('cree_par')
    serializer_class = AnnualSnapshotSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]
    http_method_names = ['get', 'post', 'head', 'options']  # Pas de PUT/PATCH/DELETE
    
    def update(self, request, *args, **kwargs):
        """
        Bloquer les mises à jour si le snapshot est verrouillé.
        
        Requirements: 4.3
        """
        instance = self.get_object()
        
        if instance.verrouille:
            return Response(
                {'error': 'Impossible de modifier un snapshot verrouillé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Empêcher la suppression des snapshots.
        """
        return Response(
            {'error': 'La suppression de snapshots n\'est pas autorisée'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=['post'])
    def create_for_year(self, request):
        """
        Crée un snapshot pour une année donnée en calculant les statistiques.
        
        Request Body:
            annee (int): Année du snapshot
            description (str, optional): Description du snapshot
            
        Returns:
            Snapshot créé avec les statistiques calculées
            
        Requirements: 4.1, 4.2
        """
        annee = request.data.get('annee')
        description = request.data.get('description', '')
        
        if not annee:
            return Response(
                {'error': 'Le paramètre annee est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Utiliser SnapshotManager pour créer le snapshot
            snapshot = SnapshotManager.create_snapshot(
                annee=int(annee),
                user=request.user,
                description=description
            )
            
            serializer = self.get_serializer(snapshot)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def compare(self, request):
        """
        Compare deux snapshots.
        
        Query Parameters:
            annee1 (int): Première année
            annee2 (int): Deuxième année
            
        Returns:
            Comparaison détaillée avec différences absolues et relatives
            
        Requirements: 4.5
        """
        annee1 = request.query_params.get('annee1')
        annee2 = request.query_params.get('annee2')
        
        if not annee1 or not annee2:
            return Response(
                {'error': 'Les paramètres annee1 et annee2 sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Utiliser SnapshotManager pour comparer
            comparison = SnapshotManager.compare_snapshots(
                annee1=int(annee1),
                annee2=int(annee2)
            )
            
            return Response(comparison)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """
        Verrouille un snapshot pour le rendre immutable.
        
        Une fois verrouillé, un snapshot ne peut plus être modifié.
        
        Returns:
            Snapshot verrouillé
            
        Requirements: 4.3
        """
        snapshot = self.get_object()
        
        if snapshot.verrouille:
            return Response(
                {'message': 'Le snapshot est déjà verrouillé'},
                status=status.HTTP_200_OK
            )
        
        snapshot.verrouille = True
        snapshot.save()
        
        serializer = self.get_serializer(snapshot)
        return Response(serializer.data)



@extend_schema_view(
    list=extend_schema(
        summary="Liste des snapshots de producteurs",
        description="Retourne la liste paginée de tous les snapshots de producteurs avec filtrage et tri.",
        tags=['Producteur Snapshots'],
        parameters=[
            OpenApiParameter(
                name='annee',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par année (requis)',
                required=True
            ),
            OpenApiParameter(
                name='commune',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par commune'
            ),
            OpenApiParameter(
                name='village',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par village'
            ),
            OpenApiParameter(
                name='cooperative',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par nom de coopérative'
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Rechercher par code ou nom de producteur'
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Trier par champ (code, nom, commune, village). Préfixer avec - pour ordre décroissant.'
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Détails d'un snapshot de producteur",
        description="Retourne les détails complets d'un snapshot de producteur spécifique.",
        tags=['Producteur Snapshots']
    ),
)
class ProducteurSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API pour les snapshots annuels des producteurs.
    
    Fournit des opérations de lecture uniquement (list, retrieve) avec des actions
    personnalisées pour les statistiques, comparaisons et exports.
    
    Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4
    """
    
    queryset = ProducteurSnapshot.objects.select_related(
        'producteur',
        'enregistre_par'
    )
    serializer_class = ProducteurSnapshotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['annee', 'commune', 'village', 'cooperative_nom', 'sexe', 'actif']
    ordering_fields = ['code', 'nom', 'commune', 'village', 'annee']
    ordering = ['code']
    
    def get_queryset(self):
        """
        Filtre le queryset avec recherche par code ou nom.
        
        Requirements: 7.3, 7.4
        """
        queryset = super().get_queryset()
        
        # Recherche par code ou nom
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | Q(nom__icontains=search) | Q(prenom__icontains=search)
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Liste les snapshots avec validation de l'année.
        
        Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
        """
        # Vérifier que l'année est fournie
        annee = request.query_params.get('annee')
        if not annee:
            return Response(
                {'error': 'Le paramètre annee est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Statistiques des producteurs par année",
        description="Calcule et retourne les statistiques agrégées des producteurs pour une année donnée.",
        tags=['Producteur Snapshots'],
        parameters=[
            OpenApiParameter(
                name='annee',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année pour les statistiques (requis)',
                required=True
            ),
            OpenApiParameter(
                name='commune',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par commune'
            ),
            OpenApiParameter(
                name='village',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par village'
            ),
            OpenApiParameter(
                name='cooperative',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par coopérative'
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Calcule les statistiques des producteurs pour une année donnée.
        
        Query Parameters:
            annee (int, required): Année pour les statistiques
            commune (str, optional): Filtrer par commune
            village (str, optional): Filtrer par village
            cooperative (str, optional): Filtrer par coopérative
            
        Returns:
            Statistiques agrégées (total, par sexe, femmes leaders, par coopérative, par commune, taux scolarisation)
            
        Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
        """
        # Récupérer l'année
        annee = request.query_params.get('annee')
        if not annee:
            return Response(
                {'error': 'Le paramètre annee est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            annee = int(annee)
        except ValueError:
            return Response(
                {'error': 'L\'année doit être un entier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construire le queryset filtré
        queryset = self.get_queryset().filter(annee=annee)
        
        # Appliquer les filtres optionnels
        commune = request.query_params.get('commune')
        village = request.query_params.get('village')
        cooperative = request.query_params.get('cooperative')
        
        if commune:
            queryset = queryset.filter(commune=commune)
        if village:
            queryset = queryset.filter(village=village)
        if cooperative:
            queryset = queryset.filter(cooperative_nom__icontains=cooperative)
        
        # Calculer les statistiques
        total_producteurs = queryset.count()
        
        # Répartition par sexe
        par_sexe = queryset.values('sexe').annotate(
            count=Count('id')
        ).order_by('sexe')
        par_sexe_dict = {item['sexe']: item['count'] for item in par_sexe}
        
        # Nombre de femmes leaders
        femmes_leaders = queryset.filter(femme_leader=True).count()
        
        # Répartition par coopérative
        par_cooperative = queryset.values('cooperative_nom').annotate(
            count=Count('id')
        ).order_by('-count')
        par_cooperative_dict = {
            item['cooperative_nom'] or 'Sans coopérative': item['count'] 
            for item in par_cooperative
        }
        
        # Répartition par commune
        par_commune = queryset.values('commune').annotate(
            count=Count('id')
        ).order_by('-count')
        par_commune_dict = {item['commune']: item['count'] for item in par_commune}
        
        # Taux de scolarisation moyen
        taux_scolarisation_moyen = queryset.aggregate(
            moyenne=Avg('taux_scolarisation')
        )['moyenne']
        
        if taux_scolarisation_moyen is not None:
            taux_scolarisation_moyen = round(float(taux_scolarisation_moyen), 2)
        
        return Response({
            'annee': annee,
            'total_producteurs': total_producteurs,
            'par_sexe': par_sexe_dict,
            'femmes_leaders': femmes_leaders,
            'par_cooperative': par_cooperative_dict,
            'par_commune': par_commune_dict,
            'taux_scolarisation_moyen': taux_scolarisation_moyen,
            'filters': {
                'commune': commune,
                'village': village,
                'cooperative': cooperative
            }
        })
    
    @extend_schema(
        summary="Comparer deux années",
        description="Compare les producteurs entre deux années et identifie les nouveaux, sortis et l'évolution des statistiques.",
        tags=['Producteur Snapshots'],
        parameters=[
            OpenApiParameter(
                name='year1',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Première année (requis)',
                required=True
            ),
            OpenApiParameter(
                name='year2',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Deuxième année (requis)',
                required=True
            ),
        ],
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=False, methods=['get'])
    def compare(self, request):
        """
        Compare les producteurs entre deux années.
        
        Query Parameters:
            year1 (int, required): Première année
            year2 (int, required): Deuxième année
            
        Returns:
            Comparaison détaillée avec évolution, nouveaux producteurs, producteurs sortis
            
        Requirements: 8.8
        """
        # Récupérer les années
        year1 = request.query_params.get('year1')
        year2 = request.query_params.get('year2')
        
        if not year1 or not year2:
            return Response(
                {'error': 'Les paramètres year1 et year2 sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            year1 = int(year1)
            year2 = int(year2)
        except ValueError:
            return Response(
                {'error': 'Les années doivent être des entiers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Récupérer les snapshots des deux années
        snapshots_year1 = self.get_queryset().filter(annee=year1)
        snapshots_year2 = self.get_queryset().filter(annee=year2)
        
        # Calculer les statistiques pour chaque année
        total_year1 = snapshots_year1.count()
        total_year2 = snapshots_year2.count()
        
        femmes_leaders_year1 = snapshots_year1.filter(femme_leader=True).count()
        femmes_leaders_year2 = snapshots_year2.filter(femme_leader=True).count()
        
        taux_scol_year1 = snapshots_year1.aggregate(moyenne=Avg('taux_scolarisation'))['moyenne']
        taux_scol_year2 = snapshots_year2.aggregate(moyenne=Avg('taux_scolarisation'))['moyenne']
        
        # Identifier les producteurs (par code)
        codes_year1 = set(snapshots_year1.values_list('code', flat=True))
        codes_year2 = set(snapshots_year2.values_list('code', flat=True))
        
        # Producteurs nouveaux (présents en year2 mais pas en year1)
        codes_nouveaux = codes_year2 - codes_year1
        producteurs_nouveaux = snapshots_year2.filter(code__in=codes_nouveaux).values(
            'code', 'nom', 'prenom', 'commune', 'village', 'cooperative_nom'
        )
        
        # Producteurs sortis (présents en year1 mais pas en year2)
        codes_sortis = codes_year1 - codes_year2
        producteurs_sortis = snapshots_year1.filter(code__in=codes_sortis).values(
            'code', 'nom', 'prenom', 'commune', 'village', 'cooperative_nom'
        )
        
        # Calculer les différences
        difference_total = total_year2 - total_year1
        pourcentage_total = (difference_total / total_year1 * 100) if total_year1 > 0 else 0
        
        difference_femmes_leaders = femmes_leaders_year2 - femmes_leaders_year1
        
        return Response({
            'year1': year1,
            'year2': year2,
            'evolution': {
                'total': {
                    year1: total_year1,
                    year2: total_year2,
                    'difference': difference_total,
                    'pourcentage': round(pourcentage_total, 2)
                },
                'nouveaux': len(codes_nouveaux),
                'sortis': len(codes_sortis),
                'femmes_leaders': {
                    year1: femmes_leaders_year1,
                    year2: femmes_leaders_year2,
                    'difference': difference_femmes_leaders
                },
                'taux_scolarisation': {
                    year1: round(float(taux_scol_year1), 2) if taux_scol_year1 else None,
                    year2: round(float(taux_scol_year2), 2) if taux_scol_year2 else None,
                    'difference': round(float(taux_scol_year2 - taux_scol_year1), 2) if taux_scol_year1 and taux_scol_year2 else None
                }
            },
            'producteurs_nouveaux': list(producteurs_nouveaux),
            'producteurs_sortis': list(producteurs_sortis)
        })
    
    @extend_schema(
        summary="Exporter les snapshots en Excel",
        description="Génère un fichier Excel avec les snapshots de producteurs selon les filtres spécifiés.",
        tags=['Producteur Snapshots'],
        parameters=[
            OpenApiParameter(
                name='annee',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année à exporter (requis)',
                required=True
            ),
            OpenApiParameter(
                name='commune',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par commune'
            ),
            OpenApiParameter(
                name='village',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par village'
            ),
            OpenApiParameter(
                name='cooperative',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par coopérative'
            ),
        ],
        responses={
            200: OpenApiTypes.BINARY,
            400: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Exporte les snapshots de producteurs en Excel.
        
        Query Parameters:
            annee (int, required): Année à exporter
            commune (str, optional): Filtrer par commune
            village (str, optional): Filtrer par village
            cooperative (str, optional): Filtrer par coopérative
            
        Returns:
            Fichier Excel avec les snapshots de producteurs
            
        Requirements: 10.1, 10.2, 10.3, 10.4
        """
        from django.http import HttpResponse
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill
        
        # Récupérer l'année
        annee = request.query_params.get('annee')
        if not annee:
            return Response(
                {'error': 'Le paramètre annee est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            annee = int(annee)
        except ValueError:
            return Response(
                {'error': 'L\'année doit être un entier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construire le queryset filtré
        queryset = self.get_queryset().filter(annee=annee)
        
        # Appliquer les filtres optionnels
        commune = request.query_params.get('commune')
        village = request.query_params.get('village')
        cooperative = request.query_params.get('cooperative')
        
        if commune:
            queryset = queryset.filter(commune=commune)
        if village:
            queryset = queryset.filter(village=village)
        if cooperative:
            queryset = queryset.filter(cooperative_nom__icontains=cooperative)
        
        # Créer le workbook Excel
        wb = Workbook()
        ws = wb.active
        ws.title = f"Producteurs {annee}"
        
        # Style pour l'en-tête
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        # En-têtes
        headers = [
            'Code', 'Nom', 'Prénom', 'CIN', 'Sexe',
            'Commune', 'Fokontany', 'Village',
            'Téléphone', 'Email',
            'Coopérative', 'Responsabilité',
            'Date Naissance', 'Statut Matrimonial', 'Niveau Education',
            'Femme Leader', 'Paysan Relais', 'Satellite Floraison',
            'Nb Adultes', 'Nb Hommes', 'Nb Femmes',
            'Nb Garçons', 'Nb Filles', 'Nb Enfants Scolarisés',
            'Taux Scolarisation (%)',
            'Source Eau', 'Type CSB', 'Assurance Santé',
            'Actif'
        ]
        
        # Écrire les en-têtes
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
        
        # Écrire les données
        for row_num, snapshot in enumerate(queryset, 2):
            ws.cell(row=row_num, column=1, value=snapshot.code)
            ws.cell(row=row_num, column=2, value=snapshot.nom)
            ws.cell(row=row_num, column=3, value=snapshot.prenom)
            ws.cell(row=row_num, column=4, value=snapshot.cin)
            ws.cell(row=row_num, column=5, value=snapshot.sexe)
            
            ws.cell(row=row_num, column=6, value=snapshot.commune)
            ws.cell(row=row_num, column=7, value=snapshot.fokontany)
            ws.cell(row=row_num, column=8, value=snapshot.village)
            
            ws.cell(row=row_num, column=9, value=snapshot.telephone)
            ws.cell(row=row_num, column=10, value=snapshot.email)
            
            ws.cell(row=row_num, column=11, value=snapshot.cooperative_nom)
            ws.cell(row=row_num, column=12, value=snapshot.responsabilite_cooperative)
            
            ws.cell(row=row_num, column=13, value=snapshot.date_naissance.strftime('%Y-%m-%d') if snapshot.date_naissance else '')
            ws.cell(row=row_num, column=14, value=snapshot.statut_matrimonial)
            ws.cell(row=row_num, column=15, value=snapshot.niveau_education)
            
            ws.cell(row=row_num, column=16, value='Oui' if snapshot.femme_leader else 'Non')
            ws.cell(row=row_num, column=17, value='Oui' if snapshot.paysan_relais else 'Non')
            ws.cell(row=row_num, column=18, value='Oui' if snapshot.satellite_floraison else 'Non')
            
            ws.cell(row=row_num, column=19, value=snapshot.nb_adultes_plus_18)
            ws.cell(row=row_num, column=20, value=snapshot.nb_hommes_adultes)
            ws.cell(row=row_num, column=21, value=snapshot.nb_femmes_adultes)
            
            ws.cell(row=row_num, column=22, value=snapshot.nb_enfants_garcons)
            ws.cell(row=row_num, column=23, value=snapshot.nb_enfants_filles)
            ws.cell(row=row_num, column=24, value=snapshot.nb_enfants_scolarises)
            
            ws.cell(row=row_num, column=25, value=float(snapshot.taux_scolarisation))
            
            ws.cell(row=row_num, column=26, value=snapshot.source_eau)
            ws.cell(row=row_num, column=27, value=snapshot.type_centre_sante)
            ws.cell(row=row_num, column=28, value='Oui' if snapshot.a_assurance_sante else 'Non')
            
            ws.cell(row=row_num, column=29, value='Oui' if snapshot.actif else 'Non')
        
        # Ajuster la largeur des colonnes
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column].width = adjusted_width
        
        # Créer la réponse HTTP
        from io import BytesIO
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        response = HttpResponse(
            excel_file.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        # Nom du fichier
        filename = f'producteurs_snapshots_{annee}'
        if commune:
            filename += f'_{commune}'
        if village:
            filename += f'_{village}'
        filename += '.xlsx'
        
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    @extend_schema(
        summary="Vue globale des adhésions par année",
        description="Affiche pour chaque année disponible le nombre de producteurs qui ont rejoint la coopérative (nouveaux membres).",
        tags=['Producteur Snapshots'],
        parameters=[
            OpenApiParameter(
                name='annee_debut',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de début (optionnel, par défaut: première année disponible)'
            ),
            OpenApiParameter(
                name='annee_fin',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de fin (optionnel, par défaut: dernière année disponible)'
            ),
            OpenApiParameter(
                name='cooperative',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='ID de la coopérative'
            ),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def adhesions_par_annee(self, request):
        """
        Vue globale des adhésions par année d'adhésion réelle.
        
        Affiche les producteurs qui ont adhéré à la coopérative chaque année
        basé sur leur date_adhesion_cooperative.
        
        Query Parameters:
            annee_debut (int, optional): Année de début
            annee_fin (int, optional): Année de fin
            cooperative (int, optional): ID de la coopérative
            
        Returns:
            Liste des années avec statistiques d'adhésion
        """
        from producteurs.models import Producteur
        from django.db.models.functions import ExtractYear
        
        # Construire le queryset de base - producteurs avec date d'adhésion
        queryset = Producteur.objects.filter(
            date_adhesion_cooperative__isnull=False
        )
        
        # Appliquer le filtre coopérative
        cooperative = request.query_params.get('cooperative')
        if cooperative:
            try:
                cooperative_id = int(cooperative)
                queryset = queryset.filter(cooperative_id=cooperative_id)
            except (ValueError, TypeError):
                pass
        
        # Extraire l'année d'adhésion
        queryset = queryset.annotate(
            annee_adhesion=ExtractYear('date_adhesion_cooperative')
        )
        
        # Récupérer toutes les années d'adhésion disponibles
        annees_disponibles = queryset.values_list('annee_adhesion', flat=True).distinct().order_by('annee_adhesion')
        annees_disponibles = [a for a in annees_disponibles if a is not None]
        
        if not annees_disponibles:
            return Response({
                'message': "Aucune donnée d'adhésion disponible",
                'par_annee': [],
                'statistiques_globales': {}
            })
        
        # Filtrer par plage d'années si spécifié
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        
        if annee_debut:
            try:
                annee_debut = int(annee_debut)
                annees_disponibles = [a for a in annees_disponibles if a >= annee_debut]
            except ValueError:
                pass
        
        if annee_fin:
            try:
                annee_fin = int(annee_fin)
                annees_disponibles = [a for a in annees_disponibles if a <= annee_fin]
            except ValueError:
                pass
        
        # Calculer les statistiques pour chaque année
        resultats = []
        total_cumule = 0
        
        for annee in annees_disponibles:
            # Producteurs qui ont adhéré cette année
            producteurs_annee = queryset.filter(annee_adhesion=annee)
            nouveaux = producteurs_annee.count()
            total_cumule += nouveaux
            
            # Statistiques par sexe
            par_sexe = producteurs_annee.values('sexe').annotate(count=Count('id'))
            par_sexe_dict = {item['sexe']: item['count'] for item in par_sexe}
            
            # Détails des nouveaux producteurs (10 premiers)
            nouveaux_details = producteurs_annee.values(
                'code', 'nom', 'prenom', 'commune', 'village', 'sexe'
            ).annotate(
                cooperative_nom=F('cooperative__nom')
            )[:10]
            
            # Répartition par coopérative (si pas de filtre)
            if not cooperative:
                par_coop = producteurs_annee.values('cooperative__nom').annotate(
                    count=Count('id')
                ).order_by('-count')[:5]
                par_coop_list = [
                    {'cooperative': item['cooperative__nom'] or 'Sans coopérative', 'count': item['count']}
                    for item in par_coop
                ]
            else:
                par_coop_list = []
            
            # Calculer le taux de croissance par rapport à l'année précédente
            if resultats:
                total_precedent = resultats[-1]['total_producteurs']
                taux_croissance = ((total_cumule - total_precedent) / total_precedent * 100) if total_precedent > 0 else 0
            else:
                taux_croissance = 0
            
            resultats.append({
                'annee': annee,
                'total_producteurs': total_cumule,  # Total cumulé jusqu'à cette année
                'nouveaux_producteurs': nouveaux,  # Nouveaux cette année
                'producteurs_sortis': 0,  # Pas de notion de "sortis" avec date d'adhésion
                'taux_croissance': round(taux_croissance, 2),
                'par_sexe': par_sexe_dict,
                'par_cooperative': par_coop_list,
                'nouveaux_details': list(nouveaux_details)
            })
        
        # Calculer les statistiques globales
        if resultats:
            total_nouveaux = sum(r['nouveaux_producteurs'] for r in resultats)
            
            statistiques_globales = {
                'periode': f"{resultats[0]['annee']} - {resultats[-1]['annee']}",
                'nombre_annees': len(resultats),
                'total_nouveaux': total_nouveaux,
                'total_sortis': 0,
                'taux_croissance_global': round(
                    ((resultats[-1]['total_producteurs'] - resultats[0]['nouveaux_producteurs']) / 
                     resultats[0]['nouveaux_producteurs'] * 100), 2
                ) if resultats[0]['nouveaux_producteurs'] > 0 else 0
            }
        else:
            statistiques_globales = {}
        
        return Response({
            'statistiques_globales': statistiques_globales,
            'par_annee': resultats,
            'total_producteurs': total_cumule,
            'total_cooperatives': queryset.values('cooperative').distinct().count(),
            'filtres_appliques': {
                'cooperative': cooperative,
                'annee_debut': annee_debut,
                'annee_fin': annee_fin
            }
        })


@extend_schema(tags=['Export'])
class HistoryExportViewSet(viewsets.ViewSet):
    """
    API pour l'export des données historiques en Excel.
    
    Permet l'export des productions, AGR et indicateurs sociaux
    avec formatage et graphiques optionnels.
    
    Requirements: 8.1, 8.2, 8.5
    """
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Exporter les données historiques en Excel",
        description="Génère un fichier Excel avec les données historiques selon les filtres spécifiés.",
        parameters=[
            OpenApiParameter(
                name='data_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Type de données: production, agr, social, all',
                required=True
            ),
            OpenApiParameter(
                name='annee_debut',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de début',
                required=True
            ),
            OpenApiParameter(
                name='annee_fin',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Année de fin',
                required=True
            ),
            OpenApiParameter(
                name='include_charts',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Inclure les graphiques (true/false)',
                required=False
            ),
            OpenApiParameter(
                name='cooperative',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par coopérative',
                required=False
            ),
            OpenApiParameter(
                name='village',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filtrer par village',
                required=False
            ),
            OpenApiParameter(
                name='producteur',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par producteur',
                required=False
            ),
            OpenApiParameter(
                name='parcelle',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filtrer par parcelle',
                required=False
            ),
        ],
        responses={
            200: OpenApiTypes.BINARY,
            400: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Exporte les données historiques en Excel.
        
        Query Parameters:
            data_type (str): Type de données (production, agr, social, all)
            annee_debut (int): Année de début
            annee_fin (int): Année de fin
            include_charts (bool): Inclure les graphiques
            cooperative (int): Filtrer par coopérative
            village (str): Filtrer par village
            producteur (int): Filtrer par producteur
            parcelle (int): Filtrer par parcelle
            
        Returns:
            Fichier Excel avec les données exportées
        """
        from django.http import HttpResponse
        from .export import HistoryExporter
        
        # Récupérer les paramètres
        data_type = request.query_params.get('data_type', 'all')
        annee_debut = request.query_params.get('annee_debut')
        annee_fin = request.query_params.get('annee_fin')
        include_charts = request.query_params.get('include_charts', 'false').lower() == 'true'
        
        # Validation
        if not annee_debut or not annee_fin:
            return Response(
                {'error': 'Les paramètres annee_debut et annee_fin sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            annee_debut = int(annee_debut)
            annee_fin = int(annee_fin)
        except ValueError:
            return Response(
                {'error': 'Les années doivent être des entiers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if annee_debut > annee_fin:
            return Response(
                {'error': 'L\'année de début doit être inférieure ou égale à l\'année de fin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construire les filtres
        filters = {}
        if request.query_params.get('cooperative'):
            filters['cooperative'] = request.query_params.get('cooperative')
        if request.query_params.get('village'):
            filters['village'] = request.query_params.get('village')
        if request.query_params.get('producteur'):
            filters['producteur'] = request.query_params.get('producteur')
        if request.query_params.get('parcelle'):
            filters['parcelle'] = request.query_params.get('parcelle')
        if request.query_params.get('culture'):
            filters['culture'] = request.query_params.get('culture')
        if request.query_params.get('type_agr'):
            filters['type_agr'] = request.query_params.get('type_agr')
        if request.query_params.get('type_indicateur'):
            filters['type_indicateur'] = request.query_params.get('type_indicateur')
        
        # Créer l'exporter
        exporter = HistoryExporter()
        
        # Exporter selon le type
        try:
            if data_type in ['production', 'all']:
                exporter.export_production_history(
                    annee_debut=annee_debut,
                    annee_fin=annee_fin,
                    filters=filters,
                    include_charts=include_charts
                )
            
            if data_type in ['agr', 'all']:
                exporter.export_agr_history(
                    annee_debut=annee_debut,
                    annee_fin=annee_fin,
                    filters=filters,
                    include_charts=include_charts
                )
            
            if data_type in ['social', 'all']:
                exporter.export_social_indicators(
                    annee_debut=annee_debut,
                    annee_fin=annee_fin,
                    filters=filters,
                    include_charts=include_charts
                )
            
            # Générer le fichier
            excel_data = exporter.get_workbook_bytes()
            
            # Créer la réponse HTTP
            response = HttpResponse(
                excel_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            
            # Nom du fichier
            filename = f'historique_{data_type}_{annee_debut}_{annee_fin}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'export: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
