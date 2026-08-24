from django.db import migrations

# Mapping des anciens codes texte de BonCollecte.certification
# vers les codes du référentiel TypeCertification (matching case-insensitive).
CERTIFICATION_CODE_MAPPING = {
    'g4g': 'G4G',
    'bio': 'BIO',
    'ra': 'RA',
    'ffl': 'FFL',
    'rauebt': 'UEBT',
}


def migrate_certification_forwards(apps, schema_editor):
    BonCollecte = apps.get_model('tracabilite', 'BonCollecte')
    TypeCertification = apps.get_model('formations', 'TypeCertification')

    # Index des types de certification par code (insensible à la casse)
    type_index = {}
    for tc in TypeCertification.objects.all():
        if tc.code:
            type_index[tc.code.lower()] = tc

    for bc in BonCollecte.objects.all().iterator():
        if not bc.certification:
            continue
        target = CERTIFICATION_CODE_MAPPING.get(bc.certification, bc.certification)
        tc = type_index.get(target.lower())
        if tc:
            bc.type_certification = tc
            bc.save(update_fields=['type_certification'])


def migrate_certification_backwards(apps, schema_editor):
    # Pas de restauration fiable des données de la FK — on ne fait rien.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tracabilite', '0007_boncollecte_type_certification_and_more'),
        ('formations', '0003_activitecertification_certification_cooperative_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_certification_forwards, migrate_certification_backwards),
    ]