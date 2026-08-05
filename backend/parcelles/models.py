from django.contrib.gis.db import models as gis_models
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from producteurs.models import Producteur


class ParcelleManager(models.Manager):
    """Manager personnalisé pour les parcelles"""
    def actives(self):
        return self.filter(active=True)
    
    def avec_geolocalisation(self):
        """Parcelles avec coordonnées GPS"""
        return self.filter(point__isnull=False)


class Parcelle(models.Model):
    """Modèle pour les parcelles de vanille avec support PostGIS"""
    
    TYPE_PROPRIETE_CHOICES = [
        ('terrain_propre', 'Terrain propre'),
        ('terrain_loue', 'Terrain loué'),
        ('les_deux', 'Les deux'),
    ]
    
    PROFIL_PARCELLE_CHOICES = [
        ('en_pente', 'En pente'),
        ('parc_naturel', 'À proximité d\'un Parc Naturel'),
        ('reserve_naturelle', 'À proximité d\'une Réserve Naturelle'),
        ('zone_tampon', 'Dans une zone tampon'),
        ('source_eau', 'À proximité d\'une source d\'eau'),
    ]
    
    TYPE_VANILLE_CHOICES = [
        ('planifolia', 'Planifolia'),
        ('tahitensis', 'Tahitensis'),
        ('pompona', 'Pompona'),
    ]
    
    CULTURE_PRINCIPALE_CHOICES = [
        ('vanille', 'Vanille'),
        ('cafe', 'Café'),
        ('girofle', 'Girofle'),
        ('autre', 'Autre'),
    ]
    
    CERTIFICATION_CHOICES = [
        ('g4g', 'G4G'),
        ('ra', 'Rainforest Alliance'),
        ('uebt', 'UEBT'),
        ('ffl', 'FFL'),
        ('ft', 'Fair Trade'),
        ('bio', 'BIO'),
        ('pact', 'PACT'),
    ]
    
    DISTANCE_CHOICES = [
        ('moins_1h', 'Moins de 1h'),
        ('1h_2h', '1h - 2h'),
        ('2h_3h', '2h - 3h'),
        ('plus_4h', 'Plus de 4h'),
    ]
    
    # Relations
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='parcelles',
        verbose_name="Producteur"
    )
    
    # Informations de base
    numero_parcelle = models.PositiveIntegerField(
        verbose_name="Numéro de parcelle",
        help_text="P1, P2, P3..."
    )
    
    code_parcelle = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Code parcelle",
        help_text="Code unique de la parcelle (ex: PROD001-P1)"
    )
    
    # Localisation textuelle
    localisation = models.CharField(
        max_length=200,
        verbose_name="Localisation",
        help_text="Fokontany/Faritra",
        blank=True,
        null=False,
        default='Non renseigné'
    )
    
    gps_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        verbose_name="GPS Latitude"
    )
    
    gps_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        verbose_name="GPS Longitude"
    )
    
    point = gis_models.PointField(
        null=True,
        blank=True,
        srid=4326,
        geography=True,
        verbose_name="Position GPS (Point)",
        help_text="Coordonnées GPS de la parcelle"
    )
    
    polygon = gis_models.PolygonField(
        null=True,
        blank=True,
        srid=4326,
        geography=True,
        verbose_name="Délimitation (Polygone)",
        help_text="Contours de la parcelle"
    )
    
    # Dimension
    dimension_ha = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        validators=[MinValueValidator(0)],
        verbose_name="Dimension (Ha)"
    )
    annee_creation = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
        verbose_name="Année de création / acquisition"
    )
    
    # Culture vanille
    nombre_pieds = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de pieds de vanille"
    )
    
    annee_plantation = models.PositiveIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
        verbose_name="Année de plantation"
    )
    
    type_vanille = models.CharField(
        max_length=50,
        choices=TYPE_VANILLE_CHOICES,
        default='planifolia',
        verbose_name="Type de vanille cultivé"
    )
    
    culture_principale = models.CharField(
        max_length=20,
        choices=CULTURE_PRINCIPALE_CHOICES,
        default='vanille',
        verbose_name="Culture principale"
    )
    
    # Cultures pratiquées sur la parcelle (peut contenir plusieurs cultures)
    cultures_pratiquees = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Cultures pratiquées",
        help_text="Liste des cultures pratiquées sur cette parcelle (ex: ['vanille', 'cafe', 'girofle'])"
    )
    
    # Estimations de production par culture
    # Format: {"vanille": 150.5, "cafe": 200.0, "girofle": 80.0}
    productions_par_culture = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Productions estimées par culture (kg)",
        help_text="Dictionnaire des estimations de production par type de culture en kg"
    )
    
    estimation_production_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Estimation de production totale (kg)",
        help_text="Total de toutes les productions (calculé automatiquement si productions_par_culture est rempli)"
    )
    
    # Cultures autour
    cultures_autour = models.TextField(
        blank=True,
        verbose_name="Types de cultures autour de la parcelle"
    )
    
    # Caractéristiques de la parcelle
    profil_parcelle = models.CharField(
        max_length=50,
        choices=PROFIL_PARCELLE_CHOICES,
        blank=True,
        verbose_name="Profil de la parcelle"
    )
    
    # Distance habitation
    distance_habitation = models.CharField(
        max_length=20,
        choices=DISTANCE_CHOICES,
        blank=True,
        verbose_name="Distance de l'habitation"
    )
    
    # Propriété
    type_propriete = models.CharField(
        max_length=50,
        choices=TYPE_PROPRIETE_CHOICES,
        default='terrain_propre',
        verbose_name="Type de propriété"
    )
    
    # Certification
    certifiee = models.BooleanField(
        default=False,
        verbose_name="Parcelle certifiée"
    )
    
    type_certification = models.CharField(
        max_length=20,
        choices=CERTIFICATION_CHOICES,
        blank=True,
        verbose_name="Type de certification"
    )
    
    # Photo
    photo_parcelle = models.ImageField(
        upload_to='parcelles/photos/',
        blank=True,
        null=True,
        verbose_name="Photo de la parcelle"
    )
    
    # Statut
    active = models.BooleanField(default=True, verbose_name="Active")
    
    # Traçabilité
    date_enregistrement = models.DateTimeField(
        auto_now_add=True,
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
        blank=True,
        related_name='parcelles_creees',
        verbose_name="Créé par"
    )
    
    modifie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parcelles_modifiees',
        verbose_name="Modifié par"
    )
    
    objects = ParcelleManager()
    
    class Meta:
        verbose_name = "Parcelle"
        verbose_name_plural = "Parcelles"
        ordering = ['producteur', 'numero_parcelle']
        unique_together = ['producteur', 'numero_parcelle']
        indexes = [
            models.Index(fields=['code_parcelle']),
            models.Index(fields=['producteur']),
            models.Index(fields=['certifiee']),
            models.Index(fields=['type_vanille']),
            models.Index(fields=['active']),
            models.Index(fields=['culture_principale']),
        ]
    
    def __str__(self):
        return f"{self.code_parcelle} - P{self.numero_parcelle}"
    
    @property
    def producteur_nom(self):
        """Retourne le nom complet du producteur"""
        return self.producteur.nom_complet
    
    @property
    def age_parcelle(self):
        """Calcule l'âge de la parcelle"""
        if self.annee_plantation:
            from datetime import datetime
            return datetime.now().year - self.annee_plantation
        return None
    
    @property
    def latitude(self):
        """Retourner la latitude depuis PostGIS ou ancien système"""
        if self.point:
            return self.point.y
        return float(self.gps_latitude) if self.gps_latitude else None
    
    @property
    def longitude(self):
        """Retourner la longitude depuis PostGIS ou ancien système"""
        if self.point:
            return self.point.x
        return float(self.gps_longitude) if self.gps_longitude else None
    
    @property
    def superficie_m2(self):
        """Calculer la superficie en m² depuis le polygone"""
        if self.polygon:
            return self.polygon.area
        return None
    
    def save(self, *args, **kwargs):
        # Générer le code parcelle automatiquement
        if not self.code_parcelle:
            self.code_parcelle = f"{self.producteur.code}-P{self.numero_parcelle}"
        
        # Migration automatique : Ancien GPS → PostGIS Point
        if not self.point and self.gps_latitude and self.gps_longitude:
            from django.contrib.gis.geos import Point
            self.point = Point(float(self.gps_longitude), float(self.gps_latitude), srid=4326)
        
        # Calculer le total de production et cultures pratiquées depuis productions_par_culture
        if self.productions_par_culture and isinstance(self.productions_par_culture, dict):
            # 1. Calculer le total de production
            total = sum(float(v) for v in self.productions_par_culture.values() if v)
            if total > 0:
                self.estimation_production_kg = total
            
            # 2. Mettre à jour cultures_pratiquees à partir des clés de productions_par_culture
            cultures_list = [culture for culture in self.productions_par_culture.keys() if culture]
            if cultures_list:
                self.cultures_pratiquees = cultures_list
        
        super().save(*args, **kwargs)
