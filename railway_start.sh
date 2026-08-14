#!/bin/bash
set -e

echo "=== Running collectstatic ==="
python manage.py collectstatic --noinput

echo "=== Running migrations ==="
python manage.py migrate --noinput

echo "=== Backfilling Ligi Mashinani county_discipline FK ==="
python manage.py backfill_ligi_county_discipline || echo "Backfill skipped or already done"

echo "=== Cleaning up stale ward Team records ==="
python manage.py cleanup_stale_ward_teams || echo "Cleanup skipped"

echo "=== Simplifying player registration codes ==="
python manage.py simplify_registration_codes || echo "Code simplification skipped"

echo "=== Syncing ward team names from Ligi registrations ==="
python manage.py shell -c "
from teams.models import LigiMashinaniRegistration, Team, CountyDiscipline
updated = 0
skipped_conflict = 0
for reg in LigiMashinaniRegistration.objects.filter(status='approved'):
    # Skip if target name is already taken by a DIFFERENT team
    if Team.objects.filter(name=reg.team_name).exclude(
        source_discipline_id=reg.county_discipline_id
    ).exists():
        print(f'  SKIP conflict: {reg.team_name!r} already used by another team')
        skipped_conflict += 1
        continue
    # Try FK first
    if reg.county_discipline_id:
        team = Team.objects.filter(source_discipline_id=reg.county_discipline_id).first()
        if team and team.name != reg.team_name:
            print(f'  FK match: {team.name!r} -> {reg.team_name!r}')
            team.name = reg.team_name
            team.save(update_fields=['name'])
            updated += 1
            continue
    # Fallback: case-insensitive ward + sub_county + discipline
    cds = CountyDiscipline.objects.filter(
        ward__iexact=reg.ward.strip(),
        sub_county__iexact=reg.sub_county.strip(),
        sport_type=reg.discipline,
        level='ward',
    )
    for cd in cds:
        team = Team.objects.filter(source_discipline=cd).first()
        if team and team.name != reg.team_name:
            print(f'  Ward match: {team.name!r} -> {reg.team_name!r} (ward={reg.ward}, disc={reg.discipline})')
            team.name = reg.team_name
            team.save(update_fields=['name'])
            updated += 1
print(f'Done. Synced {updated} ward team names. Skipped {skipped_conflict} conflicts.')
" || echo "Team name sync skipped"

echo "=== Clearing cache ==="
python manage.py shell -c "from django.core.cache import cache; cache.clear(); print('Cache cleared.')" || echo "Cache clear skipped (no Redis yet)"

echo "=== Ensuring superuser ==="
python manage.py ensure_superuser

echo "=== Starting gunicorn ==="
exec gunicorn mkj_cms.wsgi \
  --bind 0.0.0.0:$PORT \
  --workers 3 \
  --threads 2 \
  --timeout 180 \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  --preload \
  --access-logfile - \
  --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" %(L)ss'
