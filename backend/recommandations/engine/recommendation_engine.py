import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from django.db import transaction
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from datetime import timedelta

from producteurs.models import Producteur
from parcelles.models import Parcelle
from recommandations.models import Recommendation, Activite


class RecommendationEngine:
    """
    Moteur de recommandation basé sur la similarité cosinus
    
    Processus:
    1. Extraction des features pour chaque producteur
    2. Normalisation avec StandardScaler
    3. Calcul de la matrice de similarité cosinus
    4. Identification des producteurs similaires
    5. Analyse des activités réussies (impact >= 7/10)
    6. Agrégation et scoring des recommandations
    7. Classement et sélection du top-5
    """
    
    def __init__(self):
        self.producteurs_df = None
        self.similarity_matrix = None
        self.scaler = StandardScaler()
    
    def extract_features(self):
        """
        Extrait les features pour chaque producteur
        
        Features utilisées:
        - nb_formations: Nombre de formations suivies
        - superficie_totale: Superficie totale des parcelles (ha)
        - nb_pieds_vanille: Nombre total de pieds de vanille
        - production_totale: Production totale estimée (kg)
        - age_moyen_parcelles: Âge moyen des parcelles (années)
        - nb_parcelles_certifiees: Nombre de parcelles certifiées
        - diversite_cultures: Nombre de types de cultures pratiquées
        - nb_collectes: Nombre de collectes dans l'année
        - anciennete: Années depuis l'adhésion
        - nb_parcelles: Nombre de parcelles
        """
        from datetime import datetime
        producteurs = Producteur.objects.filter(actif=True).prefetch_related('parcelles', 'activites')
        
        print(f"\n[DEBUG]  DEBUG - Total producteurs actifs dans la base: {producteurs.count()}")
        
        annee_actuelle = datetime.now().year
        
        data = []
        producteurs_sans_parcelles = []  # Track producteurs sans parcelles pour debug
        
        for p in producteurs:
            # Calcul des features activités
            nb_formations = p.activites.filter(type__icontains='formation').count()
            nb_collectes = p.activites.filter(type__icontains='collecte', date__year=annee_actuelle).count()
            
            # Calcul des features parcelles (NOUVELLES DONNÉES)
            parcelles_actives = p.parcelles.filter(active=True)
            
            # VÉRIFICATION: Si aucune parcelle active, utiliser des valeurs par défaut au lieu d'exclure
            # Cela permet d'inclure tous les producteurs actifs dans l'analyse
            if parcelles_actives.count() == 0:
                # Producteur sans parcelles actives - utiliser des valeurs par défaut
                producteurs_sans_parcelles.append(p.id)
                superficie_totale = 0.0
                nb_pieds_vanille = 0
                production_totale = 0.0
                age_moyen_parcelles = 0.0
                nb_parcelles_certifiees = 0
                diversite_cultures = 0
                nb_parcelles = 0
            else:
                superficie_totale = parcelles_actives.aggregate(total=Sum('dimension_ha'))['total'] or 0
                nb_pieds_vanille = parcelles_actives.aggregate(total=Sum('nombre_pieds'))['total'] or 0
                production_totale = parcelles_actives.aggregate(total=Sum('estimation_production_kg'))['total'] or 0
                
                # Calcul de l'âge moyen des parcelles
                ages_parcelles = []
                for parcelle in parcelles_actives:
                    if parcelle.annee_plantation:
                        age = annee_actuelle - parcelle.annee_plantation
                        if age >= 0:  # Éviter les années futures
                            ages_parcelles.append(age)
                age_moyen_parcelles = sum(ages_parcelles) / len(ages_parcelles) if ages_parcelles else 0
                
                # Nombre de parcelles certifiées
                nb_parcelles_certifiees = parcelles_actives.filter(certifiee=True).count()
                
                # Diversité des cultures (nombre de types différents)
                cultures_set = set()
                for parcelle in parcelles_actives:
                    if parcelle.cultures_pratiquees:
                        cultures_set.update(parcelle.cultures_pratiquees)
                diversite_cultures = len(cultures_set)
                
                nb_parcelles = parcelles_actives.count()
            
            # Ancienneté (calculée pour tous les producteurs)
            if p.date_adhesion_cooperative:
                anciennete = (timezone.now().date() - p.date_adhesion_cooperative).days // 365
            else:
                anciennete = 0
            
            # Calcul de l'âge
            age = 0
            if p.date_naissance:
                age = (timezone.now().date() - p.date_naissance).days // 365
                
            # Encodage du sexe (0=M, 1=F)
            sexe_code = 1 if p.sexe == 'F' else 0
            
            data.append({
                'id': p.id,
                'nom': p.nom,
                'prenom': p.prenom,
                'commune': p.commune,  # Ajout de la commune pour le boosting
                'nb_formations': nb_formations,
                'superficie_totale': float(superficie_totale),
                'nb_pieds_vanille': nb_pieds_vanille,
                'production_totale': float(production_totale),
                'age_moyen_parcelles': age_moyen_parcelles,
                'nb_parcelles_certifiees': nb_parcelles_certifiees,
                'diversite_cultures': diversite_cultures,
                'nb_collectes': nb_collectes,
                'anciennete': anciennete,
                'nb_parcelles': nb_parcelles,
                'age': age,
                'sexe_code': sexe_code
            })
        
        # DEBUG: Afficher les producteurs sans parcelles (mais inclus avec valeurs par défaut)
        if producteurs_sans_parcelles:
            print(f"\n[WARNING]  DEBUG - {len(producteurs_sans_parcelles)} producteur(s) sans parcelles actives (inclus avec valeurs par défaut):")
            print(f"   IDs: {producteurs_sans_parcelles[:20]}...")
            if len(producteurs_sans_parcelles) > 20:
                print(f"   ... et {len(producteurs_sans_parcelles) - 20} autres")
        
        return pd.DataFrame(data)
    
    def train(self):
        """
        Entraîne le modèle : extraction + normalisation + calcul similarité
        """
        print("[INFO]  Extraction des features...")
        self.producteurs_df = self.extract_features()
        
        if len(self.producteurs_df) < 2:
            raise ValueError("Pas assez de producteurs pour calculer la similarité (minimum 2)")
        
        # DEBUG: Afficher les features du producteur pour diagnostic
        print(f"\n[DEBUG]  DEBUG - Total producteurs dans DataFrame: {len(self.producteurs_df)}")
        print(f"[DEBUG]  DEBUG - IDs des producteurs: {self.producteurs_df['id'].tolist()[:10]}...")
        
        # Sélection des colonnes numériques pour la similarité
        feature_columns = [
            'nb_formations', 'superficie_totale', 'nb_pieds_vanille',
            'production_totale', 'age_moyen_parcelles', 'nb_parcelles_certifiees',
            'diversite_cultures', 'nb_collectes', 'anciennete', 'nb_parcelles',
            'age', 'sexe_code'
        ]
        
        features = self.producteurs_df[feature_columns].values
        
        # DEBUG: Vérifier les NaN ou Inf avant normalisation
        import numpy as np
        has_nan = np.isnan(features).any()
        has_inf = np.isinf(features).any()
        
        if has_nan:
            print("[WARNING]  WARNING: Des valeurs NaN détectées dans les features")
            # Remplacer NaN par 0
            features = np.nan_to_num(features, nan=0.0)
        
        if has_inf:
            print("[WARNING]  WARNING: Des valeurs Inf détectées dans les features")
            # Remplacer Inf par 0
            features = np.nan_to_num(features, posinf=0.0, neginf=0.0)
        
        # Normalisation
        print("[INFO]  Normalisation des features...")
        try:
            features_normalized = self.scaler.fit_transform(features)
            
            # DEBUG: Vérifier après normalisation
            has_nan_after = np.isnan(features_normalized).any()
            has_inf_after = np.isinf(features_normalized).any()
            
            if has_nan_after or has_inf_after:
                print("[WARNING]  WARNING: Normalisation a créé des NaN/Inf")
                features_normalized = np.nan_to_num(features_normalized, nan=0.0, posinf=0.0, neginf=0.0)
        except Exception as e:
            print(f"[ERREUR]  ERREUR lors de la normalisation: {e}")
            # Utiliser les features non normalisées en dernier recours
            features_normalized = features
        
        # Calcul de la matrice de similarité cosinus
        print("[?]  Calcul de la matrice de similarité...")
        self.similarity_matrix = cosine_similarity(features_normalized)
        
        print(f"[OK]  Modèle entraîné : {len(self.producteurs_df)} producteurs")
    
    def get_top_similar(self, similarity_matrix, producteur_idx, n=10):
        """
        Retourne les N producteurs les plus similaires avec boosting local
        """
        similarities = similarity_matrix[producteur_idx].copy()
        
        # === LOCATION BOOSTING (BONUS COMMUNE) ===
        # Récupérer la commune du producteur cible
        target_commune = self.producteurs_df.iloc[producteur_idx]['commune']
        
        if target_commune:
            # Identifier les index des producteurs de la même commune
            same_commune_indices = self.producteurs_df.index[
                self.producteurs_df['commune'].str.lower() == target_commune.lower()
            ].tolist()
            
            # Appliquer le bonus (+0.3)
            # On s'assure de ne pas dépasser 1.0 (bien que cosine soit max 1.0, le boost peut dépasser)
            # Mais pour le classement relatif, ce n'est pas grave si > 1.0
            for idx in same_commune_indices:
                if idx != producteur_idx:
                    similarities[idx] += 0.3
                    
        # Trier par similarité décroissante
        similar_indices = np.argsort(similarities)[::-1]
        
        # Exclure le producteur lui-même
        similar_indices = [idx for idx in similar_indices if idx != producteur_idx]
        
        # Retourner les top N avec leurs scores
        return [(idx, similarities[idx]) for idx in similar_indices[:n]]
    
    def get_recommendations(self, producteur_id, top_n=5):
        """
        Génère les recommandations pour un producteur
        
        Args:
            producteur_id: ID du producteur cible
            top_n: Nombre de recommandations à retourner
        
        Returns:
            List[Dict]: Liste des recommandations avec scores
        """
        if self.producteurs_df is None or self.similarity_matrix is None:
            self.train()
        
        # Vérifier que le producteur existe et est actif
        try:
            producteur = Producteur.objects.get(id=producteur_id)
            if not producteur.actif:
                print(f"[WARNING]  Producteur {producteur_id} est inactif - aucune recommandation générée")
                return []
        except Producteur.DoesNotExist:
            print(f"[ERREUR]  Producteur {producteur_id} n'existe pas")
            return []
        
        # Trouver l'index du producteur dans le DataFrame
        print(f"\n[DEBUG]  DEBUG - Recherche du producteur {producteur_id} dans le DataFrame...")
        print(f"[DEBUG]  DEBUG - DataFrame contient {len(self.producteurs_df)} producteurs")
        print(f"[DEBUG]  DEBUG - Producteur {producteur_id} dans la liste? {producteur_id in self.producteurs_df['id'].values}")
        
        if producteur_id in self.producteurs_df['id'].values:
            # Afficher les features de ce producteur
            producteur_row = self.producteurs_df[self.producteurs_df['id'] == producteur_id]
            producteur_data = producteur_row.iloc[0]
            producteur_idx = producteur_row.index[0]  # Utiliser l'index pandas
            
            print(f"\n[OK]  Producteur {producteur_id} trouvé dans le DataFrame!")
            print(f"   Index pandas: {producteur_idx}")
            print(f"   Features: {producteur_data.to_dict()}")
        else:
            print(f"\n[ERREUR]  ERREUR: Producteur {producteur_id} NON trouvé dans le DataFrame")
            print(f"   IDs disponibles: {self.producteurs_df['id'].tolist()[:20]}...")
            print(f"[WARNING]  Producteur {producteur_id} (actif mais sans données suffisantes pour analyse)")
            print(f"   [OK]  Données nécessaires dans les PARCELLES:")
            print(f"      - Superficie (dimension_ha) > 0")
            print(f"      - Nombre de pieds de vanille (nombre_pieds) > 0")
            print(f"      - Production estimée (estimation_production_kg)")
            print(f"      - Année de plantation (pour calcul d'âge)")
            print(f"      - Cultures pratiquées (diversité)")
            print(f"      - Certification (optionnel mais valorisé)")
            print(f"   [OK]  Données recommandées dans ACTIVITÉS:")
            print(f"      - Formations suivies")
            print(f"      - Collectes réalisées (année en cours)")
            return []
        
        # Récupérer les producteurs similaires
        similar_producteurs = self.get_top_similar(
            self.similarity_matrix,
            producteur_idx,
            n=10  # Prendre plus pour avoir des options
        )
        
        # Analyser les activités réussies des producteurs similaires
        recommendations = self.analyze_successful_activities(
            similar_producteurs,
            producteur_id
        )
        
        # Trier et limiter au top N
        recommendations.sort(key=lambda x: x['score_pertinence'], reverse=True)
        
        return recommendations[:top_n]
    
    def analyze_successful_activities(self, similar_producteurs, target_producteur_id):
        """
        Analyse les activités réussies des producteurs similaires
        
        Args:
            similar_producteurs: Liste de (idx, similarity_score)
            target_producteur_id: ID du producteur cible
        
        Returns:
            List[Dict]: Activités recommandées avec scores
        """
        recommendations = {}
        
        # Date limite : activités des 2 dernières années
        date_limite = timezone.now() - timedelta(days=730)
        
        for idx, similarity_score in similar_producteurs:
            # Récupérer l'ID du producteur similaire
            similar_producteur_id = self.producteurs_df.iloc[idx]['id']
            
            # Récupérer les activités réussies (impact >= 7.0)
            activites = Activite.objects.filter(
                producteur_id=similar_producteur_id,
                impact_score__gte=7.0,
                date__gte=date_limite
            ).values('type', 'description', 'impact_score')
            
            for activite in activites:
                type_activite = activite['type']
                
                # Agrégation des recommandations par type
                if type_activite not in recommendations:
                    recommendations[type_activite] = {
                        'type_activite': type_activite,
                        'description': activite['description'],
                        'score_pertinence': 0.0,
                        'nb_occurrences': 0,
                        'impact_moyen': 0.0,
                        'sources': []
                    }
                
                # Calcul du score de pertinence
                # score = similarité × (impact / 10)
                contribution = similarity_score * (activite['impact_score'] / 10.0)
                
                recommendations[type_activite]['score_pertinence'] += contribution
                recommendations[type_activite]['nb_occurrences'] += 1
                recommendations[type_activite]['impact_moyen'] += activite['impact_score']
                recommendations[type_activite]['sources'].append({
                    'producteur_id': int(similar_producteur_id),
                    'similarity': float(round(similarity_score, 3)),
                    'impact': float(activite['impact_score'])
                })
        
        # Finalisation des scores
        result = []
        for rec in recommendations.values():
            if rec['nb_occurrences'] > 0:
                # Moyenne de l'impact
                rec['impact_moyen'] = rec['impact_moyen'] / rec['nb_occurrences']
                
                # Normalisation du score entre 0 et 1
                rec['score_pertinence'] = min(rec['score_pertinence'], 1.0)
                
                # Limiter les sources au top 3
                rec['sources'] = sorted(
                    rec['sources'],
                    key=lambda x: x['similarity'],
                    reverse=True
                )[:3]
            
            result.append(rec)
        
        return result
    
    def generate_explanation(self, recommendation):
        """
        Génère une explication textuelle pour une recommandation
        
        Args:
            recommendation: Dict contenant la recommandation
        
        Returns:
            str: Explication en français
        """
        nb_sources = recommendation['nb_occurrences']
        impact_moyen = recommendation['impact_moyen']
        score = recommendation['score_pertinence'] * 10
        
        explication = f"Cette action est recommandée car {nb_sources} producteurs "
        explication += f"similaires ont obtenu un impact moyen de {impact_moyen:.1f}/10. "
        explication += f"Score de pertinence : {score:.1f}/10."
        
        return explication
    
    def save_recommendations(self, producteur_id, recommendations):
        """
        Sauvegarde les recommandations dans la base de données
        
        Args:
            producteur_id: ID du producteur
            recommendations: Liste des recommandations
        """
        with transaction.atomic():
            # Suppression des anciennes recommandations en attente
            Recommendation.objects.filter(
                producteur_id=producteur_id,
                statut='pending'
            ).delete()
            
            # Création des nouvelles recommandations
            for rec in recommendations:
                Recommendation.objects.create(
                    producteur_id=producteur_id,
                    type_activite=rec['type_activite'],
                    description=rec['description'],
                    score_pertinence=rec['score_pertinence'],
                    date_generation=timezone.now(),
                    statut='pending',
                    explication=self.generate_explanation(rec),
                    sources=rec['sources']
                )
    
    def refresh_all_recommendations(self):
        """
        Régénère les recommandations pour tous les producteurs actifs
        Utilisé pour la tâche planifiée quotidienne
        """
        print("=" * 60)
        print("REFRESH DES RECOMMANDATIONS IA")
        print("=" * 60)
        
        # Entraînement du modèle
        self.train()
        
        # Génération des recommandations pour chaque producteur
        producteurs = Producteur.objects.filter(actif=True)
        total = producteurs.count()
        
        print(f"Génération des recommandations pour {total} producteurs...")
        
        success_count = 0
        for i, producteur in enumerate(producteurs, 1):
            try:
                recommendations = self.get_recommendations(producteur.id, top_n=5)
                
                if recommendations:
                    self.save_recommendations(producteur.id, recommendations)
                    success_count += 1
                
                if i % 10 == 0:
                    print(f"[INFO]  Progression : {i}/{total} ({i*100//total}%)")
                
            except Exception as e:
                print(f"[ERREUR]  ERREUR Producteur {producteur.id}: {str(e)}")
        
        print(f"[OK]  {success_count}/{total} producteurs traités avec succès.")
        print("=" * 60)
        
        return {
            'total': total,
            'success': success_count,
            'failed': total - success_count
        }
