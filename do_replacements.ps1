
$templateDir = "c:\Users\GCA19433\Desktop\mkj\templates"
$skipFiles = @("home_old_backup.html","home_v2_backup.html")
$skipPaths = @("$templateDir\public\home.html","$templateDir\public\base.html")
$changed = @()

Get-ChildItem -Path $templateDir -Recurse -Filter "*.html" | ForEach-Object {
    $fp = $_.FullName
    $fn = $_.Name
    if ($skipFiles -contains $fn) { return }
    foreach ($sp in $skipPaths) { if ($fp -ieq $sp) { return } }
    
    $orig = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)
    $c = $orig

    # Rule: block title " - MKJ" -> " . MKJ" (using middot U+00B7)
    $c = [regex]::Replace($c,
        '({%[-\s]*block title[-\s]*%})(.*?)({%[-\s]*endblock[-\s]*%})',
        {
            param($m)
            $p = $m.Groups[1].Value
            $t = $m.Groups[2].Value
            $s = $m.Groups[3].Value
            $t = $t -replace ' - MKJ', " `u{00B7} MKJ"
            $t = $t -replace ' - Ligi', " `u{00B7} Ligi"
            $t = $t -replace '  -  ', " `u{00B7} "
            "$p$t$s"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # Rule: visible text in <h1> and <h2>: "  -  " -> " . " and " - " -> " . "
    # Only for heading elements that contain these patterns (avoid code/CSS)
    $c = [regex]::Replace($c,
        '(<h[12][^>]*>)(.*?)(</h[12]>)',
        {
            param($m)
            $o = $m.Groups[1].Value
            $t = $m.Groups[2].Value
            $cl = $m.Groups[3].Value
            # Only replace if not inside JS or CSS context (basic check)
            # Replace double-spaced variant first
            $t = $t -replace '  -  ', " `u{00B7} "
            # Replace standard " - " separator in headings
            # BUT careful: the score "1 - 0" in a match sheet should NOT be changed
            # Safe patterns: "X - MKJ", "X - Ligi", "X - Admin", "X - FKF", "X - WSCC", "X - Ward", "X - Sub"
            # We skip plain " - " that could be scores
            $cl
            "$o$t$cl"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    # Rule: <p> text patterns
    # "Ward Sports Council Chair - " -> "Ward Sports Council Chair . "
    $c = $c -replace 'Ward Sports Council Chair - ', "Ward Sports Council Chair `u{00B7} "
    # "Team Manager - " -> "Team Manager . "  (only in visible text, not in form confirmations)
    # Very targeted: we only replace in <p> and <h1>/<h2> contexts with these exact strings
    $c = [regex]::Replace($c,
        '(<(?:p|h[12])[^>]*>)(.*?Team Manager - .*?)(</(?:p|h[12])>)',
        {
            param($m)
            $o = $m.Groups[1].Value
            $t = $m.Groups[2].Value -replace 'Team Manager - ', "Team Manager `u{00B7} "
            $cl = $m.Groups[3].Value
            "$o$t$cl"
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($fp, $c, [System.Text.Encoding]::UTF8)
        $changed += $fp
        Write-Host "CHANGED: $fp"
    }
}

Write-Host ""
Write-Host "Total changed: $($changed.Count)"
