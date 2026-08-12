from django.db import models
from django.contrib.auth.models import User


class Region(models.Model):
    """Région (ex: SAVA)"""
    nom = models.CharField(max_length=100, unique=True, verbose_name="Nom de la région")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    actif = models.BooleanField(default=True, verbose_name="Active")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Région"
        verbose_name_plural = "Régions"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class District(models.Model):
    """District (ex: Sambava, Antalaha, Vohemar, Andapa)"""
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name='districts',
        verbose_name="Région"
    )
    nom = models.CharField(max_length=100, verbose_name="Nom du district")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "District"
        verbose_name_plural = "Districts"
        ordering = ['nom']
        unique_together = ['region', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.region.nom})"


class Commune(models.Model):
    """Commune"""
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name='communes',
        verbose_name="District"
    )
    nom = models.CharField(max_length=100, verbose_name="Nom de la commune")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    actif = models.BooleanField(default=True, verbose_name="Active")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Commune"
        verbose_name_plural = "Communes"
        ordering = ['nom']
        unique_together = ['district', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.district.nom})"


class Fokontany(models.Model):
    """Fokontany"""
    commune = models.ForeignKey(
        Commune,
        on_delete=models.PROTECT,
        related_name='fokontanys',
        verbose_name="Commune"
    )
    nom = models.CharField(max_length=100, verbose_name="Nom du fokontany")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Fokontany"
        verbose_name_plural = "Fokontany"
        ordering = ['nom']
        unique_together = ['commune', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.commune.nom})"


class Village(models.Model):
    """Village"""
    fokontany = models.ForeignKey(
        Fokontany,
        on_delete=models.PROTECT,
        related_name='villages',
        verbose_name="Fokontany"
    )
    nom = models.CharField(max_length=100, verbose_name="Nom du village")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Village"
        verbose_name_plural = "Villages"
        ordering = ['nom']
        unique_together = ['fokontany', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.fokontany.nom})"


class Agence(models.Model):
    """Agence RAMEX — pas systématique par district"""
    nom = models.CharField(max_length=100, verbose_name="Nom de l'agence")
    code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Code")
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name='agences',
        verbose_name="District"
    )
    actif = models.BooleanField(default=True, verbose_name="Active")
    adresse = models.CharField(max_length=200, blank=True, verbose_name="Adresse")
    telephone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Agence RAMEX"
        verbose_name_plural = "Agences RAMEX"
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.district.nom})"


class StructureIntermediaire(models.Model):
    """Structure intermédiaire — représentants des producteurs par Fokontany"""
    fokontany = models.ForeignKey(
        Fokontany,
        on_delete=models.PROTECT,
        related_name='structures_intermediaires',
        verbose_name="Fokontany"
    )
    cooperative = models.ForeignKey(
        'cooperatives.Cooperative',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='structures_intermediaires',
        verbose_name="Coopérative"
    )
    nom = models.CharField(max_length=200, verbose_name="Nom du représentant")
    telephone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    actif = models.BooleanField(default=True, verbose_name="Active")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Structure intermédiaire"
        verbose_name_plural = "Structures intermédiaires"
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} - {self.fokontany.nom}"