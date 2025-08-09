# 設置 API 服務器開機自啟動
# 需要以管理員權限運行

param(
    [switch]$Install,
    [switch]$Uninstall
)

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

function Install-AutoStart {
    Write-Status "正在設置 API 服務器開機自啟動..." "INFO"
    
    # 獲取當前腳本目錄
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $batchFile = Join-Path $scriptPath "start-api-server.bat"
    
    # 創建任務計劃
    $taskName = "SwimmingAPIServer"
    $taskDescription = "游泳課程管理系統 API 服務器自動啟動"
    
    # 刪除現有任務（如果存在）
    schtasks /delete /tn $taskName /f 2>$null
    
    # 創建新任務
    $action = "cmd.exe"
    $arguments = "/c `"$batchFile`""
    $trigger = "AtStartup"
    $settings = "/ru `"SYSTEM`" /rl HIGHEST /f"
    
    $command = "schtasks /create /tn `"$taskName`" /tr `"$action $arguments`" /sc $trigger $settings"
    
    Write-Status "執行命令：$command" "INFO"
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ 開機自啟動設置成功！" "SUCCESS"
        Write-Status "任務名稱：$taskName" "INFO"
        Write-Status "觸發條件：系統啟動時" "INFO"
        Write-Status "執行文件：$batchFile" "INFO"
    } else {
        Write-Status "❌ 開機自啟動設置失敗！" "ERROR"
        Write-Status "請確保以管理員權限運行此腳本" "WARNING"
    }
}

function Uninstall-AutoStart {
    Write-Status "正在移除 API 服務器開機自啟動..." "INFO"
    
    $taskName = "SwimmingAPIServer"
    schtasks /delete /tn $taskName /f
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ 開機自啟動已移除！" "SUCCESS"
    } else {
        Write-Status "❌ 移除開機自啟動失敗！" "ERROR"
    }
}

function Show-Help {
    Write-Status "使用方法：" "INFO"
    Write-Status "  .\setup-autostart.ps1 -Install    - 設置開機自啟動" "INFO"
    Write-Status "  .\setup-autostart.ps1 -Uninstall  - 移除開機自啟動" "INFO"
    Write-Status "" "INFO"
    Write-Status "注意：需要以管理員權限運行" "WARNING"
}

# 檢查管理員權限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 主程序
if (-not (Test-Administrator)) {
    Write-Status "❌ 需要管理員權限來設置開機自啟動" "ERROR"
    Write-Status "請右鍵點擊 PowerShell，選擇'以管理員身份運行'" "WARNING"
    exit 1
}

if ($Install) {
    Install-AutoStart
} elseif ($Uninstall) {
    Uninstall-AutoStart
} else {
    Show-Help
} 