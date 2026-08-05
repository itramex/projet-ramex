from django.contrib import admin
from .models import ProductionHistory, AGRHistory, SocialIndicatorHistory, AnnualSnapshot


@admin.register(ProductionHistory)
class ProductionHistoryAdmin(admin.ModelAdmin):
    list_display = ('parcelle', 'annee', 'culture', 'quantite_kg', 'revenu_total', 'date_enregistrement')
    list_filter = ('annee', 'culture', 'parcelle__producteur__cooperative')
    search_fields = ('parcelle__code_parcelle', 'parcelle__producteur__code', 'culture')
    readonly_fields = ('date_enregistrement', 'enregistre_par', 'revenu_total')
    ordering = ('-annee', 'parcelle')
    
    fieldsets = (
        ('Identification', {
            'fields': ('parcelle', 'annee', 'culture')
        }),
        ('Données de production', {
            'fields': ('quantite_kg', 'prix_vente_kg', 'revenu_total')
        }),
        ('Métadonnées', {
            'fields': ('notes', 'date_enregistrement', 'enregistre_par'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création
            obj.enregistre_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(AGRHistory)
class AGRHistoryAdmin(admin.ModelAdmin):
    list_display = ('producteur', 'annee', 'type_agr', 'ordre', 'revenu_annuel', 'date_enregistrement')
    list_filter = ('annee', 'type_agr', 'producteur__cooperative')
    search_fields = ('producteur__code', 'producteur__nom', 'type_agr')
    readonly_fields = ('date_enregistrement', 'enregistre_par')
    ordering = ('-annee', 'producteur', 'ordre')
    
    fieldsets = (
        ('Identification', {
            'fields': ('producteur', 'annee', 'type_agr', 'ordre')
        }),
        ('Données quantitatives', {
            'fields': ('quantite_produite', 'quantite_vendue', 'quantite_consommee', 'prix_vente_unitaire', 'revenu_annuel')
        }),
        ('Métadonnées', {
            'fields': ('notes', 'date_enregistrement', 'enregistre_par'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.enregistre_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(SocialIndicatorHistory)
class SocialIndicatorHistoryAdmin(admin.ModelAdmin):
    list_display = ('producteur', 'annee', 'type_indicateur', 'get_valeur', 'date_enregistrement')
    list_filter = ('annee', 'type_indicateur', 'producteur__cooperative')
    search_fields = ('producteur__code', 'producteur__nom')
    readonly_fields = ('date_enregistrement', 'enregistre_par')
    ordering = ('-annee', 'producteur')
    
    fieldsets = (
        ('Identification', {
            'fields': ('producteur', 'annee', 'type_indicateur')
        }),
        ('Valeur', {
            'fields': ('valeur_numerique', 'valeur_texte', 'valeur_booleen'),
            'description': 'Remplir le champ approprié selon le type d\'indicateur'
        }),
        ('Métadonnées', {
            'fields': ('notes', 'date_enregistrement', 'enregistre_par'),
            'classes': ('collapse',)
        }),
    )
    
    def get_valeur(self, obj):
        """Retourne la valeur appropriée selon le type"""
        if obj.valeur_numerique is not None:
            return f"{obj.valeur_numerique}"
        elif obj.valeur_texte:
            return obj.valeur_texte
        elif obj.valeur_booleen is not None:
            return "Oui" if obj.valeur_booleen else "Non"
        return "-"
    get_valeur.short_description = "Valeur"
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.enregistre_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnnualSnapshot)
class AnnualSnapshotAdmin(admin.ModelAdmin):
    list_display = ('annee', 'nb_producteurs', 'nb_parcelles', 'production_totale_kg', 'revenu_total_agr', 'verrouille', 'date_creation')
    list_filter = ('verrouille', 'annee')
    search_fields = ('annee', 'description')
    readonly_fields = ('date_creation', 'cree_par')
    ordering = ('-annee',)
    
    fieldsets = (
        ('Année', {
            'fields': ('annee',)
        }),
        ('Statistiques agrégées', {
            'fields': ('nb_producteurs', 'nb_parcelles', 'production_totale_kg', 'revenu_total_agr')
        }),
        ('Métadonnées', {
            'fields': ('description', 'verrouille', 'date_creation', 'cree_par')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.cree_par = request.user
        super().save_model(request, obj, form, change)
    
    def has_delete_permission(self, request, obj=None):
        """Empêcher la suppression des snapshots verrouillés"""
        if obj and obj.verrouille:
            return False
        return super().has_delete_permission(request, obj)
