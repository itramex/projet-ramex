from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import CanManageCertificationDD
from users.models import ActivityLog
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.db.models.functions import ExtractYear
from .models import (
    TypeFormation, Formation, TypeCertification, Certification,
    AuditCertification, NonConformite, ActiviteCertification,
)
from .serializers import (
    TypeFormationSerializer, FormationSerializer, FormationListSerializer,
    TypeCertificationSerializer, CertificationSerializer, CertificationListSerializer,
    AuditCertificationSerializer, NonConformiteSerializer, ActiviteCertificationSerializer,
)


class TypeFormationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les types de formations"""
    queryset = TypeFormation.objects.filter(actif=True)
    serializer_class = TypeFormationSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'description']
    ordering_fields = ['nom', 'duree_jours', 'date_creation']
    ordering = ['nom']


class FormationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les formations des producteurs"""
    queryset = Formation.objects.select_related('producteur', 'type_formation').all()
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'producteur': ['exact', 'in'],
        'type_formation': ['exact', 'in'], 
        'certificat_obtenu': ['exact'],
        'date_formation': ['exact', 'gte', 'lte']
    }
    search_fields = ['producteur__code', 'producteur__nom', 'producteur__prenom', 'lieu', 'organisme']
    ordering_fields = ['date_formation', 'date_enregistrement']
    ordering = ['-date_formation']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return FormationListSerializer
        return FormationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        producteurs_in = params.get('producteur__in')
        if producteurs_in:
            prod_ids = [pid.strip() for pid in producteurs_in.split(',') if pid.strip().isdigit()]
            if prod_ids:
                queryset = queryset.filter(producteur_id__in=prod_ids)

        annee = params.get('annee')
        if annee and str(annee).isdigit():
            queryset = queryset.filter(date_formation__year=int(annee))

        organisme = params.get('organisme')
        if organisme:
            queryset = queryset.filter(organisme__icontains=organisme)

        lieu = params.get('lieu')
        if lieu:
            queryset = queryset.filter(lieu__icontains=lieu)

        certificat_obtenu = params.get('certificat_obtenu')
        if certificat_obtenu is not None and str(certificat_obtenu).lower() in ('true', 'false'):
            queryset = queryset.filter(certificat_obtenu=str(certificat_obtenu).lower() == 'true')

        return queryset
    
    def create(self, request, *args, **kwargs):
        """Création de formation(s), supporte la création en masse"""
        from django.db import transaction
        
        data = request.data.copy()
        producteurs_ids = data.get('producteurs', [])
        
        # Si 'producteurs' n'est pas fourni, on regarde 'producteur' (cas standard)
        if not producteurs_ids and 'producteur' in data:
            producteurs_ids = [data['producteur']]
            
        if not producteurs_ids:
            return Response({'error': 'Aucun producteur spécifié'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Gestion du type de formation (texte libre ou ID)
        type_formation_input = data.get('type_formation')
        type_formation_id = None
        
        if type_formation_input:
            # Si c'est un ID (entier)
            if str(type_formation_input).isdigit():
                type_formation_id = type_formation_input
            else:
                # C'est un nom, on cherche ou on crée
                type_obj, created = TypeFormation.objects.get_or_create(
                    nom__iexact=type_formation_input.strip(),
                    defaults={'nom': type_formation_input.strip()}
                )
                type_formation_id = type_obj.id
                
        if not type_formation_id:
             return Response({'error': 'Type de formation requis'}, status=status.HTTP_400_BAD_REQUEST)
             
        # Création des formations en transaction
        created_formations = []
        try:
            with transaction.atomic():
                for prod_id in producteurs_ids:
                    formation_data = {
                        'producteur': prod_id,
                        'type_formation': type_formation_id,
                        'date_formation': data.get('date_formation'),
                        'lieu': data.get('lieu', ''),
                        'organisme': data.get('organisme', ''),
                        'notes': data.get('notes', ''),
                        'certificat_obtenu': data.get('certificat_obtenu', False)
                    }
                    serializer = self.get_serializer(data=formation_data)
                    serializer.is_valid(raise_exception=True)
                    self.perform_create(serializer)
                    created_formations.append(serializer.data)
                    
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Si un seul créé (cas standard), on retourne l'objet, sinon une liste
        if len(created_formations) == 1:
            # Enregistrer l'activité de création
            if request.user and request.user.is_authenticated:
                ActivityLog.log(
                    user=request.user,
                    action='create',
                    description=f"Création d'une formation pour le producteur {producteurs_ids[0]}",
                    module='Formations',
                    object_type='Formation',
                    request=request
                )
            return Response(created_formations[0], status=status.HTTP_201_CREATED)
        
        # Enregistrer l'activité de création en masse
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='create',
                description=f"Création de {len(created_formations)} formations pour {len(producteurs_ids)} producteurs",
                module='Formations',
                request=request,
                extra_data={'producteurs_count': len(producteurs_ids)}
            )
            
        return Response(created_formations, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(enregistre_par=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques sur les formations"""
        stats = {
            'total_formations': Formation.objects.count(),
            'types_formations_count': Formation.objects.values('type_formation').distinct().count(),
            'producteurs_formes': Formation.objects.values('producteur').distinct().count(),
            'avec_certificat': Formation.objects.filter(certificat_obtenu=True).count(),
            'par_type': list(
                Formation.objects.values('type_formation', 'type_formation__nom')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
        }
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def par_producteur(self, request):
        """Liste des formations d'un producteur"""
        producteur_id = request.query_params.get('producteur_id')
        if not producteur_id:
            return Response({'error': 'producteur_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        formations = self.queryset.filter(producteur_id=producteur_id)
        serializer = self.get_serializer(formations, many=True)
        return Response(serializer.data)


class TypeCertificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les types de certifications"""
    queryset = TypeCertification.objects.filter(actif=True)
    serializer_class = TypeCertificationSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['niveau', 'actif']
    search_fields = ['nom', 'code', 'description', 'organisme_certificateur']
    ordering_fields = ['nom', 'code', 'date_creation']
    ordering = ['nom']


class CertificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les certifications (producteurs et coopératives)"""
    queryset = Certification.objects.select_related('producteur', 'cooperative', 'type_certification').all()
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['producteur', 'cooperative', 'type_certification', 'statut', 'date_obtention', 'date_expiration']
    search_fields = [
        'producteur__code', 'producteur__nom', 'producteur__prenom',
        'cooperative__nom', 'cooperative__code', 'numero_certificat',
    ]
    ordering_fields = ['date_obtention', 'date_expiration', 'date_enregistrement']
    ordering = ['-date_obtention']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CertificationListSerializer
        return CertificationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        producteurs_in = params.get('producteur__in')
        if producteurs_in:
            prod_ids = [pid.strip() for pid in producteurs_in.split(',') if pid.strip().isdigit()]
            if prod_ids:
                queryset = queryset.filter(producteur_id__in=prod_ids)

        cooperative = params.get('cooperative')
        if cooperative:
            coop_ids = [cid.strip() for cid in cooperative.split(',') if cid.strip().isdigit()]
            if coop_ids:
                queryset = queryset.filter(cooperative_id__in=coop_ids)

        # Filtre "toutes" (toutes les certifications) ou par type d'entité
        entite = params.get('entite')
        if entite == 'cooperative':
            queryset = queryset.exclude(cooperative__isnull=True)
        elif entite == 'producteur':
            queryset = queryset.exclude(producteur__isnull=True)

        # Valeur booléenne: n'afficher que les valides
        seulement_valides = params.get('seulement_valides')
        if seulement_valides and seulement_valides.lower() == 'true':
            from django.utils import timezone
            queryset = queryset.filter(statut='valide', date_expiration__gte=timezone.now().date())

        annee = params.get('annee')
        if annee and str(annee).isdigit():
            queryset = queryset.filter(date_obtention__year=int(annee))

        return queryset
    
    def create(self, request, *args, **kwargs):
        """Création d'une certification avec logging"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        certification = serializer.instance
        
        # Enregistrer l'activité de création
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='create',
                description=f"Création de la certification {certification.type_certification.nom} pour {certification.entite_label}",
                module='Certifications',
                object_type='Certification',
                object_id=certification.id,
                request=request
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        serializer.save(enregistre_par=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Mise à jour d'une certification avec logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        certification = serializer.instance
        
        # Enregistrer l'activité de modification
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='update',
                description=f"Modification de la certification {certification.type_certification.nom} pour {certification.producteur.nom_complet}",
                module='Certifications',
                object_type='Certification',
                object_id=certification.id,
                request=request
            )
        
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        serializer.save(modifie_par=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Suppression d'une certification avec logging"""
        certification = self.get_object()
        cert_type = certification.type_certification.nom
        producteur_nom = certification.producteur.nom_complet
        cert_id = certification.id
        
        self.perform_destroy(certification)
        
        # Enregistrer l'activité de suppression
        if request.user and request.user.is_authenticated:
            ActivityLog.log(
                user=request.user,
                action='delete',
                description=f"Suppression de la certification {cert_type} pour {producteur_nom}",
                module='Certifications',
                object_type='Certification',
                object_id=cert_id,
                request=request
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques sur les certifications"""
        stats = {
            'total_certifications': Certification.objects.count(),
            'types_certifications_count': TypeCertification.objects.filter(actif=True).count(),
            'producteurs_certifies': Certification.objects.values('producteur').distinct().count(),
            'valides': Certification.objects.filter(statut='valide').count(),
            'expirees': Certification.objects.filter(statut='expire').count(),
            'en_cours': Certification.objects.filter(statut='en_cours').count(),
            'par_type': list(
                TypeCertification.objects.filter(actif=True)
                .annotate(count=Count('certifications'))
                .values('id', 'nom', 'code', 'count')
                .order_by('-count')
            ),
            'par_statut': list(
                Certification.objects.values('statut')
                .annotate(count=Count('id'))
            ),
        }
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def par_producteur(self, request):
        """Liste des certifications d'un producteur"""
        producteur_id = request.query_params.get('producteur_id')
        if not producteur_id:
            return Response({'error': 'producteur_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        certifications = self.queryset.filter(producteur_id=producteur_id)
        serializer = self.get_serializer(certifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def historique(self, request):
        """Historique des certifications par année avec liste des producteurs"""
        qs = self.filter_queryset(self.get_queryset())
        type_id = request.query_params.get('type_certification')
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        if type_id:
            qs = qs.filter(type_certification_id=type_id)
        if start and start.isdigit():
            qs = qs.filter(date_obtention__year__gte=int(start))
        if end and end.isdigit():
            qs = qs.filter(date_obtention__year__lte=int(end))

        qs_annee = qs.annotate(annee=ExtractYear('date_obtention'))
        series = list(
            qs_annee.values('annee').annotate(count=Count('id')).order_by('annee')
        )

        prod_rows = list(
            qs_annee.values('annee', 'producteur_id', 'producteur__code').distinct()
        )
        producteurs_par_annee = {}
        for r in prod_rows:
            y = r['annee']
            producteurs_par_annee.setdefault(y, []).append({
                'id': r['producteur_id'],
                'code': r['producteur__code'],
            })

        return Response({
            'series': series,
            'producteurs_par_annee': producteurs_par_annee,
        })

    @action(detail=False, methods=['get'], url_path='comparatif')
    def comparatif(self, request):
        """Vue comparative certifications + derniers audits par type."""
        qs = self.filter_queryset(self.get_queryset()).select_related(
            'producteur', 'type_certification'
        )
        results = []
        for cert in qs:
            latest_audit = AuditCertification.objects.filter(
                type_certification=cert.type_certification
            ).order_by('-date_audit').first()
            results.append({
                'producteur_id': cert.producteur_id,
                'producteur_code': cert.producteur.code,
                'producteur_nom': cert.producteur.nom_complet,
                'type_certification_id': cert.type_certification_id,
                'type_certification': cert.type_certification.nom,
                'statut': cert.statut,
                'date_obtention': cert.date_obtention,
                'date_expiration': cert.date_expiration,
                'audit_date': latest_audit.date_audit if latest_audit else None,
                'audit_resultat': latest_audit.resultat if latest_audit else None,
            })
        return Response({'results': results, 'count': len(results)})


class AuditCertificationViewSet(viewsets.ModelViewSet):
    queryset = AuditCertification.objects.select_related('type_certification').annotate(nb_nonconformites=Count('nonconformites'))
    serializer_class = AuditCertificationSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_certification', 'resultat', 'date_audit']
    search_fields = ['type_certification__nom', 'type_certification__code', 'organisme']
    ordering_fields = ['date_audit', 'date_enregistrement']
    ordering = ['-date_audit']

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        data = {
            'par_resultat': list(
                self.queryset.values('resultat').annotate(count=Count('id')).order_by('-count')
            ),
            'par_type': list(
                self.queryset.values('type_certification__id', 'type_certification__nom')
                .annotate(count=Count('id')).order_by('-count')
            )
        }
        return Response(data)

    @action(detail=True, methods=['get'])
    def nonconformites(self, request, pk=None):
        audit = self.get_object()
        ncs = audit.nonconformites.select_related('producteur')
        return Response(NonConformiteSerializer(ncs, many=True).data)


class NonConformiteViewSet(viewsets.ModelViewSet):
    queryset = NonConformite.objects.select_related('audit', 'producteur')
    serializer_class = NonConformiteSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['audit', 'producteur', 'type', 'statut', 'date_limite']
    search_fields = ['description', 'action_corrective', 'producteur__code']
    ordering_fields = ['date_enregistrement', 'date_limite']
    ordering = ['-date_enregistrement']

    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        from django.utils import timezone
        nc = self.get_object()
        nc.statut = 'resolue'
        if not nc.date_resolution:
            nc.date_resolution = timezone.now().date()
        nc.save()
        return Response(self.get_serializer(nc).data)


class ActiviteCertificationViewSet(viewsets.ModelViewSet):
    """
    API pour les activités de mise en œuvre de la certification
    (sensibilisation, formation, audit interne, audit externe).
    """
    queryset = ActiviteCertification.objects.select_related(
        'type_certification', 'cooperative', 'producteur', 'responsable'
    ).all()
    serializer_class = ActiviteCertificationSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_activite', 'type_certification', 'cooperative', 'producteur', 'date']
    search_fields = [
        'description', 'resultat', 'notes',
        'cooperative__nom', 'producteur__code', 'producteur__nom',
    ]
    ordering_fields = ['date', 'date_creation', 'nombre_participants']
    ordering = ['-date', '-date_creation']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user, responsable=self.request.user)

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques par type d'activité et par certification."""
        qs = self.filter_queryset(self.get_queryset())
        data = {
            'par_type': list(
                qs.values('type_activite').annotate(count=Count('id')).order_by('-count')
            ),
            'par_certification': list(
                qs.exclude(type_certification__isnull=True)
                .values('type_certification__id', 'type_certification__nom')
                .annotate(count=Count('id')).order_by('-count')
            ),
            'total': qs.count(),
            'total_participants': qs.aggregate(total=Count('id'))['total'],
        }
        return Response(data)
    
