from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('producteurs', '0020_historicalproducteur_commune_ref_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dotation',
            name='date_modification',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
