# recommandations/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.utils import timezone

from .models import Recommendation, Activite, MahavelonaArchive
from .serializers import (
    RecommendationSerializer,
    ActiviteSerializer,
    RecommendationStatsSerializer,
    MahavelonaArchiveSerializer
)
from .engine.recommendation_engine import RecommendationEngine


class RecommendationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les recommandations
    
    Actions disponibles:
    - list: Liste toutes les recommandations
    - retrieve: Détails d'une recommandation
    - create: Créer manuellement une recommandation
    - update/patch: Modifier une recommandation
    - delete: Supprimer une recommandation
    - generate_for_producteur: Générer recommandations pour un producteur
    - execute: Marquer comme exécutée
    - reject: Marquer comme rejetée
    - refresh_all: Régénérer toutes les recommandations (admin)
    - statistics: Statistiques globales
    """
    
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['type_activite', 'description']
    ordering_fields = ['date_generation', 'score_pertinence']
    ordering = ['-date_generation', '-score_pertinence']
    
    def get_queryset(self):
        """Filtre par producteur si spécifié"""
        queryset = super().get_queryset()
        
        producteur_id = self.request.query_params.get('producteur')
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        return queryset.select_related('producteur')
    
    @action(detail=False, methods=['post'], url_path='validate-producteur')
    def validate_producteur(self, request):
        """
        Valide qu'un producteur a suffisamment de données pour générer des recommandations
        
        POST /api/recommendations/validate-producteur/
        Body: { "producteur_id": 123 }
        
        Returns:
        {
            "valid": true/false,
            "producteur_id": 123,
            "producteur_nom": "Nom Prénom",
            "missing_data": [...],
            "existing_data": {...},
            "recommendations": [...]
        }
        """
        from producteurs.models import Producteur
        from datetime import datetime
        
        producteur_id = request.data.get('producteur_id')
        
        if not producteur_id:
            return Response(
                {'error': 'producteur_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            producteur = Producteur.objects.get(id=producteur_id)
        except Producteur.DoesNotExist:
            return Response(
                {'error': 'Producteur introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier si actif
        if not producteur.actif:
            return Response({
                'valid': False,
                'producteur_id': producteur_id,
                'producteur_nom': producteur.nom_complet,
                'reason': 'inactive',
                'message': 'Ce producteur est inactif'
            })
        
        # Analyser les données
        parcelles_actives = producteur.parcelles.filter(active=True)
        activites = producteur.activites.all()
        
        validation_result = {
            'valid': True,
            'producteur_id': producteur_id,
            'producteur_nom': producteur.nom_complet,
            'missing_data': [],
            'warnings': [],
            'existing_data': {
                'parcelles': {
                    'count': parcelles_actives.count(),
                    'details': []
                },
                'activites': {
                    'count': activites.count(),
                    'formations': activites.filter(type__icontains='formation').count(),
                    'collectes': activites.filter(type__icontains='collecte').count()
                }
            }
        }
        
        # Vérification 1: Au moins une parcelle active
        if parcelles_actives.count() == 0:
            validation_result['valid'] = False
            validation_result['missing_data'].append({
                'field': 'parcelles',
                'message': 'Aucune parcelle active trouvée',
                'action': 'Ajouter au moins une parcelle ou activer les parcelles existantes'
            })
        else:
            # Vérification détaillée de chaque parcelle
            annee_actuelle = datetime.now().year
            
            for parcelle in parcelles_actives:
                parcelle_data = {
                    'code': parcelle.code_parcelle,
                    'issues': []
                }
                
                if not parcelle.dimension_ha or parcelle.dimension_ha <= 0:
                    parcelle_data['issues'].append('Superficie (dimension_ha) manquante ou = 0')
                    validation_result['valid'] = False
                
                if not parcelle.nombre_pieds or parcelle.nombre_pieds <= 0:
                    parcelle_data['issues'].append('Nombre de pieds manquant ou = 0')
                    validation_result['valid'] = False
                
                if not parcelle.estimation_production_kg or parcelle.estimation_production_kg <= 0:
                    parcelle_data['issues'].append('Estimation production manquante ou = 0')
                    validation_result['warnings'].append(f'{parcelle.code_parcelle}: Production non estimée')
                
                if not parcelle.annee_plantation:
                    parcelle_data['issues'].append('Année de plantation manquante')
                    validation_result['warnings'].append(f'{parcelle.code_parcelle}: Année plantation manquante')
                elif parcelle.annee_plantation > annee_actuelle:
                    parcelle_data['issues'].append('Année de plantation dans le futur')
                    validation_result['valid'] = False
                
                if not parcelle.cultures_pratiquees or len(parcelle.cultures_pratiquees) == 0:
                    parcelle_data['issues'].append('Cultures pratiquées non renseignées')
                    validation_result['warnings'].append(f'{parcelle.code_parcelle}: Cultures non renseignées')
                
                if parcelle_data['issues']:
                    validation_result['existing_data']['parcelles']['details'].append(parcelle_data)
            
            # Si des problèmes sur parcelles
            if validation_result['existing_data']['parcelles']['details']:
                validation_result['missing_data'].append({
                    'field': 'parcelles_data',
                    'message': f'{len(validation_result["existing_data"]["parcelles"]["details"])} parcelle(s) avec données incomplètes',
                    'details': validation_result['existing_data']['parcelles']['details']
                })
        
        # Vérification 2: Activités (recommandé mais non bloquant)
        if activites.count() == 0:
            validation_result['warnings'].append('Aucune activité enregistrée (recommandé pour de meilleures recommandations)')
        
        # Vérification 3: Date d'adhésion
        if not producteur.date_adhesion_cooperative:
            validation_result['warnings'].append('Date d\'adhésion coopérative manquante (ancienneté non calculable)')
        
        # Recommandations d'amélioration
        recommendations = []
        if parcelles_actives.filter(certifiee=True).count() == 0:
            recommendations.append('Considérer la certification des parcelles pour améliorer les recommandations')
        
        if activites.filter(type__icontains='formation').count() == 0:
            recommendations.append('Enregistrer les formations suivies pour des recommandations plus précises')
        
        if activites.filter(type__icontains='collecte').count() == 0:
            recommendations.append('Enregistrer les collectes pour suivre la productivité')
        
        validation_result['recommendations'] = recommendations
        
        return Response(validation_result)
    
    @action(detail=False, methods=['post'], url_path='generate-for-producteur')
    def generate_for_producteur(self, request):
        """
        Génère des recommandations pour un producteur spécifique
        
        POST /api/recommendations/generate-for-producteur/
        Body: { "producteur_id": 123, "top_n": 5 }
        """
        producteur_id = request.data.get('producteur_id')
        top_n = request.data.get('top_n', 5)
        
        if not producteur_id:
            return Response(
                {'error': 'producteur_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            engine = RecommendationEngine()
            recommendations = engine.get_recommendations(producteur_id, top_n=top_n)
            
            if not recommendations:
                # Vérifier si le producteur existe et est actif
                try:
                    from producteurs.models import Producteur
                    producteur = Producteur.objects.get(id=producteur_id)
                    
                    if not producteur.actif:
                        return Response({
                            'message': 'Ce producteur est inactif. Seuls les producteurs actifs peuvent recevoir des recommandations.',
                            'recommendations': [],
                            'reason': 'inactive_producer'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'message': 'Données insuffisantes pour générer des recommandations pour ce producteur.',
                            'recommendations': [],
                            'reason': 'insufficient_data'
                        })
                except Producteur.DoesNotExist:
                    return Response({
                        'error': 'Producteur introuvable',
                        'recommendations': []
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Sauvegarde dans la DB
            engine.save_recommendations(producteur_id, recommendations)
            
            # Récupération des recommandations créées
            created_recs = Recommendation.objects.filter(
                producteur_id=producteur_id,
                statut='pending'
            ).order_by('-score_pertinence')[:top_n]
            
            serializer = self.get_serializer(created_recs, many=True)
            
            return Response({
                'message': f'{len(created_recs)} recommandations générées avec succès',
                'recommendations': serializer.data
            })
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='execute')
    def execute(self, request, pk=None):
        """
        Marque une recommandation comme exécutée
        
        POST /api/recommendations/{id}/execute/
        """
        recommendation = self.get_object()
        recommendation.statut = 'executed'
        recommendation.date_execution = timezone.now()
        recommendation.save()
        
        serializer = self.get_serializer(recommendation)
        return Response({
            'message': 'Recommandation marquée comme exécutée',
            'recommendation': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        Marque une recommandation comme rejetée
        
        POST /api/recommendations/{id}/reject/
        """
        recommendation = self.get_object()
        recommendation.statut = 'rejected'
        recommendation.save()
        
        serializer = self.get_serializer(recommendation)
        return Response({
            'message': 'Recommandation marquée comme rejetée',
            'recommendation': serializer.data
        })
    
    @action(detail=False, methods=['post'], url_path='refresh-all')
    def refresh_all(self, request):
        """
        Régénère toutes les recommandations (tâche admin)
        
        POST /api/recommendations/refresh-all/
        """
        # Vérifier que l'utilisateur est admin
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission refusée. Admin uniquement.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            engine = RecommendationEngine()
            result = engine.refresh_all_recommendations()
            
            return Response({
                'message': 'Recommandations régénérées avec succès',
                'total_producteurs': result['total'],
                'success_count': result['success'],
                'failed_count': result['failed']
            })
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Retourne les statistiques des recommandations
        
        GET /api/recommendations/statistics/
        """
        total = Recommendation.objects.count()
        pending = Recommendation.objects.filter(statut='pending').count()
        executed = Recommendation.objects.filter(statut='executed').count()
        rejected = Recommendation.objects.filter(statut='rejected').count()
        
        avg_score = Recommendation.objects.aggregate(
            avg=Avg('score_pertinence')
        )['avg'] or 0
        
        # Top 5 activités recommandées
        top_activities = Recommendation.objects.values('type_activite').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Recommandations récentes
        recent_recs = Recommendation.objects.select_related('producteur').order_by(
            '-date_generation'
        )[:10]
        
        serializer = RecommendationStatsSerializer({
            'total_recommendations': total,
            'pending_count': pending,
            'executed_count': executed,
            'rejected_count': rejected,
            'avg_score': round(avg_score, 2),
            'top_activities': list(top_activities),
            'recent_recommendations': recent_recs
        })
        
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'], url_path='mahavelona/archives')
    def mahavelona_archives(self, request):
        """
        GET /api/recommendations/mahavelona/archives/?annee=2025
        POST /api/recommendations/mahavelona/archives/
        """
        if request.method == 'GET':
            archives = MahavelonaArchive.objects.all()
            annee = request.query_params.get('annee')
            if annee and str(annee).isdigit():
                archives = archives.filter(annee_reference=int(annee))
            return Response(MahavelonaArchiveSerializer(archives, many=True).data)

        serializer = MahavelonaArchiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(cree_par=request.user if request.user.is_authenticated else None)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ActiviteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les activités
    
    CRUD complet pour gérer l'historique des activités
    """
    
    queryset = Activite.objects.all()
    serializer_class = ActiviteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['type', 'description']
    ordering_fields = ['date', 'impact_score']
    ordering = ['-date']
    
    def get_queryset(self):
        """Filtre par producteur si spécifié"""
        queryset = super().get_queryset()
        
        producteur_id = self.request.query_params.get('producteur')
        if producteur_id:
            queryset = queryset.filter(producteur_id=producteur_id)
        
        type_activite = self.request.query_params.get('type')
        if type_activite:
            queryset = queryset.filter(type__icontains=type_activite)
        
        return queryset.select_related('producteur')
    
    @action(detail=False, methods=['get'], url_path='types')
    def types(self, request):
        """
        Retourne la liste des types d'activités uniques
        
        GET /api/activites/types/
        """
        types = Activite.objects.values_list('type', flat=True).distinct().order_by('type')
        
        return Response({
            'types': list(types)
        })
