# ============================================================
# CriarAtalho.ps1
# Cria atalho da Central de Chamados na area de trabalho
# Execute com botao direito > "Executar com PowerShell"
# ============================================================

$NomeAtalho   = "Central de Chamados TI"
$UrlDestino   = "http://localhost:5173"
$Descricao    = "Central de Chamados TI"

# Caminho da area de trabalho do usuario atual
$Desktop = [Environment]::GetFolderPath("Desktop")
$Atalho  = Join-Path $Desktop "$NomeAtalho.lnk"

# Cria o atalho
$WScript = New-Object -ComObject WScript.Shell
$Link    = $WScript.CreateShortcut($Atalho)

# Tenta usar o Chrome primeiro, depois Edge, depois padrao
$Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Edge   = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $Chrome) {
    $Link.TargetPath      = $Chrome
    $Link.Arguments       = "--app=$UrlDestino"
    $Link.Description      = $Descricao
    $Link.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
    Write-Host "  Usando Google Chrome" -ForegroundColor Cyan
}
elseif (Test-Path $Edge) {
    $Link.TargetPath      = $Edge
    $Link.Arguments       = "--app=$UrlDestino"
    $Link.Description     = $Descricao
    $Link.WorkingDirectory = "C:\Program Files (x86)\Microsoft\Edge\Application"
    Write-Host "  Usando Microsoft Edge" -ForegroundColor Cyan
}
else {
    # Fallback: abre no navegador padrao via .bat
    $Bat = Join-Path "C:\chamados" "AbrirChamados.bat"
    $Link.TargetPath  = $Bat
    $Link.Description = $Descricao
    Write-Host "  Usando navegador padrao" -ForegroundColor Cyan
}

$Link.Save()

Write-Host ""
Write-Host "  Atalho criado com sucesso!" -ForegroundColor Green
Write-Host "  Local: $Atalho" -ForegroundColor White
Write-Host ""
Write-Host "  Dica: o sistema precisa estar rodando (PM2 ativo)" -ForegroundColor Yellow
Write-Host ""
pause
