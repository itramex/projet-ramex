from django.db.models import Count, Q
from producteurs.models import Producteur
from typing import Dict, Any

class DatabaseService:
    """Service pour exécuter des requêtes dans la base de données"""
    
    @staticmethod
    def count_producteurs() -> int:
        """Compte tous les producteurs"""
        return Producteur.objects.count()
    
    @staticmethod
    def count_producteurs_actifs() -> int:
        """Compte les producteurs actifs"""
        return Producteur.objects.filter(actif=True).count()
    
    @staticmethod
    def count_producteurs_inactifs() -> int:
        """Compte les producteurs inactifs"""
        return Producteur.objects.filter(actif=False).count()
    
    @staticmethod
    def list_villages() -> list:
        """Liste tous les villages uniques"""
        # order_by() neutralise le Meta.ordering du modèle : sans lui, Django
        # ajoute les colonnes d'ordre au SELECT DISTINCT et les doublons survivent.
        villages = Producteur.objects.order_by().values_list('village', flat=True).distinct()
        return list(villages)
    
    @staticmethod
    def search_producteur_by_name(name: str) -> list:
        """Recherche un producteur par nom"""
        producteurs = Producteur.objects.filter(
            Q(nom__icontains=name) | Q(prenom__icontains=name)
        )
        return list(producteurs.values('code', 'nom', 'prenom', 'telephone', 'village'))
    
    @staticmethod
    def get_statistics() -> Dict[str, Any]:
        """Retourne des statistiques générales"""
        total = Producteur.objects.count()
        actifs = Producteur.objects.filter(actif=True).count()
        inactifs = Producteur.objects.filter(actif=False).count()
        
        villages = Producteur.objects.values('village').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return {
            'total_producteurs': total,
            'producteurs_actifs': actifs,
            'producteurs_inactifs': inactifs,
            'pourcentage_actifs': round((actifs / total * 100) if total > 0 else 0, 2),
            'top_villages': list(villages)
        }
    
    @staticmethod
    def count_producteurs_par_village(village: str) -> int:
        """Compte les producteurs d'un village (recherche insensible à la casse)"""
        if not village:
            return 0
        return Producteur.objects.filter(village__icontains=village).count()
    
    @staticmethod
    def count_producteurs_par_sexe(sexe: str) -> int:
        """Compte les producteurs par genre ('M' ou 'F')"""
        return Producteur.objects.filter(sexe=sexe).count()
    
    @staticmethod
    def list_producteurs_par_village(village: str) -> list:
        """Liste les producteurs d'un village (recherche insensible à la casse)"""
        if not village:
            return []
        producteurs = Producteur.objects.filter(village__icontains=village)
        return list(producteurs.values('code', 'nom', 'prenom', 'telephone', 'village'))
    
    @staticmethod
    def list_producteurs(limit: int = 10) -> list:
        """Liste les premiers producteurs (10 par défaut)"""
        return list(
            Producteur.objects.values('code', 'nom', 'prenom', 'telephone', 'village')[:limit]
        )
