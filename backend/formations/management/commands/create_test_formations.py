"""
Script de création de données de test pour les formations et certifications
Usage: python manage.py create_test_formations
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from producteurs.models import Producteur
from formations.models import TypeFormation, Formation, TypeCertification, Certification


class Command(BaseCommand):
    help = 'Crée des données de test pour les formations et certifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--nb-producteurs',
            type=int,
            default=10,
            help='Nombre de producteurs à traiter (défaut: 10)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Supprimer les formations et certifications existantes avant de créer'
        )

    def handle(self, *args, **options):
        nb_producteurs = options['nb_producteurs']
        clear = options['clear']

        self.stdout.write(self.style.SUCCESS('🚀 Création des données de test pour formations et certifications'))

        # Supprimer les données existantes si demandé
        if clear:
            self.stdout.write('🗑️  Suppression des données existantes...')
            Formation.objects.all().delete()
            Certification.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Données supprimées'))

        # 1. Créer des types de formations
        self.stdout.write('\n📚 Création des types de formations...')
        types_formations = self._create_types_formations()
        self.stdout.write(self.style.SUCCESS(f'✅ {len(types_formations)} types de formations créés'))

        # 2. Créer des types de certifications
        self.stdout.write('\n✅ Création des types de certifications...')
        types_certifications = self._create_types_certifications()
        self.stdout.write(self.style.SUCCESS(f'✅ {len(types_certifications)} types de certifications créés'))

        # 3. Récupérer les producteurs actifs
        producteurs = Producteur.objects.filter(actif=True)[:nb_producteurs]
        if not producteurs.exists():
            self.stdout.write(self.style.ERROR('❌ Aucun producteur actif trouvé dans la base'))
            return

        self.stdout.write(f'\n👥 Traitement de {producteurs.count()} producteurs...')

        # 4. Créer des formations
        self.stdout.write('\n📖 Création des formations...')
        nb_formations = self._create_formations(producteurs, types_formations)
        self.stdout.write(self.style.SUCCESS(f'✅ {nb_formations} formations créées'))

        # 5. Créer des certifications
        self.stdout.write('\n🎖️  Création des certifications...')
        nb_certifications = self._create_certifications(producteurs, types_certifications)
        self.stdout.write(self.style.SUCCESS(f'✅ {nb_certifications} certifications créées'))

        # Résumé final
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ RÉSUMÉ'))
        self.stdout.write('='*60)
        self.stdout.write(f'📚 Types de formations    : {TypeFormation.objects.count()}')
        self.stdout.write(f'📖 Formations totales     : {Formation.objects.count()}')
        self.stdout.write(f'✅ Types de certifications: {TypeCertification.objects.count()}')
        self.stdout.write(f'🎖️  Certifications totales : {Certification.objects.count()}')
        self.stdout.write('='*60)
        self.stdout.write(self.style.SUCCESS('\n🎉 Données de test créées avec succès!'))

    def _create_types_formations(self):
        """Crée les types de formations"""
        types = [
            {
                'nom': 'Bonnes Pratiques Agricoles (BPA)',
                'description': 'Formation sur les bonnes pratiques agricoles pour la culture de vanille',
                'duree_jours': 2
            },
            {
                'nom': 'Gestion Post-Récolte',
                'description': 'Techniques de séchage, d\'échaudage et de stockage de la vanille',
                'duree_jours': 1
            },
            {
                'nom': 'Agriculture Biologique',
                'description': 'Principes et techniques de l\'agriculture biologique',
                'duree_jours': 3
            },
            {
                'nom': 'Gestion de la Qualité',
                'description': 'Contrôle qualité et traçabilité des produits',
                'duree_jours': 2
            },
            {
                'nom': 'Protection de l\'Environnement',
                'description': 'Conservation des sols et gestion durable des ressources',
                'duree_jours': 1
            },
            {
                'nom': 'Pollinisation Manuelle',
                'description': 'Techniques de pollinisation manuelle de la vanille',
                'duree_jours': 1
            },
        ]

        created = []
        for type_data in types:
            obj, created_flag = TypeFormation.objects.get_or_create(
                nom=type_data['nom'],
                defaults={
                    'description': type_data['description'],
                    'duree_jours': type_data['duree_jours']
                }
            )
            created.append(obj)
            if created_flag:
                self.stdout.write(f'  ➕ {type_data["nom"]}')

        return created

    def _create_types_certifications(self):
        """Crée les types de certifications"""
        types = [
            {
                'nom': 'Agriculture Biologique',
                'code': 'BIO',
                'niveau': 'bio',
                'organisme_certificateur': 'Ecocert Madagascar',
                'duree_validite_ans': 1
            },
            {
                'nom': 'Fair Trade',
                'code': 'FT',
                'niveau': 'fair_trade',
                'organisme_certificateur': 'Fairtrade International',
                'duree_validite_ans': 3
            },
            {
                'nom': 'Rainforest Alliance',
                'code': 'RA',
                'niveau': 'rainforest',
                'organisme_certificateur': 'Rainforest Alliance',
                'duree_validite_ans': 3
            },
            {
                'nom': 'UEBT',
                'code': 'UEBT',
                'niveau': 'uebt',
                'organisme_certificateur': 'Union for Ethical BioTrade',
                'duree_validite_ans': 2
            },
            {
                'nom': 'Good4Good',
                'code': 'G4G',
                'niveau': 'g4g',
                'organisme_certificateur': 'Good4Good',
                'duree_validite_ans': 2
            },
        ]

        created = []
        for type_data in types:
            obj, created_flag = TypeCertification.objects.get_or_create(
                code=type_data['code'],
                defaults={
                    'nom': type_data['nom'],
                    'niveau': type_data['niveau'],
                    'organisme_certificateur': type_data['organisme_certificateur'],
                    'duree_validite_ans': type_data['duree_validite_ans']
                }
            )
            created.append(obj)
            if created_flag:
                self.stdout.write(f'  ➕ {type_data["nom"]} ({type_data["code"]})')

        return created

    def _create_formations(self, producteurs, types_formations):
        """Crée des formations pour les producteurs"""
        count = 0
        lieux = ['Antalaha', 'Sambava', 'Andapa', 'Vohémar', 'Ambanja']
        organismes = ['SAVA Formation', 'Vanille Bio Formation', 'FFL Training Center', 'G4G Academy']

        for i, producteur in enumerate(producteurs):
            # Chaque producteur a 1 à 3 formations
            nb_formations = (i % 3) + 1

            for j in range(nb_formations):
                type_formation = types_formations[j % len(types_formations)]
                
                # Date de formation dans les 2 dernières années
                jours_passes = 30 + (i * 60) + (j * 30)
                date_formation = date.today() - timedelta(days=jours_passes)

                formation, created = Formation.objects.get_or_create(
                    producteur=producteur,
                    type_formation=type_formation,
                    date_formation=date_formation,
                    defaults={
                        'lieu': lieux[i % len(lieux)],
                        'organisme': organismes[j % len(organismes)],
                        'certificat_obtenu': (i + j) % 3 != 0,  # 66% ont le certificat
                        'notes': f'Formation suivie avec succès' if (i + j) % 2 == 0 else ''
                    }
                )

                if created:
                    count += 1

        return count

    def _create_certifications(self, producteurs, types_certifications):
        """Crée des certifications pour les producteurs"""
        count = 0

        for i, producteur in enumerate(producteurs):
            # 60% des producteurs ont au moins une certification
            if i % 5 == 0:
                continue  # Ce producteur n'a pas de certification

            # Nombre de certifications (1 ou 2)
            nb_certifications = 1 if i % 3 == 0 else 2

            for j in range(nb_certifications):
                type_certification = types_certifications[j % len(types_certifications)]
                
                # Date d'obtention dans les 2 dernières années
                jours_passes = 60 + (i * 45)
                date_obtention = date.today() - timedelta(days=jours_passes)
                date_expiration = date_obtention + timedelta(days=365 * type_certification.duree_validite_ans)

                # Déterminer le statut
                if date_expiration < date.today():
                    statut = 'expire'
                elif i % 10 == 0:
                    statut = 'en_cours'
                else:
                    statut = 'valide'

                certification, created = Certification.objects.get_or_create(
                    producteur=producteur,
                    type_certification=type_certification,
                    date_obtention=date_obtention,
                    defaults={
                        'numero_certificat': f'{type_certification.code}-{date_obtention.year}-{str(producteur.id).zfill(4)}',
                        'date_expiration': date_expiration,
                        'statut': statut,
                        'notes': f'Certification délivrée par {type_certification.organisme_certificateur}'
                    }
                )

                if created:
                    count += 1

        return count
