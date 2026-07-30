"""
Data migration: backfill CountyPlayer.registered_by from the Team.manager
linked via Team.source_discipline → CountyDiscipline.

For each ward-level CountyDiscipline:
  - Find the Team whose source_discipline = that discipline
  - Set registered_by = team.manager for all CountyPlayers in that discipline
    where registered_by is currently NULL

This fixes the existing data where two teams shared a discipline and players
appeared in the wrong manager's dashboard.
"""
from django.db import migrations


def backfill_registered_by(apps, schema_editor):
    CountyPlayer = apps.get_model('teams', 'CountyPlayer')
    Team = apps.get_model('teams', 'Team')

    # Process each ward-level team that has a manager
    for team in Team.objects.filter(
        source_discipline__isnull=False,
        manager__isnull=False,
        source_discipline__level='ward',
    ).select_related('source_discipline', 'manager'):
        discipline = team.source_discipline
        manager = team.manager

        updated = CountyPlayer.objects.filter(
            discipline=discipline,
            registered_by__isnull=True,
        ).update(registered_by=manager)

        if updated:
            print(
                f'  Backfilled {updated} players in {discipline.ward}, '
                f'{discipline.sub_county} ({discipline.sport_type}) → {manager.email}'
            )


def reverse_backfill(apps, schema_editor):
    # Non-destructive reverse: leave registered_by as-is
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0055_countyplayer_registered_by'),
    ]

    operations = [
        migrations.RunPython(backfill_registered_by, reverse_backfill),
    ]
