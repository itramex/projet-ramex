from django.contrib import admin
from .models import PhaseAgricole, PhaseCampagne, IndicateurCampagne


@admin.register(PhaseAgricole)
class PhaseAgricoleAdmin(admin.ModelAdmin):
    list_display = ['nom', 'code', 'pilier', 'type_phase', 'mois_debut', 'mois_fin', 'actif']
    list_filter = ['pilier', 'type_phase', 'actif']
    search_fields = ['nom', 'code']


@admin.register(PhaseCampagne)
class PhaseCampagneAdmin(admin.ModelAdmin):
    list_display = ['campagne', 'phase', 'date_debut', 'date_fin', 'statut']
    list_filter = ['statut', 'campagne']
    search_fields = ['campagne__code', 'phase__nom']


@admin.register(IndicateurCampagne)
class IndicateurCampagneAdmin(admin.ModelAdmin):
    list_display = ['campagne', 'libelle', 'type', 'objectif', 'realise', 'pilier']
    list_filter = ['pilier', 'type', 'campagne']
    search_fields = ['libelle', 'campagne__code']