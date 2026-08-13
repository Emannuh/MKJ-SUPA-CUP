# admin_dashboard/activity_middleware.py
"""
Activity logging middleware for MKJ SUPA CUP.

Logs:
  - All POST actions (data changes) with action type + description
  - Portal page visits (GET) for authenticated users — what they accessed
  - Login / Logout are handled directly in web_login_view / web_logout_view

Design choices:
  - GET logging uses a throttle: only logs each unique path once per 5 minutes
    per user session to avoid spamming the log with every click.
  - POST logging fires on every successful (2xx/3xx) write request.
  - Never raises — all exceptions are silently swallowed so logging can
    never break a request.
"""

import json
import re
from django.utils.deprecation import MiddlewareMixin
from .models import ActivityLog


# ── Page-visit labels (GET) ───────────────────────────────────────────────────
# Order matters: first match wins. Use the most-specific patterns first.
PAGE_VISIT_PATTERNS = [
    # Ligi Mashinani — TM portal
    (r'^/ligi/longlist/add-player',              'Opened: Add Player form'),
    (r'^/ligi/longlist/\d+/edit',                'Opened: Edit Player form'),
    (r'^/ligi/longlist',                          'Viewed: Player Longlist'),
    (r'^/ligi/dashboard',                         'Viewed: Team Manager Dashboard'),
    (r'^/ligi/fixtures/\d+/squad',               'Viewed: Squad Selection'),
    (r'^/ligi/fixtures',                          'Viewed: Ward Fixtures'),
    (r'^/ligi/transfers/request',                'Opened: Transfer Request form'),
    (r'^/ligi/transfers',                         'Viewed: Transfers'),
    (r'^/ligi/venues',                            'Viewed: Venues'),
    (r'^/ligi/wscc/longlists/\d+',               'Viewed: Longlist Detail'),
    (r'^/ligi/wscc/longlists',                    'Viewed: Ward Longlists'),
    (r'^/ligi/wscc/dashboard',                    'Viewed: WSCC Dashboard'),
    (r'^/ligi/wscc/teams/\d+/players',           'Viewed: Team Players (WSCC)'),
    (r'^/ligi/wscc/teams',                        'Viewed: Ward Teams (WSCC)'),
    (r'^/ligi/wscc/ward-competition/.*manage',   'Viewed: Ward Competition Management'),
    (r'^/ligi/wscc/ward-competition',             'Viewed: Ward Competition Setup'),
    (r'^/ligi/wscc/transfers',                    'Viewed: Transfers (WSCC)'),
    (r'^/ligi/player-register',                   'Viewed: Ligi Player Register'),
    (r'^/ligi/wscc/ward-players/export',          'Downloaded: Ward Players Export'),
    # Sub-county portal
    (r'^/portal/subcounty/verification/\d+',     'Viewed: Player Verification'),
    (r'^/portal/subcounty/verification',          'Viewed: Verification Dashboard'),
    (r'^/portal/subcounty/competitions/\d+/pools', 'Viewed: Competition Pools'),
    (r'^/portal/subcounty/competitions/\d+',     'Viewed: Competition Management'),
    (r'^/portal/subcounty/competitions',          'Viewed: Sub-County Competitions'),
    (r'^/portal/subcounty/allstars',              'Viewed: All Stars'),
    (r'^/portal/subcounty',                       'Viewed: Sub-County Officer Dashboard'),
    # Admin
    (r'^/portal/admin-dashboard/users/\d+/edit', 'Opened: Edit User form'),
    (r'^/portal/admin-dashboard/users/\d+',      'Viewed: User Detail'),
    (r'^/portal/admin-dashboard/users',           'Viewed: User Management'),
    (r'^/portal/admin-dashboard/emails/\d+',     'Viewed: Email Detail'),
    (r'^/portal/admin-dashboard/emails',          'Viewed: Email Dashboard'),
    (r'^/portal/admin-dashboard/activity-logs/\d+', 'Viewed: Activity Log Detail'),
    (r'^/portal/admin-dashboard/activity-logs',  'Viewed: Activity Logs'),
    (r'^/portal/admin-dashboard/password-reset-requests', 'Viewed: Password Reset Requests'),
    (r'^/portal/admin-dashboard',                'Viewed: Admin Dashboard'),
    (r'^/portal/ligi-registrations/\d+',         'Viewed: Ligi Registration Detail'),
    (r'^/portal/ligi-registrations',              'Viewed: Ligi Registrations'),
    # Portal core
    (r'^/portal/director-sports',                'Viewed: Director of Sports Dashboard'),
    (r'^/portal/chief-sports-officer',           'Viewed: Chief Sports Officer Dashboard'),
    (r'^/portal/squads/\d+/review',              'Viewed: Squad Review'),
    (r'^/portal/squads/review',                  'Viewed: Squad Review List'),
    (r'^/portal/reports/\d+/review',             'Viewed: Match Report Review'),
    (r'^/portal/reports/\d+',                    'Viewed: Match Report Detail'),
    (r'^/portal/teams/\d+',                      'Viewed: Team Detail'),
    (r'^/portal/teams',                           'Viewed: Teams'),
    (r'^/portal/competitions/\d+',               'Viewed: Competition Detail'),
    (r'^/portal/competitions',                    'Viewed: Competitions'),
    (r'^/portal/cm/competitions',                'Viewed: Competition Management'),
    (r'^/portal/coordinator/competitions',       'Viewed: Coordinator Competition'),
    (r'^/portal/',                                'Viewed: Portal Dashboard'),
    # Downloads / exports
    (r'/pdf/',                                    'Downloaded: PDF Report'),
    (r'/export/',                                 'Downloaded: Export'),
    (r'/download/',                               'Downloaded: File'),
]

# ── POST action map (unchanged from before, extended with Ligi routes) ────────
POST_ACTION_MAP = {
    # Ligi Mashinani
    '/ligi/longlist/add-player/':           ('PLAYER_CREATE',   '{name} added a new player to longlist'),
    '/ligi/longlist/':                       ('PLAYER_UPDATE',   '{name} updated a player on longlist'),
    '/ligi/longlist/submit/':               ('ADMIN_ACTION',    '{name} submitted longlist for WSCC review'),
    '/ligi/wscc/longlists/':                ('ADMIN_ACTION',    '{name} reviewed a ward longlist'),
    '/ligi/wscc/registrations/':            ('ADMIN_ACTION',    '{name} processed a ward team registration'),
    '/ligi/wscc/teams/':                    ('ADMIN_ACTION',    '{name} managed a ward team'),
    '/ligi/wscc/mark-ligi-complete/':       ('ADMIN_ACTION',    '{name} marked Ligi Mashinani as complete'),
    '/ligi/wscc/ward-competition/':         ('ADMIN_ACTION',    '{name} managed ward competition'),
    '/ligi/wscc/ward-players/export/':      ('ADMIN_ACTION',    '{name} exported ward players'),
    '/ligi/transfers/request/':             ('PLAYER_TRANSFER', '{name} submitted a transfer request'),
    '/ligi/transfers/':                     ('PLAYER_TRANSFER', '{name} actioned a transfer'),
    '/ligi/venues/':                        ('ADMIN_ACTION',    '{name} managed ward venues'),
    '/ligi/substitution/':                  ('ADMIN_ACTION',    '{name} submitted a substitution'),
    # Sub-county
    '/portal/subcounty/verification/':      ('ADMIN_ACTION',    '{name} performed player verification'),
    '/portal/subcounty/competitions/':      ('ADMIN_ACTION',    '{name} managed sub-county competition'),
    '/portal/subcounty/qualify-ward-champion/': ('ADMIN_ACTION', '{name} marked a ward champion'),
    # Admin
    '/portal/admin-dashboard/generate-fixtures/': ('FIXTURE_GENERATE', '{name} generated fixtures'),
    '/portal/admin-dashboard/reschedule-fixtures/': ('MATCH_RESCHEDULE', '{name} rescheduled fixtures'),
    '/portal/admin-dashboard/users/create/': ('USER_CREATE',   '{name} created a new user'),
    '/portal/admin-dashboard/users/':       ('USER_UPDATE',    '{name} updated a user account'),
    '/portal/admin-dashboard/suspensions/': ('SUSPENSION_CREATE', '{name} managed a suspension'),
    '/portal/admin-dashboard/assign-zones/': ('ZONE_ASSIGN',   '{name} assigned a team to a zone'),
    '/portal/admin-dashboard/transfers/':   ('PLAYER_TRANSFER', '{name} processed a transfer'),
    '/portal/admin-dashboard/password-reset-requests/': ('ADMIN_ACTION', '{name} actioned a password reset request'),
    # Portal
    '/portal/teams/':                       ('TEAM_UPDATE',    '{name} updated team information'),
    '/portal/squads/':                      ('SQUAD_APPROVE',  '{name} reviewed a squad submission'),
    '/portal/reports/':                     ('MATCH_REPORT_APPROVE', '{name} reviewed a match report'),
    '/add-player/':                         ('PLAYER_CREATE',  '{name} added a player'),
    '/edit/':                               ('PLAYER_UPDATE',  '{name} edited a player'),
    '/delete/':                             ('PLAYER_DELETE',  '{name} deleted a player'),
    '/squad/':                              ('MATCHDAY_SQUAD_SUBMIT', '{name} submitted a match squad'),
    '/report/':                             ('MATCH_REPORT',   '{name} submitted a match report'),
    '/approve/':                            ('ADMIN_ACTION',   '{name} approved an item'),
    '/reject/':                             ('ADMIN_ACTION',   '{name} rejected an item'),
    '/return/':                             ('ADMIN_ACTION',   '{name} returned an item for corrections'),
    # Password / profile
    '/portal/force-change-password/':       ('PASSWORD_CHANGE', '{name} changed their password (forced)'),
    '/portal/profile/':                     ('USER_UPDATE',    '{name} updated their profile'),
    # Ligi register (public)
    '/ligi/register/':                      ('TEAM_CREATE',    'New Ligi registration submitted'),
}

_THROTTLE_KEY = '_activity_throttle'
_THROTTLE_SECS = 300  # 5 minutes per path per session


class ActivityLoggingMiddleware(MiddlewareMixin):
    """
    Log authenticated portal activity: page visits (GET) and data changes (POST).
    Never raises — silently swallows all errors.
    """

    def process_response(self, request, response):
        try:
            self._log(request, response)
        except Exception:
            pass
        return response

    def _log(self, request, response):
        if not request.user.is_authenticated:
            return

        # Skip static/media/health/API routes
        path = request.path
        if any(path.startswith(p) for p in ('/static/', '/media/', '/health/', '/api/', '/admin/')):
            return
        # Skip AJAX ping / favicon
        if path in ('/favicon.ico',):
            return

        status = response.status_code
        method = request.method

        if method == 'POST' and 200 <= status < 400:
            self._log_post(request, path)
        elif method == 'GET' and status == 200:
            self._log_get(request, path)

    # ── POST ─────────────────────────────────────────────────────────────────

    def _log_post(self, request, path):
        # Skip login/logout — handled elsewhere
        if any(s in path for s in ('/login/', '/logout/', '/magic-login/')):
            return

        action, tmpl = self._match_post(path)
        if not action:
            return

        name = request.user.get_full_name() or request.user.email
        description = tmpl.format(name=name)

        ActivityLog.objects.create(
            user=request.user,
            action=action,
            description=description,
            ip_address=self._get_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            changes_json=self._safe_post_data(request),
        )

    def _match_post(self, path):
        best_action, best_tmpl, best_len = None, None, 0
        for pattern, (action, tmpl) in POST_ACTION_MAP.items():
            if pattern in path and len(pattern) > best_len:
                best_action, best_tmpl, best_len = action, tmpl, len(pattern)
        return best_action, best_tmpl

    # ── GET (page visit) ─────────────────────────────────────────────────────

    def _log_get(self, request, path):
        # Only log portal/ligi pages
        if not (path.startswith('/portal/') or path.startswith('/ligi/')):
            return

        label = self._match_page(path)
        if not label:
            return

        # Throttle: skip if this path was already logged in the last 5 min
        throttle = request.session.get(_THROTTLE_KEY, {})
        from django.utils import timezone as _tz
        import time
        now = time.time()
        last = throttle.get(path, 0)
        if now - last < _THROTTLE_SECS:
            return
        throttle[path] = now
        # Prune old entries to keep session small
        throttle = {k: v for k, v in throttle.items() if now - v < _THROTTLE_SECS}
        try:
            request.session[_THROTTLE_KEY] = throttle
            request.session.modified = True
        except Exception:
            pass

        name = request.user.get_full_name() or request.user.email
        ActivityLog.objects.create(
            user=request.user,
            action='ADMIN_ACTION',
            description=f'{name} — {label}',
            ip_address=self._get_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            extra_data={'page_visit': True, 'path': path},
        )

    def _match_page(self, path):
        for pattern, label in PAGE_VISIT_PATTERNS:
            if re.search(pattern, path):
                return label
        return None

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')
        return ip[:45]

    def _safe_post_data(self, request):
        SKIP = {'password', 'password1', 'password2', 'csrfmiddlewaretoken',
                'new_password', 'confirm_password', 'token'}
        try:
            data = {k: v for k, v in request.POST.items()
                    if k not in SKIP and not k.startswith('_')}
            s = json.dumps(data, default=str)
            return s[:5000] if len(s) > 5000 else s
        except Exception:
            return '{}'
