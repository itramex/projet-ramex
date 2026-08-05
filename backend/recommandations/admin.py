# recommandations/admin.py
from django.contrib import admin
from .models import Recommendation, Activite


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'producteur',
        'type_activite',
        'get_score_display',
        'statut',
        'date_generation'
    ]
    list_filter = ['statut', 'date_generation']
    search_fields = ['type_activite', 'producteur__nom', 'producteur__prenom']
    readonly_fields = ['date_generation']
    ordering = ['-date_generation', '-score_pertinence']
    
    fieldsets = (
        ('Informations', {
            'fields': ('producteur', 'type_activite', 'description')
        }),
        ('Scoring', {
            'fields': ('score_pertinence', 'explication', 'sources')
        }),
        ('Statut', {
            'fields': ('statut', 'date_generation', 'date_execution')
        }),
    )


@admin.register(Activite)
class ActiviteAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'producteur',
        'type',
        'date',
        'impact_score',
        'cout'
    ]
    list_filter = ['type', 'date']
    search_fields = ['type', 'description', 'producteur__nom']
    ordering = ['-date']
    
    fieldsets = (
        ('Informations', {
            'fields': ('producteur', 'type', 'description', 'date')
        }),
        ('Évaluation', {
            'fields': ('impact_score', 'cout', 'resultats')
        }),
    )
