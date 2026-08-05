"""
Commande Django pour importer les productions par culture depuis Excel
Usage: python manage.py import_productions
"""

from django.core.management.base import BaseCommand
from parcelles.models import Parcelle
from producteurs.models import Producteur


class Command(BaseCommand):
    help = 'Import productions par culture depuis le fichier Excel'

    def handle(self, *args, **options):
        # Charger le fichier Excel avec pandas
        import pandas as pd
        
        self.stdout.write("📖 Chargement du fichier Excel...")
        df = pd.read_excel('/media/data/RE/vanille-project/frontend/public/PROFIL PROD_22.10.2025 (1).xlsx')
        
        self.stdout.write(self.style.SUCCESS(f"✅ Fichier chargé : {len(df)} lignes de données\n"))
        
        # Configuration des colonnes Vokatra
        vokatra_configs = [
            ('Vokatra 1', 'Lanjam-bokatra (manta)1'),
            ('Vokatra 2', 'Lanjam-bokatra (manta)'),
            ('Vokatra 3', 'Lanjam-bokatra (manta).1'),
            ('Vokatra 4', 'Lanjam-bokatra (manta).2'),
            ('Vokatra 5', 'Lanjam-bokatra (manta).3'),
            ('Vokatra 6', 'Lanjam-bokatra (manta).4'),
        ]
        
        # Colonne code producteur (première colonne)
        CODE_PRODUCTEUR_COL = 0
        
        # Statistiques
        stats = {
            'total_lignes': 0,
            'parcelles_trouvees': 0,
            'parcelles_mises_a_jour': 0,
            'parcelles_non_trouvees': 0,
            'erreurs': 0,
            'cultures_ajoutees': {}
        }
        
        self.stdout.write("🔄 Traitement des lignes...\n")
        
        # Parcourir toutes les lignes avec pandas
        for index, row in df.iterrows():
            stats['total_lignes'] += 1
            row_idx = index + 2  # +2 car index commence à 0 et ligne 1 = header
            
            # Récupérer le code producteur (première colonne)
            code_producteur = row.iloc[0]
            if pd.isna(code_producteur):
                continue
            
            # Extraire toutes les productions par culture
            productions = {}
            
            # 1. Vokatra 1-6
            for culture_col, prod_col in vokatra_configs:
                culture_name = row.get(culture_col)
                production_value = row.get(prod_col)
                
                if pd.notna(culture_name) and pd.notna(production_value):
                    # Normaliser le nom de culture : minuscule + sans accents
                    import unicodedata
                    culture_normalized = str(culture_name).strip().lower()
                    culture_key = ''.join(c for c in unicodedata.normalize('NFD', culture_normalized) if unicodedata.category(c) != 'Mn')
                    
                    # Convertir la production en nombre
                    try:
                        prod_num = float(production_value)
                        if prod_num > 0:
                            # Si la culture existe déjà, additionner
                            if culture_key in productions:
                                productions[culture_key] += prod_num
                            else:
                                productions[culture_key] = prod_num
                            
                            # Statistiques
                            if culture_key not in stats['cultures_ajoutees']:
                                stats['cultures_ajoutees'][culture_key] = 0
                            stats['cultures_ajoutees'][culture_key] += 1
                    except (ValueError, TypeError):
                        pass
            
            # 2. Vanille (colonnes spécifiques)
            vanille_taona2 = row.get('Vanille Totaly vinavinam-bokatra  (kg) taona 2')
            vanille_taona1 = row.get('Vanille Vokatra voangona (kg) taona 1 ')
            
            vanille_production = None
            if pd.notna(vanille_taona2) and vanille_taona2 not in ['', 0, '0']:
                try:
                    vanille_production = float(vanille_taona2)
                except (ValueError, TypeError):
                    pass
            
            if not vanille_production and pd.notna(vanille_taona1) and vanille_taona1 not in ['', 0, '0']:
                try:
                    vanille_production = float(vanille_taona1)
                except (ValueError, TypeError):
                    pass
            
            if vanille_production and vanille_production > 0:
                if 'vanille' in productions:
                    productions['vanille'] += vanille_production
                else:
                    productions['vanille'] = vanille_production
                
                # Statistiques
                if 'vanille' not in stats['cultures_ajoutees']:
                    stats['cultures_ajoutees']['vanille'] = 0
                stats['cultures_ajoutees']['vanille'] += 1
            
            if not productions:
                continue
            
            # Chercher les parcelles de ce producteur
            try:
                producteur = Producteur.objects.filter(code=code_producteur).first()
                if not producteur:
                    if row_idx <= 10:
                        self.stdout.write(f"⚠️  Ligne {row_idx}: Producteur {code_producteur} non trouvé")
                    stats['parcelles_non_trouvees'] += 1
                    continue
                
                # Mettre à jour toutes les parcelles de ce producteur
                parcelles = Parcelle.objects.filter(producteur=producteur, active=True)
                nb_parcelles = parcelles.count()
                
                if nb_parcelles == 0:
                    stats['parcelles_non_trouvees'] += 1
                    continue
                
                stats['parcelles_trouvees'] += nb_parcelles
                
                # Mettre à jour chaque parcelle
                for parcelle in parcelles:
                    parcelle.productions_par_culture = productions
                    
                    # Recalculer le total de production
                    total_prod = sum(productions.values())
                    if total_prod > 0:
                        parcelle.estimation_production_kg = total_prod
                    
                    parcelle.save()
                    stats['parcelles_mises_a_jour'] += 1
                
                if row_idx <= 10:
                    self.stdout.write(f"✅ Ligne {row_idx}: Producteur {code_producteur} - {nb_parcelles} parcelle(s)")
                    self.stdout.write(f"   Productions: {productions}")
            
            except Exception as e:
                stats['erreurs'] += 1
                if row_idx <= 10:
                    self.stdout.write(self.style.ERROR(f"❌ Ligne {row_idx}: Erreur - {str(e)}"))
            
            # Afficher progression tous les 50 lignes
            if row_idx % 50 == 0:
                self.stdout.write(f"📊 Progression: {row_idx}/{ws.max_row} lignes traitées...")
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("📊 RÉSUMÉ DE L'IMPORT"))
        self.stdout.write("="*60)
        self.stdout.write(f"Total lignes traitées      : {stats['total_lignes']}")
        self.stdout.write(f"Parcelles trouvées         : {stats['parcelles_trouvees']}")
        self.stdout.write(f"Parcelles mises à jour     : {stats['parcelles_mises_a_jour']}")
        self.stdout.write(f"Parcelles non trouvées     : {stats['parcelles_non_trouvees']}")
        self.stdout.write(f"Erreurs                    : {stats['erreurs']}")
        self.stdout.write(f"\n🌱 Cultures importées:")
        for culture, count in sorted(stats['cultures_ajoutees'].items(), key=lambda x: x[1], reverse=True):
            self.stdout.write(f"   {culture}: {count} occurrences")
        self.stdout.write("="*60)
        
        self.stdout.write(self.style.SUCCESS("\n✅ Import terminé !"))
