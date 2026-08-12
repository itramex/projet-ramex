from rest_framework import serializers
from .models import Region, District, Commune, Fokontany, Village, Agence, StructureIntermediaire


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'nom', 'code', 'actif']


class DistrictSerializer(serializers.ModelSerializer):
    region_nom = serializers.CharField(source='region.nom', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'nom', 'code', 'region', 'region_nom', 'actif']


class CommuneSerializer(serializers.ModelSerializer):
    district_nom = serializers.CharField(source='district.nom', read_only=True)

    class Meta:
        model = Commune
        fields = ['id', 'nom', 'code', 'district', 'district_nom', 'actif']


class FokontanySerializer(serializers.ModelSerializer):
    commune_nom = serializers.CharField(source='commune.nom', read_only=True)

    class Meta:
        model = Fokontany
        fields = ['id', 'nom', 'code', 'commune', 'commune_nom', 'actif']


class VillageSerializer(serializers.ModelSerializer):
    fokontany_nom = serializers.CharField(source='fokontany.nom', read_only=True)

    class Meta:
        model = Village
        fields = ['id', 'nom', 'code', 'fokontany', 'fokontany_nom', 'actif']


class AgenceSerializer(serializers.ModelSerializer):
    district_nom = serializers.CharField(source='district.nom', read_only=True)

    class Meta:
        model = Agence
        fields = ['id', 'nom', 'code', 'district', 'district_nom', 'actif', 'adresse', 'telephone', 'email']


class StructureIntermediaireSerializer(serializers.ModelSerializer):
    fokontany_nom = serializers.CharField(source='fokontany.nom', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)

    class Meta:
        model = StructureIntermediaire
        fields = ['id', 'nom', 'telephone', 'fokontany', 'fokontany_nom', 'cooperative', 'cooperative_nom', 'actif']