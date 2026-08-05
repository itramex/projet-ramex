# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='villagereference',
            name='region',
            field=models.CharField(blank=True, help_text='Région (ex: Antsiranana)', max_length=150, null=True),
        ),
        migrations.AddIndex(
            model_name='villagereference',
            index=models.Index(fields=['region'], name='dashboard_v_region_idx'),
        ),
        migrations.AlterModelOptions(
            name='villagereference',
            options={'ordering': ['region', 'commune', 'name']},
        ),
    ]
