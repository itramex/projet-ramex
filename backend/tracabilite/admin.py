# tracabilite/admin.py
from django.contrib import admin
from .models import (
    Campagne,
    BonCollecte,
    DetailSacBonCollecte,
    FicheCollecte,
    BonTransport,
    DetailSacBonTransport,
    LotTraitement,
    Colis,
    CommandeExport,
    TracabiliteChain
)


@admin.register(Campagne)
class CampagneAdmin(admin.ModelAdmin):
    list_display = ['code', 'annee_debut', 'annee_fin', 'statut', 'date_debut', 'date_fin']
    list_filter = ['statut']
    search_fields = ['code']


class DetailSacBonCollecteInline(admin.TabularInline):
    model = DetailSacBonCollecte
    extra = 1
    fields = ['numero_sac', 'poids_brut', 'tare', 'poids_net']


@admin.register(BonCollecte)
class BonCollecteAdmin(admin.ModelAdmin):
    list_display = [
        'numero_fabc',
        'date_marche',
        'producteur',
        'poids_accepte',
        'montant_total_achat',
        'certification'
    ]
    list_filter = ['date_marche', 'type_produit', 'certification', 'campagne']
    search_fields = ['numero_fabc', 'producteur__nom', 'producteur__code']
    inlines = [DetailSacBonCollecteInline]
    readonly_fields = ['date_creation', 'date_modification']
    
    fieldsets = (
        ('Identification', {
            'fields': ('numero_fabc', 'campagne', 'date_marche')
        }),
        ('Producteur', {
            'fields': ('producteur', 'cooperative', 'est_vente_groupee', 'producteurs_groupes')
        }),
        ('Localisation', {
            'fields': ('village_marche', 'commune', 'fokontany')
        }),
        ('Produit', {
            'fields': ('type_produit', 'certification')
        }),
        ('Poids', {
            'fields': ('poids_total_livre', 'poids_accepte', 'poids_retour')
        }),
        ('Finances', {
            'fields': (
                'prix_unitaire_marche',
                'montant_premium',
                'montant_total_achat',
                'mode_paiement'
            )
        }),
        ('Avances', {
            'fields': (
                'montant_avances_anterieures',
                'remboursement_par_vanille',
                'remboursement_especes',
                'solde_avances'
            )
        }),
        ('Métadonnées', {
            'fields': ('date_creation', 'date_modification')
        })
    )


@admin.register(FicheCollecte)
class FicheCollecteAdmin(admin.ModelAdmin):
    list_display = [
        'numero_fc',
        'date_marche',
        'fokontany',
        'nombre_producteurs',
        'poids_total_net',
        'montant_total'
    ]
    list_filter = ['date_marche', 'certification', 'campagne']
    search_fields = ['numero_fc', 'fokontany']
    filter_horizontal = ['bons_collecte']


class DetailSacBonTransportInline(admin.TabularInline):
    model = DetailSacBonTransport
    extra = 1
    fields = ['numero_sac', 'poids_sac_depart', 'poids_sac_arrivee', 'controle_reception', 'remarques']


@admin.register(BonTransport)
class BonTransportAdmin(admin.ModelAdmin):
    list_display = [
        'numero_bt',
        'date_chargement',
        'lieu_depart',
        'lieu_destination',
        'poids_total_depart',
        'statut'
    ]
    list_filter = ['statut', 'type_logistique', 'date_chargement', 'campagne']
    search_fields = ['numero_bt', 'lieu_depart', 'lieu_destination']
    inlines = [DetailSacBonTransportInline]
    readonly_fields = ['date_creation', 'date_modification']


@admin.register(LotTraitement)
class LotTraitementAdmin(admin.ModelAdmin):
    list_display = [
        'numero_lot',
        'type_traitement',
        'date_debut',
        'poids_entree',
        'poids_sortie',
        'taux_perte',
        'qualite',
        'statut'
    ]
    list_filter = ['type_traitement', 'statut', 'qualite', 'campagne']
    search_fields = ['numero_lot', 'site_traitement']
    filter_horizontal = ['bons_transport']
    readonly_fields = ['perte_poids', 'taux_perte', 'date_creation', 'date_modification']


@admin.register(Colis)
class ColisAdmin(admin.ModelAdmin):
    list_display = [
        'numero_colis',
        'lot_traitement',
        'type_colis',
        'poids_net',
        'qualite',
        'date_conditionnement'
    ]
    list_filter = ['type_colis', 'qualite', 'date_conditionnement']
    search_fields = ['numero_colis', 'qr_code', 'code_barres']
    readonly_fields = ['date_creation']


@admin.register(CommandeExport)
class CommandeExportAdmin(admin.ModelAdmin):
    list_display = [
        'numero_commande',
        'nom_client',
        'pays_destination',
        'date_commande',
        'poids_total_net',
        'statut'
    ]
    list_filter = ['statut', 'type_transport', 'pays_destination', 'campagne']
    search_fields = ['numero_commande', 'nom_client', 'pays_destination']
    filter_horizontal = ['colis']
    readonly_fields = ['date_creation', 'date_modification']
    
    fieldsets = (
        ('Identification', {
            'fields': ('numero_commande', 'campagne', 'date_commande')
        }),
        ('Client', {
            'fields': ('nom_client', 'pays_destination', 'ville_destination')
        }),
        ('Colis', {
            'fields': ('colis',)
        }),
        ('Logistique', {
            'fields': (
                'type_transport',
                'numero_conteneur',
                'numero_vol'
            )
        }),
        ('Dates', {
            'fields': (
                'date_expedition',
                'date_livraison_prevue',
                'date_livraison_effective'
            )
        }),
        ('Poids', {
            'fields': ('poids_total_net', 'poids_total_brut')
        }),
        ('Commercial', {
            'fields': ('valeur_commande', 'incoterm', 'statut')
        }),
        ('Documents', {
            'fields': ('numero_facture', 'numero_bl', 'observations')
        }),
        ('Métadonnées', {
            'fields': ('date_creation', 'date_modification')
        })
    )


@admin.register(TracabiliteChain)
class TracabiliteChainAdmin(admin.ModelAdmin):
    list_display = [
        'uuid',
        'type_tracabilite',
        'producteur',
        'date_creation'
    ]
    list_filter = ['type_tracabilite', 'date_creation']
    search_fields = ['uuid', 'producteur__nom']
    readonly_fields = ['uuid', 'date_creation']
