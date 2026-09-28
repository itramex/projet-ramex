from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('tracabilite', '0010_alter_boncollecte_montant_total_achat'),
    ]

    operations = [
        migrations.AddField(
            model_name='fichecollecte',
            name='date_modification',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
