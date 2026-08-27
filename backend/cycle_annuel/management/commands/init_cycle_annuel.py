from django.core.management.base import BaseCommand
from cycle_annuel.models import PhaseAgricole


# Fenêtres métier du calendrier agricole (source : ANALYSE_SPEC Phase 6)
PHASES_DEFAUT = [
    # Traçabilité / Campagne
    {'code': 'floraison_1', 'nom': 'Floraison (1er cycle)', 'pilier': 'tracabilite',
     'type_phase': 'floraison', 'mois_debut': 1, 'mois_fin': 2, 'couleur': '#16a34a'},
    {'code': 'expedition_1', 'nom': 'Expédition (1er cycle)', 'pilier': 'tracabilite',
     'type_phase': 'expedition', 'mois_debut': 1, 'mois_fin': 2, 'couleur': '#0ea5e9'},
    {'code': 'recolte_verte', 'nom': 'Campagne vanille verte', 'pilier': 'tracabilite',
     'type_phase': 'recolte_verte', 'mois_debut': 6, 'mois_fin': 7, 'couleur': '#f59e0b'},
    {'code': 'floraison_2', 'nom': 'Floraison (2e cycle)', 'pilier': 'tracabilite',
     'type_phase': 'floraison', 'mois_debut': 7, 'mois_fin': 9, 'couleur': '#16a34a'},
    {'code': 'recolte_preparee', 'nom': 'Campagne vanille préparée', 'pilier': 'tracabilite',
     'type_phase': 'recolte_preparee', 'mois_debut': 8, 'mois_fin': 10, 'couleur': '#f59e0b'},
    {'code': 'expedition_2', 'nom': 'Expédition (2e cycle)', 'pilier': 'tracabilite',
     'type_phase': 'expedition', 'mois_debut': 10, 'mois_fin': 10, 'couleur': '#0ea5e9'},
    {'code': 'georef_1', 'nom': 'Géoréférencement GPS (1er cycle)', 'pilier': 'tracabilite',
     'type_phase': 'georeferencement', 'mois_debut': 3, 'mois_fin': 5, 'couleur': '#8b5cf6'},
    {'code': 'georef_2', 'nom': 'Géoréférencement GPS (2e cycle)', 'pilier': 'tracabilite',
     'type_phase': 'georeferencement', 'mois_debut': 10, 'mois_fin': 11, 'couleur': '#8b5cf6'},
    # Certification
    {'code': 'formation_certif_1', 'nom': 'Formations certification (1er cycle)', 'pilier': 'certification',
     'type_phase': 'formation', 'mois_debut': 3, 'mois_fin': 5, 'couleur': '#d97706'},
    {'code': 'controle_interne', 'nom': 'Contrôle interne', 'pilier': 'certification',
     'type_phase': 'controle_interne', 'mois_debut': 3, 'mois_fin': 5, 'couleur': '#dc2626'},
    {'code': 'audit_interne', 'nom': 'Audit interne', 'pilier': 'certification',
     'type_phase': 'audit_interne', 'mois_debut': 3, 'mois_fin': 5, 'couleur': '#dc2626'},
    {'code': 'formation_certif_2', 'nom': 'Formations certification (2e cycle)', 'pilier': 'certification',
     'type_phase': 'formation', 'mois_debut': 10, 'mois_fin': 11, 'couleur': '#d97706'},
    # Développement Durable
    {'code': 'reboisement', 'nom': 'Reboisement', 'pilier': 'developpement_durable',
     'type_phase': 'reboisement', 'mois_debut': 1, 'mois_fin': 12, 'toute_annee': True, 'couleur': '#22c55e'},
    {'code': 'convention_fram', 'nom': 'Convention FRAM', 'pilier': 'developpement_durable',
     'type_phase': 'convention', 'mois_debut': 8, 'mois_fin': 9, 'couleur': '#06b6d4'},
    {'code': 'pepinieres', 'nom': 'Pépinières', 'pilier': 'developpement_durable',
     'type_phase': 'pepiniere', 'mois_debut': 11, 'mois_fin': 12, 'cycle_croise': True, 'couleur': '#84cc16'},
]


class Command(BaseCommand):
    help = "Initialise le référentiel des phases agricoles du calendrier annuel."

    def handle(self, *args, **options):
        created = 0
        for data in PHASES_DEFAUT:
            code = data.pop('code')
            obj, cree = PhaseAgricole.objects.update_or_create(
                code=code,
                defaults={
                    **data,
                    'code': code,  # conservé
                    'actif': True,
                }
            )
            if cree:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  + {obj.nom}"))
            else:
                self.stdout.write(f"  = {obj.nom} (déjà présent)")
        self.stdout.write(self.style.SUCCESS(
            f"Terminé : {created} phase(s) créée(s), {PhaseAgricole.objects.count()} au total."
        ))