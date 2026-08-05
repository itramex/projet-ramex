from rest_framework import serializers
from .models import Recommendation, Activite, MahavelonaArchive
from producteurs.models import Producteur


class ProducteurBasicSerializer(serializers.ModelSerializer):
    """Serializer basique pour les références de producteurs"""
    nom_complet = serializers.SerializerMethodField()
    
    class Meta:
        model = Producteur
        fields = ['id', 'code', 'nom', 'prenom', 'nom_complet']
    
    def get_nom_complet(self, obj):
        return f"{obj.nom} {obj.prenom}"


class RecommendationSerializer(serializers.ModelSerializer):
    """Serializer pour les recommandations"""
    producteur_info = ProducteurBasicSerializer(source='producteur', read_only=True)
    score_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = Recommendation
        fields = [
            'id',
            'producteur',
            'producteur_info',
            'type_activite',
            'description',
            'score_pertinence',
            'score_display',
            'explication',
            'date_generation',
            'statut',
            'status_display',
            'date_execution',
            'sources'
        ]
        read_only_fields = ['date_generation']
    
    def get_score_display(self, obj):
        """Retourne le score sur 10"""
        return obj.get_score_display()


class ActiviteSerializer(serializers.ModelSerializer):
    """Serializer pour les activités"""
    producteur_info = ProducteurBasicSerializer(source='producteur', read_only=True)
    
    class Meta:
        model = Activite
        fields = [
            'id',
            'producteur',
            'producteur_info',
            'type',
            'description',
            'date',
            'impact_score',
            'cout',
            'resultats'
        ]
    
    def validate_impact_score(self, value):
        """Valide que le score est entre 0 et 10"""
        if not 0 <= value <= 10:
            raise serializers.ValidationError("Le score doit être entre 0 et 10")
        return value


class RecommendationStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques des recommandations"""
    total_recommendations = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    executed_count = serializers.IntegerField()
    rejected_count = serializers.IntegerField()
    avg_score = serializers.FloatField()
    top_activities = serializers.ListField()
    recent_recommendations = RecommendationSerializer(many=True)


class MahavelonaArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = MahavelonaArchive
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']
