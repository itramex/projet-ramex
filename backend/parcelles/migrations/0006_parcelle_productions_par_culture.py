# Generated migration

from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('parcelles', '0005_parcelle_cultures_pratiquees'),
    ]

    operations = [
        migrations.AddField(
            model_name='parcelle',
            name='productions_par_culture',
            field=models.JSONField(blank=True, default=dict, help_text='Dictionnaire des estimations de production par type de culture en kg', verbose_name='Productions estimées par culture (kg)'),
        ),
        migrations.AlterField(
            model_name='parcelle',
            name='estimation_production_kg',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total de toutes les productions (calculé automatiquement si productions_par_culture est rempli)', max_digits=10, validators=[MinValueValidator(0)], verbose_name='Estimation de production totale (kg)'),
        ),
    ]
