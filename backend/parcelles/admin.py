from django.contrib.gis import admin as gis_admin
from django.contrib import admin
from .models import Parcelle


@admin.register(Parcelle)
class ParcelleAdmin(gis_admin.GISModelAdmin):
    """✅ Admin avec carte interactive (Django 5.x compatible)"""
    
    # Configuration du widget carte
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 12,
            'default_lon': 47.5079,  # Longitude pour Madagascar
            'default_lat': -18.8792,  # Latitude pour Madagascar
        },
    }
    
    list_display = [
        'code_parcelle', 'numero_parcelle', 'producteur', 'localisation',
        'dimension_ha', 'nombre_pieds', 'type_vanille', 'certifiee', 'active'
    ]
    
    list_filter = [
        'active', 'certifiee', 'type_vanille', 
        'type_certification', 'type_propriete'
    ]
    
    search_fields = [
        'code_parcelle', 'localisation', 
        'producteur__nom', 'producteur__prenom', 'producteur__code'
    ]
    
    readonly_fields = [
        'code_parcelle', 'date_enregistrement', 'date_modification', 
        'age_parcelle', 'latitude', 'longitude', 'superficie_m2'
    ]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('producteur', 'numero_parcelle', 'code_parcelle')
        }),
        ('Géolocalisation', {
            'fields': (
                'localisation', 
                'point',  # ✅ Carte interactive
                'polygon',  # ✅ Polygone optionnel
                'latitude', 'longitude',  # ✅ Lecture seule
                'gps_latitude', 'gps_longitude',  # Ancien système (lecture seule)
                'distance_habitation'
            )
        }),
        ('Dimension', {
            'fields': ('dimension_ha', 'superficie_m2')
        }),
        ('Culture vanille', {
            'fields': (
                'nombre_pieds', 'annee_plantation', 'age_parcelle', 'type_vanille',
                'estimation_production_kg', 'cultures_autour'
            )
        }),
        ('Caractéristiques', {
            'fields': ('profil_parcelle', 'type_propriete')
        }),
        ('Certification', {
            'fields': ('certifiee', 'type_certification')
        }),
        ('Média', {
            'fields': ('photo_parcelle',)
        }),
        ('Statut', {
            'fields': ('active',)
        }),
        ('Traçabilité', {
            'fields': ('date_enregistrement', 'date_modification', 'cree_par', 'modifie_par'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Ajouter l'utilisateur lors de la création/modification"""
        if not change:
            obj.cree_par = request.user
        obj.modifie_par = request.user
        super().save_model(request, obj, form, change)
