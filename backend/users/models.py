from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Profil étendu pour les utilisateurs"""
    
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('animateur', 'Animateur terrain'),
        ('superviseur', 'Superviseur'),
        ('agent_collecte', 'Agent de collecte'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='animateur', verbose_name='Rôle')
    telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Téléphone')
    poste = models.CharField(max_length=100, blank=True, null=True, verbose_name='Poste')
    agence = models.ForeignKey(
        'geographie.Agence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Agence RAMEX assignée'
    )
    cooperative = models.ForeignKey(
        'cooperatives.Cooperative',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Coopérative assignée'
    )
    actif = models.BooleanField(default=True, verbose_name='Actif')
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    date_modification = models.DateTimeField(auto_now=True, verbose_name='Dernière modification')
    
    class Meta:
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


class ActivityLog(models.Model):
    """Journal d'activité des utilisateurs"""
    
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('view', 'Consultation'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('other', 'Autre'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs', verbose_name='Utilisateur')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name='Action')
    module = models.CharField(max_length=100, blank=True, null=True, verbose_name='Module')
    description = models.TextField(verbose_name='Description')
    object_type = models.CharField(max_length=100, blank=True, null=True, verbose_name='Type d\'objet')
    object_id = models.IntegerField(blank=True, null=True, verbose_name='ID de l\'objet')
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name='Adresse IP')
    user_agent = models.TextField(blank=True, null=True, verbose_name='User Agent')
    extra_data = models.JSONField(blank=True, null=True, verbose_name='Données supplémentaires')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='Date et heure')
    
    class Meta:
        verbose_name = 'Journal d\'activité'
        verbose_name_plural = 'Journaux d\'activité'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username if self.user else 'Anonyme'} - {self.get_action_display()} - {self.timestamp}"
    
    @classmethod
    def log(cls, user, action, description, module=None, object_type=None, object_id=None, request=None, extra_data=None):
        """Méthode utilitaire pour créer un log facilement"""
        ip_address = None
        user_agent = None
        
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        return cls.objects.create(
            user=user,
            action=action,
            description=description,
            module=module,
            object_type=object_type,
            object_id=object_id,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data
        )


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Créer automatiquement un profil lors de la création d'un utilisateur"""
    if created:
        # Assigner le rôle 'admin' aux superusers, sinon 'animateur' par défaut
        role = 'admin' if instance.is_superuser else 'animateur'
        UserProfile.objects.create(user=instance, role=role)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
