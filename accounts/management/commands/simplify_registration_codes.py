"""
Management command: simplify_registration_codes

Rewrites existing CountyPlayer registration codes to the new short format:
    Old: LM-KAT-VM-3  or  LMKATVM3  or  LM-KAT-VM-000003
    New: KV3

Run once after deploying the updated _generate_registration_code logic:
    python manage.py simplify_registration_codes
    python manage.py simplify_registration_codes --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Rewrite old verbose registration codes to the new short W2+S+N format'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Show what would change without saving')

    def handle(self, *args, **options):
        from teams.models import CountyPlayer
        from matches.models import get_sport_family

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be saved'))

        sport_char_map = {
            'football_men': 'F', 'football_women': 'F',
            'volleyball_men': 'V', 'volleyball_women': 'V',
            'basketball_men': 'B', 'basketball_women': 'B',
            'basketball_3x3_men': 'B', 'basketball_3x3_women': 'B',
            'handball_men': 'H', 'handball_women': 'H',
            'beach_volleyball': 'E', 'beach_handball': 'A',
        }

        # Fetch all ward players that have any old-style code
        players = CountyPlayer.objects.filter(
            discipline__level='ward',
        ).exclude(registration_code='').select_related('discipline').order_by(
            'discipline__ward', 'discipline__sport_type', 'pk'
        )

        total = players.count()
        self.stdout.write(f'Found {total} ward player(s) with registration codes.')

        updated = skipped = conflicts = 0

        # Build a per-prefix counter to assign new sequential numbers
        prefix_counters = {}  # prefix -> next available seq

        with transaction.atomic():
            for player in players:
                old_code = player.registration_code
                disc = player.discipline
                ward_abbrev = (disc.ward or 'WR')[:2].upper()
                sport_char  = sport_char_map.get(disc.sport_type, 'X')
                new_prefix  = f"{ward_abbrev}{sport_char}"

                # If already in correct format, skip
                if old_code.startswith(new_prefix):
                    try:
                        int(old_code[len(new_prefix):])
                        skipped += 1
                        continue
                    except ValueError:
                        pass

                # Assign a new sequential number for this prefix
                if new_prefix not in prefix_counters:
                    # Find the highest number already used with this prefix
                    existing = CountyPlayer.objects.filter(
                        registration_code__startswith=new_prefix
                    ).values_list('registration_code', flat=True)
                    used = set()
                    for c in existing:
                        try:
                            used.add(int(c[len(new_prefix):]))
                        except ValueError:
                            pass
                    prefix_counters[new_prefix] = max(used, default=0) + 1

                seq = prefix_counters[new_prefix]
                new_code = f"{new_prefix}{seq}"
                prefix_counters[new_prefix] = seq + 1

                # Conflict check
                if CountyPlayer.objects.filter(registration_code=new_code).exclude(pk=player.pk).exists():
                    self.stdout.write(self.style.ERROR(
                        f'  CONFLICT {old_code} → {new_code} already taken. Skipping.'
                    ))
                    conflicts += 1
                    continue

                self.stdout.write(f'  {old_code:30s} → {new_code}')
                if not dry_run:
                    player.registration_code = new_code
                    player.save(update_fields=['registration_code'])
                updated += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Updated: {updated}  |  Already correct: {skipped}  |  Conflicts: {conflicts}'
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing was saved.'))
