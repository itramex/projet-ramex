from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone


class CooperativeManager(models.Manager):
    """Manager personnalisé pour les coopératives"""
    
    def actives(self):
        return self.filter(active=True)
    
    def inactives(self):
        return self.filter(active=False)


class Cooperative(models.Model):
    """Modèle pour les coopératives"""
    
    # Informations de base
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Code coopérative",
        help_text="Code unique de la coopérative (ex: COOP001)"
    )
    nom = models.CharField(max_length=200, verbose_name="Nom de la coopérative")
    sigle = models.CharField(max_length=20, blank=True, verbose_name="Sigle")
    
    # Localisation
    region = models.CharField(max_length=100, blank=True, verbose_name="Région", null=True)
    district = models.CharField(max_length=100, blank=True, verbose_name="District", null=True)
    commune = models.CharField(max_length=100, verbose_name="Commune", null=True)
    fokontany = models.CharField(max_length=100, blank=True, verbose_name="Fokontany", null=True)
    village = models.CharField(max_length=100, verbose_name="Village", null=True)
    
    # Contact
    telephone_validator = RegexValidator(
        regex=r'^\+?261\d{9,10}$',
        message="Le numéro doit être au format: +261XXXXXXXXX"
    )
    telephone = models.CharField(
        max_length=15,
        validators=[telephone_validator],
        blank=True,
        verbose_name="Téléphone",
        null=True
    )
    email = models.EmailField(blank=True, verbose_name="Email", null=True)
    
    # Informations administratives
    numero_agrement = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro d'agrément"
    )
    date_creation = models.DateField(
        default=timezone.now,
        verbose_name="Date de création",
        help_text="Date de création officielle de la coopérative",

    )
    date_agrement = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date d'agrément"
    )
    
    # Membres
    nombre_membres = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de membres"
    )
    nombre_hommes = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre d'hommes"
    )
    nombre_femmes = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de femmes"
    )
    
    # Responsables
    president_nom = models.CharField(max_length=200, blank=True, verbose_name="Nom du président")
    president_telephone = models.CharField(max_length=15, blank=True, verbose_name="Téléphone président")
    
    secretaire_nom = models.CharField(max_length=200, blank=True, verbose_name="Nom du secrétaire")
    secretaire_telephone = models.CharField(max_length=15, blank=True, verbose_name="Téléphone secrétaire")
    
    tresorier_nom = models.CharField(max_length=200, blank=True, verbose_name="Nom du trésorier")
    tresorier_telephone = models.CharField(max_length=15, blank=True, verbose_name="Téléphone trésorier")
    
    # Informations supplémentaires
    description = models.TextField(blank=True, verbose_name="Description")
    objectifs = models.TextField(blank=True, verbose_name="Objectifs")
    annee_creation = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Année de création"
    )
    
    # Statut
    active = models.BooleanField(default=True, verbose_name="Active")
    certifiee = models.BooleanField(default=False, verbose_name="Certifiée")
    type_certification = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('bio', 'Agriculture Biologique'),
            ('commerce_equitable', 'Commerce Équitable'),
            ('rainforest', 'Rainforest Alliance'),
            ('autre', 'Autre'),
        ],
        verbose_name="Type de certification"
    )
    
    # Logo/Photo
    logo = models.ImageField(
        upload_to='cooperatives/logos/',
        blank=True,
        null=True,
        verbose_name="Logo"
    )
    
    # Traçabilité - ✅ AVEC VALEURS PAR DÉFAUT
    date_enregistrement = models.DateTimeField(
        default=timezone.now,  # ✅ Changé de auto_now_add=True
        verbose_name="Date d'enregistrement"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,  # ✅ Ajouté blank=True
        related_name='cooperatives_creees',
        verbose_name="Créé par"
    )
    modifie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cooperatives_modifiees',
        verbose_name="Modifié par"
    )
    
    objects = CooperativeManager()
    
    class Meta:
        verbose_name = "Coopérative"
        verbose_name_plural = "Coopératives"
        ordering = ['-date_enregistrement']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['commune']),
            models.Index(fields=['active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.nom}"
    
    @property
    def nombre_producteurs(self):
        """Retourne le nombre de producteurs actifs de la coopérative"""
        return self.producteur_set.filter(actif=True).count()
    
    @property
    def adresse_complete(self):
        """Retourne l'adresse complète"""
        parts = [self.village, self.commune, self.district, self.region]
        return ", ".join([p for p in parts if p])
    
    def save(self, *args, **kwargs):
        # Calculer automatiquement le nombre de membres
        if self.nombre_hommes or self.nombre_femmes:
            self.nombre_membres = (self.nombre_hommes or 0) + (self.nombre_femmes or 0)
        super().save(*args, **kwargs)
