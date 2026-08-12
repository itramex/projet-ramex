from django.db import models
from django.contrib.auth.models import User
from cooperatives.models import Cooperative
from producteurs.models import Producteur


class PartenaireDD(models.Model):
    """Partenaire de mise en œuvre du Développement Durable"""
    
    TYPE_PARTENAIRE_CHOICES = [
        ('autorite_locale', 'Autorité locale'),
        ('ong', 'ONG'),
        ('partenaire_technique', 'Partenaire technique'),
    ]
    
    nom = models.CharField(max_length=200, verbose_name="Nom du partenaire")
    type = models.CharField(
        max_length=30,
        choices=TYPE_PARTENAIRE_CHOICES,
        verbose_name="Type de partenaire"
    )
    contact = models.CharField(max_length=200, blank=True, verbose_name="Personne de contact")
    telephone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    adresse = models.CharField(max_length=200, blank=True, verbose_name="Adresse")
    description = models.TextField(blank=True, verbose_name="Description")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partenaires_dd_crees',
        verbose_name="Créé par"
    )
    
    class Meta:
        verbose_name = "Partenaire Développement Durable"
        verbose_name_plural = "Partenaires Développement Durable"
        ordering = ['nom']
        indexes = [
            models.Index(fields=['type']),
            models.Index(fields=['actif']),
        ]
    
    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"


class ActiviteDD(models.Model):
    """Activité de Développement Durable"""
    
    TYPE_ACTIVITE_CHOICES = [
        ('reboisement', 'Reboisement'),
        ('convention_partenariat', 'Convention de partenariat'),
        ('pepiniere', 'Production de jeunes plants / pépinière'),
        ('sensibilisation', 'Séance de sensibilisation'),
        ('formation', 'Formation'),
        ('audit_interne', 'Audit interne'),
        ('audit_externe', 'Audit externe'),
    ]
    
    OBJECTIF_CLIENT_CHOICES = [
        ('resilience', 'Résilience des producteurs'),
        ('autonomisation_femmes', 'Autonomisation des femmes'),
        ('droits_humains', 'Droits humains (lutte contre le travail des enfants)'),
        ('biodiversite', 'Préservation de la biodiversité'),
        ('environnement', 'Protection de l\'environnement'),
        ('autre', 'Autre'),
    ]
    
    type_activite = models.CharField(
        max_length=30,
        choices=TYPE_ACTIVITE_CHOICES,
        verbose_name="Type d'activité"
    )
    date = models.DateField(verbose_name="Date de l'activité")
    
    # Relations
    cooperative = models.ForeignKey(
        Cooperative,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_dd',
        verbose_name="Coopérative concernée"
    )
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_dd',
        verbose_name="Producteur concerné"
    )
    partenaire = models.ForeignKey(
        PartenaireDD,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_dd',
        verbose_name="Partenaire impliqué"
    )
    
    # Objectifs et description
    objectif_client = models.CharField(
        max_length=50,
        choices=OBJECTIF_CLIENT_CHOICES,
        default='autre',
        verbose_name="Objectif client"
    )
    description = models.TextField(verbose_name="Description de l'activité")
    resultat = models.TextField(blank=True, verbose_name="Résultat obtenu")
    nombre_participants = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de participants"
    )
    notes = models.TextField(blank=True, verbose_name="Notes complémentaires")
    
    # Responsable RAMEX
    responsable = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_dd_responsables',
        verbose_name="Agent RAMEX responsable"
    )
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_dd_crees',
        verbose_name="Créé par"
    )
    
    class Meta:
        verbose_name = "Activité Développement Durable"
        verbose_name_plural = "Activités Développement Durable"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['type_activite']),
            models.Index(fields=['date']),
            models.Index(fields=['cooperative']),
            models.Index(fields=['objectif_client']),
        ]
    
    def __str__(self):
        return f"{self.get_type_activite_display()} - {self.date} ({self.cooperative.nom if self.cooperative else 'Général'})"