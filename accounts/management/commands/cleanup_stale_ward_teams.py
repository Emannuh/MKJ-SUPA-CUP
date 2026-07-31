"""
Management command: remove stale ward-level Team records that are not linked
to any approved LigiMashinaniRegistration. These are legacy records from before
the county_discipline FK was introduced and they pollute the pool team dropdown.

Run once:
    python manage.py cleanup_stale_ward_teams
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Remove stale ward-level Team records not linked to approved Ligi Mashinani registrations'

    def handle(self, *args, **options):
        from teams.models import Team, LigiMashinaniRegistration

        approved_emails = set(
            LigiMashinaniRegistration.objects.filter(status='approved')
            .values_list('manager_email', flat=True)
        )
        approved_cds = set(
            LigiMashinaniRegistration.objects.filter(
                status='approved', county_discipline__isnull=False
            ).values_list('county_discipline_id', flat=True)
        )

        # Ward-level Team records whose source_discipline is NOT linked to
        # any approved registration's county_discipline
        stale = Team.objects.filter(
            source_discipline__level='ward',
        ).exclude(
            source_discipline_id__in=approved_cds
        )

        count = stale.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale ward Team records found. Nothing to do.'))
            return

        self.stdout.write(f'Found {count} stale ward Team record(s):')
        for t in stale:
            self.stdout.write(f'  - {t.name} (email: {t.contact_email})')

        stale.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} stale ward Team record(s).'))
