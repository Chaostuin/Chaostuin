@echo off
echo.
echo  Chaostuin — lokale server starten...
echo  =====================================
echo.

:: Ga naar de map waar dit .bat bestand staat
cd /d "%~dp0"

:: Open de browser na 1 seconde (geeft de server tijd om te starten)
start "" timeout /t 1 >nul
start "" "http://localhost:8000"

:: Start de Python server
python -m http.server 8000

:: Als Python niet gevonden wordt, probeer python3
if errorlevel 1 (
    echo.
    echo  Python niet gevonden als 'python', probeer 'python3'...
    python3 -m http.server 8000
)

pause
