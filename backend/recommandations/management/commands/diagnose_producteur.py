from django.core.management.base import BaseCommand
from django.db import connection
from producteurs.models import Producteur
from parcelles.models import Parcelle
from recommandations.models import Activite


class Command(BaseCommand):
    help = 'Diagnostic complet des données d\'un producteur pour les recommandations IA'

    def add_arguments(self, parser):
        parser.add_argument(
            'producteur_id',
            type=int,
            help='ID du producteur à diagnostiquer'
        )

    def handle(self, *args, **options):
        producteur_id = options['producteur_id']
        
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS(f'DIAGNOSTIC PRODUCTEUR ID: {producteur_id}'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        # 1. Vérifier l'existence du producteur
        try:
            producteur = Producteur.objects.get(id=producteur_id)
            self.stdout.write(self.style.SUCCESS(f'\n✅ Producteur trouvé: {producteur.nom_complet}'))
            self.stdout.write(f'   Code: {producteur.code}')
            self.stdout.write(f'   Actif: {producteur.actif}')
            self.stdout.write(f'   Date adhésion: {producteur.date_adhesion}')
        except Producteur.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'\n❌ Producteur {producteur_id} introuvable'))
            return
        
        if not producteur.actif:
            self.stdout.write(self.style.WARNING('\n⚠️  PRODUCTEUR INACTIF - Ne sera pas inclus dans l\'analyse'))
        
        # 2. Requête SQL pour les parcelles
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))
        self.stdout.write(self.style.SUCCESS('📊 ANALYSE DES PARCELLES'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id,
                    code_parcelle,
                    active,
                    dimension_ha,
                    nombre_pieds,
                    estimation_production_kg,
                    annee_plantation,
                    certifiee,
                    type_vanille,
                    cultures_pratiquees
                FROM parcelles_parcelle
                WHERE producteur_id = %s
                ORDER BY numero_parcelle
            """, [producteur_id])
            
            parcelles = cursor.fetchall()
            
            if not parcelles:
                self.stdout.write(self.style.ERROR('\n❌ AUCUNE PARCELLE TROUVÉE'))
                self.stdout.write(self.style.WARNING('   → Le producteur doit avoir au moins 1 parcelle'))
            else:
                self.stdout.write(f'\n📈 Total parcelles: {len(parcelles)}')
                self.stdout.write('\n' + '-' * 80)
                
                parcelles_actives = 0
                problemes = []
                
                for parcelle in parcelles:
                    (pid, code, active, dim_ha, nb_pieds, prod_kg, annee_plant, 
                     certif, type_v, cultures) = parcelle
                    
                    status_icon = '✅' if active else '❌'
                    self.stdout.write(f'\n{status_icon} Parcelle: {code}')
                    self.stdout.write(f'   ID: {pid}')
                    self.stdout.write(f'   Active: {active}')
                    self.stdout.write(f'   Dimension (ha): {dim_ha}')
                    self.stdout.write(f'   Nombre pieds: {nb_pieds}')
                    self.stdout.write(f'   Production (kg): {prod_kg}')
                    self.stdout.write(f'   Année plantation: {annee_plant}')
                    self.stdout.write(f'   Certifiée: {certif}')
                    self.stdout.write(f'   Type vanille: {type_v}')
                    self.stdout.write(f'   Cultures: {cultures}')
                    
                    # Analyser les problèmes
                    issues = []
                    if not active:
                        issues.append('Parcelle INACTIVE')
                        parcelles_actives += 0
                    else:
                        parcelles_actives += 1
                        if not dim_ha or float(dim_ha) <= 0:
                            issues.append('Superficie = 0 ou manquante')
                        if not nb_pieds or nb_pieds <= 0:
                            issues.append('Nombre de pieds = 0 ou manquant')
                        if not prod_kg or float(prod_kg) <= 0:
                            issues.append('Production = 0 ou manquante (WARNING)')
                        if not annee_plant:
                            issues.append('Année plantation manquante (WARNING)')
                        if not cultures or cultures == '[]':
                            issues.append('Cultures pratiquées manquantes (WARNING)')
                    
                    if issues:
                        problemes.append((code, issues))
                        self.stdout.write(self.style.WARNING(f'   ⚠️  Problèmes détectés:'))
                        for issue in issues:
                            self.stdout.write(self.style.WARNING(f'      - {issue}'))
                
                self.stdout.write('\n' + '-' * 80)
                self.stdout.write(f'\n📊 RÉSUMÉ PARCELLES:')
                self.stdout.write(f'   Total parcelles: {len(parcelles)}')
                self.stdout.write(f'   Parcelles actives: {parcelles_actives}')
                self.stdout.write(f'   Parcelles inactives: {len(parcelles) - parcelles_actives}')
                
                if problemes:
                    self.stdout.write(self.style.ERROR(f'\n❌ {len(problemes)} parcelle(s) avec problèmes:'))
                    for code, issues in problemes:
                        self.stdout.write(f'   • {code}: {len(issues)} problème(s)')
        
        # 3. Requête SQL pour les activités
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))
        self.stdout.write(self.style.SUCCESS('📚 ANALYSE DES ACTIVITÉS'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id,
                    type,
                    description,
                    date,
                    impact_score
                FROM recommandations_activite
                WHERE producteur_id = %s
                ORDER BY date DESC
                LIMIT 10
            """, [producteur_id])
            
            activites = cursor.fetchall()
            
            if not activites:
                self.stdout.write(self.style.WARNING('\n⚠️  AUCUNE ACTIVITÉ ENREGISTRÉE'))
                self.stdout.write('   → Recommandé: Ajouter des activités (formations, collectes)')
            else:
                self.stdout.write(f'\n📈 Total activités: {len(activites)} (10 dernières affichées)')
                
                formations = 0
                collectes = 0
                
                for activite in activites:
                    aid, atype, desc, date, impact = activite
                    self.stdout.write(f'\n   • {atype} - {date}')
                    self.stdout.write(f'     Impact: {impact}/10')
                    self.stdout.write(f'     Description: {desc[:50]}...' if len(desc) > 50 else f'     Description: {desc}')
                    
                    if 'formation' in atype.lower():
                        formations += 1
                    if 'collecte' in atype.lower():
                        collectes += 1
                
                self.stdout.write(f'\n📊 RÉSUMÉ ACTIVITÉS:')
                self.stdout.write(f'   Formations: {formations}')
                self.stdout.write(f'   Collectes: {collectes}')
        
        # 4. Conclusion et recommandations
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))
        self.stdout.write(self.style.SUCCESS('💡 CONCLUSION & RECOMMANDATIONS'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        
        can_generate = True
        recommendations = []
        
        if not producteur.actif:
            can_generate = False
            recommendations.append('❌ BLOQUANT: Activer le producteur')
        
        if not parcelles:
            can_generate = False
            recommendations.append('❌ BLOQUANT: Ajouter au moins 1 parcelle')
        elif parcelles_actives == 0:
            can_generate = False
            recommendations.append('❌ BLOQUANT: Activer au moins 1 parcelle')
        
        if problemes:
            for code, issues in problemes:
                for issue in issues:
                    if 'Superficie' in issue or 'pieds' in issue:
                        can_generate = False
                        recommendations.append(f'❌ BLOQUANT: {code} - {issue}')
                    else:
                        recommendations.append(f'⚠️  WARNING: {code} - {issue}')
        
        if not activites:
            recommendations.append('ℹ️  RECOMMANDÉ: Ajouter des activités pour de meilleures recommandations')
        
        if can_generate:
            self.stdout.write(self.style.SUCCESS('\n✅ Le producteur a suffisamment de données pour générer des recommandations'))
        else:
            self.stdout.write(self.style.ERROR('\n❌ Le producteur N\'A PAS suffisamment de données'))
        
        if recommendations:
            self.stdout.write('\n📋 Actions à effectuer:')
            for rec in recommendations:
                if '❌' in rec:
                    self.stdout.write(self.style.ERROR(f'   {rec}'))
                elif '⚠️' in rec:
                    self.stdout.write(self.style.WARNING(f'   {rec}'))
                else:
                    self.stdout.write(f'   {rec}')
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))
        self.stdout.write(self.style.SUCCESS('FIN DU DIAGNOSTIC'))
        self.stdout.write(self.style.SUCCESS('=' * 80 + '\n'))
