from rest_framework import serializers
from .models import PhaseAgricole, PhaseCampagne, IndicateurCampagne


class PhaseAgricoleSerializer(serializers.ModelSerializer):
    """Serializer pour le référentiel des phases agricoles."""

    pilier_display = serializers.CharField(source='get_pilier_display', read_only=True)
    type_phase_display = serializers.CharField(source='get_type_phase_display', read_only=True)
    mois_actifs = serializers.ListField(child=serializers.IntegerField(), read_only=True)

    class Meta:
        model = PhaseAgricole
        fields = [
            'id', 'code', 'nom', 'pilier', 'pilier_display',
            'type_phase', 'type_phase_display',
            'mois_debut', 'mois_fin', 'cycle_croise', 'toute_annee',
            'couleur', 'ordre', 'description', 'actif',
            'mois_actifs', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


class PhaseCampagneSerializer(serializers.ModelSerializer):
    """Serializeré des phases planifiées par campagne."""

    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    phase_nom = serializers.CharField(source='phase.nom', read_only=True)
    phase_pilier = serializers.CharField(source='phase.pilier', read_only=True)
    phase_couleur = serializers.CharField(source='phase.couleur', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    taux_realisation = serializers.FloatField(read_only=True)

    class Meta:
        model = PhaseCampagne
        fields = [
            'id', 'campagne', 'campagne_code', 'phase', 'phase_nom',
            'phase_pilier', 'phase_couleur', 'date_debut', 'date_fin',
            'statut', 'statut_display', 'objectif', 'realise',
            'taux_realisation', 'responsable', 'observations',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']


class IndicateurCampagneSerializer(serializers.ModelSerializer):
    """Serializeré des indicateurs de campagne."""

    campagne_code = serializers.CharField(source='campagne.code', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    pilier_display = serializers.CharField(source='get_pilier_display', read_only=True)
    taux_realisation = serializers.FloatField(read_only=True)

    class Meta:
        model = IndicateurCampagne
        fields = [
            'id', 'campagne', 'campagne_code', 'libelle',
            'type', 'type_display', 'objectif', 'realise',
            'taux_realisation', 'pilier', 'pilier_display',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']