"""
Management command to migrate existing data to history models.
Migrates production data from Parcelle, AGR data from Producteur/AGR, and social indicators.
"""
import logging
from datetime import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError
from django.contrib.auth.models import User
from producteurs.models import Producteur, AGR
from parcelles.models import Parcelle
from history.models import ProductionHistory, AGRHistory, SocialIndicatorHistory


# Setup logging
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate existing data to history models'

    def __init__(self):
        super().__init__()
        self.stats = {
            'production': {'success': 0, 'errors': 0, 'skipped': 0},
            'agr': {'success': 0, 'errors': 0, 'skipped': 0},
            'social': {'success': 0, 'errors': 0, 'skipped': 0},
        }
        self.errors = []

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Test migration without writing to database'
        )
        parser.add_argument(
            '--log-file',
            type=str,
            default='migration_errors.log',
            help='Log file for errors'
        )
        parser.add_argument(
            '--production-only',
            action='store_true',
            help='Migrate only production data'
        )
        parser.add_argument(
            '--agr-only',
            action='store_true',
            help='Migrate only AGR data'
        )
        parser.add_argument(
            '--social-only',
            action='store_true',
            help='Migrate only social indicator data'
        )
        parser.add_argument(
            '--report',
            type=str,
            default='migration_report.html',
            help='HTML report file path'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        log_file = options['log_file']
        report_file = options['report']
        
        # Setup file logging
        file_handler = logging.FileHandler(log_file, mode='w')
        file_handler.setLevel(logging.ERROR)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.setLevel(logging.ERROR)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be written'))
        
        self.stdout.write(self.style.SUCCESS('Starting data migration...'))
        
        # Determine what to migrate
        migrate_all = not (options['production_only'] or options['agr_only'] or options['social_only'])
        
        try:
            if migrate_all or options['production_only']:
                self.migrate_production_data(dry_run)
            
            if migrate_all or options['agr_only']:
                self.migrate_agr_data(dry_run)
            
            if migrate_all or options['social_only']:
                self.migrate_social_data(dry_run)
            
            # Print summary
            self.print_summary()
            
            # Generate HTML report
            if not dry_run:
                self.generate_migration_report(report_file)
                self.stdout.write(self.style.SUCCESS(f'Report generated: {report_file}'))
            
            if not dry_run:
                self.stdout.write(self.style.SUCCESS(f'\nMigration complete! Errors logged to {log_file}'))
            else:
                self.stdout.write(self.style.WARNING('\nDry run complete - no data was written'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Migration failed: {str(e)}'))
            logger.error(f'Migration failed: {str(e)}', exc_info=True)
            raise

    def migrate_production_data(self, dry_run=False):
        """
        Migrate production data from Parcelle.productions_par_culture to ProductionHistory
        """
        self.stdout.write(self.style.WARNING('\n=== Migrating Production Data ==='))
        
        # Get all parcelles with production data
        parcelles = Parcelle.objects.filter(active=True).exclude(productions_par_culture={})
        total_parcelles = parcelles.count()
        
        self.stdout.write(f'Found {total_parcelles} parcelles with production data')
        
        production_records = []
        
        for idx, parcelle in enumerate(parcelles, 1):
            if idx % 50 == 0:
                self.stdout.write(f'Processing parcelle {idx}/{total_parcelles}...')
            
            try:
                # Extract productions from JSON field
                productions = parcelle.productions_par_culture
                
                if not isinstance(productions, dict):
                    self.stats['production']['skipped'] += 1
                    continue
                
                # Determine the year to use
                # Priority: annee_plantation > annee_creation > current year
                annee = None
                if parcelle.annee_plantation:
                    annee = parcelle.annee_plantation
                elif parcelle.annee_creation:
                    annee = parcelle.annee_creation
                else:
                    annee = datetime.now().year
                
                # Validate year (allow older plantations from 1900)
                if annee < 1900 or annee > 2100:
                    error_msg = f'Invalid year {annee} for parcelle {parcelle.code_parcelle}'
                    logger.error(error_msg)
                    self.errors.append(error_msg)
                    self.stats['production']['errors'] += 1
                    continue
                
                # Create ProductionHistory for each culture
                for culture, quantite in productions.items():
                    if not culture or quantite is None:
                        continue
                    
                    try:
                        quantite_kg = Decimal(str(quantite))
                        
                        if quantite_kg < 0:
                            error_msg = f'Negative quantity for parcelle {parcelle.code_parcelle}, culture {culture}'
                            logger.error(error_msg)
                            self.errors.append(error_msg)
                            self.stats['production']['errors'] += 1
                            continue
                        
                        production_record = ProductionHistory(
                            parcelle=parcelle,
                            annee=annee,
                            culture=culture,
                            quantite_kg=quantite_kg,
                            prix_vente_kg=None,  # Not available in current data
                            revenu_total=None,
                            enregistre_par=None,
                            notes=f'Migrated from Parcelle.productions_par_culture'
                        )
                        
                        production_records.append(production_record)
                        
                    except (ValueError, TypeError) as e:
                        error_msg = f'Error converting quantity for parcelle {parcelle.code_parcelle}, culture {culture}: {str(e)}'
                        logger.error(error_msg)
                        self.errors.append(error_msg)
                        self.stats['production']['errors'] += 1
                        continue
                
            except Exception as e:
                error_msg = f'Error processing parcelle {parcelle.code_parcelle}: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['production']['errors'] += 1
                continue
        
        # Bulk create if not dry run
        if not dry_run and production_records:
            try:
                with transaction.atomic():
                    created = ProductionHistory.objects.bulk_create(
                        production_records,
                        ignore_conflicts=True  # Skip duplicates
                    )
                    self.stats['production']['success'] = len(created)
                    self.stdout.write(self.style.SUCCESS(f'Created {len(created)} production history records'))
            except Exception as e:
                error_msg = f'Error during bulk create: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['production']['errors'] += len(production_records)
        else:
            self.stats['production']['success'] = len(production_records)
            self.stdout.write(f'Would create {len(production_records)} production history records')

    def migrate_agr_data(self, dry_run=False):
        """
        Migrate AGR data from AGR model to AGRHistory
        """
        self.stdout.write(self.style.WARNING('\n=== Migrating AGR Data ==='))
        
        # Get all active AGR records
        agr_records = AGR.objects.filter(active=True)
        total_agr = agr_records.count()
        
        self.stdout.write(f'Found {total_agr} active AGR records')
        
        agr_history_records = []
        producteurs_without_agr = []
        
        for idx, agr in enumerate(agr_records, 1):
            if idx % 50 == 0:
                self.stdout.write(f'Processing AGR {idx}/{total_agr}...')
            
            try:
                producteur = agr.producteur
                
                # Determine the year
                # Priority: date_adhesion_cooperative > current year
                annee = None
                if producteur.date_adhesion_cooperative:
                    annee = producteur.date_adhesion_cooperative.year
                else:
                    annee = datetime.now().year
                    producteurs_without_agr.append(producteur.code)
                
                # Validate year (allow older data from 1900)
                if annee < 1900 or annee > 2100:
                    error_msg = f'Invalid year {annee} for producteur {producteur.code}, AGR{agr.ordre}'
                    logger.error(error_msg)
                    self.errors.append(error_msg)
                    self.stats['agr']['errors'] += 1
                    continue
                
                # Get revenue
                revenu = agr.revenu_annuel_estime or Decimal('0')
                
                if revenu < 0:
                    error_msg = f'Negative revenue for producteur {producteur.code}, AGR{agr.ordre}'
                    logger.error(error_msg)
                    self.errors.append(error_msg)
                    self.stats['agr']['errors'] += 1
                    continue
                
                agr_history = AGRHistory(
                    producteur=producteur,
                    annee=annee,
                    type_agr=agr.type_agr,
                    ordre=agr.ordre,
                    quantite_produite=agr.quantite_consommee_annuelle,  # Note: using consommee as produite
                    quantite_vendue=agr.quantite_vendue_annuelle,
                    quantite_consommee=agr.quantite_consommee_annuelle,
                    prix_vente_unitaire=agr.prix_vente_unitaire,
                    revenu_annuel=revenu,
                    enregistre_par=None,
                    notes=f'Migrated from AGR model'
                )
                
                agr_history_records.append(agr_history)
                
            except Exception as e:
                error_msg = f'Error processing AGR {agr.id} for producteur {agr.producteur.code}: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['agr']['errors'] += 1
                continue
        
        # Log producteurs without date_adhesion
        if producteurs_without_agr:
            logger.warning(f'{len(producteurs_without_agr)} producteurs without date_adhesion_cooperative: {", ".join(producteurs_without_agr[:10])}...')
        
        # Bulk create if not dry run
        if not dry_run and agr_history_records:
            try:
                with transaction.atomic():
                    created = AGRHistory.objects.bulk_create(
                        agr_history_records,
                        ignore_conflicts=True  # Skip duplicates
                    )
                    self.stats['agr']['success'] = len(created)
                    self.stdout.write(self.style.SUCCESS(f'Created {len(created)} AGR history records'))
            except Exception as e:
                error_msg = f'Error during bulk create: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['agr']['errors'] += len(agr_history_records)
        else:
            self.stats['agr']['success'] = len(agr_history_records)
            self.stdout.write(f'Would create {len(agr_history_records)} AGR history records')

    def migrate_social_data(self, dry_run=False):
        """
        Migrate social indicator data from Producteur to SocialIndicatorHistory
        """
        self.stdout.write(self.style.WARNING('\n=== Migrating Social Indicator Data ==='))
        
        # Get all active producteurs
        producteurs = Producteur.objects.filter(actif=True)
        total_producteurs = producteurs.count()
        
        self.stdout.write(f'Found {total_producteurs} active producteurs')
        
        social_records = []
        
        for idx, producteur in enumerate(producteurs, 1):
            if idx % 50 == 0:
                self.stdout.write(f'Processing producteur {idx}/{total_producteurs}...')
            
            try:
                # Determine the year
                # Priority: annee_stat_scolarisation > date_adhesion > current year
                annee = None
                if producteur.annee_stat_scolarisation:
                    annee = producteur.annee_stat_scolarisation
                elif producteur.date_adhesion_cooperative:
                    annee = producteur.date_adhesion_cooperative.year
                else:
                    annee = datetime.now().year
                
                # Validate year (allow older data from 1900)
                if annee < 1900 or annee > 2100:
                    error_msg = f'Invalid year {annee} for producteur {producteur.code}'
                    logger.error(error_msg)
                    self.errors.append(error_msg)
                    self.stats['social']['errors'] += 1
                    continue
                
                # Scolarisation (numeric)
                if producteur.taux_scolarisation and producteur.taux_scolarisation > 0:
                    social_records.append(SocialIndicatorHistory(
                        producteur=producteur,
                        annee=annee,
                        type_indicateur='scolarisation',
                        valeur_numerique=producteur.taux_scolarisation,
                        valeur_texte='',
                        valeur_booleen=None,
                        enregistre_par=None,
                        notes='Migrated from Producteur.taux_scolarisation'
                    ))
                
                # Eau potable (boolean)
                if producteur.eau_potable is not None:
                    social_records.append(SocialIndicatorHistory(
                        producteur=producteur,
                        annee=annee,
                        type_indicateur='eau_potable',
                        valeur_numerique=None,
                        valeur_texte='',
                        valeur_booleen=producteur.eau_potable,
                        enregistre_par=None,
                        notes='Migrated from Producteur.eau_potable'
                    ))
                
                # Santé (boolean - assurance santé)
                if producteur.a_assurance_sante is not None:
                    social_records.append(SocialIndicatorHistory(
                        producteur=producteur,
                        annee=annee,
                        type_indicateur='sante',
                        valeur_numerique=None,
                        valeur_texte='',
                        valeur_booleen=producteur.a_assurance_sante,
                        enregistre_par=None,
                        notes='Migrated from Producteur.a_assurance_sante'
                    ))
                
                # Habitat (text - source_eau as proxy)
                if producteur.source_eau:
                    social_records.append(SocialIndicatorHistory(
                        producteur=producteur,
                        annee=annee,
                        type_indicateur='habitat',
                        valeur_numerique=None,
                        valeur_texte=producteur.source_eau,
                        valeur_booleen=None,
                        enregistre_par=None,
                        notes='Migrated from Producteur.source_eau (as habitat proxy)'
                    ))
                
                # Energie (text - based on available data)
                # We don't have direct energy data, skip for now
                
            except Exception as e:
                error_msg = f'Error processing social indicators for producteur {producteur.code}: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['social']['errors'] += 1
                continue
        
        # Bulk create if not dry run
        if not dry_run and social_records:
            try:
                with transaction.atomic():
                    created = SocialIndicatorHistory.objects.bulk_create(
                        social_records,
                        ignore_conflicts=True  # Skip duplicates
                    )
                    self.stats['social']['success'] = len(created)
                    self.stdout.write(self.style.SUCCESS(f'Created {len(created)} social indicator history records'))
            except Exception as e:
                error_msg = f'Error during bulk create: {str(e)}'
                logger.error(error_msg, exc_info=True)
                self.errors.append(error_msg)
                self.stats['social']['errors'] += len(social_records)
        else:
            self.stats['social']['success'] = len(social_records)
            self.stdout.write(f'Would create {len(social_records)} social indicator history records')

    def print_summary(self):
        """Print migration summary"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('MIGRATION SUMMARY'))
        self.stdout.write('='*60 + '\n')
        
        # Production
        self.stdout.write(self.style.WARNING('PRODUCTION DATA:'))
        self.stdout.write(f"  Success: {self.stats['production']['success']}")
        self.stdout.write(f"  Errors: {self.stats['production']['errors']}")
        self.stdout.write(f"  Skipped: {self.stats['production']['skipped']}\n")
        
        # AGR
        self.stdout.write(self.style.WARNING('AGR DATA:'))
        self.stdout.write(f"  Success: {self.stats['agr']['success']}")
        self.stdout.write(f"  Errors: {self.stats['agr']['errors']}")
        self.stdout.write(f"  Skipped: {self.stats['agr']['skipped']}\n")
        
        # Social
        self.stdout.write(self.style.WARNING('SOCIAL INDICATOR DATA:'))
        self.stdout.write(f"  Success: {self.stats['social']['success']}")
        self.stdout.write(f"  Errors: {self.stats['social']['errors']}")
        self.stdout.write(f"  Skipped: {self.stats['social']['skipped']}\n")
        
        # Totals
        total_success = sum(s['success'] for s in self.stats.values())
        total_errors = sum(s['errors'] for s in self.stats.values())
        total_skipped = sum(s['skipped'] for s in self.stats.values())
        
        self.stdout.write(self.style.WARNING('TOTALS:'))
        self.stdout.write(self.style.SUCCESS(f"  Total Success: {total_success}"))
        if total_errors > 0:
            self.stdout.write(self.style.ERROR(f"  Total Errors: {total_errors}"))
        else:
            self.stdout.write(f"  Total Errors: {total_errors}")
        self.stdout.write(f"  Total Skipped: {total_skipped}")
        
        # Success rate
        total_attempted = total_success + total_errors
        if total_attempted > 0:
            success_rate = (total_success / total_attempted) * 100
            self.stdout.write(f"  Success Rate: {success_rate:.2f}%")
        
        self.stdout.write('\n' + '='*60)

    def generate_migration_report(self, report_file):
        """Generate HTML migration report with statistics and charts"""
        from datetime import datetime
        
        # Calculate totals
        total_success = sum(s['success'] for s in self.stats.values())
        total_errors = sum(s['errors'] for s in self.stats.values())
        total_skipped = sum(s['skipped'] for s in self.stats.values())
        total_attempted = total_success + total_errors
        success_rate = (total_success / total_attempted * 100) if total_attempted > 0 else 0
        
        # Get current counts from database
        from history.models import ProductionHistory, AGRHistory, SocialIndicatorHistory
        db_counts = {
            'production': ProductionHistory.objects.count(),
            'agr': AGRHistory.objects.count(),
            'social': SocialIndicatorHistory.objects.count(),
        }
        
        # Generate HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Migration - Historique Annuel</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-card.success {{
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }}
        .stat-card.error {{
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        }}
        .stat-card.info {{
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }}
        .stat-card h3 {{
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
        }}
        .stat-card .value {{
            font-size: 36px;
            font-weight: bold;
            margin: 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        .success-rate {{
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #27ae60;
        }}
        .error-list {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }}
        .error-item {{
            margin: 5px 0;
            padding: 5px;
            background-color: white;
            border-radius: 4px;
        }}
        .timestamp {{
            color: #7f8c8d;
            font-size: 14px;
            text-align: right;
            margin-top: 30px;
        }}
        .chart-container {{
            margin: 30px 0;
            text-align: center;
        }}
        .bar {{
            display: inline-block;
            width: 30%;
            margin: 10px;
            vertical-align: bottom;
        }}
        .bar-fill {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px;
            border-radius: 4px 4px 0 0;
            font-weight: bold;
        }}
        .bar-label {{
            margin-top: 10px;
            font-weight: bold;
            color: #2c3e50;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Rapport de Migration - Système d'Historique Annuel</h1>
        
        <div class="summary">
            <div class="stat-card success">
                <h3>Enregistrements Migrés</h3>
                <p class="value">{total_success}</p>
            </div>
            <div class="stat-card error">
                <h3>Erreurs</h3>
                <p class="value">{total_errors}</p>
            </div>
            <div class="stat-card info">
                <h3>Ignorés</h3>
                <p class="value">{total_skipped}</p>
            </div>
            <div class="stat-card">
                <h3>Total Traité</h3>
                <p class="value">{total_attempted}</p>
            </div>
        </div>
        
        <div class="success-rate">
            Taux de Réussite: {success_rate:.2f}%
        </div>
        
        <h2>📈 Détails par Type de Données</h2>
        <table>
            <thead>
                <tr>
                    <th>Type de Données</th>
                    <th>Succès</th>
                    <th>Erreurs</th>
                    <th>Ignorés</th>
                    <th>Total en Base</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Productions Agricoles</strong></td>
                    <td>{self.stats['production']['success']}</td>
                    <td>{self.stats['production']['errors']}</td>
                    <td>{self.stats['production']['skipped']}</td>
                    <td>{db_counts['production']}</td>
                </tr>
                <tr>
                    <td><strong>Revenus AGR</strong></td>
                    <td>{self.stats['agr']['success']}</td>
                    <td>{self.stats['agr']['errors']}</td>
                    <td>{self.stats['agr']['skipped']}</td>
                    <td>{db_counts['agr']}</td>
                </tr>
                <tr>
                    <td><strong>Indicateurs Sociaux</strong></td>
                    <td>{self.stats['social']['success']}</td>
                    <td>{self.stats['social']['errors']}</td>
                    <td>{self.stats['social']['skipped']}</td>
                    <td>{db_counts['social']}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="chart-container">
            <h2>📊 Visualisation des Migrations</h2>
            <div class="bar">
                <div class="bar-fill" style="height: {self.stats['production']['success'] / 10}px">
                    {self.stats['production']['success']}
                </div>
                <div class="bar-label">Productions</div>
            </div>
            <div class="bar">
                <div class="bar-fill" style="height: {self.stats['agr']['success'] / 10}px">
                    {self.stats['agr']['success']}
                </div>
                <div class="bar-label">AGR</div>
            </div>
            <div class="bar">
                <div class="bar-fill" style="height: {self.stats['social']['success'] / 10}px">
                    {self.stats['social']['success']}
                </div>
                <div class="bar-label">Indicateurs Sociaux</div>
            </div>
        </div>
        
        <h2>⚠️ Erreurs Rencontrées</h2>
        {self._generate_error_section()}
        
        <h2>📝 Données Non Migrées</h2>
        <p>Les données suivantes n'ont pas été migrées :</p>
        <ul>
            <li><strong>Parcelles sans productions_par_culture:</strong> Données non disponibles</li>
            <li><strong>AGR inactifs:</strong> {AGR.objects.filter(active=False).count()}</li>
            <li><strong>Producteurs inactifs:</strong> {Producteur.objects.filter(actif=False).count()}</li>
        </ul>
        
        <h2>✅ Recommandations</h2>
        <ul>
            <li>Vérifier les données migrées via l'interface d'administration Django</li>
            <li>Tester les API REST pour s'assurer que les données sont accessibles</li>
            <li>Vérifier les graphiques d'évolution dans l'interface frontend</li>
            <li>Créer un snapshot annuel pour l'année en cours</li>
            {self._generate_recommendations()}
        </ul>
        
        <p class="timestamp">
            Rapport généré le {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}
        </p>
    </div>
</body>
</html>
"""
        
        # Write HTML file
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        self.stdout.write(self.style.SUCCESS(f'HTML report generated: {report_file}'))

    def _generate_error_section(self):
        """Generate HTML for error section"""
        if not self.errors:
            return '<p style="color: green;">✅ Aucune erreur rencontrée pendant la migration!</p>'
        
        html = '<div class="error-list">'
        html += f'<p><strong>{len(self.errors)} erreur(s) détectée(s):</strong></p>'
        for idx, error in enumerate(self.errors[:20], 1):  # Show first 20 errors
            html += f'<div class="error-item">{idx}. {error}</div>'
        
        if len(self.errors) > 20:
            html += f'<p><em>... et {len(self.errors) - 20} autres erreurs (voir migration_errors.log)</em></p>'
        
        html += '</div>'
        return html

    def _generate_recommendations(self):
        """Generate recommendations based on migration results"""
        recommendations = []
        
        if self.stats['production']['errors'] > 0:
            recommendations.append('<li>Corriger les années invalides dans les parcelles</li>')
        
        if self.stats['agr']['errors'] > 0:
            recommendations.append('<li>Vérifier les revenus AGR négatifs ou incohérents</li>')
        
        if self.stats['social']['errors'] > 0:
            recommendations.append('<li>Compléter les données sociales manquantes</li>')
        
        return '\n'.join(recommendations) if recommendations else ''
