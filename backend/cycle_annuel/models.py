from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ==================== PHASE AGRICOLE (référentiel du calendrier) ====================

class PhaseAgricole(models.Model):
    """
    Phase / fenêtre métier du calendrier agricole annuel (référentiel).
    Décrit une étape récurrente : floraison, récolte vanille verte/préparée,
    géoréférencement, formations, audits, expédition, activités DD...
    """
    PILIER_CHOICES = [
        ('tracabilite', 'Traçabilité'),
        ('certification', 'Certification'),
        ('developpement_durable', 'Développement Durable'),
    ]

    TYPE_PHASE_CHOICES = [
        ('floraison', 'Floraison'),
        ('recolte_verte', 'Récolte vanille verte'),
        ('recolte_preparee', 'Récolte vanille préparée'),
        ('georeferencement', 'Géoréférencement GPS'),
        ('formation', 'Formation'),
        ('controle_interne', 'Contrôle interne'),
        ('audit_interne', 'Audit interne'),
        ('expedition', 'Expédition'),
        ('reboisement', 'Reboisement'),
        ('convention', 'Convention / partenariat'),
        ('pepiniere', 'Pépinière'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Code de la phase")
    nom = models.CharField(max_length=200, verbose_name="Nom de la phase")

    pilier = models.CharField(max_length=30, choices=PILIER_CHOICES, verbose_name="Pilier")
    type_phase = models.CharField(max_length=30, choices=TYPE_PHASE_CHOICES, verbose_name="Type de phase")

    mois_debut = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name="Mois début (1-12)"
    )
    mois_fin = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name="Mois fin (1-12)"
    )
    cycle_croise = models.BooleanField(
        default=False,
        verbose_name="Cycle chevauchant l'année",
        help_text="True si la fenêtre dépasse décembre (ex: Nov-Déc formation 2e cycle)"
    )
    toute_annee = models.BooleanField(default=False, verbose_name="Fenêtre étalée toute l'année")

    couleur = models.CharField(max_length=20, default='#2563eb', verbose_name="Couleur (hex)")
    ordre = models.IntegerField(default=0, verbose_name="Ordre d'affichage")
    description = models.TextField(blank=True)

    actif = models.BooleanField(default=True, verbose_name="Actif")

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['pilier', 'ordre', 'mois_debut', 'nom']
        verbose_name = "Phase agricole"
        verbose_name_plural = "Phases agricoles"

    def __str__(self):
        return f"{self.nom} ({self.mois_debut}-{self.mois_fin})"

    def mois_actifs(self):
        """Liste des mois (1-12) où la phase est active."""
        if self.toute_annee:
            return list(range(1, 13))
        start, end = self.mois_debut, self.mois_fin
        if self.cycle_croise or end < start:
            return list(range(start, 13)) + list(range(1, end + 1))
        return list(range(start, end + 1))
# ==================== PHASE PLANIFIÉE PAR CAMPAGNE ====================

class PhaseCampagne(models.Model):
    """Planification d'une phase pour une campagne donnée (cycle annuel sur la saison)."""
    STATUT_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    campagne = models.ForeignKey(
        'tracabilite.Campagne',
        on_delete=models.CASCADE,
        related_name='phases_planifiees',
        verbose_name="Campagne"
    )
    phase = models.ForeignKey(
        PhaseAgricole,
        on_delete=models.PROTECT,
        related_name='campagnes_phase',
        verbose_name="Phase agricole"
    )

    date_debut = models.DateField(verbose_name="Début réel")
    date_fin = models.DateField(verbose_name="Fin réelle")

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifiee')

    objectif = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        verbose_name="Objectif (quantité/valeur)"
    )
    realise = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        verbose_name="Réalisé"
    )
    responsable = models.CharField(max_length=100, blank=True, verbose_name="Responsable")
    observations = models.TextField(blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_debut', 'phase__ordre']
        verbose_name = "Phase planifiée (campagne)"
        verbose_name_plural = "Phases planifiées (campagne)"
        unique_together = ['campagne', 'phase']

    def __str__(self):
        return f"{self.campagne.code} — {self.phase.nom}"

    @property
    def taux_realisation(self):
        if self.objectif:
            return round(float(self.realise or 0) / float(self.objectif) * 100, 2)
        return None


# ==================== INDICATEUR DE CAMPAGNE (rapports) ====================

class IndicateurCampagne(models.Model):
    """Indicateur clé d'une campagne (objectif/valeur) pour les rapports annuels."""
    TYPE_CHOICES = [
        ('quantite', 'Quantité (kg)'),
        ('montant', 'Montant (Ar)'),
        ('valeur', 'Valeur (USD)'),
        ('nombre', 'Nombre'),
        ('taux', 'Taux (%)'),
        ('texte', 'Texte'),
    ]

    campagne = models.ForeignKey(
        'tracabilite.Campagne',
        on_delete=models.CASCADE,
        related_name='indicateurs',
        verbose_name="Campagne"
    )
    libelle = models.CharField(max_length=200, verbose_name="Libellé de l'indicateur")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='quantite')
    objectif = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Objectif"
    )
    realise = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Réalisé"
    )
    pilier = models.CharField(
        max_length=30, choices=PhaseAgricole.PILIER_CHOICES, default='tracabilite',
        verbose_name="Pilier"
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['campagne', 'pilier', 'id']
        verbose_name = "Indicateur de campagne"
        verbose_name_plural = "Indicateurs de campagne"

    def __str__(self):
        return f"{self.campagne.code} — {self.libelle}"

    @property
    def taux_realisation(self):
        if self.objectif:
            return round(float(self.realise or 0) / float(self.objectif) * 100, 2)
        return None