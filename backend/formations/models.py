from django.db import models
from django.contrib.auth.models import User
from producteurs.models import Producteur

class TypeFormation(models.Model):
    """Catalogue des types de formations disponibles"""
    nom = models.CharField(max_length=200, unique=True, verbose_name="Nom de la formation")
    description = models.TextField(blank=True, verbose_name="Description")
    duree_jours = models.IntegerField(default=1, verbose_name="Durée (jours)")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Type de Formation"
        verbose_name_plural = "Types de Formations"
        ordering = ['nom']
    
    def __str__(self):
        return self.nom


class Formation(models.Model):
    """Formations suivies par les producteurs"""
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='formations',
        verbose_name="Producteur"
    )
    type_formation = models.ForeignKey(
        TypeFormation,
        on_delete=models.PROTECT,
        related_name='formations',
        verbose_name="Type de formation"
    )
    date_formation = models.DateField(verbose_name="Date de la formation")
    lieu = models.CharField(max_length=200, blank=True, verbose_name="Lieu")
    organisme = models.CharField(max_length=200, blank=True, verbose_name="Organisme formateur")
    certificat_obtenu = models.BooleanField(default=False, verbose_name="Certificat obtenu")
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Traçabilité
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='formations_enregistrees'
    )
    
    class Meta:
        verbose_name = "Formation"
        verbose_name_plural = "Formations"
        ordering = ['-date_formation']
        indexes = [
            models.Index(fields=['producteur', 'date_formation']),
        ]
    
    def __str__(self):
        return f"{self.producteur.code} - {self.type_formation.nom} ({self.date_formation})"


class TypeCertification(models.Model):
    """Catalogue des types de certifications disponibles"""
    
    NIVEAU_CHOICES = [
        ('bio', 'BIO'),
        ('fair_trade', 'Fair Trade'),
        ('rainforest', 'Rainforest Alliance'),
        ('uebt', 'UEBT'),
        ('g4g', 'Good4Good'),
        ('ffl', 'FFL'),
        ('pact', 'PACT'),
        ('autre', 'Autre'),
    ]
    
    nom = models.CharField(max_length=200, unique=True, verbose_name="Nom de la certification")
    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    niveau = models.CharField(
        max_length=50,
        choices=NIVEAU_CHOICES,
        default='autre',
        verbose_name="Niveau/Type"
    )
    description = models.TextField(blank=True, verbose_name="Description")
    organisme_certificateur = models.CharField(max_length=200, blank=True, verbose_name="Organisme certificateur")
    duree_validite_ans = models.IntegerField(default=1, verbose_name="Durée de validité (ans)")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Type de Certification"
        verbose_name_plural = "Types de Certifications"
        ordering = ['nom']
    
    def __str__(self):
        return f"{self.nom} ({self.code})"


class Certification(models.Model):
    """Certifications obtenues par les producteurs et/ou coopératives"""
    
    STATUT_CHOICES = [
        ('valide', 'Valide'),
        ('expire', 'Expiré'),
        ('en_cours', 'En cours d\'obtention'),
        ('suspendu', 'Suspendu'),
    ]
    
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='certifications',
        verbose_name="Producteur"
    )
    cooperative = models.ForeignKey(
        'cooperatives.Cooperative',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='certifications',
        verbose_name="Coopérative"
    )
    type_certification = models.ForeignKey(
        TypeCertification,
        on_delete=models.PROTECT,
        related_name='certifications',
        verbose_name="Type de certification"
    )
    numero_certificat = models.CharField(max_length=100, blank=True, verbose_name="Numéro de certificat")
    date_obtention = models.DateField(verbose_name="Date d'obtention")
    date_expiration = models.DateField(verbose_name="Date d'expiration")
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='valide',
        verbose_name="Statut"
    )
    fichier_certificat = models.FileField(
        upload_to='certifications/',
        blank=True,
        null=True,
        verbose_name="Fichier du certificat"
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Traçabilité
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='certifications_enregistrees'
    )
    date_modification = models.DateTimeField(auto_now=True)
    modifie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certifications_modifiees'
    )
    
    class Meta:
        verbose_name = "Certification"
        verbose_name_plural = "Certifications"
        ordering = ['-date_obtention']
        indexes = [
            models.Index(fields=['producteur', 'statut']),
            models.Index(fields=['cooperative', 'statut']),
            models.Index(fields=['date_expiration']),
            models.Index(fields=['date_obtention']),
        ]
    
    def __str__(self):
        sujet = self.producteur.code if self.producteur else (self.cooperative.nom if self.cooperative else 'Entité')
        return f"{sujet} - {self.type_certification.nom} ({self.statut})"
    
    @property
    def entite_label(self):
        """Libellé de l'entité certifiée (producteur ou coopérative)."""
        if self.producteur:
            return f"Producteur: {self.producteur.nom_complet} ({self.producteur.code})"
        if self.cooperative:
            return f"Coopérative: {self.cooperative.nom}"
        return "Non spécifié"
    
    @property
    def est_valide(self):
        """Vérifie si la certification est encore valide"""
        from django.utils import timezone
        return self.statut == 'valide' and self.date_expiration >= timezone.now().date()
    
    def clean(self):
        """Au moins un producteur OU une coopérative doit être renseigné."""
        from django.core.exceptions import ValidationError
        if not self.producteur and not self.cooperative:
            raise ValidationError("Une certification doit être attachée à un producteur ou à une coopérative.")
    
    def save(self, *args, **kwargs):
        """Auto-mise à jour du statut selon la date d'expiration"""
        from django.utils import timezone
        if self.date_expiration < timezone.now().date() and self.statut == 'valide':
            self.statut = 'expire'
        super().save(*args, **kwargs)


class AuditCertification(models.Model):
    RESULTAT_CHOICES = [
        ('conforme', 'Conforme'),
        ('non_conforme', 'Non conforme'),
        ('observations', 'Avec observations'),
    ]

    type_certification = models.ForeignKey(
        TypeCertification,
        on_delete=models.PROTECT,
        related_name='audits',
        verbose_name="Type de certification"
    )
    date_audit = models.DateField(verbose_name="Date d'audit")
    organisme = models.CharField(max_length=200, blank=True, verbose_name="Organisme d'audit")
    resultat = models.CharField(max_length=20, choices=RESULTAT_CHOICES, verbose_name="Résultat")
    rapport_fichier = models.FileField(upload_to='audits/', blank=True, null=True, verbose_name="Rapport d'audit")
    resume = models.TextField(blank=True, verbose_name="Résumé/constats")

    date_enregistrement = models.DateTimeField(auto_now_add=True)
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audits_crees')

    class Meta:
        verbose_name = "Audit de Certification"
        verbose_name_plural = "Audits de Certification"
        ordering = ['-date_audit']
        indexes = [
            models.Index(fields=['type_certification', 'date_audit']),
        ]

    def __str__(self):
        return f"{self.type_certification.code} - {self.date_audit} ({self.resultat})"


class NonConformite(models.Model):
    TYPE_CHOICES = [
        ('mineure', 'Mineure'),
        ('majeure', 'Majeure'),
        ('critique', 'Critique'),
    ]
    STATUT_CHOICES = [
        ('ouverte', 'Ouverte'),
        ('en_cours', 'En cours'),
        ('resolue', 'Résolue'),
    ]

    audit = models.ForeignKey(
        AuditCertification,
        on_delete=models.CASCADE,
        related_name='nonconformites',
        verbose_name="Audit"
    )
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nonconformites',
        verbose_name="Producteur concerné"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mineure', verbose_name="Type")
    description = models.TextField(verbose_name="Description")
    action_corrective = models.TextField(blank=True, verbose_name="Action corrective")
    date_limite = models.DateField(null=True, blank=True, verbose_name="Date limite")
    date_resolution = models.DateField(null=True, blank=True, verbose_name="Date de résolution")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ouverte', verbose_name="Statut")
    fichier_preuve = models.FileField(upload_to='audits/preuves/', blank=True, null=True, verbose_name="Preuve")

    date_enregistrement = models.DateTimeField(auto_now_add=True)
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='nonconformites_creees')

    class Meta:
        verbose_name = "Non-conformité"
        verbose_name_plural = "Non-conformités"
        ordering = ['-date_enregistrement']
        indexes = [
            models.Index(fields=['statut']),
            models.Index(fields=['date_limite']),
        ]

    def __str__(self):
        ref = f"{self.audit_id}"
        return f"NC {ref} - {self.type} ({self.statut})"


class ActiviteCertification(models.Model):
    """
    Activités de mise en œuvre de la certification (pilier Certification).

    Exemples : sensibilisation, formation, audit interne, audit externe.
    Peut concerner une coopérative, un producteur ou un groupe.
    """

    TYPE_ACTIVITE_CHOICES = [
        ('sensibilisation', 'Sensibilisation'),
        ('formation', 'Formation'),
        ('audit_interne', 'Audit interne'),
        ('audit_externe', 'Audit externe'),
    ]

    type_activite = models.CharField(
        max_length=30,
        choices=TYPE_ACTIVITE_CHOICES,
        verbose_name="Type d'activité"
    )
    date = models.DateField(verbose_name="Date de l'activité")

    # Contexte
    type_certification = models.ForeignKey(
        TypeCertification,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites',
        verbose_name="Type de certification lié"
    )
    cooperative = models.ForeignKey(
        'cooperatives.Cooperative',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_certification',
        verbose_name="Coopérative concernée"
    )
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_certification',
        verbose_name="Producteur concerné"
    )

    # Contenu & résultats
    description = models.TextField(blank=True, verbose_name="Description / thèmes abordés")
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
        related_name='activites_certification_responsables',
        verbose_name="Agent RAMEX responsable"
    )

    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activites_certification_crees',
        verbose_name="Créé par"
    )

    class Meta:
        verbose_name = "Activité de certification"
        verbose_name_plural = "Activités de certification"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['type_activite']),
            models.Index(fields=['date']),
            models.Index(fields=['cooperative', 'date']),
        ]

    def __str__(self):
        sujet = self.cooperative.nom if self.cooperative else (
            self.producteur.code if self.producteur else 'Général'
        )
        return f"{self.get_type_activite_display()} - {self.date} ({sujet})"
