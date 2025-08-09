# 設置 API 服務器為 Windows 服務
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

function Install-WindowsService {
    Write-Status "正在設置 API 服務器為 Windows 服務..." "INFO"
    
    # 獲取當前腳本目錄
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $batchFile = Join-Path $scriptPath "auto-start.bat"
    
    # 創建任務計劃
    $taskName = "SwimmingAPIServer"
    
    # 刪除現有任務（如果存在）
    schtasks /delete /tn $taskName /f 2>$null
    
    # 創建新任務 - 系統啟動時運行
    $action = "cmd.exe"
    $arguments = "/c `"$batchFile`""
    $trigger = "AtStartup"
    $settings = "/ru `"SYSTEM`" /rl HIGHEST /f"
    
    $command = "schtasks /create /tn `"$taskName`" /tr `"$action $arguments`" /sc $trigger $settings"
    
    Write-Status "執行命令：$command" "INFO"
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ Windows 服務設置成功！" "SUCCESS"
        Write-Status "服務名稱：$taskName" "INFO"
        Write-Status "觸發條件：系統啟動時" "INFO"
        Write-Status "執行文件：$batchFile" "INFO"
        
        # 創建桌面快捷方式
        $desktopPath = [Environment]::GetFolderPath("Desktop")
        $shortcutPath = Join-Path $desktopPath "啟動API服務器.lnk"
        
        $WshShell = New-Object -comObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.TargetPath = $batchFile
        $Shortcut.WorkingDirectory = $scriptPath
        $Shortcut.Description = "游泳課程管理系統 API 服務器"
        $Shortcut.Save()
        
        Write-Status "✅ 桌面快捷方式已創建：$shortcutPath" "SUCCESS"
    } else {
        Write-Status "❌ Windows 服務設置失敗！" "ERROR"
        Write-Status "請確保以管理員權限運行此腳本" "WARNING"
    }
}

function Uninstall-WindowsService {
    Write-Status "正在移除 API 服務器 Windows 服務..." "INFO"
    
    $taskName = "SwimmingAPIServer"
    schtasks /delete /tn $taskName /f
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ Windows 服務已移除！" "SUCCESS"
    } else {
        Write-Status "❌ 移除 Windows 服務失敗！" "ERROR"
    }
    
    # 移除桌面快捷方式
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "啟動API服務器.lnk"
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Status "✅ 桌面快捷方式已移除！" "SUCCESS"
    }
}

function Show-Help {
    Write-Status "使用方法：" "INFO"
    Write-Status "  .\setup-windows-service.ps1 -Install    - 設置為 Windows 服務" "INFO"
    Write-Status "  .\setup-windows-service.ps1 -Uninstall  - 移除 Windows 服務" "INFO"
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
    Write-Status "❌ 需要管理員權限來設置 Windows 服務" "ERROR"
    Write-Status "請右鍵點擊 PowerShell，選擇'以管理員身份運行'" "WARNING"
    exit 1
}

if ($Install) {
    Install-WindowsService
} elseif ($Uninstall) {
    Uninstall-WindowsService
} else {
    Show-Help
} 