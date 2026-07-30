#!/bin/bash
cd /c/Users/GCA19433/Desktop/mkj
git add accounts/middleware.py accounts/models.py mkj_cms/settings.py mkj_cms/web_views.py templates/ligi/wscc/dashboard.html accounts/migrations/0022_user_current_session_key.py
git commit -m "WSCC dashboard redesign + single-session enforcement + migrations"
git push
echo "DONE: $(git log --oneline -1)"
rm -f push.sh
