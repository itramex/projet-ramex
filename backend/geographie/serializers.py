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
    # G-3b — rattachements exposés (annotés dans AgenceViewSet.get_queryset)
    # pour que l'UI propose « Désactiver » au lieu de « Supprimer ».
    nb_cooperatives = serializers.IntegerField(read_only=True, default=0)
    nb_utilisateurs = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Agence
        fields = ['id', 'nom', 'code', 'district', 'district_nom', 'actif', 'adresse',
                  'telephone', 'email', 'nb_cooperatives', 'nb_utilisateurs']

    def _generer_code(self, district, instance=None):
        """G-5 : code obligatoire + généré au format AG-<DISTRICT>-<n> (≤ 20 car.).

        Corrige la limite 8 : deux agences créées sans code écrasaient '' dans un
        champ unique → IntegrityError. Sans migration : le champ reste blank=True
        en base, mais la couche API garantit qu'un code est toujours présent.
        """
        prefixe = (getattr(district, 'code', None) or '').strip().upper() or 'AG'
        base = f'AG-{prefixe}'[:15]  # garde la place du suffixe '-<n>' (≤ 4 chiffres)
        numero = 1
        while numero < 10000:
            candidat = f'{base}-{numero}'
            doublon = Agence.objects.filter(code=candidat)
            if instance is not None:
                doublon = doublon.exclude(pk=instance.pk)
            if not doublon.exists():
                return candidat
            numero += 1
        return f'{base}-X'  # jamais atteint en pratique

    def create(self, validated_data):
        if not str(validated_data.get('code') or '').strip():
            validated_data['code'] = self._generer_code(validated_data.get('district'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Un code effacé explicitement est régénéré ; une omission (PATCH) le conserve.
        if 'code' in validated_data and not str(validated_data['code'] or '').strip():
            district = validated_data.get('district') or instance.district
            validated_data['code'] = self._generer_code(district, instance)
        return super().update(instance, validated_data)


class StructureIntermediaireSerializer(serializers.ModelSerializer):
    fokontany_nom = serializers.CharField(source='fokontany.nom', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)

    class Meta:
        model = StructureIntermediaire
        fields = ['id', 'nom', 'telephone', 'fokontany', 'fokontany_nom', 'cooperative', 'cooperative_nom', 'actif']