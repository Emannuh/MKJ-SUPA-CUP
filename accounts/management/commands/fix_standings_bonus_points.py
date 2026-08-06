"""
Management command: fix_standings_bonus_points

Fixes incorrectly inflated standings caused by bonus_points being added
for football wins/draws in addition to the won/drawn fields.

The PoolTeam.points property already computes (won×3)+drawn for football,
so bonus_points for football should be 0 (used only for deductions).
Same for handball: (won×2)+drawn is already correct.

Run once after deploying the _update_pool_standings fix:
    python manage.py fix_standings_bonus_points
    python manage.py fix_standings_bonus_points --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Zero out erroneous bonus_points for football/handball PoolTeam records'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Show what would change without saving')

    def handle(self, *args, **options):
        from competitions.models import PoolTeam
        from matches.models import get_sport_family

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing will be saved'))

        # Football and handball: bonus_points should only hold deductions (negative)
        # Any positive bonus_points here are the double-counted win/draw points
        pool_teams = PoolTeam.objects.filter(bonus_points__gt=0).select_related(
            'pool__competition', 'team'
        )

        fixed = 0
        skipped = 0

        with transaction.atomic():
            for pt in pool_teams:
                sport = pt.pool.competition.sport_type if pt.pool and pt.pool.competition else None
                if not sport:
                    skipped += 1
                    continue

                family = get_sport_family(sport)
                if family in ('football', 'handball'):
                    old_pts = pt.points
                    self.stdout.write(
                        f'  {pt.team.name} [{family}] — '
                        f'won={pt.won} drawn={pt.drawn} '
                        f'bonus_points={pt.bonus_points} → 0  '
                        f'(pts: {old_pts} → {pt.won * (3 if family == "football" else 2) + pt.drawn})'
                    )
                    if not dry_run:
                        pt.bonus_points = 0
                        pt.save(update_fields=['bonus_points'])
                    fixed += 1
                else:
                    skipped += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Fixed: {fixed} | Skipped (volleyball/basketball): {skipped}'
        ))
