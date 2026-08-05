"""
Business logic for managing annual snapshots.
"""
from typing import Dict, Optional
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class SnapshotManager:
    """Gère la création et la consultation des snapshots annuels"""
    
    @staticmethod
    def create_snapshot(annee: int, user: Optional[User] = None, description: str = "") -> 'AnnualSnapshot':
        """
        Crée un snapshot pour une année donnée en calculant les statistiques agrégées.
        
        Cette méthode :
        1. Vérifie qu'aucun snapshot n'existe déjà pour cette année
        2. Calcule les statistiques agrégées depuis les données historiques
        3. Crée et retourne l'instance AnnualSnapshot
        
        Args:
            annee: Année du snapshot (entre 2000 et 2100)
            user: Utilisateur créateur (optionnel)
            description: Description du snapshot (optionnel)
            
        Returns:
            Instance AnnualSnapshot créée avec les statistiques calculées
            
        Raises:
            ValidationError: Si un snapshot existe déjà pour cette année
            ValidationError: Si l'année est invalide
            
        Examples:
            >>> snapshot = SnapshotManager.create_snapshot(2024, user=admin_user)
            >>> print(snapshot.nb_producteurs)
            150
            
            >>> SnapshotManager.create_snapshot(2024)  # Déjà existant
            ValidationError: Un snapshot existe déjà pour l'année 2024
        """
        # Import here to avoid circular imports
        from history.models import AnnualSnapshot, ProductionHistory, AGRHistory
        from producteurs.models import Producteur
        from parcelles.models import Parcelle
        
        # Validation de l'année
        if annee < 2000 or annee > 2100:
            raise ValidationError(
                f"L'année doit être comprise entre 2000 et 2100 (reçu: {annee})"
            )
        
        # Vérifier qu'aucun snapshot n'existe déjà
        if AnnualSnapshot.objects.filter(annee=annee).exists():
            raise ValidationError(
                f"Un snapshot existe déjà pour l'année {annee}"
            )
        
        # Calculer les statistiques agrégées
        
        # 1. Nombre de producteurs actifs pour cette année
        # On compte les producteurs qui ont des données historiques pour cette année
        producteurs_avec_production = ProductionHistory.objects.filter(
            annee=annee
        ).values_list('parcelle__producteur', flat=True).distinct()
        
        producteurs_avec_agr = AGRHistory.objects.filter(
            annee=annee
        ).values_list('producteur', flat=True).distinct()
        
        # Union des deux ensembles
        producteurs_ids = set(producteurs_avec_production) | set(producteurs_avec_agr)
        nb_producteurs = len(producteurs_ids)
        
        # 2. Nombre de parcelles avec production pour cette année
        nb_parcelles = ProductionHistory.objects.filter(
            annee=annee
        ).values('parcelle').distinct().count()
        
        # 3. Production totale en kg pour cette année
        production_aggregate = ProductionHistory.objects.filter(
            annee=annee
        ).aggregate(
            total=models.Sum('quantite_kg')
        )
        production_totale_kg = production_aggregate['total'] or Decimal('0.00')
        
        # 4. Revenu total AGR pour cette année
        agr_aggregate = AGRHistory.objects.filter(
            annee=annee
        ).aggregate(
            total=models.Sum('revenu_annuel')
        )
        revenu_total_agr = agr_aggregate['total'] or Decimal('0.00')
        
        # Créer le snapshot
        snapshot = AnnualSnapshot.objects.create(
            annee=annee,
            nb_producteurs=nb_producteurs,
            nb_parcelles=nb_parcelles,
            production_totale_kg=production_totale_kg,
            revenu_total_agr=revenu_total_agr,
            cree_par=user,
            description=description
        )
        
        return snapshot
    
    @staticmethod
    def compare_snapshots(annee1: int, annee2: int) -> Dict:
        """
        Compare deux snapshots et retourne les différences.
        
        Cette méthode calcule les différences absolues et relatives entre
        deux snapshots annuels pour tous les indicateurs clés.
        
        Args:
            annee1: Première année (généralement la plus ancienne)
            annee2: Deuxième année (généralement la plus récente)
            
        Returns:
            Dictionnaire structuré avec les comparaisons :
            {
                'annee1': int,
                'annee2': int,
                'snapshot1': {...},  # Données du premier snapshot
                'snapshot2': {...},  # Données du deuxième snapshot
                'differences': {
                    'nb_producteurs': {'absolu': int, 'relatif': float},
                    'nb_parcelles': {'absolu': int, 'relatif': float},
                    'production_totale_kg': {'absolu': Decimal, 'relatif': float},
                    'revenu_total_agr': {'absolu': Decimal, 'relatif': float}
                }
            }
            
        Raises:
            ValidationError: Si un des snapshots n'existe pas
            
        Examples:
            >>> comparison = SnapshotManager.compare_snapshots(2023, 2024)
            >>> print(comparison['differences']['nb_producteurs']['relatif'])
            10.5  # 10.5% d'augmentation
        """
        # Import here to avoid circular imports
        from history.models import AnnualSnapshot
        
        # Récupérer les deux snapshots
        try:
            snapshot1 = AnnualSnapshot.objects.get(annee=annee1)
        except AnnualSnapshot.DoesNotExist:
            raise ValidationError(
                f"Aucun snapshot trouvé pour l'année {annee1}"
            )
        
        try:
            snapshot2 = AnnualSnapshot.objects.get(annee=annee2)
        except AnnualSnapshot.DoesNotExist:
            raise ValidationError(
                f"Aucun snapshot trouvé pour l'année {annee2}"
            )
        
        # Fonction helper pour calculer les différences
        def calculate_difference(value1, value2):
            """Calcule la différence absolue et relative"""
            # Convertir en float pour les calculs
            val1 = float(value1) if value1 is not None else 0.0
            val2 = float(value2) if value2 is not None else 0.0
            
            absolu = val2 - val1
            
            # Calculer le pourcentage de variation
            if val1 == 0:
                # Si valeur initiale est 0
                if val2 == 0:
                    relatif = 0.0
                else:
                    relatif = 100.0  # Augmentation de 100% (ou infinie)
            else:
                relatif = (absolu / val1) * 100
            
            return {
                'absolu': round(absolu, 2),
                'relatif': round(relatif, 2)
            }
        
        # Construire le dictionnaire de comparaison
        comparison = {
            'annee1': annee1,
            'annee2': annee2,
            'snapshot1': {
                'nb_producteurs': snapshot1.nb_producteurs,
                'nb_parcelles': snapshot1.nb_parcelles,
                'production_totale_kg': float(snapshot1.production_totale_kg),
                'revenu_total_agr': float(snapshot1.revenu_total_agr),
                'date_creation': snapshot1.date_creation.isoformat(),
                'description': snapshot1.description
            },
            'snapshot2': {
                'nb_producteurs': snapshot2.nb_producteurs,
                'nb_parcelles': snapshot2.nb_parcelles,
                'production_totale_kg': float(snapshot2.production_totale_kg),
                'revenu_total_agr': float(snapshot2.revenu_total_agr),
                'date_creation': snapshot2.date_creation.isoformat(),
                'description': snapshot2.description
            },
            'differences': {
                'nb_producteurs': calculate_difference(
                    snapshot1.nb_producteurs,
                    snapshot2.nb_producteurs
                ),
                'nb_parcelles': calculate_difference(
                    snapshot1.nb_parcelles,
                    snapshot2.nb_parcelles
                ),
                'production_totale_kg': calculate_difference(
                    snapshot1.production_totale_kg,
                    snapshot2.production_totale_kg
                ),
                'revenu_total_agr': calculate_difference(
                    snapshot1.revenu_total_agr,
                    snapshot2.revenu_total_agr
                )
            }
        }
        
        return comparison
