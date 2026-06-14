# ============================================================
# ConfigurarInicioAutomatico.ps1
# Configura o sistema de chamados para iniciar com o Windows
# Execute com botao direito > "Executar como Administrador"
# ============================================================

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   Central de Chamados TI - Central de Chamados TI" -ForegroundColor Cyan
Write-Host "   Configurando inicio automatico..." -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

# Caminhos
$NodePath    = (Get-Command node).Source
$Pm2Path     = (Get-Command pm2 -ErrorAction SilentlyContinue)?.Source
$ChamadosDir = "C:\chamados"
$ServeCmd    = (Get-Command serve -ErrorAction SilentlyContinue)?.Source

# ── 1. TAREFA: API (server.js via PM2) ────────────────────────────────────────
Write-Host "  [1/3] Configurando API (server.js)..." -ForegroundColor Yellow

$ActionApi = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c cd /d C:\chamados && pm2 start server.js --name chamados-api 2>nul || pm2 restart chamados-api" `
    -WorkingDirectory $ChamadosDir

$Trigger  = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName "ChamadosTI-API" `
    -Action $ActionApi `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Inicia a API da Central de Chamados TI - CentralTI" `
    -Force | Out-Null

Write-Host "  API configurada!" -ForegroundColor Green

# ── 2. TAREFA: FRONTEND (serve dist) ──────────────────────────────────────────
Write-Host ""
Write-Host "  [2/3] Configurando Frontend..." -ForegroundColor Yellow

$ActionFront = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c cd /d C:\chamados && pm2 start `"npx serve dist -l 5173`" --name chamados-front 2>nul || pm2 restart chamados-front" `
    -WorkingDirectory $ChamadosDir

Register-ScheduledTask `
    -TaskName "ChamadosTI-Front" `
    -Action $ActionFront `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Inicia o Frontend da Central de Chamados TI - CentralTI" `
    -Force | Out-Null

Write-Host "  Frontend configurado!" -ForegroundColor Green

# ── 3. ATALHO NA AREA DE TRABALHO ─────────────────────────────────────────────
Write-Host ""
Write-Host "  [3/3] Criando atalho na area de trabalho..." -ForegroundColor Yellow

$Desktop = [Environment]::GetFolderPath("Desktop")
$Atalho  = Join-Path $Desktop "Central de Chamados TI.lnk"
$Chrome  = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Edge    = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$WScript = New-Object -ComObject WScript.Shell
$Link    = $WScript.CreateShortcut($Atalho)

if (Test-Path $Chrome) {
    $Link.TargetPath       = $Chrome
    $Link.Arguments        = "--app=http://localhost:5173"
    $Link.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
} elseif (Test-Path $Edge) {
    $Link.TargetPath       = $Edge
    $Link.Arguments        = "--app=http://localhost:5173"
    $Link.WorkingDirectory = "C:\Program Files (x86)\Microsoft\Edge\Application"
} else {
    $Link.TargetPath = Join-Path $ChamadosDir "AbrirChamados.bat"
}

$Link.Description = "Central de Chamados TI - Central de Chamados TI"
$Link.Save()

Write-Host "  Atalho criado!" -ForegroundColor Green

# ── RESUMO ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   Tudo configurado com sucesso!" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  O sistema vai iniciar automaticamente" -ForegroundColor White
Write-Host "  toda vez que voce fizer login no Windows." -ForegroundColor White
Write-Host ""
Write-Host "  Para abrir agora sem reiniciar:" -ForegroundColor Yellow
Write-Host "   1. Abra um terminal" -ForegroundColor White
Write-Host "   2. Digite: cd C:\chamados" -ForegroundColor White
Write-Host "   3. Digite: pm2 start server.js --name chamados-api" -ForegroundColor White
Write-Host "   4. Digite: pm2 start `"npx serve dist -l 5173`" --name chamados-front" -ForegroundColor White
Write-Host ""
Write-Host "  Depois clique no atalho da area de trabalho." -ForegroundColor White
Write-Host ""
pause
