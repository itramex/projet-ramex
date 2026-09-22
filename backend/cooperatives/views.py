from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminOrReadOnly
from users.models import ActivityLog
from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractYear, ExtractMonth, Coalesce
from django.db.models import DecimalField
from django.http import HttpResponse
from django.utils import timezone
import csv
import logging

from .models import Cooperative
from .serializers import (
    CooperativeListSerializer,
    CooperativeDetailSerializer,
    CooperativeCreateUpdateSerializer
)

logger = logging.getLogger(__name__)


class CooperativeViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des coopératives
    """
    queryset = Cooperative.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'nom', 'sigle', 'commune', 'village']
    ordering_fields = ['code', 'nom', 'date_creation', 'nombre_membres']
    ordering = ['-date_enregistrement']

    def get_queryset(self):
        queryset = super().get_queryset().select_related('cree_par', 'modifie_par').annotate(
            _nb_producteurs_actifs=Count(
                'producteurs', filter=Q(producteurs__actif=True), distinct=True
            ),
            _nb_hommes_actifs=Count(
                'producteurs',
                filter=Q(producteurs__actif=True, producteurs__sexe='M'),
                distinct=True,
            ),
            _nb_femmes_actifs=Count(
                'producteurs',
                filter=Q(producteurs__actif=True, producteurs__sexe='F'),
                distinct=True,
            ),
            _superficie_totale=Coalesce(
                Sum(
                    'producteurs__parcelles__dimension_ha',
                    filter=Q(producteurs__actif=True),
                ),
                0,
                output_field=DecimalField(max_digits=15, decimal_places=2),
            ),
        )

        # #29 — Confidentialité par agence : les non-responsables (animateur,
        # agent de collecte) ne voient que les coopératives de leur agence.
        from users.permissions import scope_par_agence
        queryset, _ = scope_par_agence(
            self.request.user, queryset, lookup='agence')

        # Filtre actif/inactif
        active = self.request.query_params.get('active', None)
        if active is not None:
            queryset = queryset.filter(active=active.lower() == 'true')
        
        # Filtre par région
        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(region__icontains=region)
        
        # Filtre par commune
        commune = self.request.query_params.get('commune', None)
        if commune:
            queryset = queryset.filter(commune__icontains=commune)

        # Filtre par village (village coop ou villages membres)
        village = self.request.query_params.get('village', None)
        if village:
            queryset = queryset.filter(
                Q(village__icontains=village) | Q(producteurs__village__icontains=village)
            ).distinct()

        # Filtre présence de responsables
        has_responsables = self.request.query_params.get('has_responsables', None)
        if has_responsables is not None and str(has_responsables).lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(
                producteurs__actif=True
            ).exclude(
                producteurs__responsabilite_cooperative='aucune'
            ).distinct()
        
        return queryset.order_by('-date_enregistrement')

    def get_serializer_class(self):
        if self.action == 'list':
            return CooperativeListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CooperativeCreateUpdateSerializer
        return CooperativeDetailSerializer

    def create(self, request, *args, **kwargs):
        logger.debug(f"📥 Création coopérative - Données reçues: {request.data}")
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            logger.debug(f"✅ Validation OK")
            self.perform_create(serializer)
            
            cooperative = serializer.instance
            detail_serializer = CooperativeDetailSerializer(
                cooperative,
                context={'request': request}
            )
            
            logger.debug(f"✅ Coopérative créée: {cooperative.id} - {cooperative.code}")
            
            # Enregistrer l'activité de création
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='create',
                    description=f"Création de la coopérative {cooperative.code} - {cooperative.nom}",
                    module='Coopératives',
                    object_type='Cooperative',
                    object_id=cooperative.id,
                    request=request
                )
            
            headers = self.get_success_headers(serializer.data)
            return Response(
                detail_serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
            logger.error(f"❌ Erreur création: {str(e)}")
            logger.error(f"❌ Erreurs validation: {serializer.errors}")
            raise

    def update(self, request, *args, **kwargs):
        """Mise à jour d'une coopérative avec logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        cooperative = serializer.instance
        
        # Enregistrer l'activité de modification
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Modification de la coopérative {cooperative.code} - {cooperative.nom}",
                module='Coopératives',
                object_type='Cooperative',
                object_id=cooperative.id,
                request=request
            )
        
        detail_serializer = CooperativeDetailSerializer(
            cooperative,
            context={'request': request}
        )
        return Response(detail_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Suppression d'une coopérative avec logging"""
        cooperative = self.get_object()
        cooperative_code = cooperative.code
        cooperative_nom = cooperative.nom
        cooperative_id = cooperative.id
        
        self.perform_destroy(cooperative)
        
        # Enregistrer l'activité de suppression
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='delete',
                description=f"Suppression de la coopérative {cooperative_code} - {cooperative_nom}",
                module='Coopératives',
                object_type='Cooperative',
                object_id=cooperative_id,
                request=request
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques sur les coopératives"""
        total = Cooperative.objects.count()
        actives = Cooperative.objects.filter(active=True).count()
        
        # Agrégation DB au lieu de boucles Python
        from producteurs.models import Producteur
        from parcelles.models import Parcelle
        
        total_producteurs = Producteur.objects.filter(
            actif=True, cooperative__active=True
        ).count()
        
        superficie_totale = Parcelle.objects.filter(
            producteur__actif=True, producteur__cooperative__active=True
        ).aggregate(total=Sum('dimension_ha'))['total'] or 0
        
        par_region = list(
            Cooperative.objects.filter(active=True)
            .values('region')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        par_commune = list(
            Cooperative.objects.filter(active=True)
            .values('commune')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        stats = {
            'total': total,
            'actives': actives,
            'inactives': total - actives,
            'total_producteurs': total_producteurs,
            'superficie_totale_ha': round(superficie_totale, 2),
            'par_region': par_region,
            'par_commune': par_commune,
        }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export CSV des coopératives"""
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="cooperatives_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        response.write('\ufeff')
        
        writer = csv.writer(response, delimiter=';')
        headers = [
            'Code', 'Nom', 'Sigle', 'Région', 'District', 'Commune', 'Village',
            'Téléphone', 'Email', 'Nombre membres', 'Hommes', 'Femmes',
            'Producteurs', 'Superficie (Ha)', 'Active', 'Date création'
        ]
        writer.writerow(headers)
        
        for coop in queryset:
            nb_producteurs = coop.producteurs.filter(actif=True).count()
            superficie = coop.producteurs.filter(actif=True).aggregate(
                total=Sum('parcelles__dimension_ha')
            )['total'] or 0
            
            writer.writerow([
                coop.code,
                coop.nom,
                coop.sigle,
                coop.region,
                coop.district,
                coop.commune,
                coop.village,
                coop.telephone,
                coop.email,
                coop.nombre_membres,
                coop.nombre_hommes,
                coop.nombre_femmes,
                nb_producteurs,
                round(superficie, 2),
                'Oui' if coop.active else 'Non',
                coop.date_creation,
            ])
        
        # Enregistrer l'activité d'export
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='export',
                description=f"Export CSV de {queryset.count()} coopératives",
                module='Coopératives',
                request=request
            )
        
        return response

    @action(detail=True, methods=['get'])
    def membres(self, request, pk=None):
        """Liste des membres d'une coopérative"""
        cooperative = self.get_object()
        from producteurs.serializers import ProducteurListSerializer
        
        membres = cooperative.producteurs.filter(actif=True).order_by('nom', 'prenom')
        serializer = ProducteurListSerializer(membres, many=True)
        
        return Response({
            'cooperative': cooperative.nom,
            'nombre_membres': membres.count(),
            'membres': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='adhesions')
    def adhesions(self, request, pk=None):
        cooperative = self.get_object()
        granularite = (request.query_params.get('granularite') or 'annee').lower()
        actif_param = request.query_params.get('actif', 'true')
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        qs = cooperative.producteurs.filter(date_adhesion_cooperative__isnull=False)
        if actif_param is not None:
            val = str(actif_param).lower()
            if val in ('true', '1', 'yes', 'y'):
                qs = qs.filter(actif=True)
            elif val in ('false', '0', 'no', 'n'):
                qs = qs.filter(actif=False)

        if start and start.isdigit():
            qs = qs.filter(date_adhesion_cooperative__year__gte=int(start))
        if end and end.isdigit():
            qs = qs.filter(date_adhesion_cooperative__year__lte=int(end))

        total = qs.count()

        if granularite == 'mois':
            data = (
                qs.annotate(
                    annee=ExtractYear('date_adhesion_cooperative'),
                    mois=ExtractMonth('date_adhesion_cooperative'),
                )
                .values('annee', 'mois')
                .annotate(count=Count('id'))
                .order_by('annee', 'mois')
            )
            series = list(data)
            resp = {
                'cooperative_id': cooperative.id,
                'granularite': 'mois',
                'total': total,
                'series': series,
            }
            if start and start.isdigit():
                resp['start'] = int(start)
            if end and end.isdigit():
                resp['end'] = int(end)
            return Response(resp)

        data = (
            qs.annotate(annee=ExtractYear('date_adhesion_cooperative'))
            .values('annee')
            .annotate(count=Count('id'))
            .order_by('annee')
        )
        series_map = {row['annee']: row['count'] for row in data}

        if series_map:
            min_year = min(series_map.keys())
            max_year = max(series_map.keys())
        else:
            min_year = int(start) if start and start.isdigit() else None
            max_year = int(end) if end and end.isdigit() else None

        if start and start.isdigit():
            min_year = int(start) if min_year is None else max(min_year, int(start))
        if end and end.isdigit():
            max_year = int(end) if max_year is None else min(max_year, int(end))

        series = []
        if min_year is not None and max_year is not None and max_year >= min_year:
            for y in range(min_year, max_year + 1):
                series.append({'annee': y, 'count': series_map.get(y, 0)})
        else:
            series = [{'annee': row['annee'], 'count': row['count']} for row in data]

        resp = {
            'cooperative_id': cooperative.id,
            'granularite': 'annee',
            'total': total,
            'series': series,
        }
        if min_year is not None:
            resp['start'] = min_year
        if max_year is not None:
            resp['end'] = max_year
        return Response(resp)
