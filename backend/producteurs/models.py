from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from simple_history.models import HistoricalRecords

class ProducteurManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()
    
    def actifs(self):
        return self.get_queryset().filter(actif=True)
    
    def inactifs(self):
        return self.get_queryset().filter(actif=False)


class Producteur(models.Model):
    # ==================== CHOIX / CHOICES ====================
    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]
    
    STATUT_MATRIMONIAL_CHOICES = [
        ('celibataire', 'Célibataire'),
        ('marie', 'Marié(e)'),
        ('union_libre', 'Union libre'),
        ('divorce', 'Divorcé(e)'),
        ('veuf', 'Veuf/Veuve'),
    ]
    
    NIVEAU_EDUCATION_CHOICES = [
        ('prescolaire', 'Préscolaire'),
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
        ('universite', 'Université'),
    ]
    
    RESPONSABILITE_COOP_CHOICES = [
        ('president_coop', 'Président Coopérative'),
        ('vice_president_coop', 'Vice Président Coopérative'),
        ('tresorier_coop', 'Trésorier Coopérative'),
        ('commissaire_coop', 'Commissaires aux comptes Coopérative'),
        ('secretaire_coop', 'Secrétaire Coopérative'),
        ('conseiller_coop', 'Conseillers Coopérative'),
        ('president_ca', 'Président CA'),
        ('vice_president_ca', 'Vice Président CA'),
        ('tresorier_ca', 'Trésorier CA'),
        ('commissaire_ca', 'Commissaires aux comptes CA'),
        ('conseiller_ca', 'Conseiller CA'),
        ('secretaire_ca', 'Secrétaire CA'),
        ('aucune', 'Aucune responsabilité'),
    ]
    
    TYPE_POUBELLE_CHOICES = [
        ('fako_mora_lo', 'Fako mora lo (déchets biodégradables)'),
        ('fako_tsy_mora_lo', 'Fako tsy mora lo (déchets non biodégradables)'),
        ('fako_mampididoza', 'Fako mampididoza (déchets dangereux)'),
    ]
    
    SOURCE_EAU_CHOICES = [
        ('renirano', 'Rivière'),
        ('robinet', 'Robinet'),
        ('ranovovo', 'Puits'),
    ]
    
    TYPE_CSB_CHOICES = [
        ('csb1', 'CSB I'),
        ('csb2', 'CSB II'),
        ('hopitaly', 'Hôpital'),
    ]
    
    # ==================== IDENTIFICATION ====================
    code = models.CharField(max_length=20, unique=True, verbose_name="Code Producteur")
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, verbose_name="Prénom", null=True, blank=True)
    cin = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name="CIN",
    )
    
    # ==================== LOCALISATION ====================
    # Champs texte (conservés pour compatibilité)
    commune = models.CharField(max_length=100, verbose_name="Commune")
    fokontany = models.CharField(max_length=100, null=True, blank=True, verbose_name="Fokontany")
    village = models.CharField(max_length=100, verbose_name="Village", null=True, blank=True)
    
    # Champs FK normalisés (nouveaux)
    region = models.ForeignKey(
        'geographie.Region',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="Région"
    )
    district = models.ForeignKey(
        'geographie.District',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="District"
    )
    commune_ref = models.ForeignKey(
        'geographie.Commune',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="Commune (référentiel)"
    )
    fokontany_ref = models.ForeignKey(
        'geographie.Fokontany',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="Fokontany (référentiel)"
    )
    village_ref = models.ForeignKey(
        'geographie.Village',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="Village (référentiel)"
    )
    structure_intermediaire = models.ForeignKey(
        'geographie.StructureIntermediaire',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs',
        verbose_name="Structure intermédiaire"
    )
    
    # ==================== CONTACT ====================
    telephone = models.CharField(max_length=20, verbose_name="N° Téléphone", null=True, blank=True)
    email = models.EmailField(blank=True, null=True, verbose_name="E-mail")
    
    # ==================== INFORMATIONS PERSONNELLES ====================
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, verbose_name="Genre")
    femme_leader = models.BooleanField(
        default=False,
        verbose_name="Femme leader",
        help_text="Si femme, tient-elle une responsabilité au niveau du groupe d'épargne communautaire"
    )
    niveau_education = models.CharField(
        max_length=20,
        choices=NIVEAU_EDUCATION_CHOICES,
        default='',
        verbose_name="Niveau d'éducation"
    )
    date_naissance = models.DateField(blank=True, null=True, verbose_name="Date de naissance")
    statut_matrimonial = models.CharField(
        max_length=20,
        choices=STATUT_MATRIMONIAL_CHOICES,
        default='celibataire',
        verbose_name="Civilité",
        null=True
    )
    
    # ==================== COOPÉRATIVE ====================
    cooperative = models.ForeignKey(
        'cooperatives.Cooperative',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs'
    )
    responsabilite_cooperative = models.CharField(
        max_length=30,
        choices=RESPONSABILITE_COOP_CHOICES,
        default='aucune',
        verbose_name="Responsabilité dans la coopérative"
    )
    date_adhesion_cooperative = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'adhésion à la coopérative"
    )
    membre_groupement_epargne = models.BooleanField(
        default=False,
        verbose_name="Membre d'une caisse communautaire (VSLA)"
    )
    date_adhesion_groupement = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'adhésion au groupement"
    )
    paysan_relais = models.BooleanField(
        default=False,
        verbose_name="Paysan relais"
    )
    satellite_floraison = models.BooleanField(
        default=False,
        verbose_name="Satellite floraison"
    )
    
    # ==================== COMPOSITION DU FOYER ====================
    nb_adultes_plus_18 = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Personnes âgées de plus de 18 ans dans le foyer"
    )
    nb_hommes_adultes = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Nombre d'hommes adultes"
    )
    nb_femmes_adultes = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de femmes adultes"
    )
    personne_handicap_foyer = models.BooleanField(
        default=False,
        verbose_name="Personne en situation de handicap dans le foyer"
    )
    
    # ==================== ENFANTS ====================
    autres_enfants_foyer = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Autres enfants dans le foyer (hors propres enfants)"
    )
    nb_enfants_garcons = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Nombre d'enfants garçons"
    )
    nb_enfants_filles = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Nombre d'enfants filles"
    )
    nb_autres_garcons = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Autres garçons"
    )
    nb_autres_filles = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Autres filles"
    )
    
    # Années de naissance des enfants
    annee_naissance_enfant_1 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_2 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_3 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_4 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_5 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_6 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_7 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_8 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_9 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    annee_naissance_enfant_10 = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    
    # ==================== SCOLARISATION ====================
    nb_enfants_scolarises = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Nombre d'enfants scolarisés"
    )
    annee_stat_scolarisation = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Année de référence du taux de scolarisation"
    )
    taux_scolarisation = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Taux de scolarisation (%)"
    )
    nb_enfants_non_scolarises = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        verbose_name="Enfants en âge d'être scolarisés mais non scolarisés"
    )
    
    # Niveau d'étude des enfants
    niveau_etude_enfant_1 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_1 = models.BooleanField(default=True)
    
    niveau_etude_enfant_2 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_2 = models.BooleanField(default=True)
    
    niveau_etude_enfant_3 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_3 = models.BooleanField(default=True)
    
    niveau_etude_enfant_4 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_4 = models.BooleanField(default=True)
    
    niveau_etude_enfant_5 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_5 = models.BooleanField(default=True)
    
    niveau_etude_enfant_6 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_6 = models.BooleanField(default=True)

    niveau_etude_enfant_7 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_7 = models.BooleanField(default=True)

    niveau_etude_enfant_8 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_8 = models.BooleanField(default=True)

    niveau_etude_enfant_9 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_9 = models.BooleanField(default=True)

    niveau_etude_enfant_10 = models.CharField(max_length=20, choices=NIVEAU_EDUCATION_CHOICES, blank=True)
    continue_ecole_enfant_10 = models.BooleanField(default=True)
    
    # ==================== GESTION DES DÉCHETS ====================
    a_poubelles_triees = models.BooleanField(
        default=False,
        verbose_name="Dispose de 2 ou 3 types de poubelles"
    )
    types_poubelles = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Types de poubelles",
        help_text="Types de poubelles séparés par virgules"
    )
    dechets_non_eparpilles_maison = models.BooleanField(
        default=False,
        verbose_name="Déchets non éparpillés dans la cour"
    )
    dechets_non_eparpilles_parcelle = models.BooleanField(
        default=False,
        verbose_name="Déchets non éparpillés dans la parcelle"
    )
    recyclage_dechets = models.BooleanField(
        default=False,
        verbose_name="Pratique le recyclage des déchets"
    )
    dechets_chimiques_enterres = models.BooleanField(
        default=False,
        verbose_name="Déchets chimiques enterrés loin de l'eau"
    )
    lieu_dechets_chimiques = models.TextField(
        blank=True,
        verbose_name="Lieu de dépôt des déchets chimiques si non enterrés"
    )
    
    # ==================== GESTION DE L'EAU ====================
    fosse_eaux_usees_maison = models.BooleanField(
        default=False,
        verbose_name="Fosse pour eaux usées à la maison"
    )
    fosse_eaux_usees_champ = models.BooleanField(
        default=False,
        verbose_name="Fosse pour eaux usées au champ"
    )
    recyclage_eau_pluie = models.BooleanField(
        default=False,
        verbose_name="Recyclage eau de pluie"
    )
    wc_maison = models.BooleanField(
        default=False,
        verbose_name="WC à la maison"
    )
    wc_champ = models.BooleanField(
        default=False,
        verbose_name="WC au champ"
    )
    lieu_lavage = models.BooleanField(
        default=False,
        verbose_name="Dispose d'un lieu pour se laver"
    )
    source_eau = models.CharField(
        max_length=20,
        choices=SOURCE_EAU_CHOICES,
        blank=True,
        verbose_name="Source d'approvisionnement en eau"
    )
    eau_potable = models.BooleanField(
        default=False,
        verbose_name="Eau potable"
    )
    fait_bouillir_eau = models.BooleanField(default=False, verbose_name="Fait bouillir l'eau")
    utilise_sureau = models.BooleanField(default=False, verbose_name="Utilise Sur'eau")
    autre_traitement_eau = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Autre méthode de traitement de l'eau"
    )
    lave_linge_riviere = models.BooleanField(
        default=False,
        verbose_name="Lave le linge/vaisselle dans la rivière"
    )
    
    # ==================== SANTÉ ====================
    type_centre_sante = models.CharField(
        max_length=20,
        choices=TYPE_CSB_CHOICES,
        blank=True,
        verbose_name="Type de centre de santé disponible"
    )
    a_assurance_sante = models.BooleanField(
        default=False,
        verbose_name="Possède une assurance santé"
    )
    
    # ==================== VIE COMMUNAUTAIRE & ENVIRONNEMENT ====================
    respecte_dina = models.BooleanField(
        default=True,
        verbose_name="Participe au respect des conventions sociales (dina)"
    )
    participe_travaux_communautaires = models.BooleanField(
        default=True,
        verbose_name="Participe aux travaux communautaires"
    )
    participe_protection_environnement = models.BooleanField(
        default=True,
        verbose_name="Participe à la protection de l'environnement"
    )
    ne_brule_pas_foret = models.BooleanField(default=True)
    ne_coupe_pas_foret = models.BooleanField(default=True)
    ne_cultive_pas_zone_protegee = models.BooleanField(default=True)
    respecte_loi_animaux_proteges = models.BooleanField(default=True)
    
    # ==================== CHASSE & ÉLEVAGE ====================
    pratique_chasse = models.BooleanField(
        default=False,
        verbose_name="Pratique la chasse"
    )
    animaux_chasses = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Types d'animaux chassés",
        help_text="Lambodia, Trandraka, Tomendry, Ankomba, autres"
    )
    pratique_elevage = models.BooleanField(
        default=False,
        verbose_name="Pratique l'élevage"
    )
    animaux_eleves = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Types d'animaux élevés"
    )
    
    # ==================== ACTIVITÉS AGRICOLES ====================
    a_exploite_foret_apres_2019 = models.BooleanField(
        default=False,
        verbose_name="A exploité la forêt après 2019"
    )
    pratique_tavy = models.BooleanField(
        default=False,
        verbose_name="Pratique le brûlis agricole (Tavy)"
    )
    fait_defrichage = models.BooleanField(
        default=False,
        verbose_name="Fait du défrichage ou travaille la pierre"
    )
    pratique_peche = models.BooleanField(
        default=False,
        verbose_name="Pratique la pêche"
    )
    peche_mer = models.BooleanField(default=False, verbose_name="Pêche en mer")
    peche_eau_douce = models.BooleanField(default=False, verbose_name="Pêche en eau douce")
    respecte_regles_peche = models.BooleanField(
        default=True,
        verbose_name="Respecte les règles de pêche"
    )
    
    # ==================== PRODUITS CHIMIQUES ====================
    utilise_chimiques_autres_cultures = models.BooleanField(
        default=False,
        verbose_name="Utilise des produits chimiques sur autres cultures"
    )
    stocke_chimiques_maison = models.BooleanField(
        default=False,
        verbose_name="Stocke des produits chimiques à la maison"
    )
    lieu_nettoyage_outils_chimiques = models.BooleanField(
        default=False,
        verbose_name="Lieu spécifique pour nettoyer les outils chimiques"
    )
    
    # ==================== DOTATIONS & FORMATIONS ====================
    dotations_recues = models.TextField(
        blank=True,
        verbose_name="Dotations reçues",
        help_text="Nature et quantité des dotations"
    )
    formations_suivies = models.TextField(
        blank=True,
        verbose_name="Formations suivies"
    )
    
    # ==================== ACTIVITÉS ====================
    dotation = models.TextField(
        blank=True,
        verbose_name="Dotation (activité)",
        help_text="Type de dotation reçue"
    )
    agr1 = models.TextField(
        blank=True,
        verbose_name="AGR 1 (Activité génératrice de revenus 1)",
        help_text="Description de l'AGR 1"
    )
    agr2 = models.TextField(
        blank=True,
        verbose_name="AGR 2 (Activité génératrice de revenus 2)",
        help_text="Description de l'AGR 2"
    )
    mahavelona = models.BooleanField(
        default=False,
        verbose_name="Mahavelona (Mutuelle santé)"
    )
    mahavelona_annee = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Année d'adhésion Mahavelona"
    )
    mahavelona_criteres_version = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Version des critères Mahavelona"
    )
    
    # ==================== PHOTO ====================
    photo = models.ImageField(
        upload_to='producteurs/photos/',
        blank=True,
        null=True,
        verbose_name="Photo du producteur"
    )
    
    # ==================== AUDIT & STATUT ====================
    # date_adhesion supprimé - utiliser date_adhesion_cooperative à la place
    date_modification = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='producteurs_crees',
        verbose_name="Créé par"
    )
    modifie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs_modifies',
        verbose_name="Modifié par"
    )
    actif = models.BooleanField(default=True)
    date_desactivation = models.DateTimeField(null=True, blank=True)
    desactive_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs_desactives'
    )
    raison_desactivation = models.TextField(blank=True, null=True)
    verifie = models.BooleanField(default=False, verbose_name="Profil vérifié")
    date_verification = models.DateTimeField(null=True, blank=True)
    verifie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='producteurs_verifies',
        verbose_name="Vérifié par"
    )
    
    objects = ProducteurManager()

    history = HistoricalRecords()
    
    class Meta:
        ordering = ['-date_adhesion_cooperative', '-date_modification']
        verbose_name = 'Producteur'
        verbose_name_plural = 'Producteurs'
        indexes = [
            models.Index(fields=['actif', 'code']),
            models.Index(fields=['village', 'commune']),
            models.Index(fields=['cooperative']),
            models.Index(fields=['cooperative', 'date_adhesion_cooperative']),
            models.Index(fields=['sexe']),
            models.Index(fields=['femme_leader']),
            models.Index(fields=['paysan_relais']),
            models.Index(fields=['verifie']),
            models.Index(fields=['mahavelona']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.nom} {self.prenom}"
    
    @property
    def nom_complet(self):
        return f"{self.nom} {self.prenom}"
    
    @property
    def age(self):
        from django.utils import timezone
        if self.date_naissance:
            today = timezone.now().date()
            return today.year - self.date_naissance.year - (
                (today.month, today.day) < (self.date_naissance.month, self.date_naissance.day)
            )
        return None
    
    @property
    def total_enfants(self):
        return self.nb_enfants_garcons + self.nb_enfants_filles + self.nb_autres_garcons + self.nb_autres_filles
    
    @property
    def agr1_detail(self):
        """Get AGR1 detail object"""
        return self.agr_activities.filter(ordre=1, active=True).first()
    
    @property
    def agr2_detail(self):
        """Get AGR2 detail object"""
        return self.agr_activities.filter(ordre=2, active=True).first()
    
    @property
    def total_revenu_agr(self):
        """Calculate total AGR revenue"""
        from django.db.models import Sum
        result = self.agr_activities.filter(active=True).aggregate(
            total=Sum('revenu_annuel_estime')
        )
        return result['total'] or 0
    
    def soft_delete(self, user=None, raison=""):
        from django.utils import timezone
        self.actif = False
        self.date_desactivation = timezone.now()
        self.desactive_par = user
        self.raison_desactivation = raison
        self.save()
    
    def restaurer(self):
        self.actif = True
        self.date_desactivation = None
        self.desactive_par = None
        self.raison_desactivation = None
        self.save()
    
    def verifier(self, user):
        from django.utils import timezone
        self.verifie = True
        self.date_verification = timezone.now()
        self.verifie_par = user
        self.save()
        
    def calculate_schooling_stats(self):
        """
        Calculate taux_scolarisation based on children ages and update related counts.
        Requirements:
        1. Numerator: Children in school AND aged 3-18 (inclusive) -> Updates self.nb_enfants_scolarises
        2. Denominator: Children aged 3-18 (inclusive) -> Sum of (scolarises + non_scolarises in range)
        3. Reference Year: self.annee_stat_scolarisation or current year
        """
        # KEEP_DECLARED_VALUES: garder les valeurs declarees/importees
        # si aucun slot de scolarisation n'est renseigne.
        _slots = [getattr(self, 'continue_ecole_enfant_%d' % i, None) for i in range(1, 11)]
        if all(v is None for v in _slots):
            return
        from django.utils import timezone
        
        # Determine reference year
        current_year = timezone.now().year
        ref_year = self.annee_stat_scolarisation or current_year
        
        children_in_school_age = 0
        children_scolarises_in_age = 0
        
        # Iterate through 10 children slots
        for i in range(1, 11):
            birth_year_field = f'annee_naissance_enfant_{i}'
            continue_field = f'continue_ecole_enfant_{i}'
            
            birth_year = getattr(self, birth_year_field, None)
            if birth_year:
                # Calculate age based on reference year
                age = ref_year - birth_year
                
                # Check age range: 3 <= age <= 18
                if 3 <= age <= 18:
                    children_in_school_age += 1
                    
                    # Check if currently in school
                    is_in_school = getattr(self, continue_field, False)
                    if is_in_school:
                        children_scolarises_in_age += 1
        
        # Update counts to reflect ONLY children in range [3, 18]
        # This ensures dashboard aggregations are consistent
        self.nb_enfants_scolarises = children_scolarises_in_age
        # Non-scolarises is simply total in range - scolarises in range
        self.nb_enfants_non_scolarises = children_in_school_age - children_scolarises_in_age
        
        # Update rate
        if children_in_school_age > 0:
            self.taux_scolarisation = (children_scolarises_in_age / children_in_school_age) * 100
        else:
            self.taux_scolarisation = 0
            
    def save(self, *args, **kwargs):
        # Always calculate schooling stats before saving
        self.calculate_schooling_stats()
        super().save(*args, **kwargs)


class Dotation(models.Model):
    """Dotations reçues par producteur, historisées par année"""
    TYPE_DOTATION_CHOICES = [
        ('kit_scolaire', 'Kit scolaire'),
        ('poisson', 'Poisson'),
        ('volaille', 'Volaille'),
        ('autre', 'Autre'),
    ]

    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='dotations',
        verbose_name="Producteur"
    )
    type_dotation = models.CharField(
        max_length=30,
        choices=TYPE_DOTATION_CHOICES,
        verbose_name="Type de dotation"
    )
    annee = models.PositiveIntegerField(verbose_name="Année de dotation")
    quantite = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité / nombre de kits"
    )
    details = models.CharField(max_length=255, blank=True, verbose_name="Détails complémentaires")

    # Traçabilité
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dotations_creees'
    )

    class Meta:
        verbose_name = "Dotation"
        verbose_name_plural = "Dotations"
        ordering = ['-annee', '-date_enregistrement']
        unique_together = ('producteur', 'type_dotation', 'annee', 'details')
        indexes = [
            models.Index(fields=['producteur']),
            models.Index(fields=['type_dotation']),
            models.Index(fields=['annee']),
        ]

    def __str__(self):
        return f"{self.producteur.code} - {self.type_dotation} ({self.annee})"


class AGR(models.Model):
    """Activités Génératrices de Revenus (AGR) - Income-generating activities"""
    
    # ==================== CHOIX / CHOICES ====================
    TYPE_AGR_CHOICES = [
        ('pisciculture', 'Pisciculture'),
        ('aviculture', 'Aviculture'),
        ('autre', 'Autre'),
    ]
    
    UTILISATION_CHOICES = [
        ('consommation', 'À consommer'),
        ('vente', 'À vendre'),
        ('les_deux', 'Les deux'),
    ]
    
    # ==================== RELATIONS ====================
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.CASCADE,
        related_name='agr_activities',
        verbose_name="Producteur"
    )
    
    # ==================== INFORMATIONS DE BASE ====================
    type_agr = models.CharField(
        max_length=100,
        choices=TYPE_AGR_CHOICES,
        verbose_name="Type d'AGR"
    )
    ordre = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Ordre de l'AGR (1, 2, 3, ...)"
    )
    
    # ==================== INTRANTS ====================
    intrants_recus = models.BooleanField(
        default=False,
        verbose_name="Intrants reçus"
    )
    quantite_intrants = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité d'intrants reçus",
        help_text="Nombre d'intrants reçus (alevins, poussins, etc.)"
    )
    
    # ==================== UTILISATION ====================
    utilisation = models.CharField(
        max_length=20,
        choices=UTILISATION_CHOICES,
        blank=True,
        verbose_name="Type d'utilisation"
    )
    
    # ==================== QUANTITÉS ====================
    quantite_consommee_annuelle = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité consommée par an",
        help_text="Quantité consommée par an (kg ou nombre)"
    )
    quantite_vendue_annuelle = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Quantité vendue par an"
    )
    unite_mesure = models.CharField(
        max_length=20,
        default='kg',
        verbose_name="Unité de mesure",
        help_text="kg, nombre, etc."
    )
    
    # ==================== REVENUS ====================
    prix_vente_unitaire = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Prix de vente unitaire",
        help_text="Prix de vente unitaire en Ariary"
    )
    revenu_annuel_estime = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Revenu annuel estimé",
        help_text="Calculé: quantite_vendue × prix_vente"
    )
    
    # ==================== ÉTAT ACTUEL (spécifique par type) ====================
    nombre_bassins = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de bassins",
        help_text="Pour pisciculture"
    )
    nombre_volailles = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de volailles",
        help_text="Pour aviculture"
    )
    
    # ==================== MÉTADONNÉES ====================
    active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )
    date_creation = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    enregistre_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agr_enregistrees',
        verbose_name="Enregistré par"
    )
    
    class Meta:
        ordering = ['producteur', 'ordre']
        verbose_name = "AGR"
        verbose_name_plural = "AGR"
        unique_together = [['producteur', 'ordre']]
        indexes = [
            models.Index(fields=['producteur']),
            models.Index(fields=['type_agr']),
            models.Index(fields=['active']),
        ]
    
    def save(self, *args, **kwargs):
        """Calculate revenu_annuel_estime before saving"""
        if self.quantite_vendue_annuelle and self.prix_vente_unitaire:
            self.revenu_annuel_estime = (
                self.quantite_vendue_annuelle * self.prix_vente_unitaire
            )
        else:
            self.revenu_annuel_estime = None
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.producteur.code} - {self.get_type_agr_display()} (AGR{self.ordre})"
