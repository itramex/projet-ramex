from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from producteurs.models import Producteur
from parcelles.models import Parcelle
from cooperatives.models import Cooperative

# ==================== ÉTAPE 1 : COLLECTE ====================

class Campagne(models.Model):
    """Campagne agricole (année de récolte)"""
    code = models.CharField(max_length=20, unique=True)  # Ex: "2024-2025"
    annee_debut = models.IntegerField()
    annee_fin = models.IntegerField()
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('cloturee', 'Clôturée')
        ],
        default='active'
    )
    
    class Meta:
        ordering = ['-annee_debut']
    
    def __str__(self):
        return self.code


class BonCollecte(models.Model):
    """
    FACTURE PRODUCTEUR / BON DE COLLECTE (FABC)
    Document : FACTURE-PRODUCTEUR-BON-DE-COLLECTE.pdf
    """
    TYPE_PRODUIT_CHOICES = [
        ('vanille_verte', 'Vanille Verte'),
        ('vanille_vrac', 'Vanille Vrac'),
        ('cafe', 'Café'),
        ('girofle', 'Girofle'),
    ]
    
    TYPE_CERTIFICATION_CHOICES = [
        ('g4g', 'G4G (Good 4 Good)'),
        ('bio', 'BIO'),
        ('ra', 'RA (Rainforest Alliance)'),
        ('ffl', 'FFL (Fair for Life)'),
        ('rauebt', 'RAUEBT'),
    ]
    
    MODE_PAIEMENT_CHOICES = [
        ('especes', 'Espèces'),
        ('cheque', 'Chèque'),
        ('mobile', 'Mobile Banking'),
    ]
    
    numero_fabc = models.CharField(max_length=20, unique=True, db_index=True)
    
    # Contexte
    campagne = models.ForeignKey(Campagne, on_delete=models.PROTECT)
    producteur = models.ForeignKey(Producteur, on_delete=models.PROTECT)
    cooperative = models.ForeignKey(
        Cooperative, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Si vente groupée, lien vers plusieurs producteurs
    est_vente_groupee = models.BooleanField(default=False)
    producteurs_groupes = models.ManyToManyField(
        Producteur,
        related_name='bons_collecte_groupes',
        blank=True,
        help_text="Liste des producteurs dans le cas d'une vente groupée"
    )
    
    # Localisation et date
    date_marche = models.DateField()
    village_marche = models.CharField(max_length=100)
    commune = models.CharField(max_length=100)
    fokontany = models.CharField(max_length=100)
    
    # Produit
    type_produit = models.CharField(max_length=20, choices=TYPE_PRODUIT_CHOICES)
    # Liaison Certification (Phase 4) : référence au référentiel TypeCertification (extensible)
    type_certification = models.ForeignKey(
        'formations.TypeCertification',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bons_collecte',
        verbose_name="Type de certification"
    )
    # Champ texte de compatibilité (historique) — peut être vide si la FK est utilisée
    certification = models.CharField(max_length=20, choices=TYPE_CERTIFICATION_CHOICES, null=True, blank=True)
    
    # Poids (kg)
    poids_total_livre = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        validators=[MinValueValidator(0)],
        verbose_name="Poids total à la livraison (kg)"
    )
    poids_accepte = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        validators=[MinValueValidator(0)],
        verbose_name="Poids accepté/acheté (kg)"
    )
    poids_retour = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Poids retour (kg)"
    )
    
    # Informations financières
    prix_unitaire_marche = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Prix unitaire du marché (Ar/kg)"
    )
    montant_premium = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Montant premium (Ar)"
    )
    montant_total_achat = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        verbose_name="Montant total achat (Ar)"
    )
    
    # Mode de paiement
    mode_paiement = models.CharField(max_length=20, choices=MODE_PAIEMENT_CHOICES)
    
    # Avances (système de recouvrement)
    montant_avances_anterieures = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        default=0,
        verbose_name="Montant des avances antérieures (Ar)"
    )
    remboursement_par_vanille = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        default=0,
        verbose_name="Remboursement par vanille livrée (Ar)"
    )
    remboursement_especes = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        default=0,
        verbose_name="Remboursement en espèces (Ar)"
    )
    solde_avances = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        default=0,
        verbose_name="Solde des avances (Ar)"
    )
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_marche', '-numero_fabc']
        verbose_name = "Bon de collecte (FABC)"
        verbose_name_plural = "Bons de collecte (FABC)"
        indexes = [
            models.Index(fields=['campagne']),
            models.Index(fields=['producteur']),
            models.Index(fields=['cooperative']),
            models.Index(fields=['date_marche']),
            models.Index(fields=['type_produit']),
            models.Index(fields=['certification']),
        ]
    
    def __str__(self):
        return f"FABC {self.numero_fabc} - {self.producteur.code}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique du montant total
        if not self.montant_total_achat:
            self.montant_total_achat = (
                self.poids_accepte * self.prix_unitaire_marche + 
                self.montant_premium
            )
        super().save(*args, **kwargs)


class DetailSacBonCollecte(models.Model):
    """Détail des sacs pour un bon de collecte"""
    bon_collecte = models.ForeignKey(
        BonCollecte, 
        on_delete=models.CASCADE, 
        related_name='details_sacs'
    )
    numero_sac = models.IntegerField()
    poids_brut = models.DecimalField(max_digits=8, decimal_places=3)
    tare = models.DecimalField(max_digits=8, decimal_places=3)
    poids_net = models.DecimalField(max_digits=8, decimal_places=3)
    
    class Meta:
        ordering = ['numero_sac']
        unique_together = ['bon_collecte', 'numero_sac']
    
    def __str__(self):
        return f"Sac {self.numero_sac} - {self.bon_collecte.numero_fabc}"


class FicheCollecte(models.Model):
    """
    FICHE DE COLLECTE (FC)
    Regroupe plusieurs FABC pour un marché donné
    Document : FICHE-DE-COLLECTE.pdf
    """
    # Numéro unique FC (0001-1850 selon document)
    numero_fc = models.CharField(max_length=20, unique=True, db_index=True)
    
    # Contexte
    campagne = models.ForeignKey(Campagne, on_delete=models.PROTECT)
    cooperative = models.ForeignKey(
        Cooperative, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    certification = models.CharField(max_length=20)
    
    # Date et lieu
    date_marche = models.DateField()
    fokontany = models.CharField(max_length=100)
    
    # Liste des bons de collecte
    bons_collecte = models.ManyToManyField(
        BonCollecte, 
        related_name='fiches_collecte'
    )
    
    # Totaux calculés
    nombre_producteurs = models.IntegerField(default=0)
    poids_total_net = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        default=0
    )
    montant_total = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    
    # Agent responsable
    agent_re = models.CharField(max_length=100, verbose_name="Nom de l'agent RE")
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date_marche', '-numero_fc']
        verbose_name = "Fiche de collecte (FC)"
        verbose_name_plural = "Fiches de collecte (FC)"
    
    def __str__(self):
        return f"FC {self.numero_fc} - {self.date_marche}"


# ==================== ÉTAPE 2 : TRANSPORT ====================

class BonTransport(models.Model):
    """
    BON DE TRANSPORT / RECEPTION (BT)
    Document : MODELE-BON-DE-TRANSPORT-RECEPTION.pdf
    """
    TYPE_LOGISTIQUE_CHOICES = [
        ('dos_homme', 'Dos d\'homme'),
        ('moto', 'Moto'),
        ('vehicule', 'Véhicule'),
    ]
    
    # Numéro unique BT (1001-2100 selon document)
    numero_bt = models.CharField(max_length=20, unique=True, db_index=True)
    
    # Contexte
    campagne = models.ForeignKey(Campagne, on_delete=models.PROTECT)
    fiche_collecte = models.ForeignKey(
        FicheCollecte,
        on_delete=models.PROTECT,
        related_name='bons_transport'
    )
    cooperative = models.ForeignKey(
        Cooperative, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Localisation
    lieu_depart = models.CharField(max_length=200)
    fokontany_depart = models.CharField(max_length=100)
    lieu_destination = models.CharField(max_length=200)
    
    # Logistique
    type_logistique = models.CharField(
        max_length=20, 
        choices=TYPE_LOGISTIQUE_CHOICES
    )
    numero_vehicule = models.CharField(max_length=50, blank=True)
    type_vehicule = models.CharField(max_length=50, blank=True)
    nom_chauffeur = models.CharField(max_length=100, blank=True)
    telephone_chauffeur = models.CharField(max_length=20, blank=True)
    
    # Dates et poids
    date_chargement = models.DateField()
    date_arrivee = models.DateField(null=True, blank=True)
    poids_total_depart = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        validators=[MinValueValidator(0)]
    )
    poids_total_arrivee = models.DecimalField(
        max_digits=12, 
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Responsables
    agent_convoyeur = models.CharField(max_length=100)
    agent_receptionnaire = models.CharField(max_length=100, blank=True)
    
    # Statut
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_transit', 'En transit'),
            ('recu', 'Reçu'),
            ('anomalie', 'Anomalie'),
        ],
        default='en_transit'
    )
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_chargement', '-numero_bt']
        verbose_name = "Bon de transport (BT)"
        verbose_name_plural = "Bons de transport (BT)"
    
    def __str__(self):
        return f"BT {self.numero_bt} - {self.date_chargement}"


class DetailSacBonTransport(models.Model):
    """Détail des sacs transportés"""
    bon_transport = models.ForeignKey(
        BonTransport, 
        on_delete=models.CASCADE,
        related_name='details_sacs'
    )
    numero_sac = models.IntegerField()
    poids_sac_depart = models.DecimalField(max_digits=8, decimal_places=3)
    poids_sac_arrivee = models.DecimalField(
        max_digits=8, 
        decimal_places=3,
        null=True,
        blank=True
    )
    controle_reception = models.CharField(
        max_length=10,
        choices=[('OK', 'OK'), ('NOK', 'NOK')],
        blank=True
    )
    remarques = models.TextField(
        blank=True,
        help_text="Ex: sac déchiré, perdu, écart de poids..."
    )
    
    class Meta:
        ordering = ['numero_sac']
        unique_together = ['bon_transport', 'numero_sac']
    
    def __str__(self):
        return f"Sac {self.numero_sac} - BT {self.bon_transport.numero_bt}"

# ==================== ÉTAPE 3 : TRAITEMENT ====================

class LotTraitement(models.Model):
    """
    LOT DE TRAITEMENT
    Regroupe plusieurs bons de transport pour traitement
    """
    # Numéro unique du lot
    numero_lot = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Contexte
    campagne = models.ForeignKey(Campagne, on_delete=models.PROTECT)
    cooperative = models.ForeignKey(
        Cooperative, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Bons de transport sources
    bons_transport = models.ManyToManyField(
        BonTransport,
        related_name='lots_traitement'
    )
    
    # Type de traitement
    TYPE_TRAITEMENT_CHOICES = [
        ('sechage', 'Séchage'),
        ('fermentation', 'Fermentation'),
        ('triage', 'Triage'),
        ('conditionnement', 'Conditionnement'),
    ]
    type_traitement = models.CharField(max_length=20, choices=TYPE_TRAITEMENT_CHOICES)
    
    # Dates
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    
    # Poids
    poids_entree = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)]
    )
    poids_sortie = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    perte_poids = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        default=0,
        help_text="Perte de poids durant le traitement (kg)"
    )
    taux_perte = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Taux de perte en %"
    )
    
    # Qualité
    QUALITE_CHOICES = [
        ('gourmet', 'Gourmet'),
        ('tk1', 'TK1'),
        ('tk2', 'TK2'),
        ('cuts', 'Cuts'),
    ]
    qualite = models.CharField(
        max_length=20,
        choices=QUALITE_CHOICES,
        blank=True
    )
    
    # Responsable et localisation
    responsable_traitement = models.CharField(max_length=100)
    site_traitement = models.CharField(max_length=200)
    
    # Statut
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_cours', 'En cours'),
            ('termine', 'Terminé'),
            ('valide', 'Validé'),
        ],
        default='en_cours'
    )
    
    # Observations
    observations = models.TextField(blank=True)
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_debut', '-numero_lot']
        verbose_name = "Lot de traitement"
        verbose_name_plural = "Lots de traitement"
    
    def __str__(self):
        return f"Lot {self.numero_lot} - {self.type_traitement}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique de la perte
        if self.poids_sortie and self.poids_entree:
            self.perte_poids = self.poids_entree - self.poids_sortie
            if self.poids_entree > 0:
                self.taux_perte = (self.perte_poids / self.poids_entree) * 100
        super().save(*args, **kwargs)


# ==================== ÉTAPE 4 : CONDITIONNEMENT ====================

class Colis(models.Model):
    """
    COLIS / PACKAGING
    Conditionnement final pour export
    """
    TYPE_COLIS_CHOICES = [
        ('carton', 'Carton'),
        ('sac', 'Sac'),
        ('caisse_bois', 'Caisse en bois'),
        ('container', 'Container'),
    ]
    
    # Numéro unique du colis
    numero_colis = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Lot de traitement source
    lot_traitement = models.ForeignKey(
        LotTraitement,
        on_delete=models.PROTECT,
        related_name='colis'
    )
    
    # Type et spécifications
    type_colis = models.CharField(max_length=20, choices=TYPE_COLIS_CHOICES)
    poids_net = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(0)]
    )
    poids_brut = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(0)]
    )
    
    # Qualité
    qualite = models.CharField(max_length=20)
    grade = models.CharField(max_length=50, blank=True)
    
    # Date de conditionnement
    date_conditionnement = models.DateField()
    
    # QR Code / Code-barres pour traçabilité
    qr_code = models.CharField(max_length=200, unique=True, blank=True)
    code_barres = models.CharField(max_length=100, blank=True)
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date_conditionnement', 'numero_colis']
        verbose_name = "Colis"
        verbose_name_plural = "Colis"
    
    def __str__(self):
        return f"Colis {self.numero_colis}"


# ==================== ÉTAPE 5 : EXPORT ====================

class CommandeExport(models.Model):
    """
    COMMANDE D'EXPORT
    Regroupement de colis pour expédition
    """
    # Numéro unique de commande
    numero_commande = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Contexte
    campagne = models.ForeignKey(Campagne, on_delete=models.PROTECT)
    
    # Client
    nom_client = models.CharField(max_length=200)
    pays_destination = models.CharField(max_length=100)
    ville_destination = models.CharField(max_length=100)
    
    # Colis associés
    colis = models.ManyToManyField(Colis, related_name='commandes_export')
    
    # Informations logistiques
    TYPE_TRANSPORT_CHOICES = [
        ('aerien', 'Aérien'),
        ('maritime', 'Maritime'),
        ('terrestre', 'Terrestre'),
    ]
    type_transport = models.CharField(max_length=20, choices=TYPE_TRANSPORT_CHOICES)
    numero_conteneur = models.CharField(max_length=50, blank=True)
    numero_vol = models.CharField(max_length=50, blank=True)
    
    # Dates
    date_commande = models.DateField()
    date_expedition = models.DateField(null=True, blank=True)
    date_livraison_prevue = models.DateField(null=True, blank=True)
    date_livraison_effective = models.DateField(null=True, blank=True)
    
    # Poids total
    poids_total_net = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )
    poids_total_brut = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )
    
    # Valeur et incoterm
    valeur_commande = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Valeur en USD"
    )
    incoterm = models.CharField(
        max_length=10,
        choices=[
            ('EXW', 'EXW'),
            ('FOB', 'FOB'),
            ('CIF', 'CIF'),
            ('DDP', 'DDP'),
        ],
        default='FOB'
    )
    
    # Statut
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_preparation', 'En préparation'),
            ('expedie', 'Expédié'),
            ('en_transit', 'En transit'),
            ('livre', 'Livré'),
            ('annule', 'Annulé'),
        ],
        default='en_preparation'
    )
    
    # Documents
    numero_facture = models.CharField(max_length=50, blank=True)
    numero_bl = models.CharField(max_length=50, blank=True)
    
    # Observations
    observations = models.TextField(blank=True)
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_commande', '-numero_commande']
        verbose_name = "Commande d'export"
        verbose_name_plural = "Commandes d'export"
    
    def __str__(self):
        return f"Export {self.numero_commande} - {self.nom_client}"


# ==================== MOTEUR DE TRAÇABILITÉ ====================

class TracabiliteChain(models.Model):
    """
    CHAÎNE DE TRAÇABILITÉ
    Enregistrement de toute la chaîne de traçabilité pour un élément donné
    """
    # Identifiant unique de la chaîne
    uuid = models.UUIDField(unique=True, editable=False, db_index=True)
    
    # Type de traçabilité
    TYPE_TRACABILITE_CHOICES = [
        ('ascendante', 'Ascendante (producteur → export)'),
        ('descendante', 'Descendante (export → producteur)'),
    ]
    type_tracabilite = models.CharField(max_length=20, choices=TYPE_TRACABILITE_CHOICES)
    
    # Point de départ
    producteur = models.ForeignKey(
        Producteur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    parcelle = models.ForeignKey(
        Parcelle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Chaîne complète (JSON)
    bon_collecte_id = models.IntegerField(null=True, blank=True)
    fiche_collecte_id = models.IntegerField(null=True, blank=True)
    bon_transport_id = models.IntegerField(null=True, blank=True)
    lot_traitement_id = models.IntegerField(null=True, blank=True)
    colis_id = models.IntegerField(null=True, blank=True)
    commande_export_id = models.IntegerField(null=True, blank=True)
    
    # Données complètes en JSON
    chain_data = models.JSONField(
        default=dict,
        help_text="Données complètes de la chaîne en JSON"
    )
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Chaîne de traçabilité"
        verbose_name_plural = "Chaînes de traçabilité"
    
    def __str__(self):
        return f"Traçabilité {self.type_tracabilite} - {self.uuid}"

