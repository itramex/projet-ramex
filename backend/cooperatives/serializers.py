from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Cooperative

User = get_user_model()


class UserInfoSerializer(serializers.ModelSerializer):
    """Serializer pour les infos basiques d'un utilisateur"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class CooperativeListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des coopératives"""
    nombre_producteurs = serializers.SerializerMethodField()
    superficie_totale_ha = serializers.SerializerMethodField()
    nombre_membres = serializers.SerializerMethodField()
    nombre_hommes = serializers.SerializerMethodField()
    nombre_femmes = serializers.SerializerMethodField()
    villages = serializers.SerializerMethodField()
    
    # Champs géographiques normalisés
    region_ref_nom = serializers.CharField(source='region_ref.nom', read_only=True, allow_null=True)
    district_ref_nom = serializers.CharField(source='district_ref.nom', read_only=True, allow_null=True)
    commune_ref_nom = serializers.CharField(source='commune_ref.nom', read_only=True, allow_null=True)
    fokontany_ref_nom = serializers.CharField(source='fokontany_ref.nom', read_only=True, allow_null=True)
    village_ref_nom = serializers.CharField(source='village_ref.nom', read_only=True, allow_null=True)
    agence_nom = serializers.CharField(source='agence.nom', read_only=True, allow_null=True)
    
    class Meta:
        model = Cooperative
        fields = [
            'id', 'code', 'nom', 'sigle', 'region', 'district', 'commune',
            'village', 'telephone', 'email', 'active', 'annee_creation',
            'nombre_membres', 'nombre_hommes', 'nombre_femmes',
            'nombre_producteurs', 'superficie_totale_ha',
            'date_creation', 'date_enregistrement', 'villages',
            # Champs géographiques normalisés
            'region_ref', 'region_ref_nom', 'district_ref', 'district_ref_nom',
            'commune_ref', 'commune_ref_nom', 'fokontany_ref', 'fokontany_ref_nom',
            'village_ref', 'village_ref_nom', 'agence', 'agence_nom',
        ]
    
    def get_villages(self, obj):
        """Récupérer la liste des villages uniques des producteurs actifs"""
        return list(obj.producteurs.filter(actif=True).exclude(village='').values_list('village', flat=True).distinct().order_by('village'))
    
    def get_nombre_membres(self, obj):
        """Calculer le nombre total de membres actifs"""
        return getattr(obj, '_nb_producteurs_actifs', None) or 0
    
    def get_nombre_hommes(self, obj):
        """Calculer le nombre d'hommes actifs"""
        return getattr(obj, '_nb_hommes_actifs', None) or 0
    
    def get_nombre_femmes(self, obj):
        """Calculer le nombre de femmes actives"""
        return getattr(obj, '_nb_femmes_actifs', None) or 0
    
    def get_nombre_producteurs(self, obj):
        """Compter les producteurs actifs de cette coopérative"""
        return getattr(obj, '_nb_producteurs_actifs', None) or 0
    
    def get_superficie_totale_ha(self, obj):
        """Calculer la superficie totale des parcelles"""
        return round(getattr(obj, '_superficie_totale', 0) or 0, 2)


class CooperativeDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une coopérative"""
    cree_par_info = UserInfoSerializer(source='cree_par', read_only=True)
    modifie_par_info = UserInfoSerializer(source='modifie_par', read_only=True)
    nombre_producteurs = serializers.SerializerMethodField()
    superficie_totale_ha = serializers.SerializerMethodField()
    responsables = serializers.SerializerMethodField()
    membres = serializers.SerializerMethodField()
    villages = serializers.SerializerMethodField()
    type_certification_display = serializers.CharField(source='get_type_certification_display', read_only=True)
    
    class Meta:
        model = Cooperative
        fields = '__all__'
    
    def get_nombre_producteurs(self, obj):
        """Compter les producteurs actifs"""
        return obj.producteurs.filter(actif=True).count()
    
    def get_superficie_totale_ha(self, obj):
        """Calculer la superficie totale"""
        from django.db.models import Sum
        total = obj.producteurs.filter(actif=True).aggregate(
            total=Sum('parcelles__dimension_ha')
        )['total']
        return round(total, 2) if total else 0
    
    def get_villages(self, obj):
        """Récupérer la liste des villages uniques des producteurs actifs"""
        return list(obj.producteurs.filter(actif=True).exclude(village='').values_list('village', flat=True).distinct().order_by('village'))
    
    def get_responsables(self, obj):
        """Récupérer les producteurs ayant une responsabilité"""
        from producteurs.serializers import ProducteurListSerializer
        
        responsables = obj.producteurs.filter(
            actif=True
        ).exclude(
            responsabilite_cooperative='aucune'
        ).order_by('responsabilite_cooperative', 'nom', 'prenom')
        
        return ProducteurListSerializer(responsables, many=True).data
    
    def get_membres(self, obj):
        """Récupérer tous les membres de la coopérative"""
        from producteurs.serializers import ProducteurListSerializer
        
        membres = obj.producteurs.filter(actif=True).order_by('nom', 'prenom')
        
        return ProducteurListSerializer(membres, many=True).data


class CooperativeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création et mise à jour"""
    type_certification_display = serializers.CharField(source='get_type_certification_display', read_only=True)
    
    class Meta:
        model = Cooperative
        fields = [
            'code', 'nom', 'sigle', 'region', 'district', 'commune',
            'fokontany', 'village', 'telephone', 'email', 'annee_creation',
            'date_creation', 'nombre_hommes', 'nombre_femmes',
            'description', 'objectifs', 'active', 'type_certification', 'type_certification_display',
            # Champs géographiques normalisés
            'region_ref', 'district_ref', 'commune_ref', 'fokontany_ref', 'village_ref', 'agence',
        ]
    
    def validate_code(self, value):
        """Valider l'unicité du code"""
        instance = self.instance
        if instance:
            if Cooperative.objects.exclude(pk=instance.pk).filter(code=value).exists():
                raise serializers.ValidationError("Ce code existe déjà")
        else:
            if Cooperative.objects.filter(code=value).exists():
                raise serializers.ValidationError("Ce code existe déjà")
        return value
