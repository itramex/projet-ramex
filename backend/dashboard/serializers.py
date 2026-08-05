from rest_framework import serializers
from .models import VillageReference


class VillageReferenceSerializer(serializers.ModelSerializer):
    """Serializer pour VillageReference"""
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = VillageReference
        fields = ['id', 'name', 'commune', 'fokontany', 'region', 'display_name', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_display_name(self, obj):
        """Retourne un nom d'affichage complet"""
        parts = [obj.name]
        if obj.fokontany:
            parts.append(f"Fokontany: {obj.fokontany}")
        if obj.commune:
            parts.append(f"Commune: {obj.commune}")
        if obj.region:
            parts.append(f"Région: {obj.region}")
        return " - ".join(parts)
