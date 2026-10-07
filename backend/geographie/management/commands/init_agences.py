"""
Jeu d'agences districtales (région SAVA) + rattachement des coopératives.

Usage : python manage.py init_agences

Idempotent (get_or_create sur le code) : re-executable sans doublon.
Le rattachement cooperative -> agence est re-applique a chaque execution
(c'est la source de verite de cette commande).

Decoupage valide avec l'equipe (jeu de test / demarrage) :
  - Agence Sambava  : FITARATRA
  - Agence Vohemar  : MIRARY SOA, MEVASOA, MAHAVELONA
  - Agence Antalaha : LIAM-PIVOARANA
  - Agence Andapa   : (aucune cooperative — sert a tester le filtre « Sans agence »)
"""
from django.core.management.base import BaseCommand

from cooperatives.models import Cooperative
from geographie.models import Agence, District


AGENCES = [
    {
        'code': 'AG-SMV',
        'nom': 'Agence Sambava',
        'district': 'Sambava',
        'cooperatives': ['FITARATRA'],
    },
    {
        'code': 'AG-VHR',
        'nom': 'Agence Vohemar',
        'district': 'Vohemar',
        'cooperatives': ['MIRARY SOA', 'MEVASOA', 'MAHAVELONA'],
    },
    {
        'code': 'AG-ANT',
        'nom': 'Agence Antalaha',
        'district': 'Antalaha',
        'cooperatives': ['LIAM-PIVOARANA'],
    },
    {
        'code': 'AG-AND',
        'nom': 'Agence Andapa',
        'district': 'Andapa',
        'cooperatives': [],
    },
]


class Command(BaseCommand):
    help = "Cree les agences districtales SAVA et rattache les cooperatives."

    def handle(self, *args, **options):
        for spec in AGENCES:
            # icontains : robuste aux variantes d'accents (Vohemar / Vohémar)
            district = District.objects.filter(
                nom__icontains=spec['district'][:4]
            ).first()
            if not district:
                self.stdout.write(self.style.WARNING(
                    f"District introuvable : {spec['district']} — agence {spec['code']} ignoree."
                ))
                continue

            agence, created = Agence.objects.get_or_create(
                code=spec['code'],
                defaults={'nom': spec['nom'], 'district': district, 'actif': True},
            )
            if not created and agence.district_id != district.id:
                agence.district = district
                agence.save(update_fields=['district'])
            state = self.style.SUCCESS('cree') if created else 'deja existant'
            self.stdout.write(f"Agence {spec['code']} — {agence.nom} : {state}")

            if spec['cooperatives']:
                coops = Cooperative.objects.filter(nom__in=spec['cooperatives'])
                updated = coops.update(agence=agence)
                self.stdout.write(
                    f"  {updated}/{len(spec['cooperatives'])} cooperative(s) rattachee(s)."
                )

        total = Agence.objects.count()
        rattach = Cooperative.objects.exclude(agence__isnull=True).count()
        self.stdout.write(self.style.SUCCESS(
            f"Termine : {total} agence(s), {rattach} cooperative(s) rattachee(s)."
        ))
