# PowerShell script: Auto-replace batch operation code
# Usage: Run in PowerShell: .\REPLACE_BATCH_OPERATION.ps1

Write-Host "===== Batch Operation Code Replacement Script =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Define file paths
$webAppDir = "Web_app"
$extractionDir = "$webAppDir/batch-operation-extraction"

# 1. Backup existing files
Write-Host "Step 1: Backing up existing files..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Copy-Item "$webAppDir/supervisor-functions.js" "$backupDir/" -Force
Copy-Item "$webAppDir/index.html" "$backupDir/" -Force
Copy-Item "$webAppDir/styles.css" "$backupDir/" -Force

Write-Host "  Backed up to: $backupDir" -ForegroundColor Green
Write-Host ""

# 2. Process supervisor-functions.js
Write-Host "Step 2: Replacing batch operation code in supervisor-functions.js..." -ForegroundColor Yellow

# Read files
$supervisorContent = Get-Content "$webAppDir/supervisor-functions.js" -Raw -Encoding UTF8
$batchOperationContent = Get-Content "$extractionDir/batch-operation-supervisor.js" -Raw -Encoding UTF8

# Find the part to keep (before batch operation code)
$marker = "window.onRegularLeaveDateChange = onRegularLeaveDateChange;"
$markerIndex = $supervisorContent.IndexOf($marker)

if ($markerIndex -lt 0) {
    Write-Host "  Error: Could not find marker position!" -ForegroundColor Red
    exit 1
}

# Keep all code before marker
$keepContent = $supervisorContent.Substring(0, $markerIndex + $marker.Length)

# Extract batch operation code from batch-operation-supervisor.js (starting from line 2458)
$batchLines = Get-Content "$extractionDir/batch-operation-supervisor.js" -Encoding UTF8
$batchStartLine = 2457  # Line 2458 (array index starts from 0)
$batchCode = $batchLines[$batchStartLine..($batchLines.Length - 1)] -join "`n"

# Merge content
$newSupervisorContent = $keepContent + "`n`n" + $batchCode

# Write file
[System.IO.File]::WriteAllText("$webAppDir/supervisor-functions.js", $newSupervisorContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "  supervisor-functions.js updated successfully" -ForegroundColor Green
Write-Host ""

# 3. Process index.html
Write-Host "Step 3: Replacing batch operation modal in index.html..." -ForegroundColor Yellow

Write-Host "  WARNING: HTML replacement needs to be done manually" -ForegroundColor Magenta
Write-Host "  Please refer to FINAL_REPLACEMENT_INSTRUCTIONS.md for instructions" -ForegroundColor Magenta
Write-Host ""

# 4. Process styles.css
Write-Host "Step 4: Adding batch operation styles to styles.css..." -ForegroundColor Yellow

$stylesContent = Get-Content "$webAppDir/styles.css" -Raw -Encoding UTF8
$batchStyles = Get-Content "$extractionDir/batch-operation-styles.css" -Raw -Encoding UTF8

# Check if batch operation styles are already included
if ($stylesContent -notmatch "/\* ===== Batch Operation Styles =====") {
    $newStylesContent = $stylesContent + "`n`n/* ===== Batch Operation Styles ===== */`n" + $batchStyles
    [System.IO.File]::WriteAllText("$webAppDir/styles.css", $newStylesContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Styles added to styles.css successfully" -ForegroundColor Green
} else {
    Write-Host "  Styles already exist, skipping" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===== Replacement Complete =====" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Manually replace batch operation button and modal in index.html (see FINAL_REPLACEMENT_INSTRUCTIONS.md)" -ForegroundColor White
Write-Host "2. Refresh browser to test functionality" -ForegroundColor White
Write-Host "3. If there are issues, restore files from $backupDir" -ForegroundColor White
Write-Host ""




Write-Host "===== Batch Operation Code Replacement Script =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Define file paths
$webAppDir = "Web_app"
$extractionDir = "$webAppDir/batch-operation-extraction"

# 1. Backup existing files
Write-Host "Step 1: Backing up existing files..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Copy-Item "$webAppDir/supervisor-functions.js" "$backupDir/" -Force
Copy-Item "$webAppDir/index.html" "$backupDir/" -Force
Copy-Item "$webAppDir/styles.css" "$backupDir/" -Force

Write-Host "  Backed up to: $backupDir" -ForegroundColor Green
Write-Host ""

# 2. Process supervisor-functions.js
Write-Host "Step 2: Replacing batch operation code in supervisor-functions.js..." -ForegroundColor Yellow

# Read files
$supervisorContent = Get-Content "$webAppDir/supervisor-functions.js" -Raw -Encoding UTF8
$batchOperationContent = Get-Content "$extractionDir/batch-operation-supervisor.js" -Raw -Encoding UTF8

# Find the part to keep (before batch operation code)
$marker = "window.onRegularLeaveDateChange = onRegularLeaveDateChange;"
$markerIndex = $supervisorContent.IndexOf($marker)

if ($markerIndex -lt 0) {
    Write-Host "  Error: Could not find marker position!" -ForegroundColor Red
    exit 1
}

# Keep all code before marker
$keepContent = $supervisorContent.Substring(0, $markerIndex + $marker.Length)

# Extract batch operation code from batch-operation-supervisor.js (starting from line 2458)
$batchLines = Get-Content "$extractionDir/batch-operation-supervisor.js" -Encoding UTF8
$batchStartLine = 2457  # Line 2458 (array index starts from 0)
$batchCode = $batchLines[$batchStartLine..($batchLines.Length - 1)] -join "`n"

# Merge content
$newSupervisorContent = $keepContent + "`n`n" + $batchCode

# Write file
[System.IO.File]::WriteAllText("$webAppDir/supervisor-functions.js", $newSupervisorContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "  supervisor-functions.js updated successfully" -ForegroundColor Green
Write-Host ""

# 3. Process index.html
Write-Host "Step 3: Replacing batch operation modal in index.html..." -ForegroundColor Yellow

Write-Host "  WARNING: HTML replacement needs to be done manually" -ForegroundColor Magenta
Write-Host "  Please refer to FINAL_REPLACEMENT_INSTRUCTIONS.md for instructions" -ForegroundColor Magenta
Write-Host ""

# 4. Process styles.css
Write-Host "Step 4: Adding batch operation styles to styles.css..." -ForegroundColor Yellow

$stylesContent = Get-Content "$webAppDir/styles.css" -Raw -Encoding UTF8
$batchStyles = Get-Content "$extractionDir/batch-operation-styles.css" -Raw -Encoding UTF8

# Check if batch operation styles are already included
if ($stylesContent -notmatch "/\* ===== Batch Operation Styles =====") {
    $newStylesContent = $stylesContent + "`n`n/* ===== Batch Operation Styles ===== */`n" + $batchStyles
    [System.IO.File]::WriteAllText("$webAppDir/styles.css", $newStylesContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Styles added to styles.css successfully" -ForegroundColor Green
} else {
    Write-Host "  Styles already exist, skipping" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===== Replacement Complete =====" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Manually replace batch operation button and modal in index.html (see FINAL_REPLACEMENT_INSTRUCTIONS.md)" -ForegroundColor White
Write-Host "2. Refresh browser to test functionality" -ForegroundColor White
Write-Host "3. If there are issues, restore files from $backupDir" -ForegroundColor White
Write-Host ""











