"""
Business logic for trend analysis and calculations.
"""
from typing import List, Tuple, Dict, Optional
from decimal import Decimal
import statistics


class TrendCalculator:
    """Calcule les tendances et statistiques sur plusieurs années"""
    
    @staticmethod
    def calculate_growth_rate(data_points: List[Tuple[int, float]]) -> Optional[float]:
        """
        Calcule le taux de croissance annuel moyen (CAGR - Compound Annual Growth Rate).
        
        La formule utilisée est: CAGR = ((Valeur_finale / Valeur_initiale)^(1/nombre_années) - 1) * 100
        
        Args:
            data_points: Liste de tuples (année, valeur) triés par année
            
        Returns:
            Taux de croissance en pourcentage, ou None si calcul impossible
            
        Examples:
            >>> TrendCalculator.calculate_growth_rate([(2020, 100), (2021, 110), (2022, 121)])
            10.0  # 10% de croissance annuelle moyenne
            
            >>> TrendCalculator.calculate_growth_rate([(2020, 100)])
            None  # Pas assez de données
            
            >>> TrendCalculator.calculate_growth_rate([(2020, 0), (2021, 100)])
            None  # Valeur initiale nulle
        """
        # Validation: besoin d'au moins 2 points de données
        if not data_points or len(data_points) < 2:
            return None
        
        # Filtrer les points avec valeurs None ou négatives
        valid_points = [(year, value) for year, value in data_points 
                       if value is not None and value >= 0]
        
        if len(valid_points) < 2:
            return None
        
        # Trier par année pour s'assurer de l'ordre
        sorted_points = sorted(valid_points, key=lambda x: x[0])
        
        # Extraire première et dernière valeur
        first_year, first_value = sorted_points[0]
        last_year, last_value = sorted_points[-1]
        
        # Vérifier que la valeur initiale n'est pas nulle
        if first_value == 0:
            return None
        
        # Calculer le nombre d'années
        num_years = last_year - first_year
        
        # Si même année, pas de croissance calculable
        if num_years == 0:
            return None
        
        # Calculer le CAGR
        # CAGR = ((Vf / Vi)^(1/n) - 1) * 100
        growth_ratio = last_value / first_value
        cagr = (pow(growth_ratio, 1.0 / num_years) - 1) * 100
        
        return round(cagr, 2)
    
    @staticmethod
    def detect_anomalies(data_points: List[Tuple[int, float]], 
                        threshold: float = 0.5) -> List[int]:
        """
        Détecte les anomalies (variations > threshold) entre années consécutives.
        
        Une anomalie est détectée quand la variation relative entre deux années
        consécutives dépasse le seuil spécifié.
        
        Args:
            data_points: Liste de tuples (année, valeur) triés par année
            threshold: Seuil de variation (0.5 = 50%, 1.0 = 100%)
            
        Returns:
            Liste des années où une anomalie a été détectée
            
        Examples:
            >>> TrendCalculator.detect_anomalies([(2020, 100), (2021, 200), (2022, 210)])
            [2021]  # Variation de 100% entre 2020 et 2021
            
            >>> TrendCalculator.detect_anomalies([(2020, 100), (2021, 140), (2022, 150)])
            []  # Variations < 50%
        """
        if not data_points or len(data_points) < 2:
            return []
        
        # Filtrer les points valides
        valid_points = [(year, value) for year, value in data_points 
                       if value is not None and value >= 0]
        
        if len(valid_points) < 2:
            return []
        
        # Trier par année
        sorted_points = sorted(valid_points, key=lambda x: x[0])
        
        anomalies = []
        
        # Comparer chaque paire d'années consécutives
        for i in range(1, len(sorted_points)):
            prev_year, prev_value = sorted_points[i - 1]
            curr_year, curr_value = sorted_points[i]
            
            # Éviter division par zéro
            if prev_value == 0:
                # Si valeur précédente est 0 et actuelle > 0, c'est une anomalie
                if curr_value > 0:
                    anomalies.append(curr_year)
                continue
            
            # Calculer la variation relative
            variation = abs(curr_value - prev_value) / prev_value
            
            # Si variation dépasse le seuil, c'est une anomalie
            if variation > threshold:
                anomalies.append(curr_year)
        
        return anomalies
    
    @staticmethod
    def calculate_trend_line(data_points: List[Tuple[int, float]]) -> Optional[Dict[str, float]]:
        """
        Calcule la ligne de tendance (régression linéaire simple).
        
        Utilise la méthode des moindres carrés pour calculer la droite de régression
        y = slope * x + intercept
        
        Args:
            data_points: Liste de tuples (année, valeur)
            
        Returns:
            Dictionnaire avec 'slope', 'intercept', 'r_squared', ou None si impossible
            
        Examples:
            >>> TrendCalculator.calculate_trend_line([(2020, 100), (2021, 110), (2022, 120)])
            {'slope': 10.0, 'intercept': -40390.0, 'r_squared': 1.0}
        """
        if not data_points or len(data_points) < 2:
            return None
        
        # Filtrer les points valides
        valid_points = [(year, value) for year, value in data_points 
                       if value is not None and value >= 0]
        
        if len(valid_points) < 2:
            return None
        
        # Extraire x (années) et y (valeurs)
        x_values = [float(year) for year, _ in valid_points]
        y_values = [float(value) for _, value in valid_points]
        
        n = len(valid_points)
        
        # Calculer les moyennes
        mean_x = statistics.mean(x_values)
        mean_y = statistics.mean(y_values)
        
        # Calculer la pente (slope) et l'ordonnée à l'origine (intercept)
        # slope = Σ((x - mean_x) * (y - mean_y)) / Σ((x - mean_x)²)
        numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values))
        denominator = sum((x - mean_x) ** 2 for x in x_values)
        
        if denominator == 0:
            return None
        
        slope = numerator / denominator
        intercept = mean_y - slope * mean_x
        
        # Calculer R² (coefficient de détermination)
        # R² = 1 - (SS_res / SS_tot)
        # SS_res = Σ(y - y_pred)²
        # SS_tot = Σ(y - mean_y)²
        y_pred = [slope * x + intercept for x in x_values]
        ss_res = sum((y - y_p) ** 2 for y, y_p in zip(y_values, y_pred))
        ss_tot = sum((y - mean_y) ** 2 for y in y_values)
        
        if ss_tot == 0:
            # Si toutes les valeurs sont identiques, R² = 1 (ajustement parfait)
            r_squared = 1.0
        else:
            r_squared = 1 - (ss_res / ss_tot)
        
        return {
            'slope': round(slope, 2),
            'intercept': round(intercept, 2),
            'r_squared': round(r_squared, 4)
        }
