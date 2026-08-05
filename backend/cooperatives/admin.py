from django.contrib import admin
from .models import Cooperative


@admin.register(Cooperative)
class CooperativeAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'nom', 'commune', 'nombre_membres',
        'active', 'certifiee', 'date_creation'
    ]
    list_filter = ['active', 'certifiee', 'region', 'district']
    search_fields = ['code', 'nom', 'commune', 'village']
    readonly_fields = ['date_enregistrement', 'date_modification', 'nombre_producteurs']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('code', 'nom', 'sigle', 'description')
        }),
        ('Localisation', {
            'fields': ('region', 'district', 'commune', 'fokontany', 'village')
        }),
        ('Contact', {
            'fields': ('telephone', 'email')
        }),
        ('Administration', {
            'fields': (
                'numero_agrement', 'date_creation', 'date_agrement',
                'active', 'certifiee', 'type_certification'
            )
        }),
        ('Membres', {
            'fields': ('nombre_membres', 'nombre_hommes', 'nombre_femmes', 'nombre_producteurs')
        }),
        ('Responsables', {
            'fields': (
                'president_nom', 'president_telephone',
                'secretaire_nom', 'secretaire_telephone',
                'tresorier_nom', 'tresorier_telephone'
            )
        }),
        ('Autres', {
            'fields': ('objectifs', 'logo')
        }),
        ('Traçabilité', {
            'fields': ('date_enregistrement', 'date_modification', 'cree_par', 'modifie_par'),
            'classes': ('collapse',)
        }),
    )
