# recommandations/models.py
from django.db import models
from django.utils import timezone
from producteurs.models import Producteur
from django.contrib.auth.models import User

class Recommendation(models.Model):
    """Modèle pour stocker les recommandations IA"""
    
    STATUT_CHOICES = [
        ('pending', 'En attente'),
        ('executed', 'Exécutée'),
        ('rejected', 'Rejetée'),
    ]
    
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    
    type_activite = models.CharField(
        max_length=100,
        verbose_name="Type d'activité"
    )
    
    description = models.TextField(
        verbose_name="Description de la recommandation"
    )
    
    score_pertinence = models.FloatField(
        verbose_name="Score de pertinence (0-1)",
        help_text="Score calculé par l'IA"
    )
    
    explication = models.TextField(
        verbose_name="Explication de la recommandation",
        blank=True
    )
    
    date_generation = models.DateTimeField(
        default=timezone.now,
        verbose_name="Date de génération"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='pending'
    )
    
    date_execution = models.DateTimeField(
        null=True,
        blank=True
    )
    
    sources = models.JSONField(
        default=list,
        verbose_name="Producteurs sources",
        help_text="Liste des producteurs similaires ayant inspiré cette recommandation"
    )
    
    class Meta:
        ordering = ['-date_generation', '-score_pertinence']
        verbose_name = "Recommandation"
        verbose_name_plural = "Recommandations"
        indexes = [
            models.Index(fields=['producteur', 'statut']),
            models.Index(fields=['date_generation']),
        ]
    
    def __str__(self):
        return f"Recommandation pour {self.producteur.nom} - {self.type_activite} (Score: {self.score_pertinence:.2f})"
    
    def get_score_display(self):
        """Retourne le score sur 10"""
        return round(self.score_pertinence * 10, 1)


class Activite(models.Model):
    """Modèle pour stocker les activités réalisées (historique)"""
    
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='activites'
    )
    
    type = models.CharField(
        max_length=100,
        verbose_name="Type d'activité"
    )
    
    description = models.TextField(
        verbose_name="Description"
    )
    
    date = models.DateField(
        verbose_name="Date de réalisation"
    )
    
    impact_score = models.FloatField(
        verbose_name="Score d'impact (0-10)",
        help_text="Évaluation de l'efficacité de l'activité"
    )
    
    cout = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Coût (Ar)"
    )
    
    resultats = models.TextField(
        blank=True,
        verbose_name="Résultats obtenus"
    )
    
    class Meta:
        ordering = ['-date']
        verbose_name = "Activité"
        verbose_name_plural = "Activités"
    
    def __str__(self):
        return f"{self.type} - {self.producteur.nom} ({self.date})"


class MahavelonaArchive(models.Model):
    """Archive annuelle des critères Mahavelona."""
    annee_reference = models.PositiveIntegerField(verbose_name="Année de référence")
    criteres_version = models.CharField(max_length=50, verbose_name="Version critères")
    archive_json = models.JSONField(default=dict, verbose_name="Archive JSON")
    date_creation = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mahavelona_archives_creees'
    )

    class Meta:
        ordering = ['-annee_reference', '-date_creation']
        verbose_name = "Archive Mahavelona"
        verbose_name_plural = "Archives Mahavelona"
        indexes = [
            models.Index(fields=['annee_reference', 'criteres_version']),
        ]

    def __str__(self):
        return f"Mahavelona {self.annee_reference} - {self.criteres_version}"
