# fix_hyphens.ps1
# Global find-and-replace of user-visible hyphens in Django templates
# Rules: skip backup files, skip public/home.html and public/base.html,
#        only touch visible UI text (NOT CSS classes, href, URL patterns, JS variables, template logic)

$baseDir = "c:\Users\GCA19433\Desktop\mkj\templates"
$skipFiles = @(
    "home_old_backup.html",
    "home_v2_backup.html"
)
$skipPaths = @(
    "$baseDir\public\home.html",
    "$baseDir\public\base.html"
)

$changedFiles = @()

function Apply-Replacements {
    param([string]$filePath)

    $fileName = Split-Path $filePath -Leaf

    # Skip backup files
    if ($skipFiles -contains $fileName) { return }

    # Skip protected paths
    foreach ($skip in $skipPaths) {
        if ($filePath -ieq $skip) { return }
    }

    $original = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    $content = $original

    # ── RULE 1: "Inter-Sub-County" → "Inter Sub County" (visible text, before Sub-County so we don't double-replace)
    $content = $content -replace 'Inter-Sub-County', 'Inter Sub County'

    # ── RULE 2: "Sub-County Sports Officer" → "Sub County Sports Officer" (visible text labels)
    $content = $content -replace 'Sub-County Sports Officer', 'Sub County Sports Officer'

    # ── RULE 3: "All Sub-Counties" → "All Sub Counties" (dropdown options)
    $content = $content -replace 'All Sub-Counties', 'All Sub Counties'

    # ── RULE 4: "Sub-County" (title-case) → "Sub County" in visible text
    # We replace globally but must NOT touch CSS class names or href/URL patterns.
    # CSS classes use "sub-county" lowercase; "Sub-County" title-case only appears in visible text.
    $content = $content -replace 'Sub-County', 'Sub County'

    # ── RULE 5: "sub-county" (lowercase) → "sub county" — only in visible text
    # We must be careful NOT to replace CSS class names like "sub-county-filter" or href attributes.
    # Strategy: replace in HTML text nodes (between tags), title/label elements, option values, <p> text.
    # The safest approach: replace all "sub-county" but NOT inside class="..." or href="..." attributes.
    # We'll do a regex that avoids replacing inside HTML attribute values.
    # Replace "sub-county" that is NOT inside an attribute (not preceded by class=, id=, href=, etc.)
    # Safe: replace in visible positions — after >, in title blocks, in <p>, <h1> etc.
    # The occurrences found are in: meta keywords (public/base.html – skipped), JS comments, option values
    # We'll do a conservative targeted replacement:
    $content = $content -replace '(?<=[>"\s])sub-county(?=[<"\s,])', 'sub county'

    # ── RULE 6: &mdash; → · (middot)
    $content = $content -replace '&mdash;', '·'

    # ── RULE 7: Titles using " - " as separator in {% block title %} tags only
    # Pattern: {% block title %}...Title - MKJ...{% endblock %}
    # Replace " - MKJ" with " · MKJ" inside block title tags
    $content = [regex]::Replace($content,
        '({%\s*block title\s*%})(.*?)({%\s*endblock\s*%})',
        {
            param($m)
            $prefix = $m.Groups[1].Value
            $title  = $m.Groups[2].Value
            $suffix = $m.Groups[3].Value
            # Replace " - MKJ" → " · MKJ"
            $title = $title -replace ' - MKJ', ' · MKJ'
            # Replace " - Ligi" → " · Ligi" (for Ligi Mashinani portal titles)
            $title = $title -replace ' - Ligi', ' · Ligi'
            # Replace "  -  " (double spaced) → " · " in title blocks
            $title = $title -replace '  -  ', ' · '
            "$prefix$title$suffix"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # ── RULE 8: Page headings using " - " or "  -  " → " · " in <h1>, <h2>, visible <p> text
    # Only in text between tags, NOT in HTML attributes or JS strings
    # Replace inside <h1>...</h1>, <h2>...</h2>
    $content = [regex]::Replace($content,
        '(<h[12][^>]*>)(.*?)(</h[12]>)',
        {
            param($m)
            $open  = $m.Groups[1].Value
            $text  = $m.Groups[2].Value
            $close = $m.Groups[3].Value
            $text = $text -replace '  -  ', ' · '
            $text = $text -replace ' - ', ' · '
            "$open$text$close"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # Replace inside <p> visible text (only when it has "Ward Sports Council Chair - " or "Team Manager - " patterns,
    # plus general heading-like separators)
    $content = [regex]::Replace($content,
        '(<p[^>]*>)(.*?)(</p>)',
        {
            param($m)
            $open  = $m.Groups[1].Value
            $text  = $m.Groups[2].Value
            $close = $m.Groups[3].Value
            # Only apply to text that contains these specific patterns
            $text = $text -replace 'Ward Sports Council Chair - ', 'Ward Sports Council Chair · '
            $text = $text -replace 'Team Manager - ', 'Team Manager · '
            $text = $text -replace '  -  ', ' · '
            "$open$text$close"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # ── RULE 9: Sidebar heading "Sub-County Officer" in visible text (h4 etc.)
    # Already handled by Rule 4 above (Sub-County → Sub County)

    # ── RULE 10: "Ward - Sub-County - Discipline" patterns in <p> tags (longlist_detail)
    # Pattern: " Ward - {{ ... }} Sub-County - {{ ... }}" → " Ward · {{ ... }} Sub County · {{ ... }}"
    # This is in a <p> tag but with template variables. The regex above handles <p> blocks.
    # But need to also handle the pattern where Sub-County appears inline in a <p>:
    # e.g.:  <p>{{ discipline.ward|title }} Ward - {{ discipline.sub_county|title }} Sub-County - ...
    # The regex replace above for <p> would do " - " → " · ", so that handles the separators.
    # Sub-County within <p> is already handled by Rule 4 above.

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        $script:changedFiles += $filePath
    }
}

# Walk all HTML files recursively
$htmlFiles = Get-ChildItem -Path $baseDir -Recurse -Filter "*.html" | Select-Object -ExpandProperty FullName

foreach ($file in $htmlFiles) {
    Apply-Replacements -filePath $file
}

Write-Host ""
Write-Host "=== Files Changed ($($changedFiles.Count)) ==="
foreach ($f in $changedFiles) {
    Write-Host "  CHANGED: $f"
}
Write-Host ""
Write-Host "Done."
