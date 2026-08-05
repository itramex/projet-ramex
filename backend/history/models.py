from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from producteurs.models import Producteur
from parcelles.models import Parcelle


class ProductionHistory(models.Model):
    """Historique des productions agricoles par parcelle et année"""
    
    # Relations
    parcelle = models.ForeignKey(
        Parcelle,
        on_delete=models.CASCADE,
        related_name='production_history',
        verbose_name="Parcelle"
    )
    
    # Données temporelles
    annee = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        verbose_name="Année"
    )
    
    # Données de production
    culture = models.CharField(
        max_length=50,
        verbose_name="Type de culture",
        help_text="vanille, cafe, girofle, etc."
    )
    quantite_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité produite (kg)"
    )
    prix_vente_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Prix de vente par kg (Ar)"
    )
    revenu_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Revenu total (Ar)"
    )
    
    # Métadonnées
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'enregistrement"
    )
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productions_enregistrees',
        verbose_name="Enregistré par"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
    )
    
    class Meta:
        unique_together = ('parcelle', 'annee', 'culture')
        ordering = ['-annee', 'parcelle']
        verbose_name = "Historique de production"
        verbose_name_plural = "Historiques de production"
        indexes = [
            models.Index(fields=['annee']),
            models.Index(fields=['parcelle', 'annee']),
            models.Index(fields=['culture', 'annee']),
        ]
    
    def __str__(self):
        return f"{self.parcelle.code_parcelle} - {self.culture} ({self.annee})"
    
    def save(self, *args, **kwargs):
        """Calculate revenu_total before saving"""
        if self.quantite_kg and self.prix_vente_kg:
            self.revenu_total = self.quantite_kg * self.prix_vente_kg
        super().save(*args, **kwargs)


class AGRHistory(models.Model):
    """Historique des revenus AGR par producteur et année"""
    
    TYPE_AGR_CHOICES = [
        ('pisciculture', 'Pisciculture'),
        ('aviculture', 'Aviculture'),
        ('autre', 'Autre'),
    ]
    
    # Relations
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='agr_history',
        verbose_name="Producteur"
    )
    
    # Données temporelles
    annee = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        verbose_name="Année"
    )
    
    # Type d'AGR
    type_agr = models.CharField(
        max_length=100,
        choices=TYPE_AGR_CHOICES,
        verbose_name="Type d'AGR"
    )
    ordre = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Ordre",
        help_text="AGR1, AGR2, etc."
    )
    
    # Données quantitatives
    quantite_produite = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité produite"
    )
    quantite_vendue = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité vendue"
    )
    quantite_consommee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité consommée"
    )
    prix_vente_unitaire = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Prix de vente unitaire (Ar)"
    )
    revenu_annuel = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Revenu annuel (Ar)"
    )
    
    # Métadonnées
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'enregistrement"
    )
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agr_enregistres',
        verbose_name="Enregistré par"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
    )
    
    class Meta:
        unique_together = ('producteur', 'annee', 'type_agr', 'ordre')
        ordering = ['-annee', 'producteur', 'ordre']
        verbose_name = "Historique AGR"
        verbose_name_plural = "Historiques AGR"
        indexes = [
            models.Index(fields=['annee']),
            models.Index(fields=['producteur', 'annee']),
            models.Index(fields=['type_agr', 'annee']),
        ]
    
    def __str__(self):
        return f"{self.producteur.code} - {self.get_type_agr_display()} AGR{self.ordre} ({self.annee})"
    
    def save(self, *args, **kwargs):
        """Calculate revenu_annuel if not provided"""
        if not self.revenu_annuel and self.quantite_vendue and self.prix_vente_unitaire:
            self.revenu_annuel = self.quantite_vendue * self.prix_vente_unitaire
        super().save(*args, **kwargs)


class SocialIndicatorHistory(models.Model):
    """Historique des indicateurs sociaux par producteur et année"""
    
    INDICATOR_TYPES = [
        ('scolarisation', 'Taux de scolarisation'),
        ('eau_potable', 'Accès eau potable'),
        ('sante', 'Accès aux soins'),
        ('habitat', 'Type de logement'),
        ('energie', 'Accès à l\'énergie'),
    ]
    
    # Relations
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='social_indicator_history',
        verbose_name="Producteur"
    )
    
    # Données temporelles
    annee = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        verbose_name="Année"
    )
    
    # Type d'indicateur
    type_indicateur = models.CharField(
        max_length=50,
        choices=INDICATOR_TYPES,
        verbose_name="Type d'indicateur"
    )
    
    # Valeur (peut être numérique, textuelle ou booléenne selon l'indicateur)
    valeur_numerique = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valeur numérique"
    )
    valeur_texte = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Valeur texte"
    )
    valeur_booleen = models.BooleanField(
        null=True,
        blank=True,
        verbose_name="Valeur booléenne"
    )
    
    # Métadonnées
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'enregistrement"
    )
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='indicateurs_enregistres',
        verbose_name="Enregistré par"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
    )
    
    class Meta:
        unique_together = ('producteur', 'annee', 'type_indicateur')
        ordering = ['-annee', 'producteur']
        verbose_name = "Historique d'indicateur social"
        verbose_name_plural = "Historiques d'indicateurs sociaux"
        indexes = [
            models.Index(fields=['annee']),
            models.Index(fields=['producteur', 'annee']),
            models.Index(fields=['type_indicateur', 'annee']),
        ]
    
    def __str__(self):
        return f"{self.producteur.code} - {self.get_type_indicateur_display()} ({self.annee})"


class AnnualSnapshot(models.Model):
    """Snapshot annuel des données pour référence"""
    
    # Données temporelles
    annee = models.PositiveIntegerField(
        unique=True,
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        verbose_name="Année"
    )
    
    # Statistiques agrégées
    nb_producteurs = models.IntegerField(
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de producteurs"
    )
    nb_parcelles = models.IntegerField(
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de parcelles"
    )
    production_totale_kg = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Production totale (kg)"
    )
    revenu_total_agr = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Revenu total AGR (Ar)"
    )
    
    # Métadonnées
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='snapshots_crees',
        verbose_name="Créé par"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )
    verrouille = models.BooleanField(
        default=False,
        verbose_name="Verrouillé",
        help_text="Un snapshot verrouillé ne peut plus être modifié"
    )
    
    class Meta:
        ordering = ['-annee']
        verbose_name = "Snapshot annuel"
        verbose_name_plural = "Snapshots annuels"
        indexes = [
            models.Index(fields=['annee']),
        ]
    
    def __str__(self):
        return f"Snapshot {self.annee}"
    
    def save(self, *args, **kwargs):
        """Prevent modification if locked"""
        if self.pk and self.verrouille:
            # Check if snapshot is already locked in database
            try:
                old_instance = AnnualSnapshot.objects.get(pk=self.pk)
                if old_instance.verrouille:
                    raise ValueError("Cannot modify a locked snapshot")
            except AnnualSnapshot.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class ProducteurSnapshot(models.Model):
    """Snapshot annuel d'un producteur lors de l'importation Excel"""
    
    # Relations
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='snapshots',
        verbose_name="Producteur"
    )
    
    # Année d'archivage
    annee = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        verbose_name="Année"
    )
    
    # ========== IDENTIFICATION ==========
    code = models.CharField(max_length=20, verbose_name="Code")
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, blank=True, verbose_name="Prénom")
    cin = models.CharField(max_length=15, blank=True, verbose_name="CIN")
    
    # ========== LOCALISATION ==========
    commune = models.CharField(max_length=100, verbose_name="Commune")
    fokontany = models.CharField(max_length=100, blank=True, verbose_name="Fokontany")
    village = models.CharField(max_length=100, blank=True, verbose_name="Village")
    
    # ========== CONTACT ==========
    telephone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    
    # ========== INFORMATIONS PERSONNELLES ==========
    sexe = models.CharField(max_length=1, verbose_name="Sexe")
    date_naissance = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    statut_matrimonial = models.CharField(max_length=20, blank=True, verbose_name="Statut matrimonial")
    niveau_education = models.CharField(max_length=20, blank=True, verbose_name="Niveau d'éducation")
    femme_leader = models.BooleanField(default=False, verbose_name="Femme leader")
    
    # ========== COOPÉRATIVE ==========
    cooperative_nom = models.CharField(max_length=200, blank=True, verbose_name="Nom de la coopérative")
    responsabilite_cooperative = models.CharField(max_length=30, blank=True, verbose_name="Responsabilité")
    date_adhesion_cooperative = models.DateField(null=True, blank=True, verbose_name="Date adhésion coop")
    date_adhesion_groupement = models.DateField(null=True, blank=True, verbose_name="Date adhésion groupement")
    membre_groupement_epargne = models.BooleanField(default=False, verbose_name="Membre VSLA")
    paysan_relais = models.BooleanField(default=False, verbose_name="Paysan relais")
    satellite_floraison = models.BooleanField(default=False, verbose_name="Satellite floraison")
    
    # ========== COMPOSITION DU FOYER ==========
    nb_adultes_plus_18 = models.IntegerField(default=0, verbose_name="Adultes 18+")
    nb_hommes_adultes = models.IntegerField(default=0, verbose_name="Hommes adultes")
    nb_femmes_adultes = models.IntegerField(default=0, verbose_name="Femmes adultes")
    nb_enfants_garcons = models.IntegerField(default=0, verbose_name="Garçons")
    nb_enfants_filles = models.IntegerField(default=0, verbose_name="Filles")
    nb_enfants_scolarises = models.IntegerField(default=0, verbose_name="Enfants scolarisés")
    nb_enfants_non_scolarises = models.IntegerField(default=0, verbose_name="Enfants non scolarisés")
    taux_scolarisation = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Taux scolarisation")
    
    # ========== SANTÉ & EAU ==========
    source_eau = models.CharField(max_length=20, blank=True, verbose_name="Source d'eau")
    type_centre_sante = models.CharField(max_length=20, blank=True, verbose_name="Type CSB")
    a_assurance_sante = models.BooleanField(default=False, verbose_name="Assurance santé")
    
    # ========== STATUT ==========
    actif = models.BooleanField(default=True, verbose_name="Actif")
    
    # ========== MÉTADONNÉES ==========
    date_enregistrement = models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteur_snapshots_enregistres',
        verbose_name="Enregistré par"
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    class Meta:
        unique_together = ('producteur', 'annee')
        ordering = ['-annee', 'producteur']
        verbose_name = "Snapshot Producteur"
        verbose_name_plural = "Snapshots Producteurs"
        indexes = [
            models.Index(fields=['annee']),
            models.Index(fields=['producteur', 'annee']),
            models.Index(fields=['commune', 'annee']),
            models.Index(fields=['cooperative_nom', 'annee']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.nom} ({self.annee})"
