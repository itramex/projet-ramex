from django.contrib import admin
from .models import Producteur, AGR
from simple_history.admin import SimpleHistoryAdmin

@admin.register(Producteur)
class ProducteurAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'nom', 'prenom', 'sexe', 'village', 'commune',
        'cooperative', 'responsabilite_cooperative', 'actif', 'verifie'
    ]
    history_list_display = ['status']
    list_filter = [
        'actif', 'verifie', 'sexe', 'femme_leader', 'paysan_relais',
        'membre_groupement_epargne', 'commune', 'village', 'cooperative',
        'responsabilite_cooperative', 'niveau_education'
    ]
    search_fields = ['code', 'nom', 'prenom', 'telephone', 'email']
    readonly_fields = ['date_modification', 'date_desactivation']
    
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'nom', 'prenom', 'photo')
        }),
        ('Localisation', {
            'fields': ('commune', 'fokontany', 'village')
        }),
        ('Contact', {
            'fields': ('telephone', 'email')
        }),
        ('Informations personnelles', {
            'fields': (
                'sexe', 'femme_leader', 'date_naissance', 'statut_matrimonial',
                'niveau_education'
            )
        }),
        ('Coopérative', {
            'fields': (
                'cooperative', 'responsabilite_cooperative', 'date_adhesion_cooperative',
                'membre_groupement_epargne', 'date_adhesion_groupement',
                'paysan_relais'
            )
        }),
        ('Composition du foyer', {
            'fields': (
                'nb_adultes_plus_18', 'nb_hommes_adultes', 'nb_femmes_adultes',
                'personne_handicap_foyer', 'autres_enfants_foyer'
            ),
            'classes': ('collapse',)
        }),
        ('Enfants', {
            'fields': (
                'nb_enfants_garcons', 'nb_enfants_filles',
                'nb_autres_garcons', 'nb_autres_filles',
                'annee_naissance_enfant_1', 'annee_naissance_enfant_2',
                'annee_naissance_enfant_3', 'annee_naissance_enfant_4',
                'annee_naissance_enfant_5', 'annee_naissance_enfant_6'
            ),
            'classes': ('collapse',)
        }),
        ('Scolarisation', {
            'fields': (
                'nb_enfants_scolarises', 'nb_enfants_non_scolarises',
                'niveau_etude_enfant_1', 'continue_ecole_enfant_1',
                'niveau_etude_enfant_2', 'continue_ecole_enfant_2',
                'niveau_etude_enfant_3', 'continue_ecole_enfant_3',
                'niveau_etude_enfant_4', 'continue_ecole_enfant_4',
                'niveau_etude_enfant_5', 'continue_ecole_enfant_5',
                'niveau_etude_enfant_6', 'continue_ecole_enfant_6'
            ),
            'classes': ('collapse',)
        }),
        ('Gestion des déchets', {
            'fields': (
                'a_poubelles_triees', 'types_poubelles',
                'dechets_non_eparpilles_maison', 'dechets_non_eparpilles_parcelle',
                'recyclage_dechets', 'dechets_chimiques_enterres',
                'lieu_dechets_chimiques'
            ),
            'classes': ('collapse',)
        }),
        ('Gestion de l\'eau', {
            'fields': (
                'fosse_eaux_usees_maison', 'fosse_eaux_usees_champ',
                'recyclage_eau_pluie', 'wc_maison', 'wc_champ',
                'lieu_lavage', 'source_eau', 'eau_potable',
                'fait_bouillir_eau', 'utilise_sureau', 'autre_traitement_eau',
                'lave_linge_riviere'
            ),
            'classes': ('collapse',)
        }),
        ('Santé', {
            'fields': ('type_centre_sante', 'a_assurance_sante'),
            'classes': ('collapse',)
        }),
        ('Vie communautaire', {
            'fields': (
                'respecte_dina', 'participe_travaux_communautaires',
                'participe_protection_environnement', 'ne_brule_pas_foret',
                'ne_coupe_pas_foret', 'ne_cultive_pas_zone_protegee',
                'respecte_loi_animaux_proteges'
            ),
            'classes': ('collapse',)
        }),
        ('Chasse & Élevage', {
            'fields': (
                'pratique_chasse', 'animaux_chasses',
                'pratique_elevage', 'animaux_eleves'
            ),
            'classes': ('collapse',)
        }),
        ('Activités agricoles', {
            'fields': (
                'a_exploite_foret_apres_2019', 'pratique_tavy',
                'fait_defrichage', 'pratique_peche', 'peche_mer',
                'peche_eau_douce', 'respecte_regles_peche'
            ),
            'classes': ('collapse',)
        }),
        ('Produits chimiques', {
            'fields': (
                'utilise_chimiques_autres_cultures', 'stocke_chimiques_maison',
                'lieu_nettoyage_outils_chimiques'
            ),
            'classes': ('collapse',)
        }),
        ('Dotations & Formations', {
            'fields': ('dotations_recues', 'formations_suivies'),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('actif', 'raison_desactivation', 'verifie')
        }),
        ('Audit', {
            'fields': (
                'date_modification', 'date_desactivation',
                'cree_par', 'modifie_par', 'desactive_par', 'verifie_par'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activer_producteurs', 'desactiver_producteurs', 'verifier_producteurs']
    
    def activer_producteurs(self, request, queryset):
        for producteur in queryset:
            producteur.restaurer()
        self.message_user(request, f"{queryset.count()} producteur(s) réactivé(s)")
    activer_producteurs.short_description = "Réactiver les producteurs sélectionnés"
    
    def desactiver_producteurs(self, request, queryset):
        for producteur in queryset:
            producteur.soft_delete(user=request.user, raison="Désactivation en masse")
        self.message_user(request, f"{queryset.count()} producteur(s) désactivé(s)")
    desactiver_producteurs.short_description = "Désactiver les producteurs sélectionnés"
    
    def verifier_producteurs(self, request, queryset):
        for producteur in queryset:
            if not producteur.verifie:
                producteur.verifier(user=request.user)
        self.message_user(request, f"{queryset.count()} producteur(s) vérifié(s)")
    verifier_producteurs.short_description = "Vérifier les producteurs sélectionnés"


@admin.register(AGR)
class AGRAdmin(admin.ModelAdmin):
    list_display = [
        'producteur', 'type_agr', 'ordre', 'intrants_recus',
        'utilisation', 'revenu_annuel_estime', 'active', 'date_creation'
    ]
    list_filter = ['type_agr', 'active', 'intrants_recus', 'utilisation']
    search_fields = ['producteur__code', 'producteur__nom', 'type_agr']
    readonly_fields = ['revenu_annuel_estime', 'date_creation', 'date_modification']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('producteur', 'type_agr', 'ordre', 'active')
        }),
        ('Intrants', {
            'fields': ('intrants_recus', 'quantite_intrants')
        }),
        ('Utilisation', {
            'fields': (
                'utilisation', 'quantite_consommee_annuelle',
                'quantite_vendue_annuelle', 'unite_mesure'
            )
        }),
        ('Revenus', {
            'fields': ('prix_vente_unitaire', 'revenu_annuel_estime')
        }),
        ('État actuel', {
            'fields': ('nombre_bassins', 'nombre_volailles')
        }),
        ('Audit', {
            'fields': ('enregistre_par', 'date_creation', 'date_modification')
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('producteur', 'ordre')
        return self.readonly_fields
