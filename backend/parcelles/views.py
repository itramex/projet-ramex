from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from users.permissions import IsAdminOrReadOnly
from users.models import ActivityLog
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Sum, Avg, Count
from django.http import HttpResponse
from django.utils import timezone
import csv
import logging

from .models import Parcelle
from .serializers import (
    ParcelleListSerializer,
    ParcelleDetailSerializer,
    ParcelleCreateUpdateSerializer,
    ParcelleGeoJSONSerializer
)

logger = logging.getLogger(__name__)


class ParcellePagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = 'page_size'
    max_page_size = 500


class ParcelleViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des parcelles avec support PostGIS"""
    queryset = Parcelle.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = ParcellePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code_parcelle', 'localisation', 'producteur__nom', 'producteur__code']
    ordering_fields = ['numero_parcelle', 'dimension_ha', 'nombre_pieds', 'date_enregistrement']
    ordering = ['-date_enregistrement']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('producteur')

        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les parcelles des producteurs de leur agence (via la coopérative).
        from users.permissions import scope_par_agence
        queryset, _ = scope_par_agence(self.request.user, queryset,
                                       lookup='producteur__cooperative__agence')
        
        # Filtre par producteur
        producteur = self.request.query_params.get('producteur', None)
        if producteur:
            if ',' in producteur:
                producteur_ids = [pid for pid in producteur.split(',') if pid.isdigit()]
                queryset = queryset.filter(producteur_id__in=producteur_ids)
            else:
                queryset = queryset.filter(producteur_id=producteur)
        
        # Filtre actif/inactif
        active = self.request.query_params.get('active', None)
        if active is not None:
            queryset = queryset.filter(active=active.lower() == 'true')
        
        # Filtre certifiée
        certifiee = self.request.query_params.get('certifiee', None)
        if certifiee is not None:
            certifiee_values = [c.strip().lower() for c in str(certifiee).split(',') if c.strip()]
            if len(certifiee_values) == 1:
                queryset = queryset.filter(certifiee=certifiee_values[0] == 'true')
            elif len(certifiee_values) > 1:
                bool_values = []
                for val in certifiee_values:
                    if val in ('true', '1', 'yes'):
                        bool_values.append(True)
                    elif val in ('false', '0', 'no'):
                        bool_values.append(False)
                if bool_values:
                    queryset = queryset.filter(certifiee__in=bool_values)
        
        # Filtre par type de vanille
        type_vanille = self.request.query_params.get('type_vanille', None)
        if type_vanille:
            type_vanille_values = [t.strip() for t in str(type_vanille).split(',') if t.strip()]
            if len(type_vanille_values) > 1:
                queryset = queryset.filter(type_vanille__in=type_vanille_values)
            else:
                queryset = queryset.filter(type_vanille=type_vanille_values[0])
        
        # Filtre par village (localisation) - supporte la sélection multiple
        village = self.request.query_params.get('village', None)
        if village:
            if ',' in village:
                village_list = [v.strip() for v in village.split(',') if v.strip()]
                queryset = queryset.filter(producteur__village__in=village_list)
            else:
                queryset = queryset.filter(producteur__village=village)

        # Filtre multi-cultures pratiquées — matche la liste JSON `cultures_pratiquees`
        # ET la culture principale (les parcelles anciennes n'ont que `culture_principale`).
        cultures_pratiquees = self.request.query_params.get('cultures_pratiquees', None)
        if cultures_pratiquees:
            cultures = [c.strip().lower() for c in str(cultures_pratiquees).split(',') if c.strip()]
            if cultures:
                from django.db.models import Q as _Q
                q_cultures = _Q(culture_principale__in=cultures)
                for culture in cultures:
                    # JSONField (PostgreSQL) : lignes dont la liste contient la culture
                    q_cultures |= _Q(cultures_pratiquees__contains=[culture])
                queryset = queryset.filter(q_cultures)

        # Filtre qualité GPS (coordonnées absentes)
        gps_missing = self.request.query_params.get('gps_missing', None)
        if gps_missing is not None and str(gps_missing).lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(
                point__isnull=True,
                gps_latitude__isnull=True,
                gps_longitude__isnull=True
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ParcelleListSerializer
        elif self.action == 'geojson':
            return ParcelleGeoJSONSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ParcelleCreateUpdateSerializer
        return ParcelleDetailSerializer
    
    def create(self, request, *args, **kwargs):
        logger.debug(f"📥 Création parcelle - Données reçues: {request.data}")
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            parcelle = serializer.instance
            
            detail_serializer = ParcelleDetailSerializer(
                parcelle,
                context={'request': request}
            )
            
            logger.debug(f"✅ Parcelle créée: {parcelle.id} - {parcelle.code_parcelle}")
            
            # Enregistrer l'activité de création
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='create',
                    description=f"Création de la parcelle {parcelle.code_parcelle} pour {parcelle.producteur_nom}",
                    module='Parcelles',
                    object_type='Parcelle',
                    object_id=parcelle.id,
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
        """Mise à jour d'une parcelle avec logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        parcelle = serializer.instance
        
        # Enregistrer l'activité de modification
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Modification de la parcelle {parcelle.code_parcelle}",
                module='Parcelles',
                object_type='Parcelle',
                object_id=parcelle.id,
                request=request
            )
        
        detail_serializer = ParcelleDetailSerializer(
            parcelle,
            context={'request': request}
        )
        return Response(detail_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Suppression d'une parcelle avec logging"""
        parcelle = self.get_object()
        parcelle_code = parcelle.code_parcelle
        parcelle_id = parcelle.id
        producteur_nom = parcelle.producteur_nom
        
        self.perform_destroy(parcelle)
        
        # Enregistrer l'activité de suppression
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='delete',
                description=f"Suppression de la parcelle {parcelle_code} de {producteur_nom}",
                module='Parcelles',
                object_type='Parcelle',
                object_id=parcelle_id,
                request=request
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def geojson(self, request):
        """✅ Endpoint GeoJSON pour affichage carte"""
        queryset = self.filter_queryset(self.get_queryset()).filter(point__isnull=False)
        serializer = ParcelleGeoJSONSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """✅ Trouver les parcelles proches d'un point GPS"""
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        radius_km = float(request.query_params.get('radius', 10))
        
        if not lat or not lon:
            return Response(
                {'error': 'Paramètres lat et lon requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            point = Point(float(lon), float(lat), srid=4326)
            parcelles = (
                Parcelle.objects.filter(point__isnull=False)
                .annotate(distance=Distance('point', point))
                .filter(point__distance_lte=(point, D(km=radius_km)))
                .order_by('distance')[:20]
            )
            
            serializer = ParcelleListSerializer(parcelles, many=True, context={'request': request})
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques sur les parcelles"""
        queryset = self.filter_queryset(self.get_queryset())
        
        total = queryset.count()
        total_superficie = queryset.aggregate(Sum('dimension_ha'))['dimension_ha__sum'] or 0
        total_pieds = queryset.aggregate(Sum('nombre_pieds'))['nombre_pieds__sum'] or 0
        moyenne_pieds_ha = queryset.aggregate(Avg('nombre_pieds'))['nombre_pieds__avg'] or 0
        
        # Statistiques géographiques
        avec_gps = queryset.filter(point__isnull=False).count()
        
        par_type_vanille = list(
            queryset.values('type_vanille')
            .annotate(
                count=Count('id'),
                superficie=Sum('dimension_ha'),
                pieds=Sum('nombre_pieds')
            )
            .order_by('-count')
        )
        
        certifiees = queryset.filter(certifiee=True).count()
        par_certification = list(
            queryset.filter(certifiee=True)
            .values('type_certification')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        stats = {
            'total': total,
            'total_superficie_ha': float(total_superficie),
            'total_pieds': total_pieds,
            'moyenne_pieds_ha': round(float(moyenne_pieds_ha), 2),
            'avec_gps': avec_gps,
            'sans_gps': total - avec_gps,
            'certifiees': certifiees,
            'non_certifiees': total - certifiees,
            'par_type_vanille': par_type_vanille,
            'par_certification': par_certification,
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export CSV des parcelles"""
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="parcelles_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        response.write('\ufeff')
        
        writer = csv.writer(response, delimiter=';')
        headers = [
            'Code Parcelle', 'N° Parcelle', 'Producteur', 'Code Producteur',
            'Localisation', 'Latitude', 'Longitude', 'Dimension (Ha)', 'Nombre Pieds',
            'Type Vanille', 'Année Plantation', 'Estimation Production (kg)',
            'Type Propriété', 'Certifiée', 'Type Certification', 'Active'
        ]
        writer.writerow(headers)
        
        for parcelle in queryset:
            writer.writerow([
                parcelle.code_parcelle,
                parcelle.numero_parcelle,
                parcelle.producteur_nom,
                parcelle.producteur.code,
                parcelle.localisation,
                parcelle.latitude or '',
                parcelle.longitude or '',
                parcelle.dimension_ha,
                parcelle.nombre_pieds,
                parcelle.get_type_vanille_display(),
                parcelle.annee_plantation or '',
                parcelle.estimation_production_kg,
                parcelle.get_type_propriete_display(),
                'Oui' if parcelle.certifiee else 'Non',
                parcelle.get_type_certification_display() if parcelle.type_certification else '',
                'Oui' if parcelle.active else 'Non',
            ])
        
        # Enregistrer l'activité d'export
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='export',
                description=f"Export CSV de {queryset.count()} parcelles",
                module='Parcelles',
                request=request
            )
        
        return response

    @action(detail=False, methods=['get'])
    def available_fields(self, request):
        """Retourne la liste des champs disponibles pour l'extraction avec leurs métadonnées"""
        
        # Définir les groupes de champs avec leurs métadonnées
        field_groups = {
            'identification': {
                'label': 'Identification',
                'fields': {
                    'code_parcelle': {'label': 'Code parcelle', 'type': 'text'},
                    'numero_parcelle': {'label': 'Numéro parcelle', 'type': 'number'},
                    'producteur': {'label': 'Producteur', 'type': 'foreign_key'},
                }
            },
            'localisation': {
                'label': 'Localisation',
                'fields': {
                    'localisation': {'label': 'Localisation (Fokontany)', 'type': 'text'},
                    'gps_latitude': {'label': 'Latitude GPS', 'type': 'number'},
                    'gps_longitude': {'label': 'Longitude GPS', 'type': 'number'},
                }
            },
            'dimensions': {
                'label': 'Dimensions',
                'fields': {
                    'dimension_ha': {'label': 'Superficie (Ha)', 'type': 'number'},
                    'superficie_m2': {'label': 'Superficie (m²)', 'type': 'computed'},
                }
            },
            'culture_vanille': {
                'label': 'Culture de Vanille',
                'fields': {
                    'nombre_pieds': {'label': 'Nombre de pieds', 'type': 'number'},
                    'annee_plantation': {'label': 'Année de plantation', 'type': 'number'},
                    'age_parcelle': {'label': 'Âge de la parcelle', 'type': 'computed'},
                    'type_vanille': {'label': 'Type de vanille', 'type': 'choice'},
                    'estimation_production_kg': {'label': 'Estimation production (kg)', 'type': 'number'},
                }
            },
            'caracteristiques': {
                'label': 'Caractéristiques',
                'fields': {
                    'culture_principale': {'label': 'Culture principale', 'type': 'choice'},
                    'cultures_pratiquees': {'label': 'Cultures pratiquées', 'type': 'list'},
                    'cultures_autour': {'label': 'Cultures autour', 'type': 'text'},
                    'profil_parcelle': {'label': 'Profil de la parcelle', 'type': 'choice'},
                    'distance_habitation': {'label': 'Distance habitation', 'type': 'choice'},
                }
            },
            'propriete': {
                'label': 'Propriété',
                'fields': {
                    'type_propriete': {'label': 'Type de propriété', 'type': 'choice'},
                }
            },
            'certification': {
                'label': 'Certification',
                'fields': {
                    'certifiee': {'label': 'Parcelle certifiée', 'type': 'boolean'},
                    'type_certification': {'label': 'Type de certification', 'type': 'choice'},
                }
            },
            'statut': {
                'label': 'Statut',
                'fields': {
                    'active': {'label': 'Active', 'type': 'boolean'},
                    'date_enregistrement': {'label': 'Date enregistrement', 'type': 'datetime'},
                    'date_modification': {'label': 'Date modification', 'type': 'datetime'},
                }
            }
        }
        
        return Response(field_groups)

    @action(detail=False, methods=['post'])
    def export_custom(self, request):
        """Export personnalisé avec sélection de champs"""
        selected_fields = request.data.get('fields', [])
        export_format = request.data.get('format', 'csv')  # csv ou excel
        
        if not selected_fields:
            return Response(
                {'error': 'Veuillez sélectionner au moins un champ'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Préparer les données
        data_rows = []
        headers = []
        
        # Map des champs vers leurs labels
        field_labels = {
            'code_parcelle': 'Code parcelle',
            'numero_parcelle': 'N° parcelle',
            'producteur': 'Producteur',
            'localisation': 'Localisation',
            'gps_latitude': 'Latitude',
            'gps_longitude': 'Longitude',
            'dimension_ha': 'Superficie (Ha)',
            'superficie_m2': 'Superficie (m²)',
            'nombre_pieds': 'Nombre de pieds',
            'annee_plantation': 'Année plantation',
            'age_parcelle': 'Âge parcelle',
            'type_vanille': 'Type vanille',
            'estimation_production_kg': 'Production estimée (kg)',
            'culture_principale': 'Culture principale',
            'cultures_pratiquees': 'Cultures pratiquées',
            'cultures_autour': 'Cultures autour',
            'profil_parcelle': 'Profil parcelle',
            'distance_habitation': 'Distance habitation',
            'type_propriete': 'Type propriété',
            'certifiee': 'Certifiée',
            'type_certification': 'Type certification',
            'active': 'Active',
            'date_enregistrement': 'Date enregistrement',
            'date_modification': 'Date modification',
        }
        
        # Créer les headers
        for field in selected_fields:
            headers.append(field_labels.get(field, field))
        
        # Extraire les données
        for parcelle in queryset:
            row = []
            for field in selected_fields:
                value = self._get_parcelle_field_value(parcelle, field)
                row.append(value)
            data_rows.append(row)
        
        # Export selon le format
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="parcelles_custom_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            response.write('\ufeff')  # BOM pour Excel
            
            writer = csv.writer(response, delimiter=';')
            writer.writerow(headers)
            for row in data_rows:
                writer.writerow(row)
            
            # Enregistrer l'activité d'export personnalisé
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='export',
                    description=f"Export CSV personnalisé de {len(data_rows)} parcelles ({len(selected_fields)} champs)",
                    module='Parcelles',
                    request=request,
                    extra_data={'fields': selected_fields, 'format': 'csv', 'count': len(data_rows)}
                )
            
            return response
        
        elif export_format == 'excel':
            import openpyxl
            
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Parcelles"
            
            # Écrire les headers
            for idx, header in enumerate(headers, 1):
                ws.cell(row=1, column=idx, value=header)
            
            # Écrire les données
            for row_idx, row_data in enumerate(data_rows, 2):
                for col_idx, value in enumerate(row_data, 1):
                    ws.cell(row=row_idx, column=col_idx, value=value)
            
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="parcelles_custom_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            wb.save(response)
            
            # Enregistrer l'activité d'export personnalisé
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='export',
                    description=f"Export Excel personnalisé de {len(data_rows)} parcelles ({len(selected_fields)} champs)",
                    module='Parcelles',
                    request=request,
                    extra_data={'fields': selected_fields, 'format': 'excel', 'count': len(data_rows)}
                )
            
            return response
        
        else:
            return Response(
                {'error': 'Format non supporté. Utilisez csv ou excel'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_parcelle_field_value(self, obj, field_name):
        """Récupère la valeur d'un champ avec gestion des cas spéciaux"""
        try:
            # Champs calculés
            if field_name == 'age_parcelle':
                return obj.age_parcelle or ''
            elif field_name == 'superficie_m2':
                return obj.superficie_m2 or ''
            elif field_name == 'producteur':
                return obj.producteur_nom
            
            # Champs liste (JSONField)
            elif field_name == 'cultures_pratiquees':
                cultures = obj.cultures_pratiquees or []
                if isinstance(cultures, list):
                    # Convertir les codes en labels
                    culture_labels = {
                        'vanille': 'Vanille',
                        'cafe': 'Café',
                        'girofle': 'Girofle',
                        'autre': 'Autre'
                    }
                    labels = [culture_labels.get(c, c) for c in cultures]
                    return ', '.join(labels) if labels else ''
                return str(cultures)
            
            # Champs avec choices
            elif field_name == 'type_vanille':
                return obj.get_type_vanille_display()
            elif field_name == 'culture_principale':
                return obj.get_culture_principale_display()
            elif field_name == 'profil_parcelle':
                return obj.get_profil_parcelle_display() if obj.profil_parcelle else ''
            elif field_name == 'distance_habitation':
                return obj.get_distance_habitation_display() if obj.distance_habitation else ''
            elif field_name == 'type_propriete':
                return obj.get_type_propriete_display()
            elif field_name == 'type_certification':
                return obj.get_type_certification_display() if obj.type_certification else ''
            
            # Champs booléens
            elif field_name in ['certifiee', 'active']:
                value = getattr(obj, field_name)
                return 'Oui' if value else 'Non'
            
            # Autres champs
            else:
                value = getattr(obj, field_name, '')
                return value if value is not None else ''
                
        except AttributeError:
            return ''
