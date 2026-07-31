"""
Management command: backfill county_discipline FK on LigiMashinaniRegistration
for teams that were approved BEFORE migration 0060 added the FK field.

Run once after deploying migration 0060:
    python manage.py backfill_ligi_county_discipline
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Backfill county_discipline FK on LigiMashinaniRegistration for legacy approved teams'

    def handle(self, *args, **options):
        from teams.models import (
            LigiMashinaniRegistration,
            CountyDiscipline,
            CountyRegistration,
            WardLonglist,
        )
        from django.utils import timezone

        regs = LigiMashinaniRegistration.objects.filter(
            status='approved',
            county_discipline__isnull=True,
        )

        self.stdout.write(f'Found {regs.count()} approved registrations without county_discipline FK.')

        fixed = 0
        created = 0
        skipped = 0

        for reg in regs:
            # Try to find an existing CountyDiscipline that matches this reg
            # but is not already linked to another registration
            existing_cd = CountyDiscipline.objects.filter(
                level='ward',
                ward=reg.ward,
                sub_county=reg.sub_county,
                sport_type=reg.discipline,
                ligi_registration__isnull=True,  # not yet linked
            ).first()

            if existing_cd:
                with transaction.atomic():
                    reg.county_discipline = existing_cd
                    reg.save(update_fields=['county_discipline'])
                    # Ensure WardLonglist exists
                    WardLonglist.objects.get_or_create(
                        discipline=existing_cd,
                        defaults={'status': 'draft'},
                    )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Linked {reg.team_name} ({reg.ward}) -> existing CD #{existing_cd.pk}'
                    )
                )
                fixed += 1
            else:
                # No existing unlinked CD — create a new one
                try:
                    makueni_reg = CountyRegistration.objects.filter(
                        county='Makueni'
                    ).first()
                    if not makueni_reg:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  Skipping {reg.team_name} — no Makueni CountyRegistration found'
                            )
                        )
                        skipped += 1
                        continue

                    with transaction.atomic():
                        cd = CountyDiscipline.objects.create(
                            registration=makueni_reg,
                            sport_type=reg.discipline,
                            sub_county=reg.sub_county,
                            level='ward',
                            ward=reg.ward,
                        )
                        reg.county_discipline = cd
                        reg.save(update_fields=['county_discipline'])
                        WardLonglist.objects.get_or_create(
                            discipline=cd,
                            defaults={'status': 'draft'},
                        )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  Created new CD #{cd.pk} for {reg.team_name} ({reg.ward})'
                        )
                    )
                    created += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  ERROR for {reg.team_name}: {e}'
                        )
                    )
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Fixed: {fixed}, Created: {created}, Skipped: {skipped}'
            )
        )
