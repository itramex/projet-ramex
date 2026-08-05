"""
Management command to create test fixtures for history models
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import datetime

from history.models import (
    ProductionHistory,
    AGRHistory,
    SocialIndicatorHistory,
    AnnualSnapshot
)
from producteurs.models import Producteur
from parcelles.models import Parcelle
from cooperatives.models import Cooperative


class Command(BaseCommand):
    help = 'Create test fixtures for history models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Delete existing test data before creating new fixtures',
        )

    def handle(self, *args, **options):
        if options['clean']:
            self.stdout.write('Cleaning existing test data...')
            ProductionHistory.objects.filter(notes__contains='TEST_FIXTURE').delete()
            AGRHistory.objects.filter(notes__contains='TEST_FIXTURE').delete()
            SocialIndicatorHistory.objects.filter(notes__contains='TEST_FIXTURE').delete()
            AnnualSnapshot.objects.filter(description__contains='TEST_FIXTURE').delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleaned existing test data'))

        # Get or create test user
        test_user, created = User.objects.get_or_create(
            username='test_history_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        if created:
            test_user.set_password('testpass123')
            test_user.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Created test user: {test_user.username}'))

        # Get or create test cooperative
        test_coop, created = Cooperative.objects.get_or_create(
            code='TEST_COOP_001',
            defaults={
                'nom': 'Coopérative Test Historique',
                'commune': 'Commune Test',
                'village': 'Village Test',
                'region': 'SAVA',
                'active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created test cooperative: {test_coop.code}'))

        # Get or create test producteurs
        producteurs = []
        for i in range(1, 4):
            prod, created = Producteur.objects.get_or_create(
                code=f'TEST_PROD_{i:03d}',
                defaults={
                    'nom': f'Producteur Test {i}',
                    'prenom': f'Prenom {i}',
                    'sexe': 'M' if i % 2 == 0 else 'F',
                    'commune': 'Commune Test',
                    'village': 'Village Test',
                    'cooperative': test_coop,
                    'actif': True
                }
            )
            producteurs.append(prod)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created test producteur: {prod.code}'))

        # Get or create test parcelles
        parcelles = []
        for i, prod in enumerate(producteurs, 1):
            parcelle, created = Parcelle.objects.get_or_create(
                code_parcelle=f'{prod.code}-P1',
                defaults={
                    'producteur': prod,
                    'numero_parcelle': 1,
                    'localisation': 'Test Location',
                    'dimension_ha': Decimal('1.5'),
                    'nombre_pieds': 500,
                    'annee_plantation': 2018,
                    'culture_principale': 'vanille',
                    'active': True
                }
            )
            parcelles.append(parcelle)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created test parcelle: {parcelle.code_parcelle}'))

        # Create ProductionHistory fixtures
        self.stdout.write('\nCreating ProductionHistory fixtures...')
        production_count = 0
        for parcelle in parcelles:
            for year in [2021, 2022, 2023, 2024]:
                for culture in ['vanille', 'cafe']:
                    base_quantity = Decimal('100.00') if culture == 'vanille' else Decimal('50.00')
                    year_factor = Decimal(str(1 + (year - 2021) * 0.1))  # 10% growth per year
                    
                    prod_hist, created = ProductionHistory.objects.get_or_create(
                        parcelle=parcelle,
                        annee=year,
                        culture=culture,
                        defaults={
                            'quantite_kg': base_quantity * year_factor,
                            'prix_vente_kg': Decimal('50000.00') if culture == 'vanille' else Decimal('10000.00'),
                            'enregistre_par': test_user,
                            'notes': f'TEST_FIXTURE - Production {culture} {year}'
                        }
                    )
                    if created:
                        production_count += 1

        self.stdout.write(self.style.SUCCESS(f'✓ Created {production_count} ProductionHistory records'))

        # Create AGRHistory fixtures
        self.stdout.write('\nCreating AGRHistory fixtures...')
        agr_count = 0
        for producteur in producteurs:
            for year in [2021, 2022, 2023, 2024]:
                # AGR 1: Pisciculture
                agr1, created = AGRHistory.objects.get_or_create(
                    producteur=producteur,
                    annee=year,
                    type_agr='pisciculture',
                    ordre=1,
                    defaults={
                        'quantite_produite': Decimal('200.00'),
                        'quantite_vendue': Decimal('150.00'),
                        'quantite_consommee': Decimal('50.00'),
                        'prix_vente_unitaire': Decimal('5000.00'),
                        'revenu_annuel': Decimal('750000.00'),
                        'enregistre_par': test_user,
                        'notes': f'TEST_FIXTURE - Pisciculture {year}'
                    }
                )
                if created:
                    agr_count += 1

                # AGR 2: Aviculture
                agr2, created = AGRHistory.objects.get_or_create(
                    producteur=producteur,
                    annee=year,
                    type_agr='aviculture',
                    ordre=2,
                    defaults={
                        'quantite_produite': Decimal('100.00'),
                        'quantite_vendue': Decimal('80.00'),
                        'quantite_consommee': Decimal('20.00'),
                        'prix_vente_unitaire': Decimal('8000.00'),
                        'revenu_annuel': Decimal('640000.00'),
                        'enregistre_par': test_user,
                        'notes': f'TEST_FIXTURE - Aviculture {year}'
                    }
                )
                if created:
                    agr_count += 1

        self.stdout.write(self.style.SUCCESS(f'✓ Created {agr_count} AGRHistory records'))

        # Create SocialIndicatorHistory fixtures
        self.stdout.write('\nCreating SocialIndicatorHistory fixtures...')
        social_count = 0
        for producteur in producteurs:
            for year in [2021, 2022, 2023, 2024]:
                # Scolarisation (numeric)
                scol, created = SocialIndicatorHistory.objects.get_or_create(
                    producteur=producteur,
                    annee=year,
                    type_indicateur='scolarisation',
                    defaults={
                        'valeur_numerique': Decimal('75.00') + Decimal(str((year - 2021) * 5)),
                        'enregistre_par': test_user,
                        'notes': f'TEST_FIXTURE - Scolarisation {year}'
                    }
                )
                if created:
                    social_count += 1

                # Eau potable (boolean)
                eau, created = SocialIndicatorHistory.objects.get_or_create(
                    producteur=producteur,
                    annee=year,
                    type_indicateur='eau_potable',
                    defaults={
                        'valeur_booleen': year >= 2022,  # Access from 2022
                        'enregistre_par': test_user,
                        'notes': f'TEST_FIXTURE - Eau potable {year}'
                    }
                )
                if created:
                    social_count += 1

                # Habitat (text)
                habitat, created = SocialIndicatorHistory.objects.get_or_create(
                    producteur=producteur,
                    annee=year,
                    type_indicateur='habitat',
                    defaults={
                        'valeur_texte': 'Maison en dur' if year >= 2023 else 'Maison traditionnelle',
                        'enregistre_par': test_user,
                        'notes': f'TEST_FIXTURE - Habitat {year}'
                    }
                )
                if created:
                    social_count += 1

        self.stdout.write(self.style.SUCCESS(f'✓ Created {social_count} SocialIndicatorHistory records'))

        # Create AnnualSnapshot fixtures
        self.stdout.write('\nCreating AnnualSnapshot fixtures...')
        snapshot_count = 0
        for year in [2022, 2023]:
            # Calculate aggregated stats for the year
            total_production = ProductionHistory.objects.filter(annee=year).count()
            total_agr_revenue = sum(
                agr.revenu_annuel for agr in AGRHistory.objects.filter(annee=year)
            )
            
            snapshot, created = AnnualSnapshot.objects.get_or_create(
                annee=year,
                defaults={
                    'nb_producteurs': len(producteurs),
                    'nb_parcelles': len(parcelles),
                    'production_totale_kg': Decimal('5000.00'),
                    'revenu_total_agr': Decimal(str(total_agr_revenue)),
                    'cree_par': test_user,
                    'description': f'TEST_FIXTURE - Snapshot annuel {year}',
                    'verrouille': year == 2022  # Lock 2022 snapshot
                }
            )
            if created:
                snapshot_count += 1

        self.stdout.write(self.style.SUCCESS(f'✓ Created {snapshot_count} AnnualSnapshot records'))

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✓ Test fixtures created successfully!'))
        self.stdout.write('='*60)
        self.stdout.write(f'ProductionHistory: {ProductionHistory.objects.filter(notes__contains="TEST_FIXTURE").count()} records')
        self.stdout.write(f'AGRHistory: {AGRHistory.objects.filter(notes__contains="TEST_FIXTURE").count()} records')
        self.stdout.write(f'SocialIndicatorHistory: {SocialIndicatorHistory.objects.filter(notes__contains="TEST_FIXTURE").count()} records')
        self.stdout.write(f'AnnualSnapshot: {AnnualSnapshot.objects.filter(description__contains="TEST_FIXTURE").count()} records')
        self.stdout.write('='*60)
