# ============================================
# Projet RAMEX - Script de démarrage (PowerShell)
# Lance le backend Django et le frontend React simultanément
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Projet RAMEX - Démarrage des serveurs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Vérifier que Python est installé ---
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[ERREUR] Python n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host "Installez Python 3.10+ depuis https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# --- Vérifier que Node.js est installé ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERREUR] Node.js n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host "Installez Node.js 18+ depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# --- Vérifier que PostgreSQL est accessible ---
Write-Host "[1/4] Vérification de PostgreSQL..." -ForegroundColor Yellow
$pgCheck = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pgCheck) {
    Write-Host "[AVERTISSEMENT] psql n'est pas dans le PATH. Assurez-vous que PostgreSQL est démarré." -ForegroundColor Yellow
} else {
    Write-Host "[OK] PostgreSQL trouvé: $($pgCheck.Source)" -ForegroundColor Green
}

# --- Vérifier l'environnement virtuel backend ---
Write-Host "[2/4] Vérification de l'environnement virtuel backend..." -ForegroundColor Yellow
$venvPath = Join-Path $PSScriptRoot "backend\venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[INFO] Environnement virtuel non trouvé. Création..." -ForegroundColor Yellow
    Push-Location (Join-Path $PSScriptRoot "backend")
    python -m venv venv
    if (-not (Test-Path $venvPython)) {
        Write-Host "[ERREUR] Impossible de créer l'environnement virtuel." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "[OK] Environnement virtuel créé." -ForegroundColor Green
    
    # Installer les dépendances
    Write-Host "[INFO] Installation des dépendances Python..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Échec de l'installation des dépendances Python." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "[OK] Dépendances Python installées." -ForegroundColor Green
    Pop-Location
} else {
    Write-Host "[OK] Environnement virtuel trouvé." -ForegroundColor Green
}

# --- Vérifier les dépendances frontend ---
Write-Host "[3/4] Vérification des dépendances frontend..." -ForegroundColor Yellow
$nodeModules = Join-Path $PSScriptRoot "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[INFO] node_modules non trouvé. Installation..." -ForegroundColor Yellow
    Push-Location (Join-Path $PSScriptRoot "frontend")
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Échec de l'installation des dépendances frontend." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "[OK] Dépendances frontend installées." -ForegroundColor Green
    Pop-Location
} else {
    Write-Host "[OK] Dépendances frontend trouvées." -ForegroundColor Green
}

# --- Vérifier le fichier .env backend ---
$backendEnv = Join-Path $PSScriptRoot "backend\.env"
if (-not (Test-Path $backendEnv)) {
    Write-Host "[INFO] Fichier backend\.env non trouvé. Copie depuis .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $PSScriptRoot "backend\.env.example") $backendEnv
    Write-Host "[OK] Fichier backend\.env créé. Vérifiez les valeurs." -ForegroundColor Green
}

# --- Vérifier le fichier .env frontend ---
$frontendEnv = Join-Path $PSScriptRoot "frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    Write-Host "[INFO] Fichier frontend\.env non trouvé. Copie depuis .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $PSScriptRoot "frontend\.env.example") $frontendEnv
    Write-Host "[OK] Fichier frontend\.env créé." -ForegroundColor Green
}

# --- Appliquer les migrations ---
Write-Host "[4/4] Application des migrations Django..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "backend")
& $venvPython manage.py migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Échec des migrations. Vérifiez que PostgreSQL est démarré et que les identifiants sont corrects." -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "[OK] Migrations appliquées." -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Démarrage des serveurs..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "  Admin    : http://localhost:8000/admin" -ForegroundColor Green
Write-Host ""
Write-Host "  Appuyez sur Ctrl+C dans chaque fenêtre pour arrêter." -ForegroundColor Yellow
Write-Host ""

# --- Lancer le backend dans une nouvelle fenêtre ---
Write-Host "[INFO] Lancement du backend Django..." -ForegroundColor Yellow
$backendCmd = "cd `"$(Join-Path $PSScriptRoot 'backend')`"; .\venv\Scripts\activate; python manage.py runserver 0.0.0.0:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# --- Lancer le frontend dans une nouvelle fenêtre ---
Write-Host "[INFO] Lancement du frontend React..." -ForegroundColor Yellow
$frontendCmd = "cd `"$(Join-Path $PSScriptRoot 'frontend')`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "[OK] Les deux serveurs sont en cours de démarrage dans des fenêtres séparées." -ForegroundColor Green
Write-Host "     Gardez cette fenêtre ouverte pour surveiller les logs." -ForegroundColor Cyan
Write-Host ""