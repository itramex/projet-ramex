"""
Serializers for the Annual History System

This module provides DRF serializers for historical data models,
including validation, nested relationships, and calculated fields.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import datetime
from drf_spectacular.utils import extend_schema_field, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .models import (
    ProductionHistory,
    AGRHistory,
    SocialIndicatorHistory,
    AnnualSnapshot,
    ProducteurSnapshot
)
from .validators import DataValidator
from producteurs.models import Producteur
from parcelles.models import Parcelle


class UserSerializer(serializers.ModelSerializer):
    """Serializer léger pour les informations utilisateur"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = fields


class ParcelleNestedSerializer(serializers.ModelSerializer):
    """Serializer léger pour les parcelles (nested)"""
    
    producteur_code = serializers.CharField(source='producteur.code', read_only=True)
    producteur_nom = serializers.CharField(source='producteur.nom', read_only=True)
    
    class Meta:
        model = Parcelle
        fields = [
            'id', 'code_parcelle', 'dimension_ha',
            'producteur', 'producteur_code', 'producteur_nom'
        ]
        read_only_fields = ['producteur_code', 'producteur_nom']


class ProducteurNestedSerializer(serializers.ModelSerializer):
    """Serializer léger pour les producteurs (nested)"""
    
    nom_complet = serializers.SerializerMethodField()
    
    class Meta:
        model = Producteur
        fields = ['id', 'code', 'nom', 'prenom', 'nom_complet', 'village']
        read_only_fields = fields
    
    def get_nom_complet(self, obj):
        """Retourne le nom complet du producteur"""
        return f"{obj.nom} {obj.prenom}".strip()


class ProductionHistorySerializer(serializers.ModelSerializer):
    """
    Serializer pour l'historique des productions agricoles.
    
    Gère la validation des données de production, les calculs automatiques
    de revenus, et les variations année par année.
    
    Requirements: 1.1, 1.4, 1.5
    """
    
    # Nested serializers pour affichage
    parcelle_info = ParcelleNestedSerializer(source='parcelle', read_only=True)
    enregistre_par_info = UserSerializer(source='enregistre_par', read_only=True)
    
    # Champs calculés (read-only)
    variation_annee_precedente = serializers.SerializerMethodField(read_only=True)
    revenu_calcule = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProductionHistory
        fields = [
            'id',
            'parcelle',
            'parcelle_info',
            'annee',
            'culture',
            'quantite_kg',
            'prix_vente_kg',
            'revenu_total',
            'revenu_calcule',
            'variation_annee_precedente',
            'date_enregistrement',
            'enregistre_par',
            'enregistre_par_info',
            'notes'
        ]
        read_only_fields = [
            'date_enregistrement',
            'enregistre_par_info',
            'variation_annee_precedente',
            'revenu_calcule'
        ]
    
    def get_revenu_calcule(self, obj):
        """Calcule le revenu total (quantité × prix)"""
        if obj.quantite_kg and obj.prix_vente_kg:
            return float(obj.quantite_kg * obj.prix_vente_kg)
        return None
    
    def get_variation_annee_precedente(self, obj):
        """
        Calcule la variation en pourcentage par rapport à l'année précédente.
        
        Returns:
            dict: {'annee_precedente': int, 'variation_pct': float, 'quantite_precedente': float}
            ou None si pas de données pour l'année précédente
        """
        try:
            # Chercher la production de l'année précédente pour la même parcelle et culture
            annee_precedente = obj.annee - 1
            production_precedente = ProductionHistory.objects.filter(
                parcelle=obj.parcelle,
                culture=obj.culture,
                annee=annee_precedente
            ).first()
            
            if production_precedente and production_precedente.quantite_kg:
                quantite_actuelle = float(obj.quantite_kg)
                quantite_precedente = float(production_precedente.quantite_kg)
                
                if quantite_precedente > 0:
                    variation_pct = ((quantite_actuelle - quantite_precedente) / quantite_precedente) * 100
                    
                    return {
                        'annee_precedente': annee_precedente,
                        'quantite_precedente': quantite_precedente,
                        'variation_pct': round(variation_pct, 2)
                    }
            
            return None
        except Exception:
            return None
    
    def validate_annee(self, value):
        """
        Valide que l'année est dans la plage acceptable.
        
        Requirements: 7.1
        """
        try:
            DataValidator.validate_year(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate_quantite_kg(self, value):
        """
        Valide que la quantité est positive.
        
        Requirements: 7.2
        """
        if value < 0:
            raise serializers.ValidationError(
                "La quantité ne peut pas être négative."
            )
        return value
    
    def validate_prix_vente_kg(self, value):
        """Valide que le prix de vente est positif"""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Le prix de vente ne peut pas être négatif."
            )
        return value
    
    def validate(self, data):
        """
        Validations croisées et calcul automatique du revenu.
        
        Requirements: 1.1, 7.2
        """
        # Valider la production avec DataValidator
        quantite = data.get('quantite_kg')
        culture = data.get('culture')
        prix_vente = data.get('prix_vente_kg')
        
        if quantite is not None and culture:
            try:
                DataValidator.validate_production(
                    quantite=quantite,
                    culture=culture,
                    prix_vente=prix_vente
                )
            except Exception as e:
                raise serializers.ValidationError({'culture': str(e)})
        
        # Calculer automatiquement le revenu_total si non fourni
        if quantite and prix_vente:
            calculated_revenu = quantite * prix_vente
            
            # Si revenu_total est fourni, vérifier la cohérence
            if 'revenu_total' in data and data['revenu_total'] is not None:
                difference = abs(data['revenu_total'] - calculated_revenu)
                if difference > Decimal('0.01'):
                    raise serializers.ValidationError({
                        'revenu_total': f"Le revenu total ({data['revenu_total']} Ar) ne correspond pas "
                                      f"au calcul quantité × prix ({calculated_revenu} Ar)."
                    })
            else:
                # Calculer automatiquement
                data['revenu_total'] = calculated_revenu
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['enregistre_par'] = request.user
        return super().create(validated_data)


class AGRHistorySerializer(serializers.ModelSerializer):
    """
    Serializer pour l'historique des revenus AGR.
    
    Gère la validation de la cohérence revenu = quantité × prix,
    et le calcul automatique du revenu annuel.
    
    Requirements: 2.1, 2.3
    """
    
    # Nested serializers pour affichage
    producteur_info = ProducteurNestedSerializer(source='producteur', read_only=True)
    enregistre_par_info = UserSerializer(source='enregistre_par', read_only=True)
    
    # Display fields
    type_agr_display = serializers.CharField(source='get_type_agr_display', read_only=True)
    
    # Champs calculés
    revenu_calcule = serializers.SerializerMethodField(read_only=True)
    # `revenu_annuel` est optionnel : le modèle le calcule (quantité × prix) au save().
    # Le rend writable serait incohérent avec la validation croisée dans validate().
    revenu_annuel = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False
    )
    
    class Meta:
        model = AGRHistory
        fields = [
            'id',
            'producteur',
            'producteur_info',
            'annee',
            'type_agr',
            'type_agr_display',
            'ordre',
            'quantite_produite',
            'quantite_vendue',
            'quantite_consommee',
            'prix_vente_unitaire',
            'revenu_annuel',
            'revenu_calcule',
            'date_enregistrement',
            'enregistre_par',
            'enregistre_par_info',
            'notes'
        ]
        read_only_fields = [
            'date_enregistrement',
            'enregistre_par_info',
            'type_agr_display',
            'revenu_calcule'
        ]
    
    def get_revenu_calcule(self, obj):
        """Calcule le revenu annuel (quantité vendue × prix unitaire)"""
        if obj.quantite_vendue and obj.prix_vente_unitaire:
            return float(obj.quantite_vendue * obj.prix_vente_unitaire)
        return None
    
    def validate_annee(self, value):
        """
        Valide que l'année est dans la plage acceptable.
        
        Requirements: 7.1
        """
        try:
            DataValidator.validate_year(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate_ordre(self, value):
        """Valide que l'ordre est positif"""
        if value < 1:
            raise serializers.ValidationError(
                "L'ordre doit être supérieur ou égal à 1."
            )
        return value
    
    def validate_quantite_produite(self, value):
        """Valide que la quantité produite est positive"""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "La quantité produite ne peut pas être négative."
            )
        return value
    
    def validate_quantite_vendue(self, value):
        """Valide que la quantité vendue est positive"""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "La quantité vendue ne peut pas être négative."
            )
        return value
    
    def validate_quantite_consommee(self, value):
        """Valide que la quantité consommée est positive"""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "La quantité consommée ne peut pas être négative."
            )
        return value
    
    def validate_prix_vente_unitaire(self, value):
        """Valide que le prix de vente unitaire est positif"""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Le prix de vente unitaire ne peut pas être négatif."
            )
        return value
    
    def validate_revenu_annuel(self, value):
        """Valide que le revenu annuel est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le revenu annuel ne peut pas être négatif."
            )
        return value
    
    def validate(self, data):
        """
        Validations croisées et calcul automatique du revenu.
        
        Vérifie la cohérence: revenu_annuel = quantite_vendue × prix_vente_unitaire
        
        Requirements: 2.3, 7.2
        """
        quantite_vendue = data.get('quantite_vendue')
        prix_vente_unitaire = data.get('prix_vente_unitaire')
        revenu_annuel = data.get('revenu_annuel')
        type_agr = data.get('type_agr')
        
        # Si quantité vendue et prix sont fournis
        if quantite_vendue is not None and prix_vente_unitaire is not None:
            calculated_revenu = quantite_vendue * prix_vente_unitaire
            
            # Si revenu_annuel est fourni, valider la cohérence
            if revenu_annuel is not None:
                try:
                    DataValidator.validate_agr_revenue(
                        revenu=revenu_annuel,
                        type_agr=type_agr,
                        quantite_vendue=quantite_vendue,
                        prix_vente_unitaire=prix_vente_unitaire,
                        tolerance=Decimal('0.01')
                    )
                except Exception as e:
                    raise serializers.ValidationError({'revenu_annuel': str(e)})
            else:
                # Calculer automatiquement le revenu
                data['revenu_annuel'] = calculated_revenu
        
        # Si revenu_annuel n'est toujours pas défini, erreur
        if 'revenu_annuel' not in data or data['revenu_annuel'] is None:
            if revenu_annuel is None:
                raise serializers.ValidationError({
                    'revenu_annuel': "Le revenu annuel doit être fourni ou calculable "
                                   "(quantité vendue × prix unitaire)."
                })
        
        # Valider le type d'AGR avec DataValidator
        if type_agr and revenu_annuel is not None:
            try:
                DataValidator.validate_agr_revenue(
                    revenu=data['revenu_annuel'],
                    type_agr=type_agr
                )
            except Exception as e:
                raise serializers.ValidationError({'type_agr': str(e)})
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['enregistre_par'] = request.user
        return super().create(validated_data)


class SocialIndicatorHistorySerializer(serializers.ModelSerializer):
    """
    Serializer pour l'historique des indicateurs sociaux.
    
    Gère les différents types de valeurs (numérique, texte, booléen)
    et la validation selon le type d'indicateur.
    
    Requirements: 3.1, 3.3
    """
    
    # Nested serializers pour affichage
    producteur_info = ProducteurNestedSerializer(source='producteur', read_only=True)
    enregistre_par_info = UserSerializer(source='enregistre_par', read_only=True)
    
    # Display fields
    type_indicateur_display = serializers.CharField(
        source='get_type_indicateur_display',
        read_only=True
    )
    
    # Champ calculé pour obtenir la valeur selon le type
    valeur = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = SocialIndicatorHistory
        fields = [
            'id',
            'producteur',
            'producteur_info',
            'annee',
            'type_indicateur',
            'type_indicateur_display',
            'valeur_numerique',
            'valeur_texte',
            'valeur_booleen',
            'valeur',
            'date_enregistrement',
            'enregistre_par',
            'enregistre_par_info',
            'notes'
        ]
        read_only_fields = [
            'date_enregistrement',
            'enregistre_par_info',
            'type_indicateur_display',
            'valeur'
        ]
    
    def get_valeur(self, obj):
        """
        Retourne la valeur appropriée selon le type d'indicateur.
        
        Returns:
            La valeur numérique, texte ou booléenne selon ce qui est défini
        """
        if obj.valeur_numerique is not None:
            return {
                'type': 'numerique',
                'valeur': float(obj.valeur_numerique)
            }
        elif obj.valeur_booleen is not None:
            return {
                'type': 'booleen',
                'valeur': obj.valeur_booleen
            }
        elif obj.valeur_texte:
            return {
                'type': 'texte',
                'valeur': obj.valeur_texte
            }
        return None
    
    def validate_annee(self, value):
        """
        Valide que l'année est dans la plage acceptable.
        
        Requirements: 7.1
        """
        try:
            DataValidator.validate_year(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate_valeur_numerique(self, value):
        """Valide que la valeur numérique est dans une plage acceptable"""
        if value is not None:
            # Pour la scolarisation, valider entre 0 et 100
            if value < 0 or value > 100:
                raise serializers.ValidationError(
                    "La valeur numérique doit être entre 0 et 100 (pourcentage)."
                )
        return value
    
    def validate(self, data):
        """
        Validations selon le type d'indicateur.
        
        Vérifie qu'exactement un type de valeur est fourni selon l'indicateur.
        
        Requirements: 3.1, 3.2
        """
        type_indicateur = data.get('type_indicateur')
        valeur_numerique = data.get('valeur_numerique')
        valeur_texte = data.get('valeur_texte')
        valeur_booleen = data.get('valeur_booleen')
        
        # Compter combien de valeurs sont définies
        valeurs_definies = sum([
            valeur_numerique is not None,
            bool(valeur_texte),
            valeur_booleen is not None
        ])
        
        if valeurs_definies == 0:
            raise serializers.ValidationError(
                "Au moins une valeur (numérique, texte ou booléenne) doit être fournie."
            )
        
        if valeurs_definies > 1:
            raise serializers.ValidationError(
                "Une seule valeur (numérique, texte ou booléenne) doit être fournie."
            )
        
        # Validation selon le type d'indicateur
        if type_indicateur == 'scolarisation':
            if valeur_numerique is None:
                raise serializers.ValidationError({
                    'valeur_numerique': "Le taux de scolarisation doit être une valeur numérique."
                })
        
        elif type_indicateur in ['eau_potable', 'sante']:
            if valeur_booleen is None:
                raise serializers.ValidationError({
                    'valeur_booleen': f"L'indicateur '{type_indicateur}' doit être une valeur booléenne (Oui/Non)."
                })
        
        elif type_indicateur in ['habitat', 'energie']:
            if not valeur_texte:
                raise serializers.ValidationError({
                    'valeur_texte': f"L'indicateur '{type_indicateur}' doit être une valeur texte."
                })
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['enregistre_par'] = request.user
        return super().create(validated_data)


class AnnualSnapshotSerializer(serializers.ModelSerializer):
    """
    Serializer pour les snapshots annuels.
    
    Gère l'immutabilité des snapshots verrouillés et les statistiques agrégées.
    
    Requirements: 4.1, 4.4
    """
    
    # Nested serializers pour affichage
    cree_par_info = UserSerializer(source='cree_par', read_only=True)
    
    # Champ calculé
    peut_modifier = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = AnnualSnapshot
        fields = [
            'id',
            'annee',
            'nb_producteurs',
            'nb_parcelles',
            'production_totale_kg',
            'revenu_total_agr',
            'date_creation',
            'cree_par',
            'cree_par_info',
            'description',
            'verrouille',
            'peut_modifier'
        ]
        read_only_fields = [
            'date_creation',
            'cree_par_info',
            'peut_modifier'
        ]
    
    def get_peut_modifier(self, obj):
        """
        Indique si le snapshot peut être modifié.
        
        Un snapshot verrouillé ne peut pas être modifié.
        
        Requirements: 4.3
        """
        return not obj.verrouille
    
    def validate_annee(self, value):
        """Valide que l'année est dans la plage acceptable"""
        try:
            DataValidator.validate_year(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate_nb_producteurs(self, value):
        """Valide que le nombre de producteurs est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le nombre de producteurs ne peut pas être négatif."
            )
        return value
    
    def validate_nb_parcelles(self, value):
        """Valide que le nombre de parcelles est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le nombre de parcelles ne peut pas être négatif."
            )
        return value
    
    def validate_production_totale_kg(self, value):
        """Valide que la production totale est positive"""
        if value < 0:
            raise serializers.ValidationError(
                "La production totale ne peut pas être négative."
            )
        return value
    
    def validate_revenu_total_agr(self, value):
        """Valide que le revenu total AGR est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le revenu total AGR ne peut pas être négatif."
            )
        return value
    
    def validate(self, data):
        """
        Validations pour les snapshots.
        
        Empêche la modification des snapshots verrouillés.
        
        Requirements: 4.3
        """
        # Si c'est une mise à jour (instance existe)
        if self.instance:
            if self.instance.verrouille:
                raise serializers.ValidationError(
                    "Impossible de modifier un snapshot verrouillé."
                )
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['cree_par'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Mise à jour avec vérification du verrouillage.
        
        Requirements: 4.3
        """
        if instance.verrouille:
            raise serializers.ValidationError(
                "Impossible de modifier un snapshot verrouillé."
            )
        return super().update(instance, validated_data)


class ProducteurSnapshotSerializer(serializers.ModelSerializer):
    """
    Serializer pour les snapshots annuels des producteurs.
    
    Gère l'affichage des données historiques des producteurs par année,
    avec des champs calculés pour faciliter l'analyse.
    
    Requirements: 7.1, 7.2, 7.3, 7.4
    """
    
    # Nested serializers pour affichage
    producteur_info = ProducteurNestedSerializer(source='producteur', read_only=True)
    enregistre_par_info = UserSerializer(source='enregistre_par', read_only=True)
    
    # Champs calculés (read-only)
    nom_complet = serializers.SerializerMethodField(read_only=True)
    age = serializers.SerializerMethodField(read_only=True)
    nb_enfants_total = serializers.SerializerMethodField(read_only=True)
    nb_adultes_total = serializers.SerializerMethodField(read_only=True)
    taille_menage = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProducteurSnapshot
        fields = [
            'id',
            'producteur',
            'producteur_info',
            'annee',
            # Identification
            'code',
            'nom',
            'prenom',
            'nom_complet',
            'cin',
            # Localisation
            'commune',
            'fokontany',
            'village',
            # Contact
            'telephone',
            'email',
            # Informations personnelles
            'sexe',
            'date_naissance',
            'age',
            'statut_matrimonial',
            'niveau_education',
            'femme_leader',
            # Coopérative
            'cooperative_nom',
            'responsabilite_cooperative',
            'date_adhesion_cooperative',
            'date_adhesion_groupement',
            'membre_groupement_epargne',
            'paysan_relais',
            'satellite_floraison',
            # Composition du foyer
            'nb_adultes_plus_18',
            'nb_hommes_adultes',
            'nb_femmes_adultes',
            'nb_enfants_garcons',
            'nb_enfants_filles',
            'nb_enfants_total',
            'nb_adultes_total',
            'taille_menage',
            'nb_enfants_scolarises',
            'nb_enfants_non_scolarises',
            'taux_scolarisation',
            # Santé & Eau
            'source_eau',
            'type_centre_sante',
            'a_assurance_sante',
            # Statut
            'actif',
            # Métadonnées
            'date_enregistrement',
            'enregistre_par',
            'enregistre_par_info',
            'notes'
        ]
        read_only_fields = [
            'date_enregistrement',
            'enregistre_par_info',
            'producteur_info',
            'nom_complet',
            'age',
            'nb_enfants_total',
            'nb_adultes_total',
            'taille_menage'
        ]
    
    def get_nom_complet(self, obj):
        """
        Retourne le nom complet du producteur.
        
        Returns:
            str: Nom et prénom combinés
        """
        if obj.prenom:
            return f"{obj.nom} {obj.prenom}".strip()
        return obj.nom
    
    def get_age(self, obj):
        """
        Calcule l'âge du producteur à l'année du snapshot.
        
        Returns:
            int: Âge en années, ou None si date de naissance non disponible
        """
        if obj.date_naissance:
            # Calculer l'âge à l'année du snapshot
            age = obj.annee - obj.date_naissance.year
            return age
        return None
    
    def get_nb_enfants_total(self, obj):
        """
        Calcule le nombre total d'enfants (garçons + filles).
        
        Returns:
            int: Nombre total d'enfants
        """
        return obj.nb_enfants_garcons + obj.nb_enfants_filles
    
    def get_nb_adultes_total(self, obj):
        """
        Calcule le nombre total d'adultes (hommes + femmes).
        
        Returns:
            int: Nombre total d'adultes
        """
        return obj.nb_hommes_adultes + obj.nb_femmes_adultes
    
    def get_taille_menage(self, obj):
        """
        Calcule la taille totale du ménage (adultes + enfants).
        
        Returns:
            int: Taille du ménage
        """
        nb_adultes = obj.nb_hommes_adultes + obj.nb_femmes_adultes
        nb_enfants = obj.nb_enfants_garcons + obj.nb_enfants_filles
        return nb_adultes + nb_enfants
    
    def validate_annee(self, value):
        """
        Valide que l'année est dans la plage acceptable.
        
        Requirements: 7.1
        """
        try:
            DataValidator.validate_year(value)
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate_code(self, value):
        """Valide que le code producteur n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Le code producteur ne peut pas être vide."
            )
        return value.strip()
    
    def validate_nom(self, value):
        """Valide que le nom n'est pas vide"""
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Le nom ne peut pas être vide."
            )
        return value.strip()
    
    def validate_sexe(self, value):
        """Valide que le sexe est M ou F"""
        if value not in ['M', 'F']:
            raise serializers.ValidationError(
                "Le sexe doit être 'M' (Masculin) ou 'F' (Féminin)."
            )
        return value
    
    def validate_taux_scolarisation(self, value):
        """Valide que le taux de scolarisation est entre 0 et 100"""
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Le taux de scolarisation doit être entre 0 et 100."
            )
        return value
    
    def validate_nb_enfants_garcons(self, value):
        """Valide que le nombre d'enfants garçons est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le nombre d'enfants garçons ne peut pas être négatif."
            )
        return value
    
    def validate_nb_enfants_filles(self, value):
        """Valide que le nombre d'enfants filles est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le nombre d'enfants filles ne peut pas être négatif."
            )
        return value
    
    def validate_nb_adultes_plus_18(self, value):
        """Valide que le nombre d'adultes est positif"""
        if value < 0:
            raise serializers.ValidationError(
                "Le nombre d'adultes ne peut pas être négatif."
            )
        return value
    
    def validate(self, data):
        """
        Validations croisées pour les snapshots de producteurs.
        
        Vérifie la cohérence des données familiales et de scolarisation.
        
        Requirements: 7.2
        """
        # Valider la cohérence des enfants scolarisés
        nb_enfants_scolarises = data.get('nb_enfants_scolarises', 0)
        nb_enfants_non_scolarises = data.get('nb_enfants_non_scolarises', 0)
        nb_enfants_garcons = data.get('nb_enfants_garcons', 0)
        nb_enfants_filles = data.get('nb_enfants_filles', 0)
        
        nb_enfants_total = nb_enfants_garcons + nb_enfants_filles
        nb_enfants_declares = nb_enfants_scolarises + nb_enfants_non_scolarises
        
        # Vérifier que le total des enfants scolarisés/non scolarisés ne dépasse pas le total
        if nb_enfants_declares > nb_enfants_total:
            raise serializers.ValidationError({
                'nb_enfants_scolarises': f"Le total des enfants scolarisés ({nb_enfants_scolarises}) "
                                        f"et non scolarisés ({nb_enfants_non_scolarises}) "
                                        f"ne peut pas dépasser le nombre total d'enfants ({nb_enfants_total})."
            })
        
        # Valider la cohérence du taux de scolarisation
        taux_scolarisation = data.get('taux_scolarisation', 0)
        if nb_enfants_total > 0:
            taux_calcule = (nb_enfants_scolarises / nb_enfants_total) * 100
            # Tolérance de 1% pour les arrondis
            if abs(taux_scolarisation - taux_calcule) > 1:
                raise serializers.ValidationError({
                    'taux_scolarisation': f"Le taux de scolarisation ({taux_scolarisation}%) "
                                        f"ne correspond pas au calcul "
                                        f"({nb_enfants_scolarises}/{nb_enfants_total} = {taux_calcule:.2f}%)."
                })
        
        # Valider la cohérence des adultes
        nb_hommes_adultes = data.get('nb_hommes_adultes', 0)
        nb_femmes_adultes = data.get('nb_femmes_adultes', 0)
        nb_adultes_plus_18 = data.get('nb_adultes_plus_18', 0)
        
        nb_adultes_total = nb_hommes_adultes + nb_femmes_adultes
        
        # Le total hommes + femmes ne doit pas dépasser nb_adultes_plus_18
        if nb_adultes_total > nb_adultes_plus_18:
            raise serializers.ValidationError({
                'nb_adultes_plus_18': f"Le nombre d'adultes 18+ ({nb_adultes_plus_18}) "
                                     f"ne peut pas être inférieur au total hommes ({nb_hommes_adultes}) "
                                     f"+ femmes ({nb_femmes_adultes}) = {nb_adultes_total}."
            })
        
        return data
    
    def create(self, validated_data):
        """Création avec traçabilité"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['enregistre_par'] = request.user
        return super().create(validated_data)
