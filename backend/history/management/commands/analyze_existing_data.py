"""
Management command to analyze existing data before migration.
Analyzes Producteur AGR fields and Parcelle production fields to prepare for migration.
"""
import csv
from datetime import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Count, Q, Avg, Sum
from producteurs.models import Producteur, AGR
from parcelles.models import Parcelle


class Command(BaseCommand):
    help = 'Analyze existing data before migration to history models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='migration_analysis_report.csv',
            help='Output CSV file path'
        )

    def handle(self, *args, **options):
        output_file = options['output']
        
        self.stdout.write(self.style.SUCCESS('Starting data analysis...'))
        
        # Collect all statistics
        stats = {
            'timestamp': datetime.now().isoformat(),
            'producteurs': self.analyze_producteurs(),
            'agr': self.analyze_agr(),
            'parcelles': self.analyze_parcelles(),
            'years': self.identify_years(),
            'inconsistencies': self.identify_inconsistencies(),
        }
        
        # Generate report
        self.generate_report(stats, output_file)
        
        self.stdout.write(self.style.SUCCESS(f'Analysis complete! Report saved to {output_file}'))
        self.print_summary(stats)

    def analyze_producteurs(self):
        """Analyze Producteur model for AGR-related data"""
        total = Producteur.objects.count()
        actifs = Producteur.objects.filter(actif=True).count()
        
        # Analyze AGR text fields (old format)
        with_agr1 = Producteur.objects.exclude(Q(agr1='') | Q(agr1__isnull=True)).count()
        with_agr2 = Producteur.objects.exclude(Q(agr2='') | Q(agr2__isnull=True)).count()
        
        # Analyze date_adhesion for year extraction
        with_date_adhesion = Producteur.objects.filter(
            date_adhesion_cooperative__isnull=False
        ).count()
        
        # Social indicators
        with_scolarisation = Producteur.objects.filter(
            taux_scolarisation__gt=0
        ).count()
        with_eau_potable = Producteur.objects.filter(
            eau_potable=True
        ).count()
        with_assurance_sante = Producteur.objects.filter(
            a_assurance_sante=True
        ).count()
        
        return {
            'total': total,
            'actifs': actifs,
            'with_agr1_text': with_agr1,
            'with_agr2_text': with_agr2,
            'with_date_adhesion': with_date_adhesion,
            'with_scolarisation': with_scolarisation,
            'with_eau_potable': with_eau_potable,
            'with_assurance_sante': with_assurance_sante,
        }

    def analyze_agr(self):
        """Analyze AGR model (new format)"""
        total = AGR.objects.count()
        active = AGR.objects.filter(active=True).count()
        
        # By type
        by_type = {}
        for type_agr, _ in AGR.TYPE_AGR_CHOICES:
            count = AGR.objects.filter(type_agr=type_agr, active=True).count()
            by_type[type_agr] = count
        
        # With revenue data
        with_revenue = AGR.objects.filter(
            active=True,
            revenu_annuel_estime__isnull=False,
            revenu_annuel_estime__gt=0
        ).count()
        
        # With quantity data
        with_quantity_sold = AGR.objects.filter(
            active=True,
            quantite_vendue_annuelle__isnull=False,
            quantite_vendue_annuelle__gt=0
        ).count()
        
        # Revenue statistics
        revenue_stats = AGR.objects.filter(
            active=True,
            revenu_annuel_estime__isnull=False
        ).aggregate(
            total=Sum('revenu_annuel_estime'),
            avg=Avg('revenu_annuel_estime'),
            count=Count('id')
        )
        
        return {
            'total': total,
            'active': active,
            'by_type': by_type,
            'with_revenue': with_revenue,
            'with_quantity_sold': with_quantity_sold,
            'revenue_total': float(revenue_stats['total'] or 0),
            'revenue_avg': float(revenue_stats['avg'] or 0),
            'revenue_count': revenue_stats['count'],
        }

    def analyze_parcelles(self):
        """Analyze Parcelle model for production data"""
        total = Parcelle.objects.count()
        active = Parcelle.objects.filter(active=True).count()
        
        # With production data
        with_production = Parcelle.objects.filter(
            estimation_production_kg__gt=0
        ).count()
        
        # With productions_par_culture JSON data
        with_json_production = Parcelle.objects.exclude(
            productions_par_culture={}
        ).count()
        
        # With cultures_pratiquees
        with_cultures = Parcelle.objects.exclude(
            cultures_pratiquees=[]
        ).count()
        
        # With year data
        with_annee_plantation = Parcelle.objects.filter(
            annee_plantation__isnull=False
        ).count()
        with_annee_creation = Parcelle.objects.filter(
            annee_creation__isnull=False
        ).count()
        
        # Production statistics
        production_stats = Parcelle.objects.filter(
            active=True,
            estimation_production_kg__gt=0
        ).aggregate(
            total=Sum('estimation_production_kg'),
            avg=Avg('estimation_production_kg'),
            count=Count('id')
        )
        
        # Culture types from JSON
        culture_types = set()
        for parcelle in Parcelle.objects.exclude(productions_par_culture={}):
            if isinstance(parcelle.productions_par_culture, dict):
                culture_types.update(parcelle.productions_par_culture.keys())
        
        return {
            'total': total,
            'active': active,
            'with_production': with_production,
            'with_json_production': with_json_production,
            'with_cultures': with_cultures,
            'with_annee_plantation': with_annee_plantation,
            'with_annee_creation': with_annee_creation,
            'production_total': float(production_stats['total'] or 0),
            'production_avg': float(production_stats['avg'] or 0),
            'production_count': production_stats['count'],
            'culture_types': list(culture_types),
        }

    def identify_years(self):
        """Identify available years in the data"""
        years = set()
        
        # From Producteur date_adhesion
        adhesion_years = Producteur.objects.filter(
            date_adhesion_cooperative__isnull=False
        ).values_list('date_adhesion_cooperative__year', flat=True)
        years.update(adhesion_years)
        
        # From Parcelle annee_plantation
        plantation_years = Parcelle.objects.filter(
            annee_plantation__isnull=False
        ).values_list('annee_plantation', flat=True)
        years.update(plantation_years)
        
        # From Parcelle annee_creation
        creation_years = Parcelle.objects.filter(
            annee_creation__isnull=False
        ).values_list('annee_creation', flat=True)
        years.update(creation_years)
        
        # From Producteur annee_stat_scolarisation
        scolarisation_years = Producteur.objects.filter(
            annee_stat_scolarisation__isnull=False
        ).values_list('annee_stat_scolarisation', flat=True)
        years.update(scolarisation_years)
        
        # From Producteur mahavelona_annee
        mahavelona_years = Producteur.objects.filter(
            mahavelona_annee__isnull=False
        ).values_list('mahavelona_annee', flat=True)
        years.update(mahavelona_years)
        
        years = sorted([y for y in years if y and 2000 <= y <= 2100])
        
        return {
            'available_years': years,
            'min_year': min(years) if years else None,
            'max_year': max(years) if years else None,
            'count': len(years),
        }

    def identify_inconsistencies(self):
        """Identify data inconsistencies"""
        issues = []
        
        # AGR with negative revenue
        negative_revenue = AGR.objects.filter(
            revenu_annuel_estime__lt=0
        ).count()
        if negative_revenue > 0:
            issues.append({
                'type': 'negative_agr_revenue',
                'count': negative_revenue,
                'severity': 'high'
            })
        
        # Parcelles with negative production
        negative_production = Parcelle.objects.filter(
            estimation_production_kg__lt=0
        ).count()
        if negative_production > 0:
            issues.append({
                'type': 'negative_production',
                'count': negative_production,
                'severity': 'high'
            })
        
        # AGR with inconsistent revenue calculation
        inconsistent_agr = 0
        for agr in AGR.objects.filter(
            active=True,
            quantite_vendue_annuelle__isnull=False,
            prix_vente_unitaire__isnull=False,
            revenu_annuel_estime__isnull=False
        ):
            expected = agr.quantite_vendue_annuelle * agr.prix_vente_unitaire
            if abs(expected - agr.revenu_annuel_estime) > Decimal('0.01'):
                inconsistent_agr += 1
        
        if inconsistent_agr > 0:
            issues.append({
                'type': 'inconsistent_agr_revenue',
                'count': inconsistent_agr,
                'severity': 'medium'
            })
        
        # Producteurs with invalid years
        invalid_years = Producteur.objects.filter(
            Q(annee_stat_scolarisation__lt=2000) | Q(annee_stat_scolarisation__gt=2100) |
            Q(mahavelona_annee__lt=2000) | Q(mahavelona_annee__gt=2100)
        ).count()
        if invalid_years > 0:
            issues.append({
                'type': 'invalid_years',
                'count': invalid_years,
                'severity': 'medium'
            })
        
        # Parcelles with invalid years
        invalid_parcelle_years = Parcelle.objects.filter(
            Q(annee_plantation__lt=1900) | Q(annee_plantation__gt=2100) |
            Q(annee_creation__lt=1900) | Q(annee_creation__gt=2100)
        ).count()
        if invalid_parcelle_years > 0:
            issues.append({
                'type': 'invalid_parcelle_years',
                'count': invalid_parcelle_years,
                'severity': 'medium'
            })
        
        # Producteurs without date_adhesion (will use current year)
        no_adhesion_date = Producteur.objects.filter(
            actif=True,
            date_adhesion_cooperative__isnull=True
        ).count()
        if no_adhesion_date > 0:
            issues.append({
                'type': 'no_adhesion_date',
                'count': no_adhesion_date,
                'severity': 'low'
            })
        
        return {
            'total_issues': len(issues),
            'issues': issues
        }

    def generate_report(self, stats, output_file):
        """Generate CSV report"""
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Header
            writer.writerow(['Migration Analysis Report'])
            writer.writerow(['Generated:', stats['timestamp']])
            writer.writerow([])
            
            # Producteurs section
            writer.writerow(['PRODUCTEURS'])
            writer.writerow(['Metric', 'Value'])
            for key, value in stats['producteurs'].items():
                writer.writerow([key, value])
            writer.writerow([])
            
            # AGR section
            writer.writerow(['AGR (New Model)'])
            writer.writerow(['Metric', 'Value'])
            for key, value in stats['agr'].items():
                if key == 'by_type':
                    for agr_type, count in value.items():
                        writer.writerow([f'  {agr_type}', count])
                else:
                    writer.writerow([key, value])
            writer.writerow([])
            
            # Parcelles section
            writer.writerow(['PARCELLES'])
            writer.writerow(['Metric', 'Value'])
            for key, value in stats['parcelles'].items():
                if key == 'culture_types':
                    writer.writerow([key, ', '.join(value)])
                else:
                    writer.writerow([key, value])
            writer.writerow([])
            
            # Years section
            writer.writerow(['AVAILABLE YEARS'])
            writer.writerow(['Metric', 'Value'])
            for key, value in stats['years'].items():
                if key == 'available_years':
                    writer.writerow([key, ', '.join(map(str, value))])
                else:
                    writer.writerow([key, value])
            writer.writerow([])
            
            # Inconsistencies section
            writer.writerow(['INCONSISTENCIES'])
            writer.writerow(['Type', 'Count', 'Severity'])
            for issue in stats['inconsistencies']['issues']:
                writer.writerow([issue['type'], issue['count'], issue['severity']])
            writer.writerow([])
            writer.writerow(['Total Issues', stats['inconsistencies']['total_issues']])

    def print_summary(self, stats):
        """Print summary to console"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('MIGRATION ANALYSIS SUMMARY'))
        self.stdout.write('='*60 + '\n')
        
        self.stdout.write(self.style.WARNING('PRODUCTEURS:'))
        self.stdout.write(f"  Total: {stats['producteurs']['total']}")
        self.stdout.write(f"  Active: {stats['producteurs']['actifs']}")
        self.stdout.write(f"  With AGR1 (text): {stats['producteurs']['with_agr1_text']}")
        self.stdout.write(f"  With AGR2 (text): {stats['producteurs']['with_agr2_text']}")
        self.stdout.write(f"  With date adhesion: {stats['producteurs']['with_date_adhesion']}\n")
        
        self.stdout.write(self.style.WARNING('AGR (New Model):'))
        self.stdout.write(f"  Total: {stats['agr']['total']}")
        self.stdout.write(f"  Active: {stats['agr']['active']}")
        self.stdout.write(f"  With revenue: {stats['agr']['with_revenue']}")
        self.stdout.write(f"  Total revenue: {stats['agr']['revenue_total']:,.2f} Ar\n")
        
        self.stdout.write(self.style.WARNING('PARCELLES:'))
        self.stdout.write(f"  Total: {stats['parcelles']['total']}")
        self.stdout.write(f"  Active: {stats['parcelles']['active']}")
        self.stdout.write(f"  With production: {stats['parcelles']['with_production']}")
        self.stdout.write(f"  With JSON production: {stats['parcelles']['with_json_production']}")
        self.stdout.write(f"  Total production: {stats['parcelles']['production_total']:,.2f} kg\n")
        
        self.stdout.write(self.style.WARNING('YEARS:'))
        self.stdout.write(f"  Available years: {stats['years']['count']}")
        self.stdout.write(f"  Range: {stats['years']['min_year']} - {stats['years']['max_year']}\n")
        
        self.stdout.write(self.style.WARNING('INCONSISTENCIES:'))
        if stats['inconsistencies']['total_issues'] == 0:
            self.stdout.write(self.style.SUCCESS('  No issues found!'))
        else:
            for issue in stats['inconsistencies']['issues']:
                severity_style = self.style.ERROR if issue['severity'] == 'high' else self.style.WARNING
                self.stdout.write(severity_style(
                    f"  [{issue['severity'].upper()}] {issue['type']}: {issue['count']}"
                ))
        
        self.stdout.write('\n' + '='*60)
