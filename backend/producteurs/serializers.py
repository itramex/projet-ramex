from rest_framework import serializers
from datetime import datetime
from .models import Producteur, AGR
from .models import Dotation
from django.contrib.auth.models import User
from cooperatives.models import Cooperative
from parcelles.models import Parcelle

class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les informations utilisateur"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class AGRSerializer(serializers.ModelSerializer):
    """Serializer pour les AGR (Activités Génératrices de Revenus)"""
    
    # Read-only display fields
    producteur_code = serializers.CharField(
        source='producteur.code',
        read_only=True
    )
    producteur_nom = serializers.CharField(
        source='producteur.nom',
        read_only=True
    )
    type_agr_display = serializers.CharField(
        source='get_type_agr_display',
        read_only=True
    )
    utilisation_display = serializers.CharField(
        source='get_utilisation_display',
        read_only=True
    )
    
    class Meta:
        model = AGR
        fields = [
            'id', 'producteur', 'producteur_code', 'producteur_nom',
            'type_agr', 'type_agr_display', 'ordre',
            'intrants_recus', 'quantite_intrants',
            'utilisation', 'utilisation_display',
            'quantite_consommee_annuelle', 'quantite_vendue_annuelle',
            'unite_mesure', 'prix_vente_unitaire', 'revenu_annuel_estime',
            'nombre_bassins', 'nombre_volailles',
            'active', 'date_creation', 'date_modification'
        ]
        read_only_fields = ['revenu_annuel_estime', 'date_creation', 'date_modification']


class CooperativeSerializer(serializers.ModelSerializer):
    """Serializer léger pour la coopérative"""
    class Meta:
        model = Cooperative
        fields = ['id', 'code', 'nom', 'sigle', 'commune', 'village']


class DotationSerializer(serializers.ModelSerializer):
    """Serializer pour les dotations par année"""
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)

    class Meta:
        model = Dotation
        fields = [
            'id', 'producteur', 'producteur_code', 'type_dotation',
            'annee', 'quantite', 'details', 'date_enregistrement'
        ]
        read_only_fields = ['date_enregistrement']

    def validate_annee(self, value):
        """Validation métier: année de dotation obligatoire et cohérente."""
        current_year = datetime.now().year
        if value < 2000 or value > current_year + 1:
            raise serializers.ValidationError(
                f"L'année doit être comprise entre 2000 et {current_year + 1}."
            )
        return value
    
    def validate_telephone(self, value):
        """Valide le format du téléphone"""
        if value and len(value) < 9:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 9 chiffres.")
        return value
    
    def validate_email(self, value):
        """Valide l'email"""
        if value:
            instance = self.instance
            if instance:
                if Producteur.objects.exclude(pk=instance.pk).filter(email=value).exists():
                    raise serializers.ValidationError("Cet email est déjà utilisé.")
            else:
                if Producteur.objects.filter(email=value).exists():
                    raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value
    
    def validate(self, data):
        """Validations croisées"""
        # Validation des enfants
        nb_garcons = data.get('nb_enfants_garcons', 0)
        nb_filles = data.get('nb_enfants_filles', 0)
        nb_scolarises = data.get('nb_enfants_scolarises', 0)
        
        total_enfants_propres = nb_garcons + nb_filles
        
        if nb_scolarises > total_enfants_propres:
            raise serializers.ValidationError({
                'nb_enfants_scolarises': 'Le nombre d\'enfants scolarisés ne peut pas dépasser le nombre total d\'enfants.'
            })
        
        # Validation des adultes
        nb_adultes_total = data.get('nb_adultes_plus_18', 0)
        nb_hommes = data.get('nb_hommes_adultes', 0)
        nb_femmes = data.get('nb_femmes_adultes', 0)
        
        if (nb_hommes + nb_femmes) > nb_adultes_total:
            raise serializers.ValidationError({
                'nb_adultes_plus_18': 'Le total hommes + femmes ne peut pas dépasser le nombre total d\'adultes.'
            })
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['cree_par'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Mise à jour avec traçabilité"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['modifie_par'] = request.user
        return super().update(instance, validated_data)


class ProducteurListSerializer(serializers.ModelSerializer):
    """Serializer optimisé pour les listes — champs essentiels uniquement.
    Les champs détaillés sont disponibles via ProducteurDetailSerializer."""
    
    nom_complet = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    total_enfants = serializers.ReadOnlyField()
    photo_url = serializers.SerializerMethodField()
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    responsabilite_cooperative_display = serializers.CharField(source='get_responsabilite_cooperative_display', read_only=True)
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)
    statut_matrimonial_display = serializers.CharField(source='get_statut_matrimonial_display', read_only=True)
    niveau_education_display = serializers.CharField(source='get_niveau_education_display', read_only=True)
    
    class Meta:
        model = Producteur
        fields = [
            # Identification
            'id', 'code', 'nom', 'prenom', 'cin', 'nom_complet', 'sexe', 'sexe_display', 'age', 'date_naissance',
            # Contact
            'telephone', 'email',
            # Localisation
            'village', 'fokontany', 'commune',
            # Coopérative
            'cooperative', 'cooperative_nom', 'responsabilite_cooperative', 'responsabilite_cooperative_display',
            'date_adhesion_cooperative',
            # Statut
            'actif', 'verifie', 'photo_url',
            # Leadership
            'femme_leader', 'paysan_relais', 'satellite_floraison',
            # Foyer (pour filtres dashboard)
            'total_enfants', 'nb_enfants_scolarises', 'nb_enfants_non_scolarises',
            # Affichage personnalisé (colonnes activables)
            'statut_matrimonial', 'statut_matrimonial_display',
            'niveau_education', 'niveau_education_display',
            'membre_groupement_epargne',
            'mahavelona', 'a_assurance_sante',
            'agr1', 'agr2', 'dotation',
            # Audit
            'date_modification',
        ]
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None


class ProducteurDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour les détails d'un producteur"""
    
    # Relations
    desactive_par_info = UserSerializer(source='desactive_par', read_only=True)
    cree_par_info = UserSerializer(source='cree_par', read_only=True)
    modifie_par_info = UserSerializer(source='modifie_par', read_only=True)
    verifie_par_info = UserSerializer(source='verifie_par', read_only=True)
    cooperative_info = CooperativeSerializer(source='cooperative', read_only=True)
    
    # AGR data
    agr_activities = AGRSerializer(many=True, read_only=True)
    total_revenu_agr = serializers.ReadOnlyField()
    
    # Propriétés calculées
    age = serializers.ReadOnlyField()
    nom_complet = serializers.ReadOnlyField()
    total_enfants = serializers.ReadOnlyField()
    
    # URLs des fichiers
    photo_url = serializers.SerializerMethodField()
    
    # Display fields for choices
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)
    statut_matrimonial_display = serializers.CharField(source='get_statut_matrimonial_display', read_only=True)
    niveau_education_display = serializers.CharField(source='get_niveau_education_display', read_only=True)
    responsabilite_cooperative_display = serializers.CharField(source='get_responsabilite_cooperative_display', read_only=True)
    source_eau_display = serializers.CharField(source='get_source_eau_display', read_only=True)
    type_centre_sante_display = serializers.CharField(source='get_type_centre_sante_display', read_only=True)
    
    class Meta:
        model = Producteur
        fields = '__all__'
        read_only_fields = [
            'date_adhesion_cooperative', 'date_modification', 'date_desactivation',
            'desactive_par', 'cree_par', 'modifie_par', 'date_verification',
            'verifie_par', 'verifie'
        ]
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None

    # Champs Dotations - Liste des dotations structurées
    dotations = DotationSerializer(many=True, read_only=True)


class ProducteurCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la création et mise à jour"""
    
    # Display fields for choices (read-only)
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)
    statut_matrimonial_display = serializers.CharField(source='get_statut_matrimonial_display', read_only=True)
    niveau_education_display = serializers.CharField(source='get_niveau_education_display', read_only=True)
    responsabilite_cooperative_display = serializers.CharField(source='get_responsabilite_cooperative_display', read_only=True)
    source_eau_display = serializers.CharField(source='get_source_eau_display', read_only=True)
    type_centre_sante_display = serializers.CharField(source='get_type_centre_sante_display', read_only=True)
    
    class Meta:
        model = Producteur
        exclude = [
            'date_adhesion_cooperative', 'date_modification', 'date_desactivation',
            'desactive_par', 'date_verification', 'verifie_par', 'verifie',
            'cree_par', 'modifie_par'
        ]
    
    def validate_code(self, value):
        """Valide l'unicité du code producteur"""
        instance = self.instance
        if instance:
            # Modification - exclure l'instance actuelle
            if Producteur.objects.exclude(pk=instance.pk).filter(code=value).exists():
                raise serializers.ValidationError("Ce code producteur existe déjà.")
        else:
            # Création - vérifier que le code n'existe pas
            if Producteur.objects.filter(code=value).exists():
                raise serializers.ValidationError("Ce code producteur existe déjà.")
        return value


class ProducteurStatistiquesSerializer(serializers.Serializer):
    """Serializer pour les statistiques"""
    
    total = serializers.IntegerField()
    actifs = serializers.IntegerField()
    inactifs = serializers.IntegerField()
    verifies = serializers.IntegerField()
    pourcentage_actifs = serializers.FloatField()
    pourcentage_verifies = serializers.FloatField()
    
    # Statistiques démographiques
    par_sexe = serializers.ListField()
    par_village = serializers.ListField()
    par_commune = serializers.ListField()
    par_cooperative = serializers.ListField()
    
    # Statistiques éducation
    par_niveau_education = serializers.ListField()
    
    # Statistiques enfants
    total_enfants = serializers.IntegerField()
    enfants_scolarises = serializers.IntegerField()
    taux_scolarisation = serializers.FloatField()
    
    # Statistiques hygiène
    avec_poubelles = serializers.IntegerField()
    avec_wc = serializers.IntegerField()
    eau_potable = serializers.IntegerField()
    
    # Statistiques environnement
    respecte_environnement = serializers.IntegerField()
    pratique_tavy = serializers.IntegerField()
    
    # Leadership
    femmes_leaders = serializers.IntegerField()
    paysans_relais = serializers.IntegerField()


class ProducteurExportSerializer(serializers.ModelSerializer):
    """Serializer pour l'export CSV/Excel avec tous les champs"""
    
    nom_complet = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    total_enfants = serializers.ReadOnlyField()
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    cree_par_nom = serializers.CharField(source='cree_par.username', read_only=True, allow_null=True)
    
    class Meta:
        model = Producteur
        fields = '__all__'

class ParcelleListSerializer(serializers.ModelSerializer):
    """Serializer simple pour les parcelles"""
    producteur = serializers.CharField(source='producteur.nom', read_only=True)
    
    class Meta:
        model = Parcelle
        fields = '__all__'
