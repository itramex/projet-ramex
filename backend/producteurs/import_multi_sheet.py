"""
Import Excel multi-onglets pour le fichier PROFIL PROD_24.12.2025.xlsx
Structure:
- Onglet "Producteur": Informations producteurs
- Onglet "Parcelle": Informations parcelles (P1, P2, P3...)
- Onglet "Formation": Formations reçues
- Onglet "Dotation": Dotations reçues
- Onglet "AGR": Activités génératrices de revenus
"""
import logging
import re
import openpyxl
from decimal import Decimal
from datetime import datetime
from django.db import transaction
from django.contrib.gis.geos import Point, Polygon
from producteurs.models import Producteur
from cooperatives.models import Cooperative
from parcelles.models import Parcelle
from formations.models import Formation, TypeFormation, Certification, TypeCertification

logger = logging.getLogger(__name__)


class ExcelMultiSheetImporter:
    """Importeur pour fichiers Excel multi-onglets"""
    
    def __init__(self, file_path, user=None):
        self.file_path = file_path
        self.user = user
        self.wb = openpyxl.load_workbook(file_path, data_only=True)
        self.stats = {
            'producteurs_created': 0,
            'producteurs_updated': 0,
            'parcelles_created': 0,
            'parcelles_updated': 0,
            'formations_created': 0,
            'certifications_created': 0,
            'dotations_created': 0,
            'dotations_updated': 0,
            'villages_created': 0,
            'errors': []
        }
    
    def clean_value(self, value):
        """Nettoyer une valeur Excel"""
        if value is None or value == '':
            return None
        if isinstance(value, str):
            value = value.strip()
            if value.lower() in ['', 'none', 'null', 'n/a', '-']:
                return None
        return value
    
    def parse_date(self, value):
        """Parser une date depuis Excel"""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except:
                try:
                    return datetime.strptime(value, '%d/%m/%Y').date()
                except:
                    return None
        return None
    
    def parse_polygon(self, polygon_str):
        """Parser une chaîne de polygone"""
        if not polygon_str:
            return None
        
        try:
            # Format attendu: "lat1,lng1;lat2,lng2;lat3,lng3;..."
            points = []
            for point_str in polygon_str.split(';'):
                if ',' in point_str:
                    lat, lng = point_str.split(',')
                    points.append((float(lng.strip()), float(lat.strip())))
            
            if len(points) >= 3:
                # Fermer le polygone si nécessaire
                if points[0] != points[-1]:
                    points.append(points[0])
                return Polygon(points, srid=4326)
        except Exception as e:
            logger.warning(f"Erreur parsing polygone: {e}")
        
        return None
    
    def get_or_create_cooperative(self, nom, location_data):
        """Créer ou récupérer une coopérative"""
        if not nom:
            return None
        
        try:
            coop, created = Cooperative.objects.get_or_create(
                nom=nom,
                defaults={
                    'code': nom[:10].upper(),
                    'commune': location_data.get('commune', ''),
                    'fokontany': location_data.get('fokontany', ''),
                    'village': location_data.get('village', ''),
                    'region': '',
                    'district': ''
                }
            )
            return coop
        except Exception as e:
            logger.error(f"Erreur création coopérative {nom}: {e}")
            return None
    
    def get_or_create_village_reference(self, village, commune=None, fokontany=None, region=None):
        """
        Créer ou récupérer un village de référence
        
        Args:
            village: Nom du village (obligatoire)
            commune: Nom de la commune (optionnel)
            fokontany: Nom du fokontany (optionnel)
            region: Nom de la région (optionnel)
        
        Returns:
            VillageReference: Instance du village de référence
        """
        if not village or not str(village).strip():
            return None
        
        try:
            from dashboard.models import VillageReference
            
            village_name = str(village).strip()
            commune_name = str(commune).strip() if commune else None
            fokontany_name = str(fokontany).strip() if fokontany else None
            region_name = str(region).strip() if region else None
            
            # Créer ou récupérer le village de référence
            village_ref, created = VillageReference.objects.get_or_create(
                name=village_name,
                commune=commune_name,
                fokontany=fokontany_name,
                defaults={
                    'region': region_name
                }
            )
            
            if created:
                self.stats['villages_created'] += 1
            
            return village_ref
            
        except Exception as e:
            logger.error(f"Erreur création village de référence {village}: {e}")
            return None
    
    def _parse_boolean(self, value):
        """Convertit une valeur Excel en booléen.

        Une cellule vide vaut False : comportement historique conservé, car les
        champs cibles sont des BooleanField non nullables et `None` ferait
        échouer l'import (IntegrityError). La reconnaissance des tokens est en
        revanche élargie (vrai/eo/tsia/no/faux/0.0…).
        """
        if value is None or (isinstance(value, str) and not value.strip()):
            return False
        value_str = str(value).strip().lower()
        return value_str in ['oui', 'eny', 'yes', '1', '1.0', 'true', 'vrai', 'eo']

    def _parse_int(self, value, default=0):
        """Convertit une valeur Excel en entier"""
        if value is None or value == '':
            return default
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return default

    def _parse_birth_year(self, value):
        """
        Extraire l'année de naissance depuis différents formats de date
        
        Formats supportés:
        - "vers aaaa" -> aaaa
        - "aaaa-mm-jj" -> aaaa
        - "jj/mm/aaaa" -> aaaa
        - "aaaa" -> aaaa
        - datetime object -> aaaa
        
        Args:
            value: Valeur brute depuis Excel (str, int, datetime)
        
        Returns:
            int or None: Année de naissance (1900-2100) ou None si invalide
        """
        if value is None or value == '':
            return None
        
        # Si c'est déjà un datetime, extraire l'année
        if isinstance(value, datetime):
            year = value.year
            if 1900 <= year <= 2100:
                return year
            return None
        
        # Convertir en string pour le traitement
        value_str = str(value).strip()
        
        # Format: "vers aaaa" ou "vers  aaaa"
        if 'vers' in value_str.lower():
            match = re.search(r'(\d{4})', value_str)
            if match:
                year = int(match.group(1))
                if 1900 <= year <= 2100:
                    return year
        
        # Format: "aaaa-mm-jj" (ISO format)
        if '-' in value_str:
            parts = value_str.split('-')
            if len(parts) >= 1:
                try:
                    year = int(parts[0])
                    if 1900 <= year <= 2100:
                        return year
                except ValueError:
                    pass
        
        # Format: "jj/mm/aaaa" (French format)
        if '/' in value_str:
            parts = value_str.split('/')
            if len(parts) == 3:
                try:
                    year = int(parts[2])
                    if 1900 <= year <= 2100:
                        return year
                except ValueError:
                    pass
        
        # Format: "aaaa" (juste l'année)
        try:
            year = int(float(value_str))
            if 1900 <= year <= 2100:
                return year
        except (ValueError, TypeError):
            pass
        
        return None

    def _parse_type_dotation(self, value):
        """
        Parser et normaliser le type de dotation
        
        Args:
            value: Valeur brute depuis Excel
        
        Returns:
            str: Type de dotation normalisé (kit_scolaire, poisson, volaille, autre)
        """
        if not value:
            return 'autre'
        
        value_lower = str(value).lower().strip()
        
        # Mapping des valeurs possibles
        if 'kit' in value_lower and 'scolaire' in value_lower:
            return 'kit_scolaire'
        elif 'poisson' in value_lower or 'fish' in value_lower:
            return 'poisson'
        elif 'volaille' in value_lower or 'poulet' in value_lower or 'poultry' in value_lower:
            return 'volaille'
        else:
            return 'autre'

    def import_producteurs(self):
        """Importer les producteurs depuis l'onglet Producteur"""
        if 'Producteur' not in self.wb.sheetnames:
            logger.error("Onglet 'Producteur' non trouvé")
            return
        
        ws = self.wb['Producteur']
        
        # Lire les en-têtes
        headers = {}
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(1, col_idx)
            if cell.value:
                headers[col_idx] = str(cell.value).strip()
        
        # Traiter chaque ligne
        for row_idx in range(2, ws.max_row + 1):
            try:
                # Extraire les données de la ligne
                row_data = {}
                for col_idx, header in headers.items():
                    cell = ws.cell(row_idx, col_idx)
                    row_data[header] = self.clean_value(cell.value)
                
                # Code producteur (obligatoire)
                code_raw = row_data.get("Laharan'ny mpamboly (Code prod)")
                if not code_raw:
                    # Vérifier si la ligne est vide pour éviter de spammer les logs
                    if not any(v for k,v in row_data.items() if v):
                         continue
                        
                    self.stats['errors'].append({
                        'ligne': row_idx,
                        'erreur': 'Code producteur manquant'
                    })
                    continue
                
                # Tronquer le code à 20 caractères max
                code = str(code_raw).strip()[:20]

                # ========== IDENTIFICATION ==========
                # Tronquer telephone à 20 car (et nettoyer si possible)
                tel_raw = row_data.get('Laharana finday', '')
                telephone = str(tel_raw).strip()[:20] if tel_raw else ''
                
                producteur_data = {
                    'code': code,
                    'nom': row_data.get("Anaran'ny mpamboly", ''),
                    'prenom': row_data.get("Fanampin'anaran'ny mpamboly", ''),
                    'commune': row_data.get('KAOMININA', ''),
                    'fokontany': row_data.get('FOKONTANY', ''),
                    'village': row_data.get('VILLAGE', ''),
                    'cin': str(row_data.get('CIN', '')).strip()[:15] if row_data.get('CIN') else '',
                    'telephone': telephone,
                    'email': row_data.get('E-mail', ''),
                    'sexe': 'M' if row_data.get('Lahy sa Vavy') == 'Lahy' else 'F',
                    'date_naissance': self.parse_date(row_data.get('Daty nahaterahana')),
                    'actif': True
                }
                
                # ========== ÉDUCATION ==========
                niveau_etude = (row_data.get('Fianarana vita (Préscolaire, Collège, Lycée, Université)') or '').lower()
                if 'université' in niveau_etude or 'universite' in niveau_etude:
                    producteur_data['niveau_education'] = 'universite'
                elif 'lycée' in niveau_etude or 'lycee' in niveau_etude:
                    producteur_data['niveau_education'] = 'lycee'
                elif 'collège' in niveau_etude or 'college' in niveau_etude:
                    producteur_data['niveau_education'] = 'college'
                elif 'préscolaire' in niveau_etude or 'prescolaire' in niveau_etude:
                    producteur_data['niveau_education'] = 'prescolaire'
                else:
                    producteur_data['niveau_education'] = 'primaire'
                
                # ========== SITUATION FAMILIALE ==========
                situation = (row_data.get('Toe-panambadiana') or '').lower()
                if 'célibataire' in situation or 'tokan-tena' in situation:
                    producteur_data['statut_matrimonial'] = 'celibataire'
                elif 'marié' in situation or 'manambady' in situation:
                    producteur_data['statut_matrimonial'] = 'marie'
                elif 'miara-mipetraka' in situation or 'mpisipa' in situation:
                    producteur_data['statut_matrimonial'] = 'union_libre'
                elif 'divorcé' in situation or 'nisaraka' in situation:
                    producteur_data['statut_matrimonial'] = 'divorce'
                elif 'veuf' in situation or 'maty vady' in situation:
                    producteur_data['statut_matrimonial'] = 'veuf'
                else:
                    producteur_data['statut_matrimonial'] = 'celibataire'
                
                # ========== DATE ADHÉSION ==========
                producteur_data['date_adhesion_groupement'] = self.parse_date(row_data.get("Date d'adhésion lakiletelo"))
                
                annee_adhesion = row_data.get('Taona nidirana fikambanana')
                date_coop = None
                if annee_adhesion is not None and annee_adhesion != '':
                    try:
                        annee = int(float(str(annee_adhesion)))
                        if 1990 <= annee <= 2100:
                            from datetime import date
                            date_coop = date(annee, 1, 1)
                    except (ValueError, TypeError):
                        pass
                
                if date_coop is None:
                    date_coop = self.parse_date(annee_adhesion)
                    
                producteur_data['date_adhesion_cooperative'] = date_coop
                
                # ========== VILLAGE DE RÉFÉRENCE ==========
                # Créer ou récupérer le village de référence
                if producteur_data['village']:
                    self.get_or_create_village_reference(
                        village=producteur_data['village'],
                        commune=producteur_data['commune'],
                        fokontany=producteur_data['fokontany'],
                        region=None  # Pas de région dans le fichier Excel
                    )
                
                # ========== COOPÉRATIVE ==========
                coop_name = row_data.get('KOPERATIVA')
                if coop_name:
                    coop = self.get_or_create_cooperative(coop_name, {
                        'commune': producteur_data['commune'],
                        'fokontany': producteur_data['fokontany'],
                        'village': producteur_data['village']
                    })
                    if coop:
                        producteur_data['cooperative'] = coop
                
                # ========== RÔLES ==========
                andraikitra = (row_data.get('Andraikitra (Multi-select)') or '').lower()
                
                # Responsabilité coopérative
                if 'président coopérative' in andraikitra or 'president coop' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'president_coop'
                elif 'vice président coopérative' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'vice_president_coop'
                elif 'trésorier coopérative' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'tresorier_coop'
                elif 'commissaires aux comptes coopérative' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'commissaire_coop'
                elif 'secrétaire coopérative' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'secretaire_coop'
                elif 'conseillers coopérative' in andraikitra or 'conseiller coopérative' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'conseiller_coop'
                elif 'président ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'president_ca'
                elif 'vice président ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'vice_president_ca'
                elif 'trésorier ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'tresorier_ca'
                elif 'commissaires aux comptes ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'commissaire_ca'
                elif 'conseiller ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'conseiller_ca'
                elif 'secrétaire ca' in andraikitra:
                    producteur_data['responsabilite_cooperative'] = 'secretaire_ca'
                else:
                    producteur_data['responsabilite_cooperative'] = 'aucune'
                
                producteur_data['paysan_relais'] = 'paysant relais' in andraikitra or 'paysan relais' in andraikitra
                producteur_data['satellite_floraison'] = 'satélite floraison' in andraikitra or 'satellite floraison' in andraikitra
                
                # ========== FEMME LEADER ==========
                responsabilites_externes = [
                    'satélite floraison', 'secretaire vsla', 'tresorier vsla',
                    'président fokontany', 'secretaire fokontany', 'conseiller fokontany'
                ]
                a_responsabilite_externe = any(resp in andraikitra for resp in responsabilites_externes)
                est_membre_coop_simple = 'membre coop' in andraikitra and not any(resp in andraikitra for resp in [
                    'président coopérative', 'vice président coopérative', 'trésorier coopérative',
                    'secrétaire coopérative', 'commissaire coopérative', 'conseillers coopérative'
                ])
                
                femme_leader_excel = self._parse_boolean(row_data.get('Raha vavy, "Femme leader" ve ?'))
                
                if producteur_data['sexe'] == 'F' and femme_leader_excel:
                    producteur_data['femme_leader'] = True
                elif producteur_data['sexe'] == 'F' and a_responsabilite_externe and not est_membre_coop_simple:
                    producteur_data['femme_leader'] = True
                else:
                    producteur_data['femme_leader'] = False
                
                # ========== GROUPES ==========
                producteur_data['membre_groupement_epargne'] = self._parse_boolean(row_data.get('Mpikambana VSLA ? Mpikambana lakiletelo'))
                
                # ========== COMPOSITION DU FOYER ==========
                producteur_data['nb_adultes_plus_18'] = self._parse_int(row_data.get('Firy ny olona miotra ny 18 taona miara-mipetraka aminao ?'), 0)
                producteur_data['nb_femmes_adultes'] = self._parse_int(row_data.get('Firy ny vavy ?'), 0)
                producteur_data['nb_hommes_adultes'] = self._parse_int(row_data.get('Raha eny, Firy ny lahy?'), 0)
                producteur_data['personne_handicap_foyer'] = self._parse_boolean(row_data.get('Misy olona mana-kilema na fahasembanana ve miara mipetraka aminao?'))
                producteur_data['autres_enfants_foyer'] = self._parse_int(row_data.get('Misy zaza hafa ankoatra ny zanakao ve midoko antranonao? Raha eny firy ny isany?'), 0)
                
                # ========== ENFANTS ==========
                producteur_data['nb_enfants_garcons'] = self._parse_int(row_data.get('Firy ny zanakao lahy ?'), 0)
                producteur_data['nb_enfants_filles'] = self._parse_int(row_data.get('Firy ny zanakao vavy ?'), 0)
                producteur_data['nb_autres_garcons'] = self._parse_int(row_data.get('Firy ny zaza hafa lahy ?'), 0)
                producteur_data['nb_autres_filles'] = self._parse_int(row_data.get('Firy ny zaza hafa vavy ?'), 0)
                
                # Années de naissance des enfants
                producteur_data['annee_naissance_enfant_1'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza voalohany"))
                producteur_data['annee_naissance_enfant_2'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza faha 2"))
                producteur_data['annee_naissance_enfant_3'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza faha 3"))
                producteur_data['annee_naissance_enfant_4'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza faha 4"))
                producteur_data['annee_naissance_enfant_5'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza faha 5"))
                producteur_data['annee_naissance_enfant_6'] = self._parse_birth_year(row_data.get("Taona nahaterahan'ny zaza faha 6"))
                
                # ========== SCOLARISATION ==========
                producteur_data['nb_enfants_scolarises'] = self._parse_int(row_data.get('Firy ny mianatra?'), 0)
                producteur_data['nb_enfants_non_scolarises'] = self._parse_int(row_data.get('Firy ny tokony mianatra nefa tsy mianatra?'), 0)
                
                # Niveau d'étude des enfants
                education_mapping = {
                    'prescolaire': 'prescolaire',
                    'primaire': 'primaire',
                    'collège': 'college',
                    'lycée': 'lycee',
                    'université': 'universite'
                }
                
                for i in range(1, 7):
                    etude_key = f"Hatraiza ny fianarana vitan'ny zaza {'voalohany' if i == 1 else f'faha {i}'} ?"
                    continue_key = f"Mbola manohy ve{'' if i == 1 else f'.{i-1}'}"
                    
                    etude_val = (row_data.get(etude_key) or '').lower()
                    for key, val in education_mapping.items():
                        if key in etude_val:
                            producteur_data[f'niveau_etude_enfant_{i}'] = val
                            break
                    else:
                        producteur_data[f'niveau_etude_enfant_{i}'] = ''
                    
                    producteur_data[f'continue_ecole_enfant_{i}'] = self._parse_boolean(row_data.get(continue_key))
                
                # ========== GESTION DES DÉCHETS ==========
                producteur_data['types_poubelles'] = ''
                producteur_data['a_poubelles_triees'] = self._parse_boolean(row_data.get('Manana lavapako roa na telo karazana an-trano ve ianao?'))
                producteur_data['dechets_non_eparpilles_maison'] = self._parse_boolean(row_data.get("Tsy miparitaka ve ireo fako amin'ny tany ipetrahanao ?"))
                producteur_data['dechets_non_eparpilles_parcelle'] = self._parse_boolean(row_data.get('ary ny @ tanimbolinao?'))
                producteur_data['recyclage_dechets'] = self._parse_boolean(row_data.get('Recyclage des déchets'))
                producteur_data['dechets_chimiques_enterres'] = self._parse_boolean(row_data.get('Nalevinao tsara lavitra ny rano ve ireo fako misy akora simika ?'))
                producteur_data['lieu_dechets_chimiques'] = self.clean_value(row_data.get('raha "tsia" dia natao aiza ny fako misy akora simika?')) or ''
                
                # ========== GESTION DE L'EAU ==========
                producteur_data['fosse_eaux_usees_maison'] = self._parse_boolean(row_data.get('Manana lavaka fanariana rano maloto ve anao any antrano ?'))
                producteur_data['fosse_eaux_usees_champ'] = self._parse_boolean(row_data.get('Manana lavaka fanariana rano maloto ve anao any antanimboly?'))
                producteur_data['recyclage_eau_pluie'] = self._parse_boolean(row_data.get('Recyclage eau de pluie'))
                producteur_data['wc_maison'] = self._parse_boolean(row_data.get('Manana kabone ve anao any antrano?'))
                producteur_data['wc_champ'] = self._parse_boolean(row_data.get('Manana kabone ve anao any @ antanimboly?'))
                producteur_data['lieu_lavage'] = self._parse_boolean(row_data.get("Misy ladosy ve amin'ny lakoronao?"))
                
                source_eau = (row_data.get('Ankaiza anao no malaka rano?') or '').lower()
                if 'renirano' in source_eau or 'rivière' in source_eau:
                    producteur_data['source_eau'] = 'renirano'
                elif 'robinet' in source_eau:
                    producteur_data['source_eau'] = 'robinet'
                elif 'ranovovo' in source_eau or 'puits' in source_eau:
                    producteur_data['source_eau'] = 'ranovovo'
                else:
                    producteur_data['source_eau'] = ''
                
                traitement_eau = (row_data.get('Madio tsara ve ny rano sotroinao?') or '').lower()
                producteur_data['fait_bouillir_eau'] = 'mampandevy' in traitement_eau or 'bouillir' in traitement_eau
                producteur_data['utilise_sureau'] = "sur'eau" in traitement_eau or 'sureau' in traitement_eau
                producteur_data['autre_traitement_eau'] = self.clean_value(row_data.get('Madio tsara ve ny rano sotroinao?')) if 'hafa' in traitement_eau else ''
                
                producteur_data['lave_linge_riviere'] = self._parse_boolean(row_data.get('Manasa lamba/lasety amin\'ny renirano ve ianao?'))
                
                # ========== SANTÉ ==========
                csb = (row_data.get('Misy toeram-pitsaboana ve eny amin\'ny toerana misy anao?') or '').lower()
                if 'csb i' in csb or 'csb1' in csb:
                    producteur_data['type_centre_sante'] = 'csb1'
                elif ('csb i' and 'csb ii') in csb or 'csb2' in csb:
                    producteur_data['type_centre_sante'] = 'csb2'
                elif 'hopitaly' in csb or 'hôpital' in csb or ('csb i' and 'csb ii' and 'csb iii') in csb:
                    producteur_data['type_centre_sante'] = 'hopitaly'
                else:
                    producteur_data['type_centre_sante'] = ''
                
                producteur_data['a_assurance_sante'] = self._parse_boolean(row_data.get('Manana fiantoana ara-pahasalamana ve ianao?'))
                
                # ========== VIE COMMUNAUTAIRE & ENVIRONNEMENT ==========
                producteur_data['respecte_dina'] = self._parse_boolean(row_data.get('Mandray anjara amin\'ireo dina mifehy ny fiaraha-monina ve ianao?'))
                producteur_data['participe_travaux_communautaires'] = self._parse_boolean(row_data.get('Mandray anjara amin\'ny asam-pokonolona ve ianao?'))
                producteur_data['participe_protection_environnement'] = self._parse_boolean(row_data.get('Mandray anjara amin\'ny fikajiana ny tontolo iainana ve ianao?'))
                
                # ========== CHASSE & ÉLEVAGE ==========
                producteur_data['pratique_chasse'] = self._parse_boolean(row_data.get('Mihaza ve ianao?'))
                producteur_data['animaux_chasses'] = self.clean_value(row_data.get('Raha Eny, inona ny karazana ny biby hazainao?')) or ''
                producteur_data['pratique_elevage'] = self._parse_boolean(row_data.get('Mitarimy biby dia ve ianao?'))
                producteur_data['animaux_eleves'] = self.clean_value(row_data.get('Raha Eny, inona ny karazana ny biby dia tariminao?')) or ''
                
                # ========== ACTIVITÉS AGRICOLES ==========
                producteur_data['a_exploite_foret_apres_2019'] = self._parse_boolean(row_data.get("Nitevy ala ve ianao tao aorinan'ny taona 2019?"))
                producteur_data['pratique_tavy'] = self._parse_boolean(row_data.get('Manao Tavy ve ianao?'))
                producteur_data['fait_defrichage'] = self._parse_boolean(row_data.get('Mangady na miasa vato ve ianao?'))
                producteur_data['pratique_peche'] = self._parse_boolean(row_data.get('Manjono na manarato ve ianao?'))
                
                peche_type = (row_data.get('Manjono na manarato ve ianao?') or '').lower()
                producteur_data['peche_mer'] = 'ranomasina' in peche_type
                producteur_data['peche_eau_douce'] = 'ranomamy' in peche_type
                producteur_data['respecte_regles_peche'] = self._parse_boolean(row_data.get('Raha manjono ianao, manaja ireo fepetra mikasika ny jono ve ianao?'))
                
                # ========== PRODUITS CHIMIQUES ==========
                producteur_data['utilise_chimiques_autres_cultures'] = self._parse_boolean(row_data.get('Ianao ve nampiasa Akora simika (ody bibikely, zezika simika) amin\'ny voly hafa noho ny lavanio?'))
                producteur_data['stocke_chimiques_maison'] = self._parse_boolean(row_data.get('Ianao ve mikajy akora simika (ody bibikely, zezika simika) ao antranonao?'))
                producteur_data['lieu_nettoyage_outils_chimiques'] = self._parse_boolean(row_data.get('Misy toerana manokana ve fanadiovana ireo fitaovana ampiasaina amin\'ny akora simika?'))
                
                # ========== DOTATIONS & FORMATIONS (legacy fields) ==========
                dotations = []
                if self._parse_boolean(row_data.get('Dotation Kits Solaire')):
                    dotations.append('Kits Solaire')
                producteur_data['dotations_recues'] = ', '.join(dotations) if dotations else ''
                
                formations = []
                formation_val = self.clean_value(row_data.get('Formation'))
                if formation_val:
                    formations.append(formation_val)
                producteur_data['formations_suivies'] = ', '.join(formations) if formations else ''
                
                # ========== ACTIVITÉS (dotation, mahavelona) ==========
                # Note: Les AGR sont importées depuis l'onglet AGR via import_agr()
                producteur_data['dotation'] = self.clean_value(row_data.get('Dotation Kits Solaire')) or ''
                producteur_data['agr1'] = ''  # Sera rempli par import_agr()
                producteur_data['agr2'] = ''  # Sera rempli par import_agr()
                producteur_data['mahavelona'] = self._parse_boolean(row_data.get('Mahavelona'))
                producteur_data['mahavelona_criteres_version'] = ''
                
                # ========== ACTIVITÉS NON VANILLE (derived) ==========
                producteur_data['ne_brule_pas_foret'] = not producteur_data.get('pratique_tavy', False)
                producteur_data['ne_coupe_pas_foret'] = not producteur_data.get('a_exploite_foret_apres_2019', False)
                producteur_data['ne_cultive_pas_zone_protegee'] = producteur_data.get('participe_protection_environnement', False)
                producteur_data['respecte_loi_animaux_proteges'] = not producteur_data.get('pratique_chasse', False)
                
                # Créer ou mettre à jour
                producteur, created = Producteur.objects.update_or_create(
                    code=code,
                    defaults=producteur_data
                )
                
                if created:
                    self.stats['producteurs_created'] += 1
                else:
                    self.stats['producteurs_updated'] += 1
                
            except Exception as e:
                self.stats['errors'].append({
                    'ligne': row_idx,
                    'erreur': f'Producteur: {str(e)}'
                })
                logger.error(f"Erreur ligne {row_idx}: {e}")
    
    def import_parcelles(self):
        """Importer les parcelles depuis l'onglet Parcelle"""
        if 'Parcelle' not in self.wb.sheetnames:
            logger.error("Onglet 'Parcelle' non trouvé")
            return
        
        ws = self.wb['Parcelle']
        
        # Lire les en-têtes
        headers = {}
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(1, col_idx)
            if cell.value:
                headers[col_idx] = str(cell.value).strip()
        
        # Détecter le nombre de parcelles (P1, P2, P3...)
        parcelle_numbers = set()
        for header in headers.values():
            match = re.search(r'P(\d+)', header)
            if match:
                parcelle_numbers.add(int(match.group(1)))
        
        max_parcelles = max(parcelle_numbers) if parcelle_numbers else 0
        
        # Traiter chaque ligne
        for row_idx in range(2, ws.max_row + 1):
            try:
                # Extraire les données de la ligne
                row_data = {}
                for col_idx, header in headers.items():
                    cell = ws.cell(row_idx, col_idx)
                    row_data[header] = self.clean_value(cell.value)
                
                # Code producteur
                code_prod = row_data.get("Laharan'ny mpamboly (Code prod)")
                if not code_prod:
                    continue
                
                # Récupérer le producteur
                try:
                    producteur = Producteur.objects.get(code=code_prod)
                except Producteur.DoesNotExist:
                    self.stats['errors'].append({
                        'ligne': row_idx,
                        'erreur': f'Producteur {code_prod} non trouvé'
                    })
                    continue
                
                # ========== PRE-CALCULATE PRODUCTIONS BY PARCEL CODE ==========
                # This must happen BEFORE iterating through P1, P2, P3... parcels
                # to ensure we can map Vokatra crops to the correct parcels
                
                import unicodedata
                productions_by_parcelle_code = {}
                
                # Map Vokatra columns to their corresponding Code Parcelle columns
                vokatra_to_code_mapping = [
                    ('Vokatra 1', 'Lanjam-bokatra (manta)1', 'Code Parcelle'),
                    ('Vokatra 2', 'Lanjam-bokatra (manta)', 'Code parcelle'),
                    ('Vokatra 3', 'Lanjam-bokatra (manta).1', None),
                    ('Vokatra 4', 'Lanjam-bokatra (manta).2', None),
                    ('Vokatra 5', 'Lanjam-bokatra (manta).3', None),
                    ('Vokatra 6', 'Lanjam-bokatra (manta).4', None),
                ]
                
                # Process each Vokatra
                for culture_col, prod_col, code_col in vokatra_to_code_mapping:
                    culture_name = row_data.get(culture_col)
                    production_value = row_data.get(prod_col)
                    
                    if not culture_name or not production_value:
                        continue
                    
                    # Normalize culture name
                    culture_normalized = str(culture_name).strip().lower()
                    culture_key_norm = ''.join(
                        c for c in unicodedata.normalize('NFD', culture_normalized) 
                        if unicodedata.category(c) != 'Mn'
                    )
                    
                    # Parse production value
                    try:
                        prod_num = float(production_value)
                        if prod_num <= 0:
                            continue
                    except (ValueError, TypeError):
                        continue
                    
                    # Determine target parcel code
                    if code_col:
                        # Try to get the specific parcel code
                        target_code_raw = row_data.get(code_col)
                        if target_code_raw and str(target_code_raw).strip():
                            # Use the specified code
                            target_code = str(target_code_raw).strip()
                        else:
                            # Empty -> assign to main parcel (P1)
                            target_code = f'{code_prod}-P1'
                    else:
                        # No code column -> default to P1
                        target_code = f'{code_prod}-P1'
                    
                    # Add to productions_by_parcelle_code
                    if target_code not in productions_by_parcelle_code:
                        productions_by_parcelle_code[target_code] = {}
                    
                    if culture_key_norm in productions_by_parcelle_code[target_code]:
                        productions_by_parcelle_code[target_code][culture_key_norm] += prod_num
                    else:
                        productions_by_parcelle_code[target_code][culture_key_norm] = prod_num
                
                # Add Vanille production (always goes to P1)
                vanille_taona2 = row_data.get('Vanille Totaly vinavinam-bokatra  (kg) taona 2')
                vanille_taona1 = row_data.get('Vanille Vokatra voangona (kg) taona 1 ')
                
                vanille_production = None
                if vanille_taona2 and vanille_taona2 not in ['', 0, '0']:
                    try:
                        vanille_production = float(vanille_taona2)
                    except:
                        pass
                
                if not vanille_production and vanille_taona1 and vanille_taona1 not in ['', 0, '0']:
                    try:
                        vanille_production = float(vanille_taona1)
                    except:
                        pass
                
                if vanille_production and vanille_production > 0:
                    main_parcel_code = f'{code_prod}-P1'
                    if main_parcel_code not in productions_by_parcelle_code:
                        productions_by_parcelle_code[main_parcel_code] = {}
                    
                    if 'vanille' in productions_by_parcelle_code[main_parcel_code]:
                        productions_by_parcelle_code[main_parcel_code]['vanille'] += vanille_production
                    else:
                        productions_by_parcelle_code[main_parcel_code]['vanille'] = vanille_production
                
                
                # Traiter chaque parcelle (P1, P2, P3...)
                for p_num in range(1, max_parcelles + 1):
                    try:
                        # Clés des colonnes pour cette parcelle
                        localisation_key = f'Toerana misy ny tanimboly P{p_num} (fokontany/faritra)'
                        lat_key = f'GPS Latitude P{p_num}'
                        lng_key = f'GPS Longitude P{p_num}'
                        polygon_key = f'Polygone P{p_num}'
                        surface_key = f'Velarany P{p_num} (Ha)'
                        pieds_key = f"Isan'ny fototra P{p_num}"
                        annee_key = f'Taona nambolena voalohany P{p_num}'
                        type_key = f'Karazana lavanio nambolena P{p_num}'
                        production_key = f'Vinavinam-bokatra P{p_num} (kg)'
                        
                        # Vérifier si la parcelle existe
                        localisation = row_data.get(localisation_key)
                        superficie = row_data.get(surface_key)
                        nb_pieds = row_data.get(pieds_key)
                        
                        # Critères minimaux pour créer une parcelle
                        parcelle_existe = (
                            (localisation and str(localisation).strip() != '') or
                            (superficie and superficie not in ['', 0, '0']) or
                            (nb_pieds and nb_pieds not in ['', 0, '0'])
                        )
                        
                        if not parcelle_existe:
                            continue  # Pas de parcelle à ce numéro
                        
                        # ========== MAPPER LES DONNÉES ==========
                        parcelle_data = {
                            'producteur': producteur,
                            'numero_parcelle': p_num,
                            'code_parcelle': f'{code_prod}-P{p_num}',
                            'active': True
                        }
                        
                        # ========== LOCALISATION ==========
                        if localisation and str(localisation).strip() != '':
                            parcelle_data['localisation'] = str(localisation).strip()
                        else:
                            parcelle_data['localisation'] = 'Non renseigné'
                        
                        # ========== DIMENSION ==========
                        if superficie:
                            try:
                                parcelle_data['dimension_ha'] = Decimal(str(superficie))
                            except:
                                parcelle_data['dimension_ha'] = Decimal('0')
                        else:
                            parcelle_data['dimension_ha'] = Decimal('0')
                        
                        # ========== NOMBRE DE PIEDS ==========
                        if nb_pieds:
                            try:
                                parcelle_data['nombre_pieds'] = int(float(str(nb_pieds)))
                            except:
                                parcelle_data['nombre_pieds'] = 0
                        else:
                            parcelle_data['nombre_pieds'] = 0
                        
                        # ========== TYPE DE VANILLE ==========
                        type_vanille_val = row_data.get(type_key)
                        type_vanille = str(type_vanille_val).lower() if type_vanille_val else ''
                        if 'planifolia' in type_vanille:
                            parcelle_data['type_vanille'] = 'planifolia'
                        elif 'tahitensis' in type_vanille or 'tahiti' in type_vanille:
                            parcelle_data['type_vanille'] = 'tahitensis'
                        elif 'pompona' in type_vanille:
                            parcelle_data['type_vanille'] = 'pompona'
                        else:
                            parcelle_data['type_vanille'] = 'planifolia'
                        
                        # ========== ANNÉE DE PLANTATION ==========
                        annee = row_data.get(annee_key)
                        if annee:
                            try:
                                annee_str = str(annee).strip()
                                if '.' in annee_str:
                                    annee_str = annee_str.split('.')[0]
                                annee_int = int(annee_str)
                                if 1900 <= annee_int <= 2100:
                                    parcelle_data['annee_plantation'] = annee_int
                            except:
                                pass
                        
                        # ========== ESTIMATION PRODUCTION ==========
                        production = row_data.get(production_key)
                        if production:
                            try:
                                parcelle_data['estimation_production_kg'] = Decimal(str(production))
                            except:
                                parcelle_data['estimation_production_kg'] = Decimal('0')
                        else:
                            parcelle_data['estimation_production_kg'] = Decimal('0')
                        
                        # ========== GPS ==========
                        lat = row_data.get(lat_key)
                        lng = row_data.get(lng_key)
                        if lat and lng and str(lat).strip() != '' and str(lng).strip() != '':
                            try:
                                parcelle_data['gps_latitude'] = Decimal(str(lat))
                                parcelle_data['gps_longitude'] = Decimal(str(lng))
                                parcelle_data['point'] = Point(float(lng), float(lat), srid=4326)
                            except:
                                parcelle_data['gps_latitude'] = None
                                parcelle_data['gps_longitude'] = None
                                parcelle_data['point'] = None
                        else:
                            parcelle_data['gps_latitude'] = None
                            parcelle_data['gps_longitude'] = None
                            parcelle_data['point'] = None
                        
                        # ========== POLYGON DATA ==========
                        polygon_str = row_data.get(polygon_key)
                        if polygon_str and str(polygon_str).strip() != '':
                            try:
                                polygon_str = str(polygon_str).strip()
                                
                                # Format GeoJSON
                                if polygon_str.startswith('{') and 'coordinates' in polygon_str:
                                    import json
                                    geojson_data = json.loads(polygon_str)
                                    if geojson_data.get('type') == 'Polygon' and 'coordinates' in geojson_data:
                                        coords = geojson_data['coordinates'][0]
                                        parcelle_data['polygon'] = Polygon(coords, srid=4326)
                                
                                # Format WKT
                                elif polygon_str.startswith('POLYGON'):
                                    parcelle_data['polygon'] = Polygon.from_ewkt(polygon_str)
                                
                                # Format CSV: lat1,lng1,lat2,lng2,...
                                elif ',' in polygon_str:
                                    coords_list = polygon_str.split(',')
                                    coords = []
                                    for i in range(0, len(coords_list), 2):
                                        if i + 1 < len(coords_list):
                                            try:
                                                lat_val = float(coords_list[i].strip())
                                                lng_val = float(coords_list[i + 1].strip())
                                                coords.append((lng_val, lat_val))  # [lng, lat]
                                            except ValueError:
                                                continue
                                    if len(coords) >= 3:
                                        if coords[0] != coords[-1]:
                                            coords.append(coords[0])
                                        parcelle_data['polygon'] = Polygon(coords, srid=4326)
                                
                                # Format space-separated: lon1 lat1,lon2 lat2,...
                                elif ' ' in polygon_str:
                                    coords_list = polygon_str.split(',')
                                    coords = []
                                    for coord_pair in coords_list:
                                        lon_lat = coord_pair.strip().split(' ')
                                        if len(lon_lat) == 2:
                                            coords.append((float(lon_lat[0]), float(lon_lat[1])))
                                    if len(coords) >= 3:
                                        if coords[0] != coords[-1]:
                                            coords.append(coords[0])
                                        parcelle_data['polygon'] = Polygon(coords, srid=4326)
                                
                                # Fallback to old parse_polygon method
                                else:
                                    polygon = self.parse_polygon(polygon_str)
                                    if polygon:
                                        parcelle_data['polygon'] = polygon
                                        
                            except Exception as e:
                                logger.warning(f"Erreur parsing polygone P{p_num}: {e}")
                                parcelle_data['polygon'] = None
                        else:
                            parcelle_data['polygon'] = None
                        
                        # ========== CULTURE PRINCIPALE ==========
                        culture_val = row_data.get(f"Iza amin'ireto safidy manaraka ireto no (ankoatrin'ny lavanio) :")
                        culture_txt = str(culture_val).lower() if culture_val else ''
                        if 'café' in culture_txt or 'cafe' in culture_txt:
                            parcelle_data['culture_principale'] = 'cafe'
                        elif 'girofle' in culture_txt:
                            parcelle_data['culture_principale'] = 'girofle'
                        elif 'vanille' in culture_txt or 'lavania' in culture_txt or 'lavaniro' in culture_txt:
                            parcelle_data['culture_principale'] = 'vanille'
                        else:
                            parcelle_data['culture_principale'] = 'vanille' if parcelle_data.get('type_vanille') else 'autre'
                        
                        
                        # ========== INJECT PRODUCTIONS FROM PRE-CALCULATION ==========
                        # Get productions for this specific parcel code
                        p_code = f'{code_prod}-P{p_num}'
                        productions = productions_by_parcelle_code.get(p_code, {})
                        
                        # Mark this code as processed (remove from dict)
                        if p_code in productions_by_parcelle_code:
                            del productions_by_parcelle_code[p_code]
                        
                        # Set production data for this parcel
                        parcelle_data['productions_par_culture'] = productions
                        
                        # Derive cultures_pratiquees and estimation_production_kg
                        if productions:
                            parcelle_data['cultures_pratiquees'] = list(productions.keys())
                            total_prod = sum(productions.values())
                            if total_prod > 0:
                                parcelle_data['estimation_production_kg'] = Decimal(str(total_prod))
                        else:
                            parcelle_data['cultures_pratiquees'] = []
                        
                        # ========== CULTURES AUTOUR ==========
                        cultures_autour = row_data.get(f'Karazana voly misy manodidina P{p_num}')
                        if cultures_autour and str(cultures_autour).lower() != 'nan':
                            parcelle_data['cultures_autour'] = str(cultures_autour).strip()
                        else:
                            parcelle_data['cultures_autour'] = ''
                        
                        # ========== PROFIL PARCELLE ==========
                        profil_val = row_data.get(f"Toetran'ny tanimboly {p_num}")
                        profil = str(profil_val).lower() if profil_val else ''
                        if 'pente' in profil:
                            parcelle_data['profil_parcelle'] = 'en_pente'
                        elif 'parc' in profil and 'naturel' in profil:
                            parcelle_data['profil_parcelle'] = 'parc_naturel'
                        elif 'reserve' in profil:
                            parcelle_data['profil_parcelle'] = 'reserve_naturelle'
                        elif 'zone tampon' in profil:
                            parcelle_data['profil_parcelle'] = 'zone_tampon'
                        elif 'source' in profil and 'eau' in profil:
                            parcelle_data['profil_parcelle'] = 'source_eau'
                        else:
                            parcelle_data['profil_parcelle'] = ''
                        
                        # ========== DISTANCE HABITATION ==========
                        distance_val = row_data.get(f"Halaviran'ny tanimboly P{p_num} miala ny trano fonenana ?")
                        distance = str(distance_val).lower() if distance_val else ''
                        if '1' in distance and '2' not in distance:
                            parcelle_data['distance_habitation'] = 'moins_1h'
                        elif '2' in distance:
                            parcelle_data['distance_habitation'] = '2h'
                        elif '3' in distance:
                            parcelle_data['distance_habitation'] = '3h'
                        elif '4' in distance:
                            parcelle_data['distance_habitation'] = '4h'
                        else:
                            parcelle_data['distance_habitation'] = ''
                        
                        # ========== TYPE PROPRIÉTÉ ==========
                        type_prop_val = row_data.get("Ny tantsaha dia : \n- tompon'ny tanimboliny? \n- sa mpanofa?")
                        type_prop = str(type_prop_val).lower() if type_prop_val else ''
                        if 'tompon' in type_prop and not ('mpanofa' in type_prop or 'deux' in type_prop or 'roa' in type_prop):
                            parcelle_data['type_propriete'] = 'terrain_propre'
                        elif 'mpanofa' in type_prop and 'tompon' not in type_prop:
                            parcelle_data['type_propriete'] = 'terrain_loue'
                        elif 'roa' in type_prop or 'deux' in type_prop:
                            parcelle_data['type_propriete'] = 'les_deux'
                        else:
                            parcelle_data['type_propriete'] = 'terrain_propre'
                        
                        # ========== CERTIFICATION ==========
                        cert_val = row_data.get('Certification')
                        certification = str(cert_val).lower() if cert_val else ''
                        parcelle_data['certifiee'] = False
                        parcelle_data['type_certification'] = ''
                        
                        if certification and certification != 'nan':
                            parcelle_data['certifiee'] = True
                            if 'g4g' in certification:
                                parcelle_data['type_certification'] = 'g4g'
                            elif 'bio' in certification:
                                parcelle_data['type_certification'] = 'bio'
                            elif 'ra' in certification or 'rainforest' in certification:
                                parcelle_data['type_certification'] = 'ra'
                            elif 'uebt' in certification:
                                parcelle_data['type_certification'] = 'uebt'
                            elif 'ffl' in certification:
                                parcelle_data['type_certification'] = 'ffl'
                            elif 'fair' in certification or 'ft' in certification:
                                parcelle_data['type_certification'] = 'ft'
                            elif 'pact' in certification:
                                parcelle_data['type_certification'] = 'pact'
                        
                        # Créer ou mettre à jour
                        parcelle, created = Parcelle.objects.update_or_create(
                            code_parcelle=parcelle_data['code_parcelle'],
                            defaults=parcelle_data
                        )
                        
                        if created:
                            self.stats['parcelles_created'] += 1
                        else:
                            self.stats['parcelles_updated'] += 1
                    
                    except Exception as e:
                        self.stats['errors'].append({
                            'ligne': row_idx,
                            'producteur': code_prod,
                            'parcelle': f'P{p_num}',
                            'erreur': str(e)
                        })
                        logger.error(f"Erreur parcelle P{p_num} ligne {row_idx}: {e}")
                
                # ========== CREATE DETACHED PARCELS ==========
                # Any remaining codes in productions_by_parcelle_code are detached parcels
                # that weren't covered by the P1, P2, P3... loop
                for detached_code, detached_productions in productions_by_parcelle_code.items():
                    try:
                        # Derive culture principale from the crops
                        culture_principale = 'autre'
                        if detached_productions:
                            # Use the first crop as the main culture
                            first_culture = list(detached_productions.keys())[0]
                            culture_principale = first_culture
                        
                        # Create minimal parcel data
                        detached_parcelle_data = {
                            'producteur': producteur,
                            'numero_parcelle': 0,  # Detached parcels don't have a number
                            'code_parcelle': detached_code,
                            'active': True,
                            'localisation': 'Non renseigné',
                            'culture_principale': culture_principale,
                            'productions_par_culture': detached_productions,
                            'cultures_pratiquees': list(detached_productions.keys()),
                            'dimension_ha': Decimal('0'),  # Required field
                            'nombre_pieds': 0,  # Required field
                            'type_vanille': 'planifolia',  # Default type
                        }
                        
                        # Calculate total production
                        total_prod = sum(detached_productions.values())
                        if total_prod > 0:
                            detached_parcelle_data['estimation_production_kg'] = Decimal(str(total_prod))
                        
                        # Create or update the detached parcel
                        parcelle, created = Parcelle.objects.update_or_create(
                            code_parcelle=detached_code,
                            defaults=detached_parcelle_data
                        )
                        
                        if created:
                            self.stats['parcelles_created'] += 1
                            logger.info(f"Parcelle détachée créée: {detached_code}")
                        else:
                            self.stats['parcelles_updated'] += 1
                            logger.info(f"Parcelle détachée mise à jour: {detached_code}")
                    
                    except Exception as e:
                        self.stats['errors'].append({
                            'ligne': row_idx,
                            'producteur': code_prod,
                            'parcelle': detached_code,
                            'erreur': str(e)
                        })
                        logger.error(f"Erreur parcelle détachée {detached_code} ligne {row_idx}: {e}")
            
            except Exception as e:
                self.stats['errors'].append({
                    'ligne': row_idx,
                    'erreur': f'Parcelles: {str(e)}'
                })
                logger.error(f"Erreur ligne {row_idx}: {e}")
    
    def import_formations(self):
        """Importer les formations depuis l'onglet Formation"""
        if 'Formation' not in self.wb.sheetnames:
            logger.warning("Onglet 'Formation' non trouvé")
            return
        
        ws = self.wb['Formation']
        
        for row_idx in range(2, ws.max_row + 1):
            try:
                # Lire toutes les colonnes de l'onglet Formation
                code_prod = self.clean_value(ws.cell(row_idx, 1).value)  # Colonne 1: Code producteur
                formation_text = self.clean_value(ws.cell(row_idx, 2).value)  # Colonne 2: Formations
                date_formation_raw = ws.cell(row_idx, 3).value  # Colonne 3: Date de formation
                lieu = self.clean_value(ws.cell(row_idx, 4).value)  # Colonne 4: Lieu
                formateur = self.clean_value(ws.cell(row_idx, 6).value)  # Colonne 6: Formateur
                cert_text = self.clean_value(ws.cell(row_idx, 7).value)  # Colonne 7: Certifications
                
                if not code_prod:
                    continue
                
                # Récupérer le producteur
                try:
                    producteur = Producteur.objects.get(code=code_prod)
                except Producteur.DoesNotExist:
                    continue
                
                # Traiter la date de formation
                date_formation = None
                if date_formation_raw:
                    if isinstance(date_formation_raw, datetime):
                        date_formation = date_formation_raw.date()
                    elif isinstance(date_formation_raw, str):
                        try:
                            date_formation = datetime.strptime(date_formation_raw, '%Y-%m-%d').date()
                        except ValueError:
                            try:
                                date_formation = datetime.strptime(date_formation_raw, '%d/%m/%Y').date()
                            except ValueError:
                                logger.warning(f"Format de date invalide ligne {row_idx}: {date_formation_raw}")
                                date_formation = datetime.now().date()
                
                # Si pas de date, utiliser la date actuelle
                if not date_formation:
                    date_formation = datetime.now().date()
                
                # Traiter les formations
                if formation_text:
                    formations = [f.strip() for f in re.split(r'[\n,;]', formation_text) if f.strip()]
                    for form_name in formations:
                        try:
                            # Créer ou récupérer le type de formation
                            type_form, _ = TypeFormation.objects.get_or_create(
                                nom=form_name,
                                defaults={
                                    'description': '',
                                    'duree_jours': 1,
                                    'actif': True
                                }
                            )
                            
                            # Créer la formation
                            Formation.objects.get_or_create(
                                producteur=producteur,
                                type_formation=type_form,
                                date_formation=date_formation,
                                defaults={
                                    'lieu': lieu or '',
                                    'organisme': formateur or '',
                                    'certificat_obtenu': False,
                                    'enregistre_par': self.user
                                }
                            )
                            self.stats['formations_created'] += 1
                        except Exception as e:
                            logger.error(f"Erreur formation {form_name}: {e}")
                    
                    # Mettre à jour le champ texte formations_suivies
                    if formations:
                        producteur.formations_suivies = ', '.join(formations)
                        producteur.save(update_fields=['formations_suivies'])
                
                # Traiter les certifications
                if cert_text:
                    certifications = [c.strip().lower() for c in re.split(r'[\n,;]', cert_text) if c.strip()]
                    for cert_name in certifications:
                        try:
                            # Mapper le nom vers le niveau
                            niveau = None
                            if 'bio' in cert_name:
                                niveau = 'bio'
                            elif 'g4g' in cert_name or 'good4good' in cert_name:
                                niveau = 'g4g'
                            elif 'fair' in cert_name or cert_name == 'ft':
                                niveau = 'fair_trade'
                            elif 'rainforest' in cert_name or cert_name == 'ra':
                                niveau = 'rainforest'
                            elif 'uebt' in cert_name:
                                niveau = 'uebt'
                            elif 'ffl' in cert_name:
                                niveau = 'ffl'
                            elif 'pact' in cert_name:
                                niveau = 'pact'
                            
                            if niveau:
                                # Créer ou récupérer le type de certification
                                type_cert, _ = TypeCertification.objects.get_or_create(
                                    niveau=niveau,
                                    defaults={
                                        'nom': niveau.upper(),
                                        'code': niveau.upper(),
                                        'description': '',
                                        'organisme_certificateur': '',
                                        'duree_validite_ans': 1,
                                        'actif': True
                                    }
                                )
                                
                                # Créer la certification
                                today = datetime.now().date()
                                from datetime import timedelta
                                Certification.objects.get_or_create(
                                    producteur=producteur,
                                    type_certification=type_cert,
                                    defaults={
                                        'numero_certificat': '',
                                        'date_obtention': today,
                                        'date_expiration': today + timedelta(days=365),
                                        'statut': 'valide',
                                        'enregistre_par': self.user
                                    }
                                )
                                self.stats['certifications_created'] += 1
                        except Exception as e:
                            logger.error(f"Erreur certification {cert_name}: {e}")
            
            except Exception as e:
                self.stats['errors'].append({
                    'ligne': row_idx,
                    'erreur': f'Formations/Certifications: {str(e)}'
                })
                logger.error(f"Erreur ligne {row_idx}: {e}")
    
    def import_agr(self):
        """Importer les AGR depuis l'onglet AGR avec tous les détails d'impact
        
        Supporte un nombre illimité d'AGRs par producteur.
        Détecte automatiquement les colonnes AGR dans le fichier Excel.
        """
        
        if 'AGR' not in self.wb.sheetnames:
            logger.warning("Onglet 'AGR' non trouvé")
            return
        
        ws = self.wb['AGR']
        
        # Initialiser les compteurs
        if 'agr_created' not in self.stats:
            self.stats['agr_created'] = 0
        if 'agr_updated' not in self.stats:
            self.stats['agr_updated'] = 0
        if 'agr_errors' not in self.stats:
            self.stats['agr_errors'] = []
        
        # Import AGR model
        from producteurs.models import AGR
        
        # Détecter automatiquement les colonnes AGR
        agr_column_sets = self._detect_agr_columns(ws)
        
        if not agr_column_sets:
            logger.warning("Aucune colonne AGR détectée dans le fichier")
            return
        
        # Traiter chaque ligne (à partir de la ligne 2)
        for row_idx in range(2, ws.max_row + 1):
            try:
                # Récupérer le code producteur (colonne 1)
                code_prod = self.clean_value(ws.cell(row_idx, 1).value)
                
                if not code_prod:
                    continue
                
                # Récupérer le producteur
                try:
                    producteur = Producteur.objects.get(code=code_prod)
                except Producteur.DoesNotExist:
                    self.stats['agr_errors'].append({
                        'ligne': row_idx,
                        'code_producteur': code_prod,
                        'erreur': 'Producteur non trouvé'
                    })
                    logger.warning(f"Ligne {row_idx}: Producteur {code_prod} non trouvé")
                    continue
                
                # Extraire toutes les AGRs détectées
                legacy_agr_values = []
                
                for ordre, column_map in enumerate(agr_column_sets, start=1):
                    agr_data = self._extract_agr_data(ws, row_idx, column_map, ordre)
                    
                    if agr_data and agr_data.get('type_agr'):
                        # Toujours recalculer le revenu pour écraser les anciennes valeurs à l'import.
                        qte_vendue = agr_data.get('quantite_vendue_annuelle')
                        prix_unitaire = agr_data.get('prix_vente_unitaire')
                        agr_data['revenu_annuel_estime'] = (
                            qte_vendue * prix_unitaire
                            if qte_vendue is not None and prix_unitaire is not None
                            else None
                        )

                        _, created = AGR.objects.update_or_create(
                            producteur=producteur,
                            ordre=ordre,
                            defaults={
                                **agr_data,
                                'enregistre_par': self.user,
                            }
                        )
                        if created:
                            self.stats['agr_created'] += 1
                        else:
                            self.stats['agr_updated'] += 1
                        
                        # Collecter pour les champs legacy
                        legacy_agr_values.append(agr_data['type_agr'])
                
                # Update legacy fields (agr1 et agr2 seulement pour compatibilité)
                if legacy_agr_values:
                    update_fields = []
                    
                    if len(legacy_agr_values) >= 1:
                        producteur.agr1 = legacy_agr_values[0]
                        update_fields.append('agr1')
                    
                    if len(legacy_agr_values) >= 2:
                        producteur.agr2 = legacy_agr_values[1]
                        update_fields.append('agr2')
                    
                    if update_fields:
                        producteur.save(update_fields=update_fields)
                
            except Exception as e:
                self.stats['agr_errors'].append({
                    'ligne': row_idx,
                    'code_producteur': code_prod if 'code_prod' in locals() else 'N/A',
                    'erreur': str(e)
                })
                logger.error(f"Erreur ligne {row_idx} (AGR): {e}")
    
    def _detect_agr_columns(self, ws):
        """
        Détecte automatiquement les colonnes AGR dans le fichier Excel.
        
        Cherche des patterns de colonnes qui se répètent avec un espacement régulier.
        Format attendu: chaque AGR occupe 8 colonnes + 1 colonne spacer optionnelle.
        
        Returns:
            Liste de dictionnaires de mapping de colonnes pour chaque AGR
        """
        # Lire les en-têtes (ligne 1)
        headers = []
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(1, col_idx)
            header = str(cell.value).strip().lower() if cell.value else ''
            headers.append((col_idx, header))
        
        # Détecter les colonnes AGR par pattern
        agr_column_sets = []
        
        # Méthode 1: Colonnes fixes (AGR1: 2-9, AGR2: 11-18, AGR3: 20-27, etc.)
        # Pattern: 8 colonnes de données + 1 colonne spacer
        col_offset = 2  # Commence à la colonne 2 (après code producteur)
        agr_num = 1
        
        while col_offset + 7 <= ws.max_column:  # Besoin de 8 colonnes minimum
            # Vérifier si cette position contient des données AGR
            type_col = col_offset
            
            # Vérifier si la colonne type contient des données dans les premières lignes
            has_data = False
            for row_idx in range(2, min(10, ws.max_row + 1)):  # Vérifier les 8 premières lignes
                cell_value = self.clean_value(ws.cell(row_idx, type_col).value)
                if cell_value:
                    has_data = True
                    break
            
            if has_data:
                # Déterminer le champ spécifique (bassins ou volailles)
                specific_field_col = col_offset + 7  # 8ème colonne
                specific_field_key = 'nb_bassins' if agr_num == 1 else 'nb_volailles'
                
                column_map = {
                    'type': col_offset,
                    'intrants_recus': col_offset + 1,
                    'quantite_intrants': col_offset + 2,
                    'utilisation': col_offset + 3,
                    'qte_consommee': col_offset + 4,
                    'qte_vendue': col_offset + 5,
                    'prix': col_offset + 6,
                    specific_field_key: specific_field_col,
                }
                
                agr_column_sets.append(column_map)
                
                # Passer au prochain ensemble (8 colonnes + 1 spacer)
                col_offset += 9
                agr_num += 1
            else:
                # Pas de données, essayer la prochaine position
                col_offset += 1
        
        # Si aucune AGR détectée avec la méthode automatique, utiliser les colonnes fixes
        if not agr_column_sets:
            agr_column_sets = [
                {
                    'type': 2,
                    'intrants_recus': 3,
                    'quantite_intrants': 4,
                    'utilisation': 5,
                    'qte_consommee': 6,
                    'qte_vendue': 7,
                    'prix': 8,
                    'nb_bassins': 9,
                },
                {
                    'type': 11,
                    'intrants_recus': 12,
                    'quantite_intrants': 13,
                    'utilisation': 14,
                    'qte_consommee': 15,
                    'qte_vendue': 16,
                    'prix': 17,
                    'nb_volailles': 18,
                }
            ]
        
        return agr_column_sets
    
    def _extract_agr_data(self, ws, row_idx, column_map, ordre):
        """
        Extract AGR data from a row based on column mapping
        
        Args:
            ws: Worksheet
            row_idx: Row index
            column_map: Dictionary mapping field names to column indices
            ordre: AGR order (1 or 2)
        
        Returns:
            Dictionary with AGR data or None if no type_agr
        """
        # Read type_agr
        type_agr_raw = self.clean_value(ws.cell(row_idx, column_map['type']).value)
        if not type_agr_raw:
            return None
        
        # Normalize type_agr
        type_agr_lower = str(type_agr_raw).lower().strip()
        if 'pisciculture' in type_agr_lower or 'poisson' in type_agr_lower:
            type_agr = 'pisciculture'
        elif 'aviculture' in type_agr_lower or 'volaille' in type_agr_lower or 'poulet' in type_agr_lower:
            type_agr = 'aviculture'
        else:
            type_agr = 'autre'
        
        # Read intrants_recus (Oui/Non)
        intrants_raw = self.clean_value(ws.cell(row_idx, column_map['intrants_recus']).value)
        intrants_recus = self._parse_boolean(intrants_raw)
        
        # Read quantite_intrants
        quantite_intrants_raw = self.clean_value(ws.cell(row_idx, column_map['quantite_intrants']).value)
        quantite_intrants = self._parse_int(quantite_intrants_raw, None)
        
        # Read utilisation and map to choices
        utilisation_raw = self.clean_value(ws.cell(row_idx, column_map['utilisation']).value)
        utilisation = self._map_utilisation(utilisation_raw)
        
        # Read quantite_consommee
        qte_consommee_raw = self.clean_value(ws.cell(row_idx, column_map['qte_consommee']).value)
        quantite_consommee = self._parse_decimal(qte_consommee_raw)
        
        # Read quantite_vendue
        qte_vendue_raw = self.clean_value(ws.cell(row_idx, column_map['qte_vendue']).value)
        quantite_vendue = self._parse_decimal(qte_vendue_raw)
        
        # Read prix_vente
        prix_raw = self.clean_value(ws.cell(row_idx, column_map['prix']).value)
        prix_vente = self._parse_decimal(prix_raw)
        
        # Read type-specific fields
        nombre_bassins = None
        nombre_volailles = None
        
        if ordre == 1 and 'nb_bassins' in column_map:
            nb_bassins_raw = self.clean_value(ws.cell(row_idx, column_map['nb_bassins']).value)
            nombre_bassins = self._parse_int(nb_bassins_raw, None)
        
        if ordre == 2 and 'nb_volailles' in column_map:
            nb_volailles_raw = self.clean_value(ws.cell(row_idx, column_map['nb_volailles']).value)
            nombre_volailles = self._parse_int(nb_volailles_raw, None)
        
        # Build AGR data dictionary
        agr_data = {
            'type_agr': type_agr,
            'intrants_recus': intrants_recus,
            'quantite_intrants': quantite_intrants,
            'utilisation': utilisation,
            'quantite_consommee_annuelle': quantite_consommee,
            'quantite_vendue_annuelle': quantite_vendue,
            'prix_vente_unitaire': prix_vente,
            'nombre_bassins': nombre_bassins,
            'nombre_volailles': nombre_volailles,
            'active': True,
        }
        
        return agr_data
    
    def _map_utilisation(self, value):
        """Map Excel utilisation value to model choices"""
        if not value:
            return ''
        
        value_lower = str(value).lower().strip()
        
        if 'consommer' in value_lower or 'consommation' in value_lower:
            if 'vendre' in value_lower or 'vente' in value_lower or 'deux' in value_lower or 'roa' in value_lower:
                return 'les_deux'
            return 'consommation'
        elif 'vendre' in value_lower or 'vente' in value_lower:
            return 'vente'
        elif 'deux' in value_lower or 'roa' in value_lower:
            return 'les_deux'
        
        return ''
    
    def _parse_decimal(self, value):
        """Parse a decimal value from Excel"""
        if value is None or value == '':
            return None
        
        try:
            return Decimal(str(value).replace(',', '.'))
        except (ValueError, TypeError, Exception):
            return None
    
    def import_dotations(self):
        """
        Importer les dotations depuis l'onglet Dotation
        
        Structure attendue de l'onglet:
        - Colonne 1: Code producteur (obligatoire)
        - Colonne 2: Libellé1 (Kits Scolaire)
        - Colonne 3: Nombre (quantité)
        - Colonne 4: Libellé2 (Mutuelle de santé, etc.)
        
        Returns:
            None (met à jour self.stats)
        """
        # Subtask 3.1: Vérifier l'existence de l'onglet
        if 'Dotation' not in self.wb.sheetnames:
            logger.warning("Onglet 'Dotation' non trouvé")
            return
        
        ws = self.wb['Dotation']
        
        # Extraire l'année du nom du fichier
        import os
        filename = os.path.basename(self.file_path)
        match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', filename)
        if match:
            annee_dotation = int(match.group(3))
        else:
            annee_dotation = datetime.now().year
        
        # Import Dotation model
        from producteurs.models import Dotation
        
        # Subtask 3.2: Lire les en-têtes de colonnes
        headers = {}
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(1, col_idx)
            if cell.value:
                headers[col_idx] = str(cell.value).strip()
        
        # Subtask 3.3: Implémenter la boucle de traitement des lignes
        for row_idx in range(2, ws.max_row + 1):
            # Subtask 3.10: Wrapper le traitement dans try/except
            try:
                # Extraire les données de chaque ligne dans un dictionnaire
                row_data = {}
                for col_idx, header in headers.items():
                    cell = ws.cell(row_idx, col_idx)
                    row_data[header] = self.clean_value(cell.value)
                
                # Subtask 3.4: Extraire et valider le code producteur
                code_prod = row_data.get("Laharan'ny mpamboly (Code prod)")
                
                # Ignorer la ligne si le code est vide
                if not code_prod:
                    continue
                
                # Récupérer le producteur depuis la base de données
                try:
                    producteur = Producteur.objects.get(code=code_prod)
                except Producteur.DoesNotExist:
                    # Enregistrer une erreur si le producteur n'existe pas
                    self.stats['errors'].append({
                        'ligne': row_idx,
                        'code_producteur': code_prod,
                        'erreur': 'Producteur non trouvé'
                    })
                    logger.warning(f"Ligne {row_idx}: Producteur {code_prod} non trouvé")
                    continue
                
                # Déterminer le type de dotation et les détails
                libelle1 = row_data.get("Libellé1")
                libelle2 = row_data.get("Libellé2")
                nombre = row_data.get("Nombre")
                
                # Subtask 3.5: Extraire et valider le type de dotation
                if libelle1:
                    # Cas 1: Kits Scolaire (ou autre type dans Libellé1)
                    type_dotation = self._parse_type_dotation(libelle1)
                    # Subtask 3.7: Extraire la quantité
                    quantite = self._parse_int(nombre, default=1)
                    # Subtask 3.8: Extraire les détails
                    details = ''
                elif libelle2:
                    # Cas 2: Mutuelle de santé ou autre (dans Libellé2)
                    type_dotation = self._parse_type_dotation(libelle2)
                    quantite = 1  # Pas de nombre pour Libellé2
                    details = self.clean_value(libelle2) or ''
                    # Tronquer à 255 caractères si nécessaire
                    if len(details) > 255:
                        details = details[:255]
                else:
                    # Ligne vide (pas de dotation)
                    continue
                
                # Subtask 3.6: Extraire et valider l'année
                annee = annee_dotation
                # Valider que l'année est entre 1900 et 2100
                if not (1900 <= annee <= 2100):
                    self.stats['errors'].append({
                        'ligne': row_idx,
                        'code_producteur': code_prod,
                        'erreur': f'Année invalide: {annee}'
                    })
                    logger.error(f"Ligne {row_idx}: Année invalide {annee}")
                    continue
                
                # Subtask 3.9: Créer ou mettre à jour l'enregistrement Dotation
                dotation, created = Dotation.objects.update_or_create(
                    producteur=producteur,
                    type_dotation=type_dotation,
                    annee=annee,
                    details=details,
                    defaults={
                        'quantite': quantite,
                        'cree_par': self.user
                    }
                )
                
                # Si c'est une mutuelle de santé, mettre à jour le champ mahavelona du producteur
                if libelle2 and 'mutuelle' in libelle2.lower():
                    if not producteur.mahavelona:
                        producteur.mahavelona = True
                        producteur.save(update_fields=['mahavelona'])
                
                # Incrémenter les statistiques
                if created:
                    self.stats['dotations_created'] += 1
                else:
                    self.stats['dotations_updated'] += 1
            
            except Exception as e:
                # Subtask 3.10: Enregistrer les erreurs et continuer
                self.stats['errors'].append({
                    'ligne': row_idx,
                    'erreur': f'Dotations: {str(e)}'
                })
                logger.error(f"Erreur ligne {row_idx}: {e}")
    
    def archive_to_history(self):
        """
        Archiver automatiquement les données importées dans les tables historiques
        
        Crée des enregistrements dans:
        - ProductionHistory (depuis les parcelles)
        - AGRHistory (depuis les AGR des producteurs)
        - SocialIndicatorHistory (depuis les indicateurs sociaux des producteurs)
        
        Utilise l'année courante comme année d'archivage
        """
        from history.models import ProductionHistory, AGRHistory, SocialIndicatorHistory
        
        # Déterminer l'année d'archivage (année courante)
        annee_archivage = datetime.now().year
        
        logger.info(f"Début de l'archivage automatique pour l'année {annee_archivage}")
        
        # Initialiser les compteurs
        self.stats['history_production_created'] = 0
        self.stats['history_agr_created'] = 0
        self.stats['history_social_created'] = 0
        self.stats['history_errors'] = []
        
        try:
            # ========== ARCHIVER LES PRODUCTIONS (depuis les parcelles) ==========
            parcelles = Parcelle.objects.filter(active=True).select_related('producteur')
            
            for parcelle in parcelles:
                try:
                    # Archiver chaque culture de la parcelle
                    if parcelle.productions_par_culture:
                        for culture, quantite in parcelle.productions_par_culture.items():
                            if quantite and float(quantite) > 0:
                                ProductionHistory.objects.update_or_create(
                                    parcelle=parcelle,
                                    annee=annee_archivage,
                                    culture=culture,
                                    defaults={
                                        'quantite_kg': Decimal(str(quantite)),
                                        'prix_vente_kg': None,
                                        'revenu_total': None,
                                        'enregistre_par': self.user,
                                        'notes': f'Importé automatiquement le {datetime.now().date()}'
                                    }
                                )
                                self.stats['history_production_created'] += 1
                    
                    # Si pas de productions_par_culture, utiliser estimation_production_kg
                    elif parcelle.estimation_production_kg and parcelle.estimation_production_kg > 0:
                        culture = parcelle.culture_principale or 'vanille'
                        ProductionHistory.objects.update_or_create(
                            parcelle=parcelle,
                            annee=annee_archivage,
                            culture=culture,
                            defaults={
                                'quantite_kg': parcelle.estimation_production_kg,
                                'prix_vente_kg': None,
                                'revenu_total': None,
                                'enregistre_par': self.user,
                                'notes': f'Importé automatiquement le {datetime.now().date()}'
                            }
                        )
                        self.stats['history_production_created'] += 1
                
                except Exception as e:
                    self.stats['history_errors'].append({
                        'type': 'production',
                        'parcelle': parcelle.code_parcelle,
                        'erreur': str(e)
                    })
                    logger.error(f"Erreur archivage production {parcelle.code_parcelle}: {e}")
            
            # ========== ARCHIVER LES AGR ==========
            from producteurs.models import AGR
            agrs = AGR.objects.filter(active=True).select_related('producteur')
            
            for agr in agrs:
                try:
                    AGRHistory.objects.update_or_create(
                        producteur=agr.producteur,
                        annee=annee_archivage,
                        type_agr=agr.type_agr,
                        ordre=agr.ordre,
                        defaults={
                            'quantite_produite': None,
                            'quantite_vendue': agr.quantite_vendue_annuelle,
                            'quantite_consommee': agr.quantite_consommee_annuelle,
                            'prix_vente_unitaire': agr.prix_vente_unitaire,
                            'revenu_annuel': agr.revenu_annuel_estime or Decimal('0'),
                            'enregistre_par': self.user,
                            'notes': f'Importé automatiquement le {datetime.now().date()}'
                        }
                    )
                    self.stats['history_agr_created'] += 1
                
                except Exception as e:
                    self.stats['history_errors'].append({
                        'type': 'agr',
                        'producteur': agr.producteur.code,
                        'erreur': str(e)
                    })
                    logger.error(f"Erreur archivage AGR {agr.producteur.code}: {e}")
            
            # ========== ARCHIVER LES INDICATEURS SOCIAUX ==========
            producteurs = Producteur.objects.filter(actif=True)
            
            for producteur in producteurs:
                try:
                    # Indicateur: Scolarisation
                    if producteur.nb_enfants_scolarises is not None:
                        total_enfants = (producteur.nb_enfants_scolarises or 0) + (producteur.nb_enfants_non_scolarises or 0)
                        if total_enfants > 0:
                            taux_scolarisation = (producteur.nb_enfants_scolarises / total_enfants) * 100
                            SocialIndicatorHistory.objects.update_or_create(
                                producteur=producteur,
                                annee=annee_archivage,
                                type_indicateur='scolarisation',
                                defaults={
                                    'valeur_numerique': Decimal(str(round(taux_scolarisation, 2))),
                                    'valeur_texte': f'{producteur.nb_enfants_scolarises}/{total_enfants} enfants scolarisés',
                                    'valeur_booleen': None,
                                    'enregistre_par': self.user,
                                    'notes': f'Importé automatiquement le {datetime.now().date()}'
                                }
                            )
                            self.stats['history_social_created'] += 1
                    
                    # Indicateur: Accès eau potable
                    if producteur.source_eau:
                        acces_eau_potable = producteur.source_eau in ['robinet', 'ranovovo']
                        SocialIndicatorHistory.objects.update_or_create(
                            producteur=producteur,
                            annee=annee_archivage,
                            type_indicateur='eau_potable',
                            defaults={
                                'valeur_numerique': None,
                                'valeur_texte': producteur.source_eau,
                                'valeur_booleen': acces_eau_potable,
                                'enregistre_par': self.user,
                                'notes': f'Importé automatiquement le {datetime.now().date()}'
                            }
                        )
                        self.stats['history_social_created'] += 1
                    
                    # Indicateur: Accès aux soins
                    if producteur.type_centre_sante:
                        SocialIndicatorHistory.objects.update_or_create(
                            producteur=producteur,
                            annee=annee_archivage,
                            type_indicateur='sante',
                            defaults={
                                'valeur_numerique': None,
                                'valeur_texte': producteur.type_centre_sante,
                                'valeur_booleen': producteur.a_assurance_sante,
                                'enregistre_par': self.user,
                                'notes': f'Importé automatiquement le {datetime.now().date()}'
                            }
                        )
                        self.stats['history_social_created'] += 1
                
                except Exception as e:
                    self.stats['history_errors'].append({
                        'type': 'social',
                        'producteur': producteur.code,
                        'erreur': str(e)
                    })
                    logger.error(f"Erreur archivage indicateurs sociaux {producteur.code}: {e}")
            
            logger.info(f"Archivage terminé: {self.stats['history_production_created']} productions, "
                       f"{self.stats['history_agr_created']} AGR, {self.stats['history_social_created']} indicateurs sociaux")
        
        except Exception as e:
            logger.error(f"Erreur générale lors de l'archivage: {e}")
            self.stats['history_errors'].append({
                'type': 'general',
                'erreur': str(e)
            })
    
    def archive_producteurs_to_history(self):
        """
        Archiver automatiquement les producteurs dans ProducteurSnapshot
        
        Crée un snapshot pour chaque producteur actif avec l'année courante.
        Utilise update_or_create pour éviter les doublons.
        """
        from history.models import ProducteurSnapshot
        
        # Année d'archivage (année courante)
        annee_archivage = datetime.now().year
        
        logger.info(f"Début archivage producteurs pour l'année {annee_archivage}")
        
        # Initialiser les compteurs
        self.stats['history_producteur_created'] = 0
        self.stats['history_producteur_updated'] = 0
        self.stats['history_producteur_errors'] = []
        
        try:
            # Récupérer tous les producteurs actifs avec select_related('cooperative')
            producteurs = Producteur.objects.filter(actif=True).select_related('cooperative')
            
            for producteur in producteurs:
                try:
                    # Créer ou mettre à jour le snapshot
                    snapshot, created = ProducteurSnapshot.objects.update_or_create(
                        producteur=producteur,
                        annee=annee_archivage,
                        defaults={
                            # Identification
                            'code': producteur.code,
                            'nom': producteur.nom,
                            'prenom': producteur.prenom or '',
                            'cin': producteur.cin or '',
                            
                            # Localisation
                            'commune': producteur.commune,
                            'fokontany': producteur.fokontany or '',
                            'village': producteur.village or '',
                            
                            # Contact
                            'telephone': producteur.telephone or '',
                            'email': producteur.email or '',
                            
                            # Informations personnelles
                            'sexe': producteur.sexe,
                            'date_naissance': producteur.date_naissance,
                            'statut_matrimonial': producteur.statut_matrimonial or '',
                            'niveau_education': producteur.niveau_education or '',
                            'femme_leader': producteur.femme_leader,
                            
                            # Coopérative
                            'cooperative_nom': producteur.cooperative.nom if producteur.cooperative else '',
                            'responsabilite_cooperative': producteur.responsabilite_cooperative or '',
                            'date_adhesion_cooperative': producteur.date_adhesion_cooperative,
                            'date_adhesion_groupement': producteur.date_adhesion_groupement,
                            'membre_groupement_epargne': producteur.membre_groupement_epargne,
                            'paysan_relais': producteur.paysan_relais,
                            'satellite_floraison': producteur.satellite_floraison,
                            
                            # Composition du foyer
                            'nb_adultes_plus_18': producteur.nb_adultes_plus_18,
                            'nb_hommes_adultes': producteur.nb_hommes_adultes,
                            'nb_femmes_adultes': producteur.nb_femmes_adultes,
                            'nb_enfants_garcons': producteur.nb_enfants_garcons,
                            'nb_enfants_filles': producteur.nb_enfants_filles,
                            'nb_enfants_scolarises': producteur.nb_enfants_scolarises,
                            'nb_enfants_non_scolarises': producteur.nb_enfants_non_scolarises,
                            'taux_scolarisation': producteur.taux_scolarisation,
                            
                            # Santé & Eau
                            'source_eau': producteur.source_eau or '',
                            'type_centre_sante': producteur.type_centre_sante or '',
                            'a_assurance_sante': producteur.a_assurance_sante,
                            
                            # Statut
                            'actif': producteur.actif,
                            
                            # Métadonnées
                            'enregistre_par': self.user,
                            'notes': f'Importé automatiquement le {datetime.now().date()}'
                        }
                    )
                    
                    if created:
                        self.stats['history_producteur_created'] += 1
                    else:
                        self.stats['history_producteur_updated'] += 1
                
                except Exception as e:
                    self.stats['history_producteur_errors'].append({
                        'code': producteur.code,
                        'erreur': str(e)
                    })
                    logger.error(f"Erreur archivage producteur {producteur.code}: {e}")
            
            logger.info(f"Archivage producteurs terminé: {self.stats['history_producteur_created']} créés, "
                       f"{self.stats['history_producteur_updated']} mis à jour")
        
        except Exception as e:
            logger.error(f"Erreur générale lors de l'archivage des producteurs: {e}")
            self.stats['history_producteur_errors'].append({
                'type': 'general',
                'erreur': str(e)
            })
    
    def run(self):
        """Exécuter l'import complet avec archivage automatique"""
        
        with transaction.atomic():
            self.import_producteurs()
            self.import_parcelles()
            self.import_formations()
            self.import_agr()
            self.import_dotations()
            
            # Archiver automatiquement les données importées
            self.archive_to_history()
            
            # Archiver automatiquement les producteurs
            self.archive_producteurs_to_history()
        
        if self.stats['errors']:
            logger.error("DÉTAIL DES ERREURS:")
            for err in self.stats['errors']:
                logger.error(f"- {err}")
        
        if self.stats.get('agr_errors'):
            logger.error("DÉTAIL DES ERREURS AGR:")
            for err in self.stats['agr_errors']:
                logger.error(f"- {err}")
        
        if self.stats.get('history_errors'):
            logger.error("DÉTAIL DES ERREURS D'ARCHIVAGE:")
            for err in self.stats['history_errors']:
                logger.error(f"- {err}")
        
        if self.stats.get('history_producteur_errors'):
            logger.error("DÉTAIL DES ERREURS D'ARCHIVAGE PRODUCTEURS:")
            for err in self.stats['history_producteur_errors']:
                logger.error(f"- {err}")
        
        return self.stats
