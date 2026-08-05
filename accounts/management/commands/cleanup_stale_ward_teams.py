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

        # Also catch teams with no source_discipline but named with Ligi patterns
        # whose contact_email is not in any approved registration
        stale_no_disc = Team.objects.filter(
            source_discipline__isnull=True,
            contact_email__isnull=False,
        ).exclude(
            contact_email__in=approved_emails
        ).exclude(
            contact_email=''
        )

        # Also catch stale "Makueni Soccer" teams (named by old auto-generate logic)
        stale_named = Team.objects.filter(
            name__icontains='Soccer (Men)',
        ).exclude(
            source_discipline_id__in=approved_cds
        ).exclude(
            contact_email__in=approved_emails
        )

        count = stale.count() + stale_no_disc.count() + stale_named.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale ward Team records found. Nothing to do.'))
            return

        self.stdout.write(f'Found {count} stale ward Team record(s):')
        for t in list(stale) + list(stale_no_disc) + list(stale_named):
            self.stdout.write(f'  - {t.name} (email: {t.contact_email}, source_disc: {t.source_discipline_id})')

        stale.delete()
        stale_no_disc.delete()
        stale_named.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} stale ward Team record(s).'))
