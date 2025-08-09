# 游泳課程管理系統 API 服務器監控腳本
param(
    [string]$Action = "status"
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

function Test-APIServer {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -Headers @{
            "X-API-Public-Key" = "ttdrcccy"
            "X-API-Private-Key" = "2b207365-cbf0-4e42-a3bf-f932c84557c4"
        } -TimeoutSec 10
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Start-APIServer {
    Write-Status "正在啟動 API 服務器..." "INFO"
    
    # 檢查PM2是否運行
    $pm2Status = pm2 status 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "PM2 正在運行，啟動 API 服務器..." "INFO"
        pm2 start ecosystem.config.js --env production
        Start-Sleep -Seconds 5
        
        if (Test-APIServer) {
            Write-Status "API 服務器啟動成功！" "SUCCESS"
            pm2 status
        } else {
            Write-Status "API 服務器啟動失敗！" "ERROR"
        }
    } else {
        Write-Status "PM2 未運行，請先安裝 PM2" "ERROR"
        Write-Status "運行命令：npm install -g pm2" "INFO"
    }
}

function Stop-APIServer {
    Write-Status "正在停止 API 服務器..." "INFO"
    pm2 stop swimming-api-server
    Write-Status "API 服務器已停止" "SUCCESS"
}

function Restart-APIServer {
    Write-Status "正在重啟 API 服務器..." "INFO"
    pm2 restart swimming-api-server
    Start-Sleep -Seconds 3
    
    if (Test-APIServer) {
        Write-Status "API 服務器重啟成功！" "SUCCESS"
    } else {
        Write-Status "API 服務器重啟失敗！" "ERROR"
    }
}

function Show-Status {
    Write-Status "檢查 API 服務器狀態..." "INFO"
    
    # 檢查PM2狀態
    Write-Status "PM2 進程狀態：" "INFO"
    pm2 status
    
    # 檢查API健康狀態
    Write-Status "API 健康檢查：" "INFO"
    if (Test-APIServer) {
        Write-Status "✅ API 服務器運行正常" "SUCCESS"
        Write-Status "本地地址: http://localhost:3000" "INFO"
        Write-Status "公網地址: http://203.145.95.240:3000" "INFO"
    } else {
        Write-Status "❌ API 服務器無法訪問" "ERROR"
        Write-Status "請檢查服務器是否正在運行" "WARNING"
    }
    
    # 顯示日誌
    Write-Status "最近的日誌：" "INFO"
    if (Test-Path "logs\combined.log") {
        Get-Content "logs\combined.log" -Tail 10
    } else {
        Write-Status "未找到日誌文件" "WARNING"
    }
}

# 主程序
switch ($Action.ToLower()) {
    "start" { Start-APIServer }
    "stop" { Stop-APIServer }
    "restart" { Restart-APIServer }
    "status" { Show-Status }
    default {
        Write-Status "使用方法：" "INFO"
        Write-Status "  .\monitor-server.ps1 start    - 啟動服務器" "INFO"
        Write-Status "  .\monitor-server.ps1 stop     - 停止服務器" "INFO"
        Write-Status "  .\monitor-server.ps1 restart  - 重啟服務器" "INFO"
        Write-Status "  .\monitor-server.ps1 status   - 查看狀態" "INFO"
    }
} 