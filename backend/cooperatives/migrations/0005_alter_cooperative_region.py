# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cooperatives', '0004_cooperative_annee_creation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cooperative',
            name='region',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='Région'),
        ),
    ]
