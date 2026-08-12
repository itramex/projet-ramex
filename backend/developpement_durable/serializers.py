from rest_framework import serializers
from .models import PartenaireDD, ActiviteDD


class PartenaireDDSerializer(serializers.ModelSerializer):
    """Serializer pour les partenaires DD"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = PartenaireDD
        fields = [
            'id', 'nom', 'type', 'type_display', 'contact', 'telephone',
            'email', 'adresse', 'description', 'actif',
            'date_creation', 'date_modification'
        ]


class ActiviteDDSerializer(serializers.ModelSerializer):
    """Serializer pour les activités DD"""
    type_activite_display = serializers.CharField(source='get_type_activite_display', read_only=True)
    objectif_client_display = serializers.CharField(source='get_objectif_client_display', read_only=True)
    cooperative_nom = serializers.CharField(source='cooperative.nom', read_only=True, allow_null=True)
    producteur_nom = serializers.CharField(source='producteur.nom_complet', read_only=True, allow_null=True)
    partenaire_nom = serializers.CharField(source='partenaire.nom', read_only=True, allow_null=True)
    responsable_nom = serializers.CharField(source='responsable.username', read_only=True, allow_null=True)
    
    class Meta:
        model = ActiviteDD
        fields = [
            'id', 'type_activite', 'type_activite_display', 'date',
            'cooperative', 'cooperative_nom', 'producteur', 'producteur_nom',
            'partenaire', 'partenaire_nom',
            'objectif_client', 'objectif_client_display',
            'description', 'resultat', 'nombre_participants', 'notes',
            'responsable', 'responsable_nom',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_creation', 'date_modification']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['cree_par'] = request.user
            validated_data['responsable'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user and 'responsable' not in validated_data:
            validated_data['responsable'] = request.user
        return super().update(instance, validated_data)