# Generated migration for activites fields with correct types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('producteurs', '0001_initial'),
    ]

    operations = [
        # Ajouter les champs au modèle Producteur
        # dotation, agr1, agr2 sont des TextField (description de l'activité)
        # mahavelona est un BooleanField
        migrations.AddField(
            model_name='producteur',
            name='dotation',
            field=models.TextField(blank=True, verbose_name='Dotation (activité)', help_text='Type de dotation reçue'),
        ),
        migrations.AddField(
            model_name='producteur',
            name='agr1',
            field=models.TextField(blank=True, verbose_name='AGR 1 (Activité génératrice de revenus 1)', help_text="Description de l'AGR 1"),
        ),
        migrations.AddField(
            model_name='producteur',
            name='agr2',
            field=models.TextField(blank=True, verbose_name='AGR 2 (Activité génératrice de revenus 2)', help_text="Description de l'AGR 2"),
        ),
        migrations.AddField(
            model_name='producteur',
            name='mahavelona',
            field=models.BooleanField(default=False, verbose_name='Mahavelona (Mutuelle santé)'),
        ),
        
        # Ajouter les mêmes champs au modèle HistoricalProducteur (django-simple-history)
        migrations.AddField(
            model_name='historicalproducteur',
            name='dotation',
            field=models.TextField(blank=True, verbose_name='Dotation (activité)', help_text='Type de dotation reçue'),
        ),
        migrations.AddField(
            model_name='historicalproducteur',
            name='agr1',
            field=models.TextField(blank=True, verbose_name='AGR 1 (Activité génératrice de revenus 1)', help_text="Description de l'AGR 1"),
        ),
        migrations.AddField(
            model_name='historicalproducteur',
            name='agr2',
            field=models.TextField(blank=True, verbose_name='AGR 2 (Activité génératrice de revenus 2)', help_text="Description de l'AGR 2"),
        ),
        migrations.AddField(
            model_name='historicalproducteur',
            name='mahavelona',
            field=models.BooleanField(default=False, verbose_name='Mahavelona (Mutuelle santé)'),
        ),
    ]
