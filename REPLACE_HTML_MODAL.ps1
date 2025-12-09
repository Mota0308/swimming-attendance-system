# PowerShell script to replace batch operation modal in HTML
# Usage: Run in PowerShell: .\REPLACE_HTML_MODAL.ps1

Write-Host "===== Replacing Batch Operation Modal in HTML =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Read index.html
$htmlPath = "Web_app/index.html"
$htmlContent = Get-Content $htmlPath -Raw -Encoding UTF8

# Find the old modal
$startMarker = '<div id="batchModifyModal"'
$startIndex = $htmlContent.IndexOf($startMarker)

if ($startIndex -lt 0) {
    Write-Host "Error: Could not find old modal!" -ForegroundColor Red
    exit 1
}

# Find the end of the modal (look for "</div>" that closes the modal)
# The modal structure is: <div id="batchModifyModal"> ... </div>
# We need to find the matching closing </div>

# Already found the opening
$modalOpeningStart = $startIndex
# Find the comment before it
$commentStart = $htmlContent.LastIndexOf('<!--', $modalOpeningStart)
if ($commentStart -gt ($modalOpeningStart - 100) -and $commentStart -ge 0) {
    $startIndex = $commentStart
}
$modalOpeningEnd = $htmlContent.IndexOf('>', $modalOpeningStart) + 1

# Count nested divs to find the matching closing </div>
$searchPos = $modalOpeningEnd
$divCount = 1
while ($divCount -gt 0 -and $searchPos -lt $htmlContent.Length) {
    $nextOpenDiv = $htmlContent.IndexOf('<div', $searchPos)
    $nextCloseDiv = $htmlContent.IndexOf('</div>', $searchPos)
    
    if ($nextCloseDiv -lt 0) {
        break
    }
    
    if ($nextOpenDiv -ge 0 -and $nextOpenDiv -lt $nextCloseDiv) {
        $divCount++
        $searchPos = $nextOpenDiv + 4
    } else {
        $divCount--
        $searchPos = $nextCloseDiv + 6
    }
}

$endIndex = $searchPos

Write-Host "Found old modal from position $startIndex to $endIndex" -ForegroundColor Cyan

# Extract the old modal
$oldModal = $htmlContent.Substring($startIndex, $endIndex - $startIndex)

# Read new modal from batch-operation-modal.html
$newModalContent = Get-Content "Web_app/batch-operation-extraction/batch-operation-modal.html" -Raw -Encoding UTF8

# Extract the new modal (from line 506 to 635)
$newModalLines = Get-Content "Web_app/batch-operation-extraction/batch-operation-modal.html" -Encoding UTF8
$newModal = ($newModalLines[505..634] -join "`n")

# Replace
$newHtmlContent = $htmlContent.Substring(0, $startIndex) + $newModal + $htmlContent.Substring($endIndex)

# Write back
[System.IO.File]::WriteAllText($htmlPath, $newHtmlContent, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "✓ Successfully replaced batch operation modal!" -ForegroundColor Green
Write-Host ""





Write-Host "===== Replacing Batch Operation Modal in HTML =====" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Stop"

# Read index.html
$htmlPath = "Web_app/index.html"
$htmlContent = Get-Content $htmlPath -Raw -Encoding UTF8

# Find the old modal
$startMarker = '<div id="batchModifyModal"'
$startIndex = $htmlContent.IndexOf($startMarker)

if ($startIndex -lt 0) {
    Write-Host "Error: Could not find old modal!" -ForegroundColor Red
    exit 1
}

# Find the end of the modal (look for "</div>" that closes the modal)
# The modal structure is: <div id="batchModifyModal"> ... </div>
# We need to find the matching closing </div>

# Already found the opening
$modalOpeningStart = $startIndex
# Find the comment before it
$commentStart = $htmlContent.LastIndexOf('<!--', $modalOpeningStart)
if ($commentStart -gt ($modalOpeningStart - 100) -and $commentStart -ge 0) {
    $startIndex = $commentStart
}
$modalOpeningEnd = $htmlContent.IndexOf('>', $modalOpeningStart) + 1

# Count nested divs to find the matching closing </div>
$searchPos = $modalOpeningEnd
$divCount = 1
while ($divCount -gt 0 -and $searchPos -lt $htmlContent.Length) {
    $nextOpenDiv = $htmlContent.IndexOf('<div', $searchPos)
    $nextCloseDiv = $htmlContent.IndexOf('</div>', $searchPos)
    
    if ($nextCloseDiv -lt 0) {
        break
    }
    
    if ($nextOpenDiv -ge 0 -and $nextOpenDiv -lt $nextCloseDiv) {
        $divCount++
        $searchPos = $nextOpenDiv + 4
    } else {
        $divCount--
        $searchPos = $nextCloseDiv + 6
    }
}

$endIndex = $searchPos

Write-Host "Found old modal from position $startIndex to $endIndex" -ForegroundColor Cyan

# Extract the old modal
$oldModal = $htmlContent.Substring($startIndex, $endIndex - $startIndex)

# Read new modal from batch-operation-modal.html
$newModalContent = Get-Content "Web_app/batch-operation-extraction/batch-operation-modal.html" -Raw -Encoding UTF8

# Extract the new modal (from line 506 to 635)
$newModalLines = Get-Content "Web_app/batch-operation-extraction/batch-operation-modal.html" -Encoding UTF8
$newModal = ($newModalLines[505..634] -join "`n")

# Replace
$newHtmlContent = $htmlContent.Substring(0, $startIndex) + $newModal + $htmlContent.Substring($endIndex)

# Write back
[System.IO.File]::WriteAllText($htmlPath, $newHtmlContent, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "✓ Successfully replaced batch operation modal!" -ForegroundColor Green
Write-Host ""












