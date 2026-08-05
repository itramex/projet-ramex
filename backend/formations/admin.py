from django.contrib import admin
from .models import TypeFormation, Formation, TypeCertification, Certification


@admin.register(TypeFormation)
class TypeFormationAdmin(admin.ModelAdmin):
    list_display = ('nom', 'duree_jours', 'actif', 'date_creation')
    list_filter = ('actif', 'date_creation')
    search_fields = ('nom', 'description')
    ordering = ('nom',)


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ('producteur', 'type_formation', 'date_formation', 'lieu', 'certificat_obtenu', 'date_enregistrement')
    list_filter = ('certificat_obtenu', 'date_formation', 'type_formation')
    search_fields = ('producteur__code', 'producteur__nom', 'producteur__prenom', 'lieu', 'organisme')
    autocomplete_fields = ('producteur', 'type_formation')
    date_hierarchy = 'date_formation'
    ordering = ('-date_formation',)


@admin.register(TypeCertification)
class TypeCertificationAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'niveau', 'organisme_certificateur', 'duree_validite_ans', 'actif')
    list_filter = ('niveau', 'actif', 'date_creation')
    search_fields = ('nom', 'code', 'description', 'organisme_certificateur')
    ordering = ('nom',)


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ('producteur', 'type_certification', 'numero_certificat', 'date_obtention', 'date_expiration', 'statut', 'est_valide')
    list_filter = ('statut', 'date_obtention', 'date_expiration', 'type_certification')
    search_fields = ('producteur__code', 'producteur__nom', 'producteur__prenom', 'numero_certificat')
    autocomplete_fields = ('producteur', 'type_certification')
    date_hierarchy = 'date_obtention'
    ordering = ('-date_obtention',)
    
    def est_valide(self, obj):
        return obj.est_valide
    est_valide.boolean = True
    est_valide.short_description = 'Valide'
