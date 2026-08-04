"""
Management command: simplify_registration_codes

Rewrites existing CountyPlayer registration codes from the old verbose format
    LM-KAT-VM-000003
to the new clean format
    LM-KAT-VM-3

Only touches ward-level players whose current code matches the old zero-padded
pattern (LM-XXX-XX-DDDDDD where DDDDDD has leading zeros).
Players with already-simple codes (no leading zeros) or blank codes are skipped.

Run once after deploying the updated _generate_registration_code logic:
    python manage.py simplify_registration_codes
    python manage.py simplify_registration_codes --dry-run
"""
import re
from django.core.management.base import BaseCommand
from django.db import transaction


OLD_CODE_RE = re.compile(r'^(LM-[A-Z0-9]+-[A-Z0-9]+-)(0+)(\d+)$')


class Command(BaseCommand):
    help = 'Rewrite zero-padded registration codes to simple numeric suffix'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would change without writing anything',
        )

    def handle(self, *args, **options):
        from teams.models import CountyPlayer

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be saved'))

        # Only ward-level players with a code that has leading zeros
        players = CountyPlayer.objects.filter(
            discipline__level='ward',
            registration_code__regex=r'^LM-[A-Z0-9]+-[A-Z0-9]+-0\d+$',
        ).select_related('discipline').order_by('discipline__ward', 'discipline__sport_type', 'pk')

        total = players.count()
        self.stdout.write(f'Found {total} player(s) with old-style codes to update.')

        if total == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to do.'))
            return

        updated = 0
        skipped = 0
        conflicts = 0

        with transaction.atomic():
            for player in players:
                old_code = player.registration_code
                m = OLD_CODE_RE.match(old_code)
                if not m:
                    skipped += 1
                    continue

                prefix    = m.group(1)          # e.g. "LM-KAT-VM-"
                seq_str   = m.group(2) + m.group(3)  # full numeric part e.g. "000003"
                seq_int   = int(seq_str)         # → 3
                new_code  = f"{prefix}{seq_int}" # → "LM-KAT-VM-3"

                if old_code == new_code:
                    skipped += 1
                    continue

                # Conflict check — new code must not already exist
                if CountyPlayer.objects.filter(registration_code=new_code).exclude(pk=player.pk).exists():
                    self.stdout.write(
                        self.style.ERROR(
                            f'  CONFLICT: {old_code} → {new_code} already taken by another player. Skipping.'
                        )
                    )
                    conflicts += 1
                    continue

                self.stdout.write(f'  {old_code}  →  {new_code}')
                if not dry_run:
                    player.registration_code = new_code
                    player.save(update_fields=['registration_code'])
                updated += 1

            if dry_run:
                # Roll back even the select_for_update side effects
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done.  Updated: {updated}  |  Skipped: {skipped}  |  Conflicts: {conflicts}'
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN complete — nothing was saved.'))
