"""
Validators for the Annual History System

This module provides validation functions for historical data to ensure
data quality and consistency across the system.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple
from django.core.exceptions import ValidationError


class DataValidator:
    """Validates historical data before storage"""
    
    # Valid culture types for production
    VALID_CULTURES = [
        'vanille',
        'cafe',
        'girofle',
        'riz',
        'manioc',
        'haricot',
        'mais',
        'autre'
    ]
    
    # Valid AGR types
    VALID_AGR_TYPES = [
        'pisciculture',
        'aviculture',
        'autre'
    ]
    
    @staticmethod
    def validate_year(annee: int) -> bool:
        """
        Validate that the year is within acceptable range.
        
        Args:
            annee: Year to validate
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If year is outside valid range
            
        Requirements: 7.1
        """
        current_year = datetime.now().year
        min_year = 2000
        max_year = current_year + 1
        
        if not isinstance(annee, int):
            raise ValidationError(
                f"L'année doit être un nombre entier, reçu: {type(annee).__name__}"
            )
        
        if annee < min_year or annee > max_year:
            raise ValidationError(
                f"L'année doit être comprise entre {min_year} et {max_year}. "
                f"Année fournie: {annee}"
            )
        
        return True
    
    @staticmethod
    def validate_production(
        quantite: Decimal,
        culture: str,
        prix_vente: Optional[Decimal] = None
    ) -> bool:
        """
        Validate production data.
        
        Args:
            quantite: Quantity produced in kg
            culture: Type of crop/culture
            prix_vente: Optional sale price per kg
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If data is invalid
            
        Requirements: 7.2
        """
        # Validate quantity
        if not isinstance(quantite, (Decimal, int, float)):
            raise ValidationError(
                f"La quantité doit être un nombre, reçu: {type(quantite).__name__}"
            )
        
        quantite_decimal = Decimal(str(quantite))
        
        if quantite_decimal < 0:
            raise ValidationError(
                f"La quantité ne peut pas être négative. Quantité fournie: {quantite_decimal}"
            )
        
        # Validate culture
        if not isinstance(culture, str):
            raise ValidationError(
                f"Le type de culture doit être une chaîne de caractères, reçu: {type(culture).__name__}"
            )
        
        culture_lower = culture.lower().strip()
        
        if not culture_lower:
            raise ValidationError(
                "Le type de culture ne peut pas être vide"
            )
        
        if culture_lower not in DataValidator.VALID_CULTURES:
            raise ValidationError(
                f"Type de culture invalide: '{culture}'. "
                f"Types valides: {', '.join(DataValidator.VALID_CULTURES)}"
            )
        
        # Validate prix_vente if provided
        if prix_vente is not None:
            if not isinstance(prix_vente, (Decimal, int, float)):
                raise ValidationError(
                    f"Le prix de vente doit être un nombre, reçu: {type(prix_vente).__name__}"
                )
            
            prix_vente_decimal = Decimal(str(prix_vente))
            
            if prix_vente_decimal < 0:
                raise ValidationError(
                    f"Le prix de vente ne peut pas être négatif. Prix fourni: {prix_vente_decimal}"
                )
        
        return True
    
    @staticmethod
    def validate_agr_revenue(
        revenu: Decimal,
        type_agr: str,
        quantite_vendue: Optional[Decimal] = None,
        prix_vente_unitaire: Optional[Decimal] = None,
        tolerance: Decimal = Decimal('0.01')
    ) -> bool:
        """
        Validate AGR revenue data and check consistency.
        
        Args:
            revenu: Annual revenue
            type_agr: Type of AGR activity
            quantite_vendue: Optional quantity sold
            prix_vente_unitaire: Optional unit sale price
            tolerance: Tolerance for revenue calculation (default 0.01 Ar)
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If data is invalid or inconsistent
            
        Requirements: 7.2
        """
        # Validate revenue
        if not isinstance(revenu, (Decimal, int, float)):
            raise ValidationError(
                f"Le revenu doit être un nombre, reçu: {type(revenu).__name__}"
            )
        
        revenu_decimal = Decimal(str(revenu))
        
        if revenu_decimal < 0:
            raise ValidationError(
                f"Le revenu ne peut pas être négatif. Revenu fourni: {revenu_decimal}"
            )
        
        # Validate type_agr
        if not isinstance(type_agr, str):
            raise ValidationError(
                f"Le type d'AGR doit être une chaîne de caractères, reçu: {type(type_agr).__name__}"
            )
        
        type_agr_lower = type_agr.lower().strip()
        
        if not type_agr_lower:
            raise ValidationError(
                "Le type d'AGR ne peut pas être vide"
            )
        
        if type_agr_lower not in DataValidator.VALID_AGR_TYPES:
            raise ValidationError(
                f"Type d'AGR invalide: '{type_agr}'. "
                f"Types valides: {', '.join(DataValidator.VALID_AGR_TYPES)}"
            )
        
        # Validate consistency: revenu = quantite_vendue × prix_vente_unitaire
        if quantite_vendue is not None and prix_vente_unitaire is not None:
            if not isinstance(quantite_vendue, (Decimal, int, float)):
                raise ValidationError(
                    f"La quantité vendue doit être un nombre, reçu: {type(quantite_vendue).__name__}"
                )
            
            if not isinstance(prix_vente_unitaire, (Decimal, int, float)):
                raise ValidationError(
                    f"Le prix de vente unitaire doit être un nombre, reçu: {type(prix_vente_unitaire).__name__}"
                )
            
            quantite_decimal = Decimal(str(quantite_vendue))
            prix_decimal = Decimal(str(prix_vente_unitaire))
            
            if quantite_decimal < 0:
                raise ValidationError(
                    f"La quantité vendue ne peut pas être négative. Quantité fournie: {quantite_decimal}"
                )
            
            if prix_decimal < 0:
                raise ValidationError(
                    f"Le prix de vente unitaire ne peut pas être négatif. Prix fourni: {prix_decimal}"
                )
            
            # Check consistency: revenu should equal quantite × prix
            calculated_revenu = quantite_decimal * prix_decimal
            difference = abs(revenu_decimal - calculated_revenu)
            
            if difference > tolerance:
                raise ValidationError(
                    f"Incohérence détectée: le revenu ({revenu_decimal} Ar) ne correspond pas "
                    f"au calcul quantité × prix ({calculated_revenu} Ar). "
                    f"Différence: {difference} Ar (tolérance: {tolerance} Ar)"
                )
        
        return True
