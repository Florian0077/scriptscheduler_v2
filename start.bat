REM Définir le chemin de l'environnement Python
set VENV_PATH=C:\services_edf\scriptscheduler_v2\venv

REM Définir le chemin du script Python
set SCRIPT_PATH=C:\services_edf\scriptscheduler_v2\waitress_server.py

REM Activer l'environnement virtuel
call %VENV_PATH%\Scripts\activate.bat

REM Exécuter le script Python
python %SCRIPT_PATH%
