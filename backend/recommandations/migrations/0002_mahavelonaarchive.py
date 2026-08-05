from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('recommandations', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MahavelonaArchive',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('annee_reference', models.PositiveIntegerField(verbose_name='Année de référence')),
                ('criteres_version', models.CharField(max_length=50, verbose_name='Version critères')),
                ('archive_json', models.JSONField(default=dict, verbose_name='Archive JSON')),
                ('date_creation', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Date de création')),
                ('cree_par', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mahavelona_archives_creees', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Archive Mahavelona',
                'verbose_name_plural': 'Archives Mahavelona',
                'ordering': ['-annee_reference', '-date_creation'],
                'indexes': [models.Index(fields=['annee_reference', 'criteres_version'], name='recommandat_annee_r_94de3c_idx')],
            },
        ),
    ]
