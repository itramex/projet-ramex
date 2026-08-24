from django.db import migrations

# Correspondance anciens → nouveaux rôles (Phase 2 — RBAC)
ROLE_MAPPING = {
    'admin': 'admin',             # Administrateur        → Administrateur
    'manager': 'superviseur',     # Gestionnaire          → Superviseur
    'agent': 'animateur',         # Agent de terrain      → Animateur terrain
    'viewer': 'animateur',        # Visualiseur (lecture) → Animateur terrain
}


def migrate_roles_forwards(apps, schema_editor):
    UserProfile = apps.get_model('users', 'UserProfile')
    for profile in UserProfile.objects.all():
        profile.role = ROLE_MAPPING.get(profile.role, 'animateur')
        profile.save(update_fields=['role'])


def migrate_roles_backwards(apps, schema_editor):
    """Restauration approximative (anonymisée vers les anciens rôles)."""
    reverse_mapping = {
        'admin': 'admin',
        'superviseur': 'manager',
        'animateur': 'agent',
        'agent_collecte': 'agent',
    }
    UserProfile = apps.get_model('users', 'UserProfile')
    for profile in UserProfile.objects.all():
        profile.role = reverse_mapping.get(profile.role, 'viewer')
        profile.save(update_fields=['role'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_userprofile_agence_alter_userprofile_role'),
    ]

    operations = [
        migrations.RunPython(migrate_roles_forwards, migrate_roles_backwards),
    ]