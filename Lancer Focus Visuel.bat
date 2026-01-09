@echo off
setlocal
cd /d "%~dp0"

REM TENTATIVE DE DETECTION DE NODE.JS DANS LES DOSSIERS STANDARDS
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=%PATH%;C:\Program Files\nodejs"
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
)

echo Verification de l'installation de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo ERREUR : Node.js est introuvable !
    echo ========================================================
    echo.
    echo L'application ne peut pas demarrer sans Node.js.
    echo.
    echo 1. Une page web va s'ouvrir.
    echo 2. TELECHARGEZ et INSTALLEZ la version "LTS".
    echo 3. Une fois installe, REDEMARREZ VOTRE ORDINATEUR.
    echo 4. Revenez ici et relancez ce fichier.
    echo.
    echo Appuyez sur une touche pour ouvrir le site...
    pause >nul
    start https://nodejs.org/
    exit /b
)

if not exist "node_modules" (
    echo.
    echo Premier lancement detecte. Installation des dependances...
    echo Cela peut prendre quelques minutes.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Erreur lors de l'installation des dependances.
        echo.
        pause
        exit /b
    )
)

if not exist "node_modules\electron" (
    echo.
    echo Electron n'est pas installe. Installation en cours...
    echo Cela peut prendre quelques minutes.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Erreur lors de l'installation de Electron.
        echo.
        pause
        exit /b
    )
)

echo.
echo Lancement de Focus Visuel...
call npm start
if %errorlevel% neq 0 (
    echo.
    echo Une erreur est survenue lors du lancement.
    pause
)
