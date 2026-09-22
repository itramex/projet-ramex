from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
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

from django.core.exceptions import ValidationError

# ==================== Pièces jointes (#20) ====================
# Certificat de certification, rapport d'audit, preuve de non-conformité.
PIECE_JOINTE_EXTENSIONS = ('.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx')
PIECE_JOINTE_TAILLE_MAX = 10 * 1024 * 1024  # 10 Mo


def _valider_piece_jointe(fichier):
    """Valide un fichier uploadé (pièce jointe #20) ; lève ValidationError si invalide."""
    import os
    if fichier is None:
        raise ValidationError("Aucun fichier reçu (champ attendu : 'fichier').")
    if fichier.size > PIECE_JOINTE_TAILLE_MAX:
        raise ValidationError("Fichier trop volumineux (maximum 10 Mo).")
    ext = os.path.splitext(fichier.name or '')[1].lower()
    if ext not in PIECE_JOINTE_EXTENSIONS:
        raise ValidationError(
            "Type de fichier non autorisé. Formats acceptés : PDF, images, Word, Excel."
        )


def _abs_file_url(request, field):
    """URL absolue d'une pièce jointe (ou None). Helper partagé (#20)."""
    if not field:
        return None
    url = field.url
    if request:
        return request.build_absolute_uri(url)
    return url


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

        # #19 : filtre par village du producteur formé (recherche partielle)
        village = params.get('village')
        if village:
            queryset = queryset.filter(producteur__village__icontains=village)

        # #18 : filtre par producteur — géré par les paramètres DRF standards :
        #   ?producteur=<id>          (exact, via filterset_fields)
        #   ?producteur__in=1,2,3     (multi-sélection, traité ci-dessus)
        #   ?search=Rakoto            (code / nom / prénom, via search_fields)
        # Ne PAS déclarer ici un filtre nommé « producteur » : il entrerait en conflit
        # avec filterset_fields['producteur'] (ValidationError « champ id attendu »).
        # #29 — Confidentialité par agence (après les filtres métier) : les
        # non-responsables ne voient que les formations de leur agence.
        from users.permissions import scope_par_agence
        queryset, _ = scope_par_agence(
            self.request.user, queryset,
            lookup='producteur__cooperative__agence')
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
        """Statistiques sur les formations — respecte les mêmes filtres que la liste (#18)"""
        # On réutilise get_queryset() : les filtres producteur/type/année/organisme/
        # lieu/certificat sont donc identiques à ceux de la liste.
        queryset = self.get_queryset()
        stats = {
            'total_formations': queryset.count(),
            'types_formations_count': queryset.values('type_formation').distinct().count(),
            'producteurs_formes': queryset.values('producteur').distinct().count(),
            'avec_certificat': queryset.filter(certificat_obtenu=True).count(),
            'par_type': list(
                queryset.values('type_formation', 'type_formation__nom')
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

        # #19 : filtre par village (recherche partielle) — cohérent avec les formations.
        # Le frontend envoie le même jeu de filtres aux endpoints formations ET
        # certifications : sans ce bloc, le filtre Village était silencieusement ignoré ici.
        village = params.get('village')
        if village:
            queryset = queryset.filter(producteur__village__icontains=village)

        # #29 — Confidentialité par agence : certifications liées à un producteur
        # (via sa coopérative) OU directement à une coopérative. Les lignes sans
        # aucun rattachement restent visibles.
        from users.permissions import scope_entite_agence
        queryset, _ = scope_entite_agence(
            self.request.user, queryset,
            lookup_producteur='producteur__cooperative__agence',
            lookup_cooperative='cooperative__agence')

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
        """Statistiques sur les certifications — respecte les mêmes filtres que la liste (#18)"""
        # On réutilise get_queryset() : filtres producteur__in / cooperative / entite /
        # seulement_valides / annee identiques à ceux de la liste.
        queryset = self.get_queryset()

        # #18/#19 : ventiler par type en respectant les filtres actifs.
        # Avant, le décompte portait sur TOUTES les certifications (relation
        # inverse `certifications`), donc ce graphique contredisait la liste
        # filtrée. On agrège désormais sur le queryset filtré, tout en
        # conservant la liste complète des types actifs (compteur à 0 si aucun).
        counts_par_type = {
            row['type_certification']: row['count']
            for row in queryset.values('type_certification').annotate(count=Count('id'))
        }
        par_type = [
            {
                'id': t.id,
                'nom': t.nom,
                'code': t.code,
                'count': counts_par_type.get(t.id, 0),
            }
            for t in TypeCertification.objects.filter(actif=True)
        ]
        par_type.sort(key=lambda t: (-t['count'], t['nom'] or ''))

        stats = {
            'total_certifications': queryset.count(),
            'types_certifications_count': TypeCertification.objects.filter(actif=True).count(),
            'producteurs_certifies': queryset.values('producteur').distinct().count(),
            'valides': queryset.filter(statut='valide').count(),
            'expirees': queryset.filter(statut='expire').count(),
            'en_cours': queryset.filter(statut='en_cours').count(),
            'par_type': par_type,
            'par_statut': list(
                queryset.values('statut')
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
        """Historique des certifications par année avec liste des producteurs (#20).

        Renvoie en plus des séries :
        - `par_annee` : certifications détaillées (avec pièce jointe), audits et
          non-conformités (avec preuves) groupés par année.
        """
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

        qs = qs.select_related('producteur', 'cooperative', 'type_certification')
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

        # ---- Detail par annee (pieces jointes + audits + non-conformites) ----
        par_annee = {}
        for cert in qs_annee:
            y = cert.annee
            bucket = par_annee.setdefault(y, {
                'certifications': [], 'audits': [], 'nonconformites': [],
                'producteurs': [], 'cooperatives': [],
            })
            bucket['certifications'].append({
                'id': cert.id,
                'entite_label': cert.entite_label,
                'producteur_code': cert.producteur.code if cert.producteur else None,
                'producteur_nom': cert.producteur.nom_complet if cert.producteur else None,
                'cooperative_nom': cert.cooperative.nom if cert.cooperative else None,
                'type_certification_nom': cert.type_certification.nom if cert.type_certification else None,
                'type_certification_code': cert.type_certification.code if cert.type_certification else None,
                'numero_certificat': cert.numero_certificat,
                'date_obtention': cert.date_obtention,
                'date_expiration': cert.date_expiration,
                'statut': cert.statut,
                'est_valide': cert.est_valide,
                'fichier_certificat_url': self._abs_url(request, cert.fichier_certificat),
            })
            if cert.producteur_id:
                bucket['producteurs'].append(cert.producteur_id)
            if cert.cooperative_id:
                bucket['cooperatives'].append(cert.cooperative.nom)

        # Audits + non-conformites, regroupes par annee de date_audit
        audits_qs = AuditCertification.objects.select_related('type_certification').prefetch_related('nonconformites')
        if type_id:
            audits_qs = audits_qs.filter(type_certification_id=type_id)
        if start and start.isdigit():
            audits_qs = audits_qs.filter(date_audit__year__gte=int(start))
        if end and end.isdigit():
            audits_qs = audits_qs.filter(date_audit__year__lte=int(end))
        for audit in audits_qs:
            year = audit.date_audit.year if audit.date_audit else None
            if year is None:
                continue
            bucket = par_annee.setdefault(year, {
                'certifications': [], 'audits': [], 'nonconformites': [],
                'producteurs': [], 'cooperatives': [],
            })
            ncs = list(audit.nonconformites.all())
            bucket['audits'].append({
                'id': audit.id,
                'date_audit': audit.date_audit,
                'organisme': audit.organisme,
                'resultat': audit.resultat,
                'resultat_display': audit.get_resultat_display(),
                'nb_nonconformites': len(ncs),
                'rapport_fichier_url': self._abs_url(request, audit.rapport_fichier),
            })
            for nc in ncs:
                bucket['nonconformites'].append({
                    'id': nc.id,
                    'audit_id': nc.audit_id,
                    'producteur_code': nc.producteur.code if nc.producteur else None,
                    'producteur_nom': nc.producteur.nom_complet if nc.producteur else None,
                    'type': nc.type,
                    'type_display': nc.get_type_display(),
                    'description': nc.description,
                    'action_corrective': nc.action_corrective,
                    'statut': nc.statut,
                    'statut_display': nc.get_statut_display(),
                    'date_limite': nc.date_limite,
                    'date_resolution': nc.date_resolution,
                    'fichier_preuve_url': self._abs_url(request, nc.fichier_preuve),
                })

        # Tri des annees decroissant + deduplication producteurs
        for y, bucket in par_annee.items():
            bucket['producteurs'] = sorted(set(bucket['producteurs']))
        par_annee = dict(sorted(par_annee.items(), reverse=True))

        return Response({
            'series': series,
            'producteurs_par_annee': producteurs_par_annee,
            'par_annee': par_annee,
            'total': qs.count(),
        })

    @staticmethod
    def _abs_url(request, field):
        """URL absolue d'une piece jointe (ou None)."""
        if not field:
            return None
        url = field.url
        if request:
            return request.build_absolute_uri(url)
        return url

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

    @action(detail=True, methods=['post'], url_path='piece_jointe',
            parser_classes=[MultiPartParser, FormParser])
    def piece_jointe(self, request, pk=None):
        """Upload/remplacement du fichier certificat d'une certification (#20).

        POST multipart/form-data avec champ 'fichier' (PDF, image, Word, Excel ; ≤ 10 Mo).
        """
        try:
            _valider_piece_jointe(request.FILES.get('fichier'))
        except ValidationError as exc:
            return Response({'detail': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        cert = self.get_object()
        cert.fichier_certificat = request.FILES['fichier']
        cert.save(update_fields=['fichier_certificat', 'date_modification'])
        return Response({
            'id': cert.id,
            'fichier_certificat_url': _abs_file_url(request, cert.fichier_certificat),
        }, status=status.HTTP_200_OK)


class AuditCertificationViewSet(viewsets.ModelViewSet):
    queryset = AuditCertification.objects.select_related('type_certification').annotate(nb_nonconformites=Count('nonconformites'))
    serializer_class = AuditCertificationSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_certification', 'resultat', 'date_audit']
    search_fields = ['type_certification__nom', 'type_certification__code', 'organisme']
    ordering_fields = ['date_audit', 'date_enregistrement']
    ordering = ['-date_audit']

    # #29 — Les audits ne portent ni producteur ni coopérative : aucune donnée
    # personnelle. Pas de restriction par agence (contrairement aux
    # certifications / non-conformités / formations).

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

    @action(detail=True, methods=['post'], url_path='rapport',
            parser_classes=[MultiPartParser, FormParser])
    def rapport(self, request, pk=None):
        """Upload/remplacement du rapport d'audit joint (#20).

        POST multipart/form-data avec champ 'fichier' (PDF, image, Word, Excel ; ≤ 10 Mo).
        """
        try:
            _valider_piece_jointe(request.FILES.get('fichier'))
        except ValidationError as exc:
            return Response({'detail': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        audit = self.get_object()
        audit.rapport_fichier = request.FILES['fichier']
        audit.save(update_fields=['rapport_fichier'])
        return Response({
            'id': audit.id,
            'rapport_fichier_url': _abs_file_url(request, audit.rapport_fichier),
        }, status=status.HTTP_200_OK)


class NonConformiteViewSet(viewsets.ModelViewSet):
    queryset = NonConformite.objects.select_related('audit', 'producteur')
    serializer_class = NonConformiteSerializer
    permission_classes = [IsAuthenticated, CanManageCertificationDD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['audit', 'producteur', 'type', 'statut', 'date_limite']
    search_fields = ['description', 'action_corrective', 'producteur__code']
    ordering_fields = ['date_enregistrement', 'date_limite']
    ordering = ['-date_enregistrement']

    def get_queryset(self):
        # #29 — Confidentialité par agence : les non-responsables ne voient que
        # les non-conformités rattachées aux producteurs de leur agence.
        # (Les NC sans producteur restent visibles.)
        from django.db.models import Q
        from users.permissions import can_see_all_data, get_user_agence
        queryset = super().get_queryset()
        if not can_see_all_data(self.request.user):
            agence = get_user_agence(self.request.user)
            if agence:
                queryset = queryset.filter(
                    Q(producteur__cooperative__agence_id=agence.id)
                    | Q(producteur__isnull=True)
                )
        return queryset

    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        from django.utils import timezone
        nc = self.get_object()
        nc.statut = 'resolue'
        if not nc.date_resolution:
            nc.date_resolution = timezone.now().date()
        nc.save()
        return Response(self.get_serializer(nc).data)

    @action(detail=True, methods=['post'], url_path='preuve',
            parser_classes=[MultiPartParser, FormParser])
    def preuve(self, request, pk=None):
        """Upload/remplacement de la preuve d'une non-conformité (#20).

        POST multipart/form-data avec champ 'fichier' (PDF, image, Word, Excel ; ≤ 10 Mo).
        """
        try:
            _valider_piece_jointe(request.FILES.get('fichier'))
        except ValidationError as exc:
            return Response({'detail': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        nc = self.get_object()
        nc.fichier_preuve = request.FILES['fichier']
        nc.save(update_fields=['fichier_preuve'])
        return Response({
            'id': nc.id,
            'fichier_preuve_url': _abs_file_url(request, nc.fichier_preuve),
        }, status=status.HTTP_200_OK)


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

    def get_queryset(self):
        # #29 — Confidentialité par agence : activités liées à un producteur
        # (via sa coopérative) OU directement à une coopérative.
        from users.permissions import scope_entite_agence
        queryset, _ = scope_entite_agence(
            self.request.user,
            super().get_queryset(),
            lookup_producteur='producteur__cooperative__agence',
            lookup_cooperative='cooperative__agence')
        return queryset

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
    
