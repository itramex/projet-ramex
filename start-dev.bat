@echo off
REM ============================================
REM Projet RAMEX - Script de demarrage (CMD)
REM Lance le backend Django et le frontend React
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ============================================
echo   Projet RAMEX - Demarrage des serveurs
echo ============================================
echo.

REM --- Verifier que Python est installe ---
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH.
    echo Installez Python 3.10+ depuis https://www.python.org/downloads/
    pause
    exit /b 1
)

REM --- Verifier que Node.js est installe ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou n'est pas dans le PATH.
    echo Installez Node.js 18+ depuis https://nodejs.org/
    pause
    exit /b 1
)

REM --- Verifier l'environnement virtuel backend ---
echo [1/4] Verification de l'environnement virtuel backend...
set VENV_PYTHON=%~dp0backend\venv\Scripts\python.exe

if not exist "%VENV_PYTHON%" (
    echo [INFO] Environnement virtuel non trouve. Creation...
    cd /d "%~dp0backend"
    python -m venv venv
    if not exist "%VENV_PYTHON%" (
        echo [ERREUR] Impossible de creer l'environnement virtuel.
        pause
        exit /b 1
    )
    echo [OK] Environnement virtuel cree.
    
    echo [INFO] Installation des dependances Python...
    "%VENV_PYTHON%" -m pip install --upgrade pip
    "%VENV_PYTHON%" -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation des dependances Python.
        pause
        exit /b 1
    )
    echo [OK] Dependances Python installees.
) else (
    echo [OK] Environnement virtuel trouve.
)

REM --- Verifier les dependances frontend ---
echo [2/4] Verification des dependances frontend...
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] node_modules non trouve. Installation...
    cd /d "%~dp0frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo [ERREUR] Echec de l'installation des dependances frontend.
        pause
        exit /b 1
    )
    echo [OK] Dependances frontend installees.
) else (
    echo [OK] Dependances frontend trouvees.
)

REM --- Verifier les fichiers .env ---
echo [3/4] Verification des fichiers .env...
if not exist "%~dp0backend\.env" (
    echo [INFO] Fichier backend\.env non trouve. Copie depuis .env.example...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo [OK] Fichier backend\.env cree. Verifiez les valeurs.
)

if not exist "%~dp0frontend\.env" (
    echo [INFO] Fichier frontend\.env non trouve. Copie depuis .env.example...
    copy "%~dp0frontend\.env.example" "%~dp0frontend\.env" >nul
    echo [OK] Fichier frontend\.env cree.
)

REM --- Appliquer les migrations ---
echo [4/4] Application des migrations Django...
cd /d "%~dp0backend"
"%VENV_PYTHON%" manage.py migrate
if %errorlevel% neq 0 (
    echo [ERREUR] Echec des migrations. Verifiez que PostgreSQL est demarre.
    pause
    exit /b 1
)
echo [OK] Migrations appliquees.

echo.
echo ============================================
echo   Demarrage des serveurs...
echo ============================================
echo.
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   Admin    : http://localhost:8000/admin
echo.
echo   Appuyez sur Ctrl+C dans chaque fenetre pour arreter.
echo.

REM --- Lancer le backend dans une nouvelle fenetre ---
echo [INFO] Lancement du backend Django...
start "RAMEX Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

REM --- Lancer le frontend dans une nouvelle fenetre ---
echo [INFO] Lancement du frontend React...
start "RAMEX Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo [OK] Les deux serveurs sont en cours de demarrage dans des fenetres separees.
echo      Gardez cette fenetre ouverte pour surveiller les logs.
echo.

endlocal