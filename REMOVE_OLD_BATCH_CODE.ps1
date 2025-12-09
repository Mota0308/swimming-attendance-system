# PowerShell script to remove old batch operation code
# Usage: Run in PowerShell: .\REMOVE_OLD_BATCH_CODE.ps1

Write-Host "===== Removing Old Batch Operation Code =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Read supervisor-functions.js
$jsPath = "Web_app/supervisor-functions.js"
$jsContent = Get-Content $jsPath -Encoding UTF8

# Find the line with old batch modify code
$startLine = -1
for ($i = 0; $i -lt $jsContent.Length; $i++) {
    if ($jsContent[$i] -match "批量修改功能.*旧版本") {
        $startLine = $i
        break
    }
}

if ($startLine -lt 0) {
    Write-Host "No old batch code found, exiting" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found old batch code at line: $($startLine + 1)" -ForegroundColor Cyan

# Find the first window.onRegularLeaveDateChange after the old batch code
$endLine = -1
for ($i = $startLine + 1; $i -lt $jsContent.Length; $i++) {
    if ($jsContent[$i] -match "^window\.onRegularLeaveDateChange") {
        $endLine = $i
        break
    }
}

if ($endLine -lt 0) {
    Write-Host "Could not find end marker" -ForegroundColor Red
    exit 1
}

$linesRemoved = $endLine - $startLine
Write-Host "Removing $linesRemoved lines (from line $($startLine + 1) to line $endLine)" -ForegroundColor Yellow

# Keep content before and after the old batch code
$newContent = $jsContent[0..($startLine - 1)] + $jsContent[$endLine..($jsContent.Length - 1)]

# Write back
[System.IO.File]::WriteAllLines($jsPath, $newContent, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Successfully removed old code" -ForegroundColor Green
Write-Host "Old size: $($jsContent.Length) lines" -ForegroundColor Cyan
Write-Host "New size: $($newContent.Length) lines" -ForegroundColor Cyan
Write-Host ""




Write-Host "===== Removing Old Batch Operation Code =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Read supervisor-functions.js
$jsPath = "Web_app/supervisor-functions.js"
$jsContent = Get-Content $jsPath -Encoding UTF8

# Find the line with old batch modify code
$startLine = -1
for ($i = 0; $i -lt $jsContent.Length; $i++) {
    if ($jsContent[$i] -match "批量修改功能.*旧版本") {
        $startLine = $i
        break
    }
}

if ($startLine -lt 0) {
    Write-Host "No old batch code found, exiting" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found old batch code at line: $($startLine + 1)" -ForegroundColor Cyan

# Find the first window.onRegularLeaveDateChange after the old batch code
$endLine = -1
for ($i = $startLine + 1; $i -lt $jsContent.Length; $i++) {
    if ($jsContent[$i] -match "^window\.onRegularLeaveDateChange") {
        $endLine = $i
        break
    }
}

if ($endLine -lt 0) {
    Write-Host "Could not find end marker" -ForegroundColor Red
    exit 1
}

$linesRemoved = $endLine - $startLine
Write-Host "Removing $linesRemoved lines (from line $($startLine + 1) to line $endLine)" -ForegroundColor Yellow

# Keep content before and after the old batch code
$newContent = $jsContent[0..($startLine - 1)] + $jsContent[$endLine..($jsContent.Length - 1)]

# Write back
[System.IO.File]::WriteAllLines($jsPath, $newContent, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Successfully removed old code" -ForegroundColor Green
Write-Host "Old size: $($jsContent.Length) lines" -ForegroundColor Cyan
Write-Host "New size: $($newContent.Length) lines" -ForegroundColor Cyan
Write-Host ""











