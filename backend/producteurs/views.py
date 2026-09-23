from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from users.permissions import IsAdminOrReadOnly, scope_par_agence
from users.models import ActivityLog
from simple_history.utils import update_change_reason
from django.db import models, transaction
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from django.contrib.gis.geos import Point
import csv
import re
import pandas as pd
import logging
from datetime import datetime, date
from .models import Producteur, Dotation, AGR
from .cumuls import ProducteurCumulsMixin
from parcelles.models import Parcelle
from cooperatives.models import Cooperative
from formations.models import TypeFormation, Formation, TypeCertification, Certification
from .serializers import (
    ProducteurListSerializer,
    ProducteurDetailSerializer,
    ProducteurCreateUpdateSerializer,
    ProducteurStatistiquesSerializer,
    ProducteurExportSerializer,
    DotationSerializer,
    AGRSerializer
)

logger = logging.getLogger(__name__)

class ProducteurPagination(PageNumberPagination):
    """Pagination personnalisée"""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500

class ProducteurHistoriqueMixin:
    """Mixin pour l'historique"""
    @action(detail=False, methods=['get'], url_path='historique')
    def historique(self, request):
        """
        Retourne l'historique structuré des producteurs avec productions, AGR et indicateurs sociaux
        Paramètres:
        - year: année spécifique
        - start: date de début (format YYYY)
        - end: date de fin (format YYYY)
        """
        year = request.query_params.get('year')
        start_year = request.query_params.get('start')
        end_year = request.query_params.get('end')

        # Import des modèles d'historique
        try:
            from history.models import ProductionHistory, AGRHistory, SocialIndicatorHistory
        except ImportError:
            return Response({
                "error": "Les modèles d'historique ne sont pas disponibles"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Déterminer les années à interroger
        years_to_query = []
        if year:
            try:
                years_to_query = [int(year)]
            except ValueError:
                return Response({"error": "Année invalide"}, status=status.HTTP_400_BAD_REQUEST)
        elif start_year and end_year:
            try:
                start = int(start_year)
                end = int(end_year)
                years_to_query = list(range(start, end + 1))
            except ValueError:
                return Response({"error": "Années invalides"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Par défaut, les 5 dernières années
            current_year = datetime.now().year
            years_to_query = list(range(current_year - 4, current_year + 1))

        # Récupérer tous les producteurs actifs
        # #29 — Confidentialité par agence : on ne liste que les producteurs
        # visibles par l'utilisateur (scopés à son agence si non-responsable).
        producteurs = Producteur.objects.filter(actif=True).select_related('cooperative')
        producteurs, _ = scope_par_agence(request.user, producteurs)

        results = []
        
        for annee in years_to_query:
            # Récupérer les données historiques pour cette année
            productions = ProductionHistory.objects.filter(annee=annee).select_related('parcelle__producteur')
            agr_history = AGRHistory.objects.filter(annee=annee).select_related('producteur')
            social_history = SocialIndicatorHistory.objects.filter(annee=annee).select_related('producteur')

            # Créer des dictionnaires pour un accès rapide
            productions_by_prod = {}
            for prod_hist in productions:
                prod_id = prod_hist.parcelle.producteur.id
                if prod_id not in productions_by_prod:
                    productions_by_prod[prod_id] = []
                productions_by_prod[prod_id].append({
                    'culture': prod_hist.culture,
                    'quantite_kg': float(prod_hist.quantite_kg) if prod_hist.quantite_kg else 0,
                    'revenu': float(prod_hist.revenu_total) if prod_hist.revenu_total else 0
                })

            # Construire un dictionnaire pour les AGR par producteur
            agr_by_prod = {}
            for agr in agr_history:
                prod_id = agr.producteur.id
                if prod_id not in agr_by_prod:
                    agr_by_prod[prod_id] = {
                        'agr_list': [],
                        'revenu_total': 0
                    }
                
                # Ajouter l'AGR à la liste
                agr_by_prod[prod_id]['agr_list'].append({
                    'type': agr.type_agr,
                    'ordre': agr.ordre,
                    'revenu': float(agr.revenu_annuel) if agr.revenu_annuel else 0
                })
                
                # Calculer le revenu total
                if agr.revenu_annuel:
                    agr_by_prod[prod_id]['revenu_total'] += float(agr.revenu_annuel)

            # Construire un dictionnaire pour les indicateurs sociaux
            # SocialIndicatorHistory utilise un modèle EAV avec type_indicateur
            social_by_prod = {}
            
            for social in social_history:
                prod_id = social.producteur.id
                
                if prod_id not in social_by_prod:
                    social_by_prod[prod_id] = {
                        'nb_enfants_scolarises': 0,
                        'nb_enfants_non_scolarises': 0,
                        'taux_scolarisation': 0,
                        'a_assurance_sante': False,
                        'mahavelona': False
                    }
                
                # Extraire les valeurs selon le type d'indicateur
                if social.type_indicateur == 'scolarisation':
                    # valeur_numerique contient le nombre d'enfants scolarisés
                    if social.valeur_numerique is not None:
                        social_by_prod[prod_id]['nb_enfants_scolarises'] = int(social.valeur_numerique)
                elif social.type_indicateur == 'sante':
                    # valeur_booleen pour l'assurance santé
                    if social.valeur_booleen is not None:
                        social_by_prod[prod_id]['a_assurance_sante'] = social.valeur_booleen
                # Ajouter d'autres types d'indicateurs si nécessaire
            
            # Calculer les taux de scolarisation
            for prod_id in social_by_prod:
                scolarises = social_by_prod[prod_id]['nb_enfants_scolarises']
                non_scolarises = social_by_prod[prod_id]['nb_enfants_non_scolarises']
                total = scolarises + non_scolarises
                if total > 0:
                    social_by_prod[prod_id]['taux_scolarisation'] = round((scolarises / total * 100), 2)

            # Construire les résultats pour cette année
            for producteur in producteurs:
                # Vérifier si le producteur a des données pour cette année
                has_production = producteur.id in productions_by_prod
                has_agr = producteur.id in agr_by_prod
                has_social = producteur.id in social_by_prod

                # Ne retourner que les producteurs ayant au moins une donnée
                if has_production or has_agr or has_social:
                    results.append({
                        "annee": annee,
                        "producteur_id": producteur.id,
                        "producteur_code": producteur.code,
                        "producteur_nom": producteur.nom_complet,
                        "village": producteur.village or "",
                        "commune": producteur.commune or "",
                        "cooperative": producteur.cooperative.nom if producteur.cooperative else "",
                        "productions": productions_by_prod.get(producteur.id, []),
                        "agr": agr_by_prod.get(producteur.id, {}),
                        "social": social_by_prod.get(producteur.id, {})
                    })

        return Response({
            "total": len(results),
            "years": years_to_query,
            "historique": results
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='fiche')
    def fiche(self, request, pk=None):
        """Fiche récapitulative d'un producteur (#9) : toutes les données BDD
        le concernant en une seule réponse (identité, coopérative, ménage,
        parcelles, formations, certifications, dotations, AGR, historique)."""
        p = self.get_object()

        # --- Parcelles & productions ---
        parcelles = p.parcelles.all().order_by('code_parcelle')
        parcelles_data = [
            {
                'id': pa.id, 'code': pa.code_parcelle, 'type_vanille': pa.type_vanille,
                'superficie': float(pa.dimension_ha or 0),
                'nb_pieds': pa.nombre_pieds or 0,
                'estimation': float(pa.estimation_production_kg or 0),
                'certifiee': pa.certifiee if hasattr(pa, 'certifiee') else None,
                'cultures': pa.cultures_pratiquees if hasattr(pa, 'cultures_pratiquees') else None,
            }
            for pa in parcelles
        ]

        # --- Formations ---
        formations = p.formations.select_related('type_formation').order_by('-date_formation')
        formations_data = [
            {
                'type': f.type_formation.nom if f.type_formation else '',
                'date': f.date_formation, 'organisme': f.organisme,
                'lieu': f.lieu, 'certificat': f.certificat_obtenu,
            }
            for f in formations
        ]

        # --- Certifications ---
        certifications = p.certifications.select_related('type_certification').order_by('-date_obtention')
        certifications_data = [
            {
                'type': c.type_certification.nom if c.type_certification else '',
                'numero': c.numero_certificat, 'statut': c.statut,
                'date_obtention': c.date_obtention, 'date_expiration': c.date_expiration,
            }
            for c in certifications
        ]

        # --- Dotations (réutilise les cumuls du ViewSet Dotations) ---
        dotations = p.dotations.all().order_by('-annee', '-date_enregistrement') if hasattr(p, 'dotations') else []
        cumul_par_type = {}
        for d in dotations:
            cumul_par_type[d.type_dotation] = cumul_par_type.get(d.type_dotation, 0) + (d.quantite or 0)
        dotations_data = [
            {
                'type': d.get_type_dotation_display() if hasattr(d, 'get_type_dotation_display') else d.type_dotation,
                'annee': d.annee, 'quantite': d.quantite, 'details': d.details,
            }
            for d in dotations
        ]

        # --- AGR ---
        agr_data = [
            {'type_agr': row['type_agr'], 'revenu_annuel': float(row['revenu_annuel_estime'] or 0)}
            for row in p.agr_activities.values('type_agr', 'revenu_annuel_estime')
        ] if hasattr(p, 'agr_activities') else []

        # --- Historique (snapshots annuels) ---
        annees_historique = []
        if hasattr(p, 'snapshots'):
            annees_historique = sorted(p.snapshots.values_list('annee', flat=True).distinct())

        fiche = {
            'identite': {
                'code': p.code, 'nom': p.nom, 'prenom': p.prenom,
                'nom_complet': p.nom_complet, 'sexe': p.get_sexe_display(),
                'age': p.age, 'telephone': p.telephone,
                'village': p.village, 'commune': p.commune, 'fokontany': p.fokontany,
                'niveau_education': p.get_niveau_education_display(),
                'statut_matrimonial': p.get_statut_matrimonial_display(),
                'actif': p.actif, 'femme_leader': p.femme_leader,
                'paysan_relais': p.paysan_relais,
            },
            'cooperative': {
                'nom': p.cooperative.nom if p.cooperative else None,
                'code': p.cooperative.code if p.cooperative else None,
                'responsabilite': p.get_responsabilite_cooperative_display(),
                'date_adhesion': p.date_adhesion_cooperative,
            },
            'menage': {
                'nb_adultes_plus_18': p.nb_adultes_plus_18,
                'nb_enfants_scolarises': p.nb_enfants_scolarises,
                'nb_enfants_non_scolarises': p.nb_enfants_non_scolarises,
                'total_enfants': p.total_enfants,
                'taux_scolarisation': p.taux_scolarisation,
            },
            'parcelles': {
                'total': len(parcelles_data),
                'superficie_totale': round(sum(x['superficie'] for x in parcelles_data), 2),
                'estimation_totale': round(sum(x['estimation'] for x in parcelles_data), 2),
                'nb_pieds_total': sum(x['nb_pieds'] for x in parcelles_data),
                'liste': parcelles_data,
            },
            'formations': {'total': len(formations_data), 'avec_certificat': sum(1 for f in formations_data if f['certificat']), 'liste': formations_data},
            'certifications': {'total': len(certifications_data), 'liste': certifications_data},
            'dotations': {'total': len(dotations_data), 'cumul_total': sum(d.quantite or 0 for d in dotations), 'cumul_par_type': cumul_par_type, 'liste': dotations_data},
            'agr': {'total': len(agr_data), 'revenu_total': float(sum(a.get('revenu_annuel') or 0 for a in agr_data)), 'liste': agr_data},
            'annees_historique': annees_historique,
        }
        return Response(fiche, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='historique')
    def historique_detail(self, request, pk=None):
        """Retourne l'historique d'un producteur spécifique"""
        try:
            producteur = self.get_object()
            historique = producteur.history.all().order_by('-history_date')
            
            results = []
            for h in historique:
                results.append({
                    "history_id": h.history_id,
                    "history_date": str(h.history_date) if h.history_date else "",
                    "history_type": h.history_type,
                    "type_action": {'+': 'Créé', '~': 'Modifié', '-': 'Supprimé'}.get(h.history_type, 'Inconnu'),
                    "change_reason": h.history_change_reason or "",
                    "user": str(h.history_user) if h.history_user else "Automatique",
                    "code": h.code,
                    "nom": h.nom,
                    "commune": h.commune or "",
                    "village": h.village or "",
                })
            
            return Response({
                'producteur_id': producteur.id,
                'code': producteur.code,
                'nom': producteur.nom,
                'total': len(results),
                'historique': results
            })
        except Producteur.DoesNotExist:
            return Response({'error': 'Producteur non trouvé'}, status=404)

class ProducteurViewSet(ProducteurHistoriqueMixin, ProducteurCumulsMixin, viewsets.ModelViewSet):
    """ViewSet complet pour la gestion des producteurs"""
    queryset = Producteur.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = ProducteurPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'nom', 'prenom', 'telephone', 'email', 'village', 'commune']
    ordering_fields = ['code', 'nom', 'date_adhesion_cooperative', 'village', 'commune']
    ordering = ['-date_adhesion_cooperative']

    def get_queryset(self):
        """Filtre avancé des producteurs"""
        queryset = super().get_queryset()
        
        # #29 — Confidentialité par agence : les non-responsables (animateur,
        # agent de collecte) ne voient que les producteurs de leur agence
        # (via la coopérative). Admin/superviseur → tout.
        queryset, _ = scope_par_agence(self.request.user, queryset)

        actif = self.request.query_params.get('actif', None)
        if actif is not None:
            queryset = queryset.filter(actif=actif.lower() == 'true')
        
        verifie = self.request.query_params.get('verifie', None)
        if verifie is not None:
            queryset = queryset.filter(verifie=verifie.lower() == 'true')
        
        sexe = self.request.query_params.get('sexe', None)
        if sexe:
            queryset = queryset.filter(sexe=sexe.upper())
        
        femme_leader = self.request.query_params.get('femme_leader', None)
        if femme_leader is not None:
            queryset = queryset.filter(femme_leader=femme_leader.lower() == 'true')
        
        paysan_relais = self.request.query_params.get('paysan_relais', None)
        if paysan_relais is not None:
            queryset = queryset.filter(paysan_relais=paysan_relais.lower() == 'true')
        
        satellite_floraison = self.request.query_params.get('satellite_floraison', None)
        if satellite_floraison is not None:
            queryset = queryset.filter(satellite_floraison=satellite_floraison.lower() == 'true')
        
        # Filtre par type d'AGR
        agr1_type = self.request.query_params.get('agr1', None)
        if agr1_type:
            queryset = queryset.filter(agr1__icontains=agr1_type)
        
        agr2_type = self.request.query_params.get('agr2', None)
        if agr2_type:
            queryset = queryset.filter(agr2__icontains=agr2_type)
        
        village = self.request.query_params.get('village', None)
        if village:
            # Support pour plusieurs villages (séparés par virgule)
            villages = [v.strip() for v in village.split(',') if v.strip()]
            if len(villages) > 1:
                queryset = queryset.filter(village__in=villages)
            else:
                queryset = queryset.filter(village__icontains=village)
        
        commune = self.request.query_params.get('commune', None)
        if commune:
            queryset = queryset.filter(commune__icontains=commune)
            
        mahavelona = self.request.query_params.get('mahavelona', None)
        if mahavelona is not None:
            queryset = queryset.filter(mahavelona=mahavelona.lower() == 'true')

        # Filtre par agence RAMEX (via la coopérative du producteur)
        # Supporte plusieurs agences séparées par des virgules (IDs)
        agence = self.request.query_params.get('agence', None)
        if agence is not None:
            agences = [a.strip() for a in str(agence).split(',') if a.strip()]
            if agences:
                queryset = queryset.filter(cooperative__agence_id__in=agences)

        # Filtre par dotation (nouveau modèle Dotation)
        has_dotation = self.request.query_params.get('has_dotation', None)
        if has_dotation is not None and has_dotation.lower() == 'true':
            # Producteurs avec au moins une dotation
            queryset = queryset.filter(dotations__isnull=False).distinct()
        
        dotation_type = self.request.query_params.get('dotation_type', None)
        if dotation_type:
            # Filtrer par type de dotation spécifique
            # Mapper le label affiché vers la valeur du choix
            type_mapping = {
                'Kit scolaire': 'kit_scolaire',
                'Poisson': 'poisson',
                'Volaille': 'volaille',
                'Autre': 'autre',
            }
            type_value = type_mapping.get(dotation_type, dotation_type.lower().replace(' ', '_'))
            queryset = queryset.filter(dotations__type_dotation=type_value).distinct()
        
        # Legacy: filtre par champ texte dotation (pour compatibilité)
        dotation = self.request.query_params.get('dotation', None)
        if dotation is not None and dotation.lower() == 'true':
            # Filtre pour ceux qui ont reçu une dotation (champ texte non vide OU modèle Dotation)
            from django.db.models import Q
            queryset = queryset.filter(
                Q(dotations__isnull=False) | 
                (Q(dotation__isnull=False) & ~Q(dotation__exact=''))
            ).distinct()

        # Filtres âge (calculé à partir de date_naissance)
        from datetime import date
        today = date.today()
        
        age_min = self.request.query_params.get('age_min', None)
        if age_min:
            try:
                min_age = int(age_min)
                # Pour avoir au moins X ans, il faut être né avant (aujourd'hui - X ans)
                max_birth_date = today.replace(year=today.year - min_age)
                queryset = queryset.filter(date_naissance__lte=max_birth_date)
            except ValueError:
                pass
                
        age_max = self.request.query_params.get('age_max', None)
        if age_max:
            try:
                max_age = int(age_max)
                # Pour avoir au plus X ans, il faut être né après (aujourd'hui - (X+1) ans)
                min_birth_date = today.replace(year=today.year - max_age - 1)
                queryset = queryset.filter(date_naissance__gt=min_birth_date)
            except ValueError:
                pass
        
        queryset = queryset.select_related(
            'cooperative', 'cree_par', 'modifie_par',
            'desactive_par', 'verifie_par'
        ).prefetch_related(
            'agr_activities', 'dotations'
        ).annotate(
            nb_parcelles=Count('parcelles')
        )
        
        return queryset

    def get_serializer_class(self):
        """Sélection du serializer selon l'action"""
        if self.action == 'list':
            return ProducteurListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProducteurCreateUpdateSerializer
        elif self.action == 'export':
            return ProducteurExportSerializer
        return ProducteurDetailSerializer

    def create(self, request, *args, **kwargs):
        """Création d'un producteur avec validation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        producteur = serializer.instance
        detail_serializer = ProducteurDetailSerializer(
            producteur,
            context={'request': request}
        )
        
        # Enregistrer l'activité de création
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='create',
                description=f"Création du producteur {producteur.code} - {producteur.nom_complet}",
                module='Producteurs',
                object_type='Producteur',
                object_id=producteur.id,
                request=request
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """Mise à jour d'un producteur avec logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        producteur = serializer.instance
        
        # Enregistrer l'activité de modification
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Modification du producteur {producteur.code} - {producteur.nom_complet}",
                module='Producteurs',
                object_type='Producteur',
                object_id=producteur.id,
                request=request
            )
        
        detail_serializer = ProducteurDetailSerializer(
            producteur,
            context={'request': request}
        )
        return Response(detail_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Soft delete - Le producteur devient inactif"""
        producteur = self.get_object()
        if not producteur.actif:
            return Response({
                'error': 'Ce producteur est déjà inactif.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        raison = request.data.get('raison', 'Désactivation via interface')
        producteur.soft_delete(user=request.user, raison=raison)
        
        # Enregistrer l'activité de suppression
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='delete',
                description=f"Désactivation du producteur {producteur.code} - {producteur.nom_complet}. Raison: {raison}",
                module='Producteurs',
                object_type='Producteur',
                object_id=producteur.id,
                request=request
            )
        
        return Response({
            'message': f'Le producteur {producteur.code} a été désactivé avec succès.',
            'producteur': ProducteurDetailSerializer(
                producteur,
                context={'request': request}
            ).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def restaurer(self, request, pk=None):
        """Réactive un producteur désactivé"""
        producteur = self.get_object()
        if producteur.actif:
            return Response({
                'error': 'Ce producteur est déjà actif.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        producteur.restaurer()
        
        # Enregistrer l'activité de restauration
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Réactivation du producteur {producteur.code} - {producteur.nom_complet}",
                module='Producteurs',
                object_type='Producteur',
                object_id=producteur.id,
                request=request
            )
        
        return Response({
            'message': f'Le producteur {producteur.code} a été réactivé avec succès.',
            'producteur': ProducteurDetailSerializer(
                producteur,
                context={'request': request}
            ).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def verifier(self, request, pk=None):
        """Marque le profil comme vérifié"""
        producteur = self.get_object()
        if producteur.verifie:
            return Response({
                'error': 'Ce producteur est déjà vérifié.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        producteur.verifier(user=request.user)
        
        # Enregistrer l'activité de vérification
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Vérification du profil du producteur {producteur.code} - {producteur.nom_complet}",
                module='Producteurs',
                object_type='Producteur',
                object_id=producteur.id,
                request=request
            )
        
        return Response({
            'message': f'Le profil de {producteur.nom_complet} a été vérifié avec succès.',
            'producteur': ProducteurDetailSerializer(
                producteur,
                context={'request': request}
            ).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Retourne des statistiques complètes sur les producteurs.

        #29 — Confidentialité par agence : les compteurs sont calculés sur les
        seuls producteurs visibles par l'utilisateur (scopés à son agence)."""
        base = Producteur.objects.all()
        base, _ = scope_par_agence(request.user, base)
        base_actifs = base.filter(actif=True)
        total = base.count()
        actifs = base_actifs.count()
        inactifs = base.filter(actif=False).count()
        verifies = base.filter(verifie=True).count()

        par_sexe = list(
            base_actifs
            .values('sexe')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        par_village = list(
            base_actifs
            .values('village')
            .annotate(total=Count('id'))
            .order_by('-total')[:10]
        )

        par_commune = list(
            base_actifs
            .values('commune')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        # Statistiques supplémentaires
        par_cooperative = list(
            base_actifs
            .values('cooperative__nom')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        par_niveau_education = list(
            base_actifs
            .values('niveau_education')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        # Statistiques enfants
        total_enfants = base_actifs.aggregate(
            total=Sum('nb_enfants_garcons') + Sum('nb_enfants_filles')
        )['total'] or 0

        enfants_scolarises = base_actifs.aggregate(
            total=Sum('nb_enfants_scolarises')
        )['total'] or 0

        # Calculer le nombre d'enfants en âge scolaire (3-18 ans) à partir des années de naissance
        from datetime import datetime
        annee_actuelle = datetime.now().year
        enfants_en_age_scolaire = 0

        for producteur in base_actifs:
            for i in range(1, 11):  # annee_naissance_enfant_1 à annee_naissance_enfant_10
                annee_naissance = getattr(producteur, f'annee_naissance_enfant_{i}', None)
                if annee_naissance:
                    age = annee_actuelle - annee_naissance
                    if 3 <= age <= 18:
                        enfants_en_age_scolaire += 1
        taux_scolarisation = round((enfants_scolarises / enfants_en_age_scolaire * 100) if enfants_en_age_scolaire > 0 else 0, 2)
        
        # Statistiques hygiène
        avec_poubelles = base_actifs.filter(a_poubelles_triees=True).count()
        avec_wc = base_actifs.filter(wc_maison=True).count()
        eau_potable = base_actifs.filter(source_eau='robinet').count()

        # Statistiques environnement
        respecte_environnement = base_actifs.filter(pratique_tavy=False).count()
        pratique_tavy = base_actifs.filter(pratique_tavy=True).count()

        # Leadership
        femmes_leaders = base_actifs.filter(femme_leader=True).count()
        paysans_relais = base_actifs.filter(paysan_relais=True).count()
        
        stats = {
            'total': total,
            'actifs': actifs,
            'inactifs': inactifs,
            'verifies': verifies,
            'pourcentage_actifs': round((actifs / total * 100) if total > 0 else 0, 2),
            'pourcentage_verifies': round((verifies / total * 100) if total > 0 else 0, 2),
            'par_sexe': par_sexe,
            'par_village': par_village,
            'par_commune': par_commune,
            'par_cooperative': par_cooperative,
            'par_niveau_education': par_niveau_education,
            'total_enfants': total_enfants,
            'enfants_scolarises': enfants_scolarises,
            'taux_scolarisation': taux_scolarisation,
            'avec_poubelles': avec_poubelles,
            'avec_wc': avec_wc,
            'eau_potable': eau_potable,
            'respecte_environnement': respecte_environnement,
            'pratique_tavy': pratique_tavy,
            'femmes_leaders': femmes_leaders,
            'paysans_relais': paysans_relais,
        }
        
        serializer = ProducteurStatistiquesSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export CSV des producteurs"""
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="producteurs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        response.write('\ufeff')
        writer = csv.writer(response, delimiter=';')
        
        headers = [
            'Code', 'Nom', 'Prénom', 'CIN', 'Sexe', 'Date de naissance', 'Âge',
            'Téléphone', 'Email', 'Commune', 'Fokontany', 'Village',
            'Actif', 'Vérifié', 'Date adhésion'
        ]
        
        writer.writerow(headers)
        
        for prod in queryset:
            writer.writerow([
                prod.code,
                prod.nom,
                prod.prenom,
                prod.cin or '',
                prod.get_sexe_display(),
                prod.date_naissance,
                prod.age or '',
                prod.telephone,
                prod.email or '',
                prod.commune,
                prod.fokontany or '',
                prod.village,
                'Oui' if prod.actif else 'Non',
                'Oui' if prod.verifie else 'Non',
                prod.date_adhesion_cooperative,
            ])
        
        # Enregistrer l'activité d'export
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='export',
                description=f"Export CSV de {queryset.count()} producteurs",
                module='Producteurs',
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
                    'code': {'label': 'Code Producteur', 'type': 'text'},
                    'nom': {'label': 'Nom', 'type': 'text'},
                    'prenom': {'label': 'Prénom', 'type': 'text'},
                    'cin': {'label': 'CIN', 'type': 'text'},
                }
            },
            'localisation': {
                'label': 'Localisation',
                'fields': {
                    'commune': {'label': 'Commune', 'type': 'text'},
                    'fokontany': {'label': 'Fokontany', 'type': 'text'},
                    'village': {'label': 'Village', 'type': 'text'},
                }
            },
            'contact': {
                'label': 'Contact',
                'fields': {
                    'telephone': {'label': 'Téléphone', 'type': 'text'},
                    'email': {'label': 'Email', 'type': 'text'},
                }
            },
            'informations_personnelles': {
                'label': 'Informations Personnelles',
                'fields': {
                    'sexe': {'label': 'Sexe', 'type': 'choice'},
                    'date_naissance': {'label': 'Date de naissance', 'type': 'date'},
                    'age': {'label': 'Âge', 'type': 'computed'},
                    'statut_matrimonial': {'label': 'Statut matrimonial', 'type': 'choice'},
                    'niveau_education': {'label': 'Niveau d\'éducation', 'type': 'choice'},
                    'femme_leader': {'label': 'Femme leader', 'type': 'boolean'},
                }
            },
            'cooperative': {
                'label': 'Coopérative',
                'fields': {
                    'cooperative': {'label': 'Coopérative', 'type': 'foreign_key'},
                    'responsabilite_cooperative': {'label': 'Responsabilité coopérative', 'type': 'choice'},
                    'date_adhesion_cooperative': {'label': 'Date adhésion coopérative', 'type': 'date'},
                    'membre_groupement_epargne': {'label': 'Membre groupement épargne', 'type': 'boolean'},
                    'date_adhesion_groupement': {'label': 'Date adhésion groupement', 'type': 'date'},
                    'paysan_relais': {'label': 'Paysan relais', 'type': 'boolean'},
                }
            },
            'foyer': {
                'label': 'Composition du Foyer',
                'fields': {
                    'nb_adultes_plus_18': {'label': 'Adultes (+18 ans)', 'type': 'number'},
                    'nb_hommes_adultes': {'label': 'Hommes adultes', 'type': 'number'},
                    'nb_femmes_adultes': {'label': 'Femmes adultes', 'type': 'number'},
                    'personne_handicap_foyer': {'label': 'Personne handicapée dans le foyer', 'type': 'boolean'},
                }
            },
            'enfants': {
                'label': 'Enfants',
                'fields': {
                    'nb_enfants_garcons': {'label': 'Nombre de garçons', 'type': 'number'},
                    'nb_enfants_filles': {'label': 'Nombre de filles', 'type': 'number'},
                    'total_enfants': {'label': 'Total enfants', 'type': 'computed'},
                    'autres_enfants_foyer': {'label': 'Autres enfants foyer', 'type': 'number'},
                    'nb_enfants_scolarises': {'label': 'Enfants scolarisés', 'type': 'number'},
                    'nb_enfants_non_scolarises': {'label': 'Enfants non scolarisés', 'type': 'number'},
                }
            },
            'dechets': {
                'label': 'Gestion des Déchets',
                'fields': {
                    'a_poubelles_triees': {'label': 'Poubelles triées', 'type': 'boolean'},
                    'types_poubelles': {'label': 'Types de poubelles', 'type': 'text'},
                    'dechets_non_eparpilles_maison': {'label': 'Déchets non éparpillés (maison)', 'type': 'boolean'},
                    'dechets_non_eparpilles_parcelle': {'label': 'Déchets non éparpillés (parcelle)', 'type': 'boolean'},
                    'recyclage_dechets': {'label': 'Recyclage des déchets', 'type': 'boolean'},
                    'dechets_chimiques_enterres': {'label': 'Déchets chimiques enterrés', 'type': 'boolean'},
                }
            },
            'eau': {
                'label': 'Gestion de l\'Eau',
                'fields': {
                    'fosse_eaux_usees_maison': {'label': 'Fosse eaux usées (maison)', 'type': 'boolean'},
                    'fosse_eaux_usees_champ': {'label': 'Fosse eaux usées (champ)', 'type': 'boolean'},
                    'recyclage_eau_pluie': {'label': 'Recyclage eau de pluie', 'type': 'boolean'},
                    'wc_maison': {'label': 'WC maison', 'type': 'boolean'},
                    'wc_champ': {'label': 'WC champ', 'type': 'boolean'},
                    'source_eau': {'label': 'Source d\'eau', 'type': 'choice'},
                    'eau_potable': {'label': 'Eau potable', 'type': 'boolean'},
                    'fait_bouillir_eau': {'label': 'Fait bouillir l\'eau', 'type': 'boolean'},
                }
            },
            'sante': {
                'label': 'Santé',
                'fields': {
                    'type_centre_sante': {'label': 'Type de centre de santé', 'type': 'choice'},
                    'a_assurance_sante': {'label': 'Assurance santé', 'type': 'boolean'},
                }
            },
            'environnement': {
                'label': 'Environnement',
                'fields': {
                    'respecte_dina': {'label': 'Respecte les dina', 'type': 'boolean'},
                    'participe_travaux_communautaires': {'label': 'Travaux communautaires', 'type': 'boolean'},
                    'participe_protection_environnement': {'label': 'Protection environnement', 'type': 'boolean'},
                    'ne_brule_pas_foret': {'label': 'Ne brûle pas la forêt', 'type': 'boolean'},
                    'ne_coupe_pas_foret': {'label': 'Ne coupe pas la forêt', 'type': 'boolean'},
                    'ne_cultive_pas_zone_protegee': {'label': 'Ne cultive pas en zone protégée', 'type': 'boolean'},
                }
            },
            'activites': {
                'label': 'Activités',
                'fields': {
                    'pratique_chasse': {'label': 'Pratique la chasse', 'type': 'boolean'},
                    'pratique_elevage': {'label': 'Pratique l\'élevage', 'type': 'boolean'},
                    'pratique_tavy': {'label': 'Pratique le tavy', 'type': 'boolean'},
                    'pratique_peche': {'label': 'Pratique la pêche', 'type': 'boolean'},
                    'utilise_chimiques_autres_cultures': {'label': 'Utilise produits chimiques', 'type': 'boolean'},
                }
            },
            'audit': {
                'label': 'Audit',
                'fields': {
                    'actif': {'label': 'Actif', 'type': 'boolean'},
                    'verifie': {'label': 'Vérifié', 'type': 'boolean'},
                    'date_adhesion_cooperative': {'label': 'Date d\'adhésion coopérative', 'type': 'date'},
                    'date_modification': {'label': 'Date de modification', 'type': 'datetime'},
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
            'code': 'Code',
            'nom': 'Nom',
            'prenom': 'Prénom',
            'cin': 'CIN',
            'commune': 'Commune',
            'fokontany': 'Fokontany',
            'village': 'Village',
            'telephone': 'Téléphone',
            'email': 'Email',
            'sexe': 'Sexe',
            'date_naissance': 'Date de naissance',
            'age': 'Âge',
            'statut_matrimonial': 'Statut matrimonial',
            'niveau_education': 'Niveau d\'éducation',
            'femme_leader': 'Femme leader',
            'cooperative': 'Coopérative',
            'responsabilite_cooperative': 'Responsabilité',
            'date_adhesion_cooperative': 'Date adhésion coopérative',
            'membre_groupement_epargne': 'Membre groupement épargne',
            'date_adhesion_groupement': 'Date adhésion groupement',
            'paysan_relais': 'Paysan relais',
            'nb_adultes_plus_18': 'Adultes (+18)',
            'nb_hommes_adultes': 'Hommes adultes',
            'nb_femmes_adultes': 'Femmes adultes',
            'personne_handicap_foyer': 'Personne handicapée',
            'nb_enfants_garcons': 'Garçons',
            'nb_enfants_filles': 'Filles',
            'total_enfants': 'Total enfants',
            'autres_enfants_foyer': 'Autres enfants',
            'nb_enfants_scolarises': 'Scolarisés',
            'nb_enfants_non_scolarises': 'Non scolarisés',
            'a_poubelles_triees': 'Poubelles triées',
            'types_poubelles': 'Types poubelles',
            'dechets_non_eparpilles_maison': 'Déchets triés maison',
            'dechets_non_eparpilles_parcelle': 'Déchets triés parcelle',
            'recyclage_dechets': 'Recyclage',
            'dechets_chimiques_enterres': 'Déchets chimiques enterrés',
            'fosse_eaux_usees_maison': 'Fosse eaux usées maison',
            'fosse_eaux_usees_champ': 'Fosse eaux usées champ',
            'recyclage_eau_pluie': 'Recyclage eau pluie',
            'wc_maison': 'WC maison',
            'wc_champ': 'WC champ',
            'source_eau': 'Source eau',
            'eau_potable': 'Eau potable',
            'fait_bouillir_eau': 'Bouillir eau',
            'type_centre_sante': 'Centre santé',
            'a_assurance_sante': 'Assurance santé',
            'respecte_dina': 'Respecte dina',
            'participe_travaux_communautaires': 'Travaux communautaires',
            'participe_protection_environnement': 'Protection environnement',
            'ne_brule_pas_foret': 'Ne brûle pas forêt',
            'ne_coupe_pas_foret': 'Ne coupe pas forêt',
            'ne_cultive_pas_zone_protegee': 'Ne cultive pas zone protégée',
            'pratique_chasse': 'Chasse',
            'pratique_elevage': 'Élevage',
            'pratique_tavy': 'Tavy',
            'pratique_peche': 'Pêche',
            'utilise_chimiques_autres_cultures': 'Produits chimiques',
            'actif': 'Actif',
            'verifie': 'Vérifié',
            'date_adhesion_cooperative': 'Date adhésion coopérative',
            'date_modification': 'Date modification',
        }
        
        # Créer les headers
        for field in selected_fields:
            headers.append(field_labels.get(field, field))
        
        # Extraire les données
        for prod in queryset:
            row = []
            for field in selected_fields:
                value = self._get_field_value(prod, field)
                row.append(value)
            data_rows.append(row)
        
        # Export selon le format
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="producteurs_custom_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
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
                    description=f"Export CSV personnalisé de {len(data_rows)} producteurs ({len(selected_fields)} champs)",
                    module='Producteurs',
                    request=request,
                    extra_data={'fields': selected_fields, 'format': 'csv', 'count': len(data_rows)}
                )
            
            return response
        
        elif export_format == 'excel':
            import openpyxl
            from openpyxl.utils import get_column_letter
            
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Producteurs"
            
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
            response['Content-Disposition'] = f'attachment; filename="producteurs_custom_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            wb.save(response)
            
            # Enregistrer l'activité d'export personnalisé
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='export',
                    description=f"Export Excel personnalisé de {len(data_rows)} producteurs ({len(selected_fields)} champs)",
                    module='Producteurs',
                    request=request,
                    extra_data={'fields': selected_fields, 'format': 'excel', 'count': len(data_rows)}
                )
            
            return response
        
        else:
            return Response(
                {'error': 'Format non supporté. Utilisez csv ou excel'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_field_value(self, obj, field_name):
        """Récupère la valeur d'un champ avec gestion des cas spéciaux"""
        try:
            # Champs calculés
            if field_name == 'age':
                return obj.age or ''
            elif field_name == 'total_enfants':
                return obj.total_enfants
            elif field_name == 'cooperative':
                return obj.cooperative.nom if obj.cooperative else ''
            
            # Champs avec choices
            elif field_name == 'sexe':
                return obj.get_sexe_display()
            elif field_name == 'statut_matrimonial':
                return obj.get_statut_matrimonial_display() if obj.statut_matrimonial else ''
            elif field_name == 'niveau_education':
                return obj.get_niveau_education_display() if obj.niveau_education else ''
            elif field_name == 'responsabilite_cooperative':
                return obj.get_responsabilite_cooperative_display()
            elif field_name == 'source_eau':
                return obj.get_source_eau_display() if obj.source_eau else ''
            elif field_name == 'type_centre_sante':
                return obj.get_type_centre_sante_display() if obj.type_centre_sante else ''
            
            # Champs booléens
            elif isinstance(getattr(Producteur, field_name, None), models.BooleanField):
                value = getattr(obj, field_name)
                return 'Oui' if value else 'Non'
            
            # Autres champs
            else:
                value = getattr(obj, field_name, '')
                return value if value is not None else ''
                
        except AttributeError:
            return ''

    @staticmethod
    def _annee_import(request):
        """#30 — Année de campagne de l'import (param `annee`, défaut courant)."""
        from datetime import datetime as _dt
        raw = request.data.get('annee') or request.query_params.get('annee')
        try:
            annee = int(raw) if raw not in (None, '') else _dt.now().year
        except (TypeError, ValueError):
            raise ValueError("Parametre 'annee' invalide (entier attendu, ex: 2026).")
        if annee < 2000 or annee > 2100:
            raise ValueError("Parametre 'annee' hors plage (2000-2100).")
        return annee

    @action(detail=False, methods=['post'], url_path='import-multi-sheet', permission_classes=[AllowAny])
    def import_multi_sheet(self, request):
        """
        Import format multi-onglets : Producteur, Parcelle, Formation séparés
        POST /api/producteurs/import-multi-sheet/

        #30 — Paramètre optionnel `annee` (année de campagne des données,
        défaut : année courante). Les archives créées portent cette année,
        ce qui permet le réimport annuel sans écraser les années précédentes.
        """
        if 'file' not in request.FILES:
            return Response({
                'error': 'Aucun fichier fourni'
            }, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']

        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({
                'error': 'Format de fichier invalide. Utilisez .xlsx ou .xls'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Sauvegarder temporairement le fichier
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                for chunk in file.chunks():
                    tmp_file.write(chunk)
                tmp_file_path = tmp_file.name
            
            try:
                # Utiliser l'importeur multi-onglets
                from .import_multi_sheet import ExcelMultiSheetImporter
                
                importer = ExcelMultiSheetImporter(
                    tmp_file_path, user=request.user,
                    annee_archive=self._annee_import(request))
                stats = importer.run()
                stats['annee_archive'] = importer.annee_archive
                
                # Enregistrer l'activité d'import
                if request.user and request.user.is_authenticated:
                    ActivityLog.log(
                        user=request.user,
                        action='import',
                        description=f"Import Excel multi-onglets: {stats['producteurs_created']} producteurs créés, {stats['producteurs_updated']} mis à jour, {stats['parcelles_created']} parcelles créées, {stats['parcelles_updated']} mises à jour",
                        module='Producteurs',
                        request=request,
                        extra_data={
                            'filename': file.name,
                            'stats': stats
                        }
                    )
                
                return Response(stats, status=status.HTTP_201_CREATED)
            
            finally:
                # Supprimer le fichier temporaire
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)

        except ValueError as ve:
            # #30 — paramètre `annee` invalide : 400 explicite
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"❌ Erreur globale: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'Erreur lors de la lecture du fichier: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class DotationViewSet(viewsets.ModelViewSet):
    """CRUD pour les dotations (kit scolaire, poisson, volailles, etc.)"""
    queryset = Dotation.objects.select_related('producteur').all()
    serializer_class = DotationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['producteur__code', 'producteur__nom', 'producteur__prenom', 'details']
    ordering_fields = ['annee', 'date_enregistrement', 'quantite']
    ordering = ['-annee', '-date_enregistrement']

    def get_queryset(self):
        qs = super().get_queryset()

        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les dotations des producteurs de leur agence (via la coopérative).
        from users.permissions import scope_par_agence
        qs, _ = scope_par_agence(
            self.request.user, qs,
            lookup='producteur__cooperative__agence')

        producteur_id = self.request.query_params.get('producteur')
        type_dotation = self.request.query_params.get('type_dotation')
        annee = self.request.query_params.get('annee')
        from_year = self.request.query_params.get('from_year')
        to_year = self.request.query_params.get('to_year')
        if producteur_id:
            qs = qs.filter(producteur_id=producteur_id)
        if type_dotation:
            qs = qs.filter(type_dotation=type_dotation)
        if annee:
            qs = qs.filter(annee=annee)
        if from_year and str(from_year).isdigit():
            qs = qs.filter(annee__gte=int(from_year))
        if to_year and str(to_year).isdigit():
            qs = qs.filter(annee__lte=int(to_year))
        return qs

    def list(self, request, *args, **kwargs):
        """Liste des dotations + agrégats cumulés par type/total."""
        response = super().list(request, *args, **kwargs)
        queryset = self.filter_queryset(self.get_queryset())

        aggregates = queryset.values('type_dotation').annotate(
            total_quantite=Sum('quantite')
        ).order_by('type_dotation')
        cumul_par_type = {
            row['type_dotation']: int(row['total_quantite'] or 0)
            for row in aggregates
        }
        cumul_total = int(sum(cumul_par_type.values()))

        payload = response.data
        if isinstance(payload, dict) and 'results' in payload:
            payload['cumul_par_type'] = cumul_par_type
            payload['cumul_total'] = cumul_total
        else:
            payload = {
                'results': payload,
                'cumul_par_type': cumul_par_type,
                'cumul_total': cumul_total,
            }
        response.data = payload
        return response

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user if self.request and self.request.user.is_authenticated else None)

    @action(detail=False, methods=['get'], url_path='impact')
    def impact(self, request):
        """#28 — Impact des dotations sur le ménage et l'AGR.
        - Kits scolaires → taux de scolarisation des enfants (bénéficiaires vs non).
        - Volaille/poisson → revenus AGR (bénéficiaires vs non).
        Paramètre optionnel : annee.
        """
        from django.db.models import Sum
        from history.models import AGRHistory
        annee = request.query_params.get('annee')
        actifs = Producteur.objects.filter(actif=True)

        # #29 — Confidentialité par agence : l'impact compare uniquement les
        # producteurs visibles par l'utilisateur (scopés à son agence).
        actifs, _ = scope_par_agence(request.user, actifs)

        def _taux(scol, non):
            tot = (scol or 0) + (non or 0)
            return round((scol or 0) / tot * 100, 2) if tot > 0 else None

        # --- Axe 1 : kits scolaires → scolarisation (helper robuste du dashboard) ---
        dotation_qs = Dotation.objects.filter(type_dotation='kit_scolaire')
        if annee and str(annee).isdigit():
            dotation_qs = dotation_qs.filter(annee=int(annee))
        benef_kit_ids = set(dotation_qs.values_list('producteur_id', flat=True))
        grp_kit = actifs.filter(id__in=benef_kit_ids)
        grp_sans_kit = actifs.exclude(id__in=benef_kit_ids)
        ref_year = int(annee) if annee and str(annee).isdigit() else datetime.now().year

        def _axe1(grp):
            try:
                from dashboard.views import _children_schooling_stats
                s = _children_schooling_stats(grp, ref_year)
                return {
                    'nb_producteurs': grp.count(),
                    'enfants_en_age_scolaire': s['enfants_en_age_scolaire'],
                    'enfants_scolarises': s['enfants_scolarises'],
                    'enfants_non_scolarises': s['enfants_non_scolarises'],
                    'taux_scolarisation': s['taux_scolarisation'] if s['enfants_en_age_scolaire'] > 0 else None,
                    'methode': s['methode'],
                }
            except Exception:
                agg = grp.aggregate(scol=Sum('nb_enfants_scolarises'),
                                    non=Sum('nb_enfants_non_scolarises'))
                return {
                    'nb_producteurs': grp.count(),
                    'enfants_en_age_scolaire': (agg['scol'] or 0) + (agg['non'] or 0),
                    'enfants_scolarises': int(agg['scol'] or 0),
                    'enfants_non_scolarises': int(agg['non'] or 0),
                    'taux_scolarisation': _taux(agg['scol'], agg['non']),
                    'methode': 'declare',
                }

        # --- Axe 2 : volaille/poisson → revenus AGR (AGRHistory) ---
        dotation_elp = Dotation.objects.filter(type_dotation__in=['volaille', 'poisson'])
        if annee and str(annee).isdigit():
            dotation_elp = dotation_elp.filter(annee=int(annee))
        benef_elp_ids = set(dotation_elp.values_list('producteur_id', flat=True))
        agr_qs = AGRHistory.objects.filter(producteur__actif=True)
        if annee and str(annee).isdigit():
            agr_qs = agr_qs.filter(annee=int(annee))
        nb_benef_elp = actifs.filter(id__in=benef_elp_ids).count()
        nb_sans_elp = actifs.exclude(id__in=benef_elp_ids).count()
        rev_benef = agr_qs.filter(producteur_id__in=benef_elp_ids).aggregate(t=Sum('revenu_annuel'))['t'] or 0
        rev_sans = agr_qs.exclude(producteur_id__in=benef_elp_ids).aggregate(t=Sum('revenu_annuel'))['t'] or 0

        return Response({
            'annee': int(annee) if annee and str(annee).isdigit() else None,
            'kit_scolaire_vs_scolarisation': {
                'beneficiaires': _axe1(grp_kit),
                'non_beneficiaires': _axe1(grp_sans_kit),
            },
            'elevage_vs_agr': {
                'types': ['volaille', 'poisson'],
                'beneficiaires': {
                    'nb_producteurs': nb_benef_elp,
                    'revenu_agr_total': round(float(rev_benef), 2),
                    'revenu_moyen': round(float(rev_benef) / nb_benef_elp, 2) if nb_benef_elp else 0,
                },
                'non_beneficiaires': {
                    'nb_producteurs': nb_sans_elp,
                    'revenu_agr_total': round(float(rev_sans), 2),
                    'revenu_moyen': round(float(rev_sans) / nb_sans_elp, 2) if nb_sans_elp else 0,
                },
            },
        }, status=status.HTTP_200_OK)


class AGRViewSet(viewsets.ModelViewSet):
    """ViewSet for AGR (Activités Génératrices de Revenus) management"""
    queryset = AGR.objects.all()
    serializer_class = AGRSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['producteur', 'type_agr', 'active']
    search_fields = ['producteur__code', 'producteur__nom', 'type_agr']
    ordering_fields = ['ordre', 'revenu_annuel_estime', 'date_creation']
    ordering = ['producteur', 'ordre']
    
    def get_queryset(self):
        """Filter AGRs with optimized queries + village/commune (#24)."""
        queryset = super().get_queryset()
        queryset = queryset.select_related('producteur', 'enregistre_par')
        params = self.request.query_params

        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les AGR des producteurs de leur agence (via la coopérative).
        from users.permissions import scope_par_agence
        queryset, _ = scope_par_agence(
            self.request.user, queryset,
            lookup='producteur__cooperative__agence')
        village = params.get('village')
        if village:
            queryset = queryset.filter(producteur__village__icontains=village.strip())
        commune = params.get('commune')
        if commune:
            queryset = queryset.filter(producteur__commune__icontains=commune.strip())
        return queryset
    
    def perform_create(self, serializer):
        """Set enregistre_par to current user on creation"""
        serializer.save(enregistre_par=self.request.user)
        
        # Log activity
        agr = serializer.instance
        if self.request.user and self.request.user.is_authenticated:
            ActivityLog.log(
                user=self.request.user,
                action='create',
                description=f"Création AGR {agr.type_agr} pour producteur {agr.producteur.code}",
                module='AGR',
                object_type='AGR',
                object_id=agr.id,
                request=self.request
            )
    
    def perform_update(self, serializer):
        """Log update activity"""
        agr = serializer.save()
        
        if self.request.user and self.request.user.is_authenticated:
            ActivityLog.log(
                user=self.request.user,
                action='update',
                description=f"Modification AGR {agr.type_agr} pour producteur {agr.producteur.code}",
                module='AGR',
                object_type='AGR',
                object_id=agr.id,
                request=self.request
            )
    
    def perform_destroy(self, instance):
        """Log delete activity"""
        if self.request.user and self.request.user.is_authenticated:
            ActivityLog.log(
                user=self.request.user,
                action='delete',
                description=f"Suppression AGR {instance.type_agr} pour producteur {instance.producteur.code}",
                module='AGR',
                object_type='AGR',
                object_id=instance.id,
                request=self.request
            )
        super().perform_destroy(instance)


    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get AGR statistics
        GET /api/agr/stats/

        Filtres optionnels (multi-sélection possible) :
        - village, commune : filtrent par producteur
        - produit avec les mêmes paramètres que la liste
        """
        # ---- Filtres communs (réutilisés pour toutes les agrégations) ----
        villagers = request.query_params.getlist('village')
        communes = request.query_params.getlist('commune')
        villages_clean = [v for v in villagers if v]
        communes_clean = [c for c in communes if c]

        qs = AGR.objects.filter(active=True)
        if villages_clean:
            qs = qs.filter(producteur__village__in=villages_clean)
        if communes_clean:
            qs = qs.filter(producteur__commune__in=communes_clean)

        # ---- Total AGRs ----
        total_agr = qs.count()

        # ---- AGRs by type ----
        by_type = {}
        type_counts = qs.values('type_agr').annotate(
            count=Count('id')
        ).order_by('-count')

        for item in type_counts:
            by_type[item['type_agr']] = item['count']

        # ---- Total revenue (global) + par type ----
        total_revenue = qs.aggregate(
            total=Sum('revenu_annuel_estime')
        )['total'] or 0

        total_revenue_by_type = {}
        rev_by_type = qs.values('type_agr').annotate(
            total_revenu=Sum('revenu_annuel_estime')
        )
        for item in rev_by_type:
            if item['total_revenu']:
                total_revenue_by_type[item['type_agr']] = float(item['total_revenu'])

        # ---- Average revenue by type ----
        average_revenue_by_type = {}
        avg_by_type = qs.values('type_agr').annotate(
            avg_revenue=Avg('revenu_annuel_estime')
        )

        for item in avg_by_type:
            if item['avg_revenue']:
                average_revenue_by_type[item['type_agr']] = float(item['avg_revenue'])

        # ---- Producteurs avec AGR ----
        producteurs_with_agr = qs.values('producteur').distinct().count()

        # ---- Producteurs avec multiple AGRs ----
        producteurs_with_multiple = qs.values('producteur').annotate(
            agr_count=Count('id')
        ).filter(agr_count__gt=1).count()
        
        # Top 10 producteurs by AGR revenue
        top_producteurs = []
        top_prods = Producteur.objects.annotate(
            total_agr_revenue=Sum('agr_activities__revenu_annuel_estime', filter=Q(agr_activities__active=True)),
            agr_count=Count('agr_activities', filter=Q(agr_activities__active=True))
        ).filter(
            total_agr_revenue__isnull=False
        ).order_by('-total_agr_revenue')[:10]
        
        for prod in top_prods:
            top_producteurs.append({
                'id': prod.id,
                'code': prod.code,
                'nom': prod.nom_complet,
                'agr_count': prod.agr_count,
                'total_revenue': float(prod.total_agr_revenue) if prod.total_agr_revenue else 0
            })
        
        stats = {
            'total_agr': total_agr,
            'by_type': by_type,
            'total_revenue': float(total_revenue),
            'total_revenue_by_type': total_revenue_by_type,
            'average_revenue_by_type': average_revenue_by_type,
            'producteurs_with_agr': producteurs_with_agr,
            'producteurs_with_multiple_agr': producteurs_with_multiple,
            'top_producteurs': top_producteurs,
            'filtres_appliques': bool(villages_clean or communes_clean),
        }
        
        # Log activity
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='view',
                description="Consultation des statistiques AGR",
                module='AGR',
                request=request
            )
        
        return Response(stats)
