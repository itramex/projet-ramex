from rest_framework import serializers
from .models import (
    Campagne,
    BonCollecte,
    DetailSacBonCollecte,
    FicheCollecte,
    BonTransport,
    DetailSacBonTransport,
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
from formations.models import TypeCertification


# ==================== SERIALIZERS RÉUTILISÉS ====================

class ProducteurBasicSerializer(serializers.Serializer):
    """Serializer basique pour producteur (pour éviter import circulaire)"""
    id = serializers.IntegerField()
    code = serializers.CharField()
    nom = serializers.CharField()
    prenom = serializers.CharField()
    nom_complet = serializers.CharField(read_only=True)
    village = serializers.CharField()
    fokontany = serializers.CharField()
    commune = serializers.CharField()
    telephone = serializers.CharField(allow_blank=True)


class CooperativeBasicSerializer(serializers.Serializer):
    """Serializer basique pour coopérative (pour éviter import circulaire)"""
    id = serializers.IntegerField()
    code = serializers.CharField()
    nom = serializers.CharField()
    sigle = serializers.CharField(allow_blank=True)
    commune = serializers.CharField()
    village = serializers.CharField()


# ==================== CAMPAGNE ====================

class CampagneSerializer(serializers.ModelSerializer):
    """Serializer pour les campagnes agricoles"""
    
    class Meta:
        model = Campagne
        fields = '__all__'


# ==================== BON DE COLLECTE ====================

class DetailSacBonCollecteSerializer(serializers.ModelSerializer):
    """Serializer pour les détails des sacs d'un bon de collecte"""
    
    class Meta:
        model = DetailSacBonCollecte
        fields = ['id', 'numero_sac', 'poids_brut', 'tare', 'poids_net']


class BonCollecteListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des bons de collecte"""
    
    # Relations
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    
    # Display fields
    type_produit_display = serializers.CharField(source='get_type_produit_display', read_only=True)
    certification_display = serializers.SerializerMethodField()
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    
    class Meta:
        model = BonCollecte
        fields = [
            'id', 'numero_fabc', 'campagne', 'campagne_code',
            'producteur', 'producteur_nom', 'producteur_code',
            'cooperative', 'cooperative_nom',
            'date_marche', 'village_marche', 'commune', 'fokontany',
            'type_produit', 'type_produit_display',
            'certification', 'certification_display',
            'type_certification', 'type_certification_nom',
            'poids_total_livre', 'poids_accepte', 'poids_retour',
            'prix_unitaire_marche', 'montant_premium', 'montant_total_achat',
            'mode_paiement', 'mode_paiement_display',
            'est_vente_groupee',
            'date_creation', 'date_modification'
        ]

    def get_certification_display(self, obj):
        if obj.type_certification:
            return obj.type_certification.nom
        value = obj.certification or ''
        if ',' in value:
            return ", ".join([v.strip().upper() for v in value.split(',') if v.strip()])
        try:
            return obj.get_certification_display()
        except Exception:
            return value.upper() if value else ''


class BonCollecteDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un bon de collecte"""
    
    # Relations complètes
    producteur_info = ProducteurBasicSerializer(source='producteur', read_only=True)
    cooperative_info = CooperativeBasicSerializer(source='cooperative', read_only=True)
    campagne_info = CampagneSerializer(source='campagne', read_only=True)
    details_sacs = DetailSacBonCollecteSerializer(many=True, read_only=True)
    
    # Producteurs groupés (si vente groupée)
    producteurs_groupes_info = ProducteurBasicSerializer(
        source='producteurs_groupes',
        many=True,
        read_only=True
    )
    
    # Display fields
    type_produit_display = serializers.CharField(source='get_type_produit_display', read_only=True)
    certification_display = serializers.SerializerMethodField()
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    
    class Meta:
        model = BonCollecte
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification']

    def get_certification_display(self, obj):
        if obj.type_certification:
            return obj.type_certification.nom
        value = obj.certification or ''
        if ',' in value:
            return ", ".join([v.strip().upper() for v in value.split(',') if v.strip()])
        try:
            return obj.get_certification_display()
        except Exception:
            return value.upper() if value else ''


class BonCollecteCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'un bon de collecte"""
    
    details_sacs = DetailSacBonCollecteSerializer(many=True, required=False)
    type_certification = serializers.PrimaryKeyRelatedField(
        queryset=TypeCertification.objects.all(),
        required=False,
        allow_null=True,
    )
    certification = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    # Display fields (read-only)
    type_produit_display = serializers.CharField(source='get_type_produit_display', read_only=True)
    certification_display = serializers.SerializerMethodField()
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    type_certification_nom = serializers.CharField(source='type_certification.nom', read_only=True)
    
    class Meta:
        model = BonCollecte
        exclude = ['date_creation', 'date_modification']

    def _normalize_certification(self, certification_value):
        if isinstance(certification_value, list):
            values = [str(v).strip().lower() for v in certification_value if str(v).strip()]
            return ",".join(values[:5]) if values else ''
        if isinstance(certification_value, str):
            values = [v.strip().lower() for v in certification_value.split(',') if v.strip()]
            return ",".join(values[:5]) if values else ''
        return certification_value

    def get_certification_display(self, obj):
        if obj.type_certification:
            return obj.type_certification.nom
        value = obj.certification or ''
        if ',' in value:
            return ", ".join([v.strip().upper() for v in value.split(',') if v.strip()])
        try:
            return obj.get_certification_display()
        except Exception:
            return value.upper() if value else ''
    
    def validate_numero_fabc(self, value):
        """Valider l'unicité du numéro FABC"""
        instance = self.instance
        if instance:
            if BonCollecte.objects.exclude(pk=instance.pk).filter(numero_fabc=value).exists():
                raise serializers.ValidationError("Ce numéro FABC existe déjà")
        else:
            if BonCollecte.objects.filter(numero_fabc=value).exists():
                raise serializers.ValidationError("Ce numéro FABC existe déjà")
        return value
    
    def validate(self, data):
        """Validations croisées"""
        if 'certification' in data and data.get('certification'):
            data['certification'] = self._normalize_certification(data.get('certification'))
        else:
            # Si une FK TypeCertification est fournie, on la laisse telle quelle
            data.setdefault('certification', '')
        poids_total_livre = data.get('poids_total_livre', 0)
        poids_accepte = data.get('poids_accepte', 0)
        poids_retour = data.get('poids_retour', 0)
        
        if poids_accepte > poids_total_livre:
            raise serializers.ValidationError({
                'poids_accepte': 'Le poids accepté ne peut pas dépasser le poids total livré'
            })
        
        if poids_retour > poids_total_livre:
            raise serializers.ValidationError({
                'poids_retour': 'Le poids retour ne peut pas dépasser le poids total livré'
            })
        

        producteur = data.get('producteur') or (self.instance.producteur if self.instance else None)
        if producteur:
            data.setdefault('village_marche', getattr(producteur, 'village', '') or '')
            data.setdefault('commune', getattr(producteur, 'commune', '') or '')
            data.setdefault('fokontany', getattr(producteur, 'fokontany', '') or '')
        return data
    
    def create(self, validated_data):
        """Création avec gestion des sacs"""
        details_sacs_data = validated_data.pop('details_sacs', [])
        producteurs_groupes = validated_data.pop('producteurs_groupes', [])
        
        bon_collecte = BonCollecte.objects.create(**validated_data)
        
        # Ajouter les producteurs groupés
        if producteurs_groupes:
            bon_collecte.producteurs_groupes.set(producteurs_groupes)
        
        # Créer les détails des sacs
        for detail_data in details_sacs_data:
            DetailSacBonCollecte.objects.create(
                bon_collecte=bon_collecte,
                **detail_data
            )
        
        return bon_collecte
    
    def update(self, instance, validated_data):
        """Mise à jour avec gestion des sacs"""
        details_sacs_data = validated_data.pop('details_sacs', None)
        producteurs_groupes = validated_data.pop('producteurs_groupes', None)
        
        # Mise à jour des champs simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mise à jour des producteurs groupés
        if producteurs_groupes is not None:
            instance.producteurs_groupes.set(producteurs_groupes)
        
        # Mise à jour des sacs si fournis
        if details_sacs_data is not None:
            # Supprimer les anciens
            instance.details_sacs.all().delete()
            # Créer les nouveaux
            for detail_data in details_sacs_data:
                DetailSacBonCollecte.objects.create(
                    bon_collecte=instance,
                    **detail_data
                )
        
        return instance


# ==================== FICHE DE COLLECTE ====================

class FicheCollecteListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des fiches de collecte"""
    
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    certification_display = serializers.CharField(source='get_certification_display', read_only=True)
    
    class Meta:
        model = FicheCollecte
        fields = [
            'id', 'numero_fc', 'campagne', 'campagne_code',
            'cooperative', 'cooperative_nom',
            'certification', 'certification_display',
            'date_marche', 'fokontany',
            'nombre_producteurs', 'poids_total_net', 'montant_total',
            'agent_re', 'date_creation'
        ]


class FicheCollecteDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une fiche de collecte"""
    
    campagne_info = CampagneSerializer(source='campagne', read_only=True)
    cooperative_info = CooperativeBasicSerializer(source='cooperative', read_only=True)
    bons_collecte_info = BonCollecteListSerializer(source='bons_collecte', many=True, read_only=True)
    
    certification_display = serializers.CharField(source='get_certification_display', read_only=True)
    
    class Meta:
        model = FicheCollecte
        fields = '__all__'
        read_only_fields = ['date_creation']


class FicheCollecteCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'une fiche de collecte"""
    
    certification_display = serializers.CharField(source='get_certification_display', read_only=True)
    
    class Meta:
        model = FicheCollecte
        exclude = ['date_creation']
    
    def validate_numero_fc(self, value):
        """Valider l'unicité du numéro FC"""
        instance = self.instance
        if instance:
            if FicheCollecte.objects.exclude(pk=instance.pk).filter(numero_fc=value).exists():
                raise serializers.ValidationError("Ce numéro FC existe déjà")
        else:
            if FicheCollecte.objects.filter(numero_fc=value).exists():
                raise serializers.ValidationError("Ce numéro FC existe déjà")
        return value


# ==================== BON DE TRANSPORT ====================

class DetailSacBonTransportSerializer(serializers.ModelSerializer):
    """Serializer pour les détails des sacs d'un bon de transport"""
    
    controle_reception_display = serializers.CharField(source='get_controle_reception_display', read_only=True)
    
    class Meta:
        model = DetailSacBonTransport
        fields = '__all__'


class BonTransportListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des bons de transport"""
    
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    fiche_collecte_numero = serializers.CharField(source='fiche_collecte.numero_fc', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    
    type_logistique_display = serializers.CharField(source='get_type_logistique_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = BonTransport
        fields = [
            'id', 'numero_bt', 'campagne', 'campagne_code',
            'fiche_collecte', 'fiche_collecte_numero',
            'cooperative', 'cooperative_nom',
            'lieu_depart', 'fokontany_depart', 'lieu_destination',
            'type_logistique', 'type_logistique_display',
            'date_chargement', 'date_arrivee',
            'poids_total_depart', 'poids_total_arrivee',
            'statut', 'statut_display',
            'date_creation'
        ]


class BonTransportDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un bon de transport"""
    
    campagne_info = CampagneSerializer(source='campagne', read_only=True)
    fiche_collecte_info = FicheCollecteListSerializer(source='fiche_collecte', read_only=True)
    cooperative_info = CooperativeBasicSerializer(source='cooperative', read_only=True)
    details_sacs = DetailSacBonTransportSerializer(many=True, read_only=True)
    
    type_logistique_display = serializers.CharField(source='get_type_logistique_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = BonTransport
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification']


class BonTransportCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'un bon de transport"""
    
    details_sacs = DetailSacBonTransportSerializer(many=True, required=False)
    
    type_logistique_display = serializers.CharField(source='get_type_logistique_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = BonTransport
        exclude = ['date_creation', 'date_modification']
    
    def validate_numero_bt(self, value):
        """Valider l'unicité du numéro BT"""
        instance = self.instance
        if instance:
            if BonTransport.objects.exclude(pk=instance.pk).filter(numero_bt=value).exists():
                raise serializers.ValidationError("Ce numéro BT existe déjà")
        else:
            if BonTransport.objects.filter(numero_bt=value).exists():
                raise serializers.ValidationError("Ce numéro BT existe déjà")
        return value


# ==================== LOT DE TRAITEMENT ====================

class LotTraitementListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des lots de traitement"""
    
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    
    type_traitement_display = serializers.CharField(source='get_type_traitement_display', read_only=True)
    qualite_display = serializers.CharField(source='get_qualite_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = LotTraitement
        fields = [
            'id', 'numero_lot', 'campagne', 'campagne_code',
            'cooperative', 'cooperative_nom',
            'type_traitement', 'type_traitement_display',
            'date_debut', 'date_fin',
            'poids_entree', 'poids_sortie', 'perte_poids', 'taux_perte',
            'qualite', 'qualite_display',
            'statut', 'statut_display',
            'responsable_traitement', 'site_traitement',
            'date_creation'
        ]


class LotTraitementDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un lot de traitement"""
    
    campagne_info = CampagneSerializer(source='campagne', read_only=True)
    cooperative_info = CooperativeBasicSerializer(source='cooperative', read_only=True)
    bons_transport_info = BonTransportListSerializer(source='bons_transport', many=True, read_only=True)
    
    type_traitement_display = serializers.CharField(source='get_type_traitement_display', read_only=True)
    qualite_display = serializers.CharField(source='get_qualite_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = LotTraitement
        fields = '__all__'
        read_only_fields = ['perte_poids', 'taux_perte', 'date_creation', 'date_modification']


class LotTraitementCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'un lot de traitement"""
    
    type_traitement_display = serializers.CharField(source='get_type_traitement_display', read_only=True)
    qualite_display = serializers.CharField(source='get_qualite_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = LotTraitement
        exclude = ['perte_poids', 'taux_perte', 'date_creation', 'date_modification']


# ==================== COLIS ====================

class ColisListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des colis"""
    
    lot_traitement_numero = serializers.CharField(source='lot_traitement.numero_lot', read_only=True)
    
    type_colis_display = serializers.CharField(source='get_type_colis_display', read_only=True)
    
    class Meta:
        model = Colis
        fields = [
            'id', 'numero_colis',
            'lot_traitement', 'lot_traitement_numero',
            'type_colis', 'type_colis_display',
            'poids_net', 'poids_brut',
            'qualite', 'grade',
            'date_conditionnement',
            'qr_code', 'code_barres',
            'date_creation'
        ]


class ColisDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un colis"""
    
    lot_traitement_info = LotTraitementListSerializer(source='lot_traitement', read_only=True)
    
    type_colis_display = serializers.CharField(source='get_type_colis_display', read_only=True)
    
    class Meta:
        model = Colis
        fields = '__all__'
        read_only_fields = ['date_creation']


class ColisCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'un colis"""
    
    type_colis_display = serializers.CharField(source='get_type_colis_display', read_only=True)
    
    class Meta:
        model = Colis
        exclude = ['date_creation']


# ==================== COMMANDE EXPORT ====================

class CommandeExportListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des commandes d'export"""
    
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    
    type_transport_display = serializers.CharField(source='get_type_transport_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    incoterm_display = serializers.CharField(source='get_incoterm_display', read_only=True)
    
    class Meta:
        model = CommandeExport
        fields = [
            'id', 'numero_commande', 'campagne', 'campagne_code',
            'nom_client', 'pays_destination', 'ville_destination',
            'type_transport', 'type_transport_display',
            'date_commande', 'date_expedition', 'date_livraison_prevue',
            'poids_total_net', 'poids_total_brut',
            'valeur_commande', 'incoterm', 'incoterm_display',
            'statut', 'statut_display',
            'date_creation'
        ]


class CommandeExportDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une commande d'export"""
    
    campagne_info = CampagneSerializer(source='campagne', read_only=True)
    colis_info = ColisListSerializer(source='colis', many=True, read_only=True)
    
    type_transport_display = serializers.CharField(source='get_type_transport_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    incoterm_display = serializers.CharField(source='get_incoterm_display', read_only=True)
    
    class Meta:
        model = CommandeExport
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification']


class CommandeExportCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/mise à jour d'une commande d'export"""
    
    type_transport_display = serializers.CharField(source='get_type_transport_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    incoterm_display = serializers.CharField(source='get_incoterm_display', read_only=True)
    
    class Meta:
        model = CommandeExport
        exclude = ['date_creation', 'date_modification']


# ==================== TRACABILITÉ ====================

class TracabiliteChainSerializer(serializers.ModelSerializer):
    """Serializer pour les chaînes de traçabilité"""
    
    producteur_info = ProducteurBasicSerializer(source='producteur', read_only=True)
    
    type_tracabilite_display = serializers.CharField(source='get_type_tracabilite_display', read_only=True)
    
    class Meta:
        model = TracabiliteChain
        fields = '__all__'
        read_only_fields = ['uuid', 'date_creation']


class TracabiliteChainListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste des chaînes de traçabilité.

    Extrait un résumé (numéros FABC / colis / commande, poids, nb d'étapes)
    directement depuis chain_data, sans requêtes supplémentaires.
    """

    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    type_tracabilite_display = serializers.CharField(source='get_type_tracabilite_display', read_only=True)
    numero_fabc = serializers.SerializerMethodField()
    numero_colis = serializers.SerializerMethodField()
    numero_commande = serializers.SerializerMethodField()
    poids_kg = serializers.SerializerMethodField()
    nb_etapes = serializers.SerializerMethodField()

    ETAPE_KEYS = ['bon_collecte', 'fiche_collecte', 'bon_transport',
                  'lot_traitement', 'colis', 'commande_export']

    class Meta:
        model = TracabiliteChain
        fields = [
            'id', 'uuid', 'type_tracabilite', 'type_tracabilite_display',
            'producteur', 'producteur_nom', 'producteur_code',
            'bon_collecte_id', 'fiche_collecte_id', 'bon_transport_id',
            'lot_traitement_id', 'colis_id', 'commande_export_id',
            'numero_fabc', 'numero_colis', 'numero_commande', 'poids_kg',
            'nb_etapes', 'date_creation',
        ]

    def get_numero_fabc(self, obj):
        bc = (obj.chain_data or {}).get('bon_collecte')
        if isinstance(bc, dict):
            return bc.get('numero_fabc')
        if isinstance(bc, list) and bc:
            return ', '.join(str(b.get('numero_fabc', '')) for b in bc[:3])
        return None

    def get_numero_colis(self, obj):
        colis = (obj.chain_data or {}).get('colis')
        if isinstance(colis, dict):
            return colis.get('numero_colis')
        if isinstance(colis, list) and colis:
            return ', '.join(str(c.get('numero_colis', '')) for c in colis[:3])
        return None

    def get_numero_commande(self, obj):
        ce = (obj.chain_data or {}).get('commande_export')
        if isinstance(ce, dict):
            return ce.get('numero_commande')
        if isinstance(ce, list) and ce:
            return ce[0].get('numero_commande')
        return None

    def get_poids_kg(self, obj):
        data = obj.chain_data or {}
        bc = data.get('bon_collecte')
        if isinstance(bc, dict) and bc.get('poids_accepte') is not None:
            return bc.get('poids_accepte')
        ce = data.get('commande_export')
        if isinstance(ce, dict) and ce.get('poids_total_net') is not None:
            return ce.get('poids_total_net')
        return None

    def get_nb_etapes(self, obj):
        data = obj.chain_data or {}
        return sum(1 for k in self.ETAPE_KEYS if data.get(k))

# ==================== ESTIMATION DE PRODUCTION (Phase 5) ====================

class EstimationProductionSerializer(serializers.ModelSerializer):
    """Serializer pour les estimations de production."""

    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True)
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    type_vanille_display = serializers.CharField(source='get_type_vanille_display', read_only=True)

    class Meta:
        model = EstimationProduction
        fields = [
            'id', 'producteur', 'producteur_nom', 'producteur_code',
            'campagne', 'campagne_code',
            'quantite_estimee', 'type_vanille', 'type_vanille_display',
            'date_estimation', 'observations', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


# ==================== MAGASIN ====================

class MagasinSerializer(serializers.ModelSerializer):
    """Serializer pour les magasins."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    stock_actuel = serializers.DecimalField(
        max_digits=14, decimal_places=3, read_only=True
    )
    nb_fiches_stock = serializers.IntegerField(source='fiches_stock.count', read_only=True)

    class Meta:
        model = Magasin
        fields = [
            'id', 'nom', 'code', 'type', 'type_display',
            'localisation', 'responsable', 'telephone', 'actif',
            'stock_actuel', 'nb_fiches_stock',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


# ==================== BON DE LIVRAISON ====================

class BonLivraisonSerializer(serializers.ModelSerializer):
    """Serializer pour les bons de livraison."""

    commande_export_numero = serializers.CharField(
        source='commande_export.numero_commande', read_only=True
    )
    magasin_source_nom = serializers.CharField(source='magasin_source.nom', read_only=True)
    magasin_destination_nom = serializers.CharField(source='magasin_destination.nom', read_only=True)
    produit_display = serializers.CharField(source='get_produit_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = BonLivraison
        fields = [
            'id', 'numero', 'commande_export', 'commande_export_numero',
            'magasin_source', 'magasin_source_nom',
            'magasin_destination', 'magasin_destination_nom',
            'produit', 'produit_display', 'quantite',
            'date', 'transporteur', 'observations',
            'statut', 'statut_display',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


# ==================== ENTRÉE MAGASIN ====================

class EntreeMagasinSerializer(serializers.ModelSerializer):
    """Serializer pour les entrées magasin."""

    magasin_nom = serializers.CharField(source='magasin.nom', read_only=True)
    bon_livraison_numero = serializers.CharField(source='bon_livraison.numero', read_only=True)

    class Meta:
        model = EntreeMagasin
        fields = [
            'id', 'numero_bon', 'bon_livraison', 'bon_livraison_numero',
            'magasin', 'magasin_nom', 'produit', 'quantite_recue',
            'date', 'agent_receptionnaire', 'observations', 'date_creation',
        ]
        read_only_fields = ['date_creation']


# ==================== FICHE DE STOCK ====================

class FicheStockSerializer(serializers.ModelSerializer):
    """Serializer pour les fiches de stock."""

    magasin_nom = serializers.CharField(source='magasin.nom', read_only=True)
    type_mouvement_display = serializers.CharField(source='get_type_mouvement_display', read_only=True)
    solde = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)

    class Meta:
        model = FicheStock
        fields = [
            'id', 'magasin', 'magasin_nom', 'produit',
            'date', 'reference',
            'quantite_entree', 'quantite_sortie', 'solde',
            'type_mouvement', 'type_mouvement_display',
            'observations', 'date_creation',
        ]
        read_only_fields = ['solde', 'date_creation']
