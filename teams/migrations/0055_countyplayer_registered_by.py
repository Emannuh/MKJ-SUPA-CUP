from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0054_add_ward_venue_model'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='countyplayer',
            name='registered_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Team manager who registered this player',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='registered_players',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
