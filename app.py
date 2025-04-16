from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import os
import json
from datetime import datetime
import subprocess
import sys
import signal
from werkzeug.utils import secure_filename
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from pytz import utc
from datetime import timedelta
import uuid

app = Flask(__name__)
app.secret_key = 'votre_clé_secrète_ici'  # À changer en production

# Activer les extensions Jinja2
app.jinja_env.add_extension('jinja2.ext.do')

# Filtre Jinja pour formater les timestamps
@app.template_filter('format_timestamp')
def format_timestamp(timestamp):
    """Convertit un timestamp ISO en format lisible"""
    if not timestamp:
        return ""
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return dt.strftime('%d/%m/%Y %H:%M:%S')
    except:
        return timestamp

# Configuration
SCHEDULES_FILE = 'data/schedules.json'
SCRIPTS_FILE = 'data/scripts.json'
LOGS_FILE = 'data/logs.json'
UPLOAD_FOLDER = 'scripts'
ALLOWED_EXTENSIONS = {'py'}

# Variables pour la navigation de fichiers
DEFAULT_PATHS = {
    'python': os.path.dirname(sys.executable),
    'scripts': os.path.join(os.getcwd(), 'scripts')
}

# Créer les dossiers nécessaires s'ils n'existent pas
os.makedirs('data', exist_ok=True)
os.makedirs('scripts', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)

# Initialiser les fichiers de données s'ils n'existent pas
if not os.path.exists(SCHEDULES_FILE):
    with open(SCHEDULES_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(SCRIPTS_FILE):
    with open(SCRIPTS_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(LOGS_FILE):
    with open(LOGS_FILE, 'w') as f:
        json.dump([], f)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_schedules():
    with open(SCHEDULES_FILE, 'r') as f:
        return json.load(f)

def save_schedules(schedules):
    with open(SCHEDULES_FILE, 'w') as f:
        json.dump(schedules, f, indent=4)

def get_scripts():
    with open(SCRIPTS_FILE, 'r') as f:
        return json.load(f)

def save_scripts(scripts):
    with open(SCRIPTS_FILE, 'w') as f:
        json.dump(scripts, f, indent=4)

def get_logs():
    """Récupère les journaux d'exécution en gérant les erreurs de format JSON"""
    try:
        with open(LOGS_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Erreur de décodage JSON dans logs.json: {str(e)}")
        # Tenter de récupérer le fichier
        try:
            # Créer une sauvegarde du fichier corrompu
            import shutil
            backup_file = f"{LOGS_FILE}.bak"
            shutil.copy2(LOGS_FILE, backup_file)
            print(f"Sauvegarde du fichier logs.json corrompu créée: {backup_file}")
            
            # Lire le contenu brut du fichier
            with open(LOGS_FILE, 'r') as f:
                content = f.read()
            
            # Essayer de récupérer autant d'objets JSON valides que possible
            valid_logs = []
            start_pos = 0
            while start_pos < len(content):
                try:
                    # Trouver le début d'un objet JSON
                    while start_pos < len(content) and content[start_pos] != '{':
                        start_pos += 1
                    
                    if start_pos >= len(content):
                        break
                    
                    # Décoder un objet JSON
                    obj, end_pos = json.JSONDecoder().raw_decode(content[start_pos:])
                    valid_logs.append(obj)
                    start_pos += end_pos
                except json.JSONDecodeError:
                    # Si on ne peut pas décoder, avancer d'un caractère et réessayer
                    start_pos += 1
                except Exception as e:
                    print(f"Erreur pendant la récupération: {str(e)}")
                    start_pos += 1
            
            # S'il n'y a pas de logs valides, créer une liste vide
            if not valid_logs:
                valid_logs = []
            
            # Sauvegarder les logs valides dans le fichier
            save_logs(valid_logs)
            print(f"Fichier logs.json réparé avec {len(valid_logs)} logs récupérés")
            
            return valid_logs
        except Exception as e:
            print(f"Échec de la récupération du fichier logs.json: {str(e)}")
            # En dernier recours, réinitialiser le fichier
            with open(LOGS_FILE, 'w') as f:
                json.dump([], f)
            return []

def save_logs(logs):
    with open(LOGS_FILE, 'w') as f:
        json.dump(logs, f, indent=4)

def add_log(schedule_id, schedule_name, script_path, status, output=None):
    logs = get_logs()
    log_entry = {
        'id': len(logs) + 1,
        'schedule_id': schedule_id,
        'schedule_name': schedule_name,
        'script_path': script_path,
        'status': status,
        'output': output,
        'timestamp': datetime.now().isoformat()
    }
    logs.append(log_entry)
    save_logs(logs)
    return log_entry

def execute_script(script_path, schedule_id=None, schedule_name=None, env_path=None, timeout=30):
    """Exécute un script Python avec un timeout optionnel"""
    try:
        # Convertir schedule_id en entier s'il est fourni comme chaîne
        if schedule_id and isinstance(schedule_id, str) and schedule_id.isdigit():
            schedule_id = int(schedule_id)
            
        # Vérifier si le script est déjà en cours d'exécution
        if schedule_id and schedule_id in running_scripts:
            # Vérifier si le processus est réellement en cours d'exécution
            process_info = running_scripts[schedule_id]
            if is_process_running(process_info['process']):
                return add_log(
                    schedule_id=schedule_id,
                    schedule_name=schedule_name,
                    script_path=script_path,
                    status='warning',
                    output='Le script est déjà en cours d\'exécution.'
                )
            else:
                # Le processus n'est plus en cours d'exécution, on le retire de la liste
                del running_scripts[schedule_id]
            
        # Utiliser le chemin par défaut de Python si aucun environnement n'est spécifié
        if not env_path or not os.path.exists(env_path):
            env_path = sys.executable
        
        # Déterminer si c'est un service ou un script standard
        is_service = False
        if schedule_id:
            schedules = get_schedules()
            for schedule in schedules:
                if schedule['id'] == schedule_id and schedule.get('schedule_type') == 'service':
                    is_service = True
                    break
        
        effective_timeout = None if is_service else timeout

        # Déterminer le répertoire de travail (working directory)
        # Utiliser le répertoire du script comme répertoire de travail pour tous les scripts
        script_dir = os.path.dirname(os.path.abspath(script_path))
        
        try:
            # Pour les services (serveurs Flask), ne pas rediriger les flux
            if is_service:
                process = subprocess.Popen(
                    [env_path, script_path],
                    cwd=script_dir,  # Utiliser le répertoire du script comme répertoire de travail
                    start_new_session=True
                )
            else:
                # Pour les scripts standards, rediriger les flux mais utiliser le même répertoire de travail
                process = subprocess.Popen(
                    [env_path, script_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=script_dir,  # Utiliser le répertoire du script comme répertoire de travail
                    start_new_session=True
                )
            
            # Stocker le processus en cours d'exécution
            # Si c'est un script planifié, on le stocke dans les scripts en cours
            if schedule_id:
                running_scripts[schedule_id] = {
                    'process': process,
                    'start_time': datetime.now().isoformat(),  # Stocke directement la date comme chaîne
                    'script_path': script_path,
                    'name': schedule_name or os.path.basename(script_path)
                }
            
            # Si c'est un service ou un script instantané, on attend qu'il se termine
            if not is_service:
                try:
                    stdout, stderr = process.communicate(timeout=effective_timeout)
                    output = stdout + stderr
                    status = 'success' if process.returncode == 0 else 'error'
                    
                    # Retirer le script de la liste des scripts en cours d'exécution
                    if schedule_id and schedule_id in running_scripts:
                        del running_scripts[schedule_id]
                        
                    return add_log(
                        schedule_id=schedule_id,
                        schedule_name=schedule_name,
                        script_path=script_path,
                        status=status,
                        output=output
                    )
                except subprocess.TimeoutExpired:
                    # En cas de timeout, tuer le processus
                    try:
                        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    except:
                        process.kill()
                    
                    # Retirer le script de la liste des scripts en cours d'exécution
                    if schedule_id and schedule_id in running_scripts:
                        del running_scripts[schedule_id]
                        
                    return add_log(
                        schedule_id=schedule_id,
                        schedule_name=schedule_name,
                        script_path=script_path,
                        status='timeout',
                        output='L\'exécution du script a dépassé le délai imparti.'
                    )
            else:
                # Pour les services, on retourne immédiatement et on laisse le processus continuer
                return add_log(
                    schedule_id=schedule_id,
                    schedule_name=schedule_name,
                    script_path=script_path,
                    status='success',  # Utiliser 'success' au lieu de 'running' pour un statut uniforme
                    output='Service démarré.'
                )
                
        except Exception as e:
            # En cas d'erreur, s'assurer que le script est marqué comme terminé
            if schedule_id and schedule_id in running_scripts:
                del running_scripts[schedule_id]
                
            return add_log(
                schedule_id=schedule_id,
                schedule_name=schedule_name,
                script_path=script_path,
                status='error',
                output=f'Erreur lors de l\'exécution: {str(e)}'
            )
            
    except Exception as e:
        # Gestion d'erreur générale pour toute la fonction
        if schedule_id and schedule_id in running_scripts:
            del running_scripts[schedule_id]
            
        return add_log(
            schedule_id=schedule_id,
            schedule_name=schedule_name,
            script_path=script_path,
            status='error',
            output=f'Erreur générale: {str(e)}'
        )

def check_service_status(schedule_id):
    """Vérifie l'état d'un service et le redémarre si nécessaire"""
    try:
        # Récupérer les planifications
        schedules = get_schedules()
        schedule = None
        
        # Trouver la planification correspondante
        for s in schedules:
            if s['id'] == schedule_id:
                schedule = s
                break
        
        if not schedule:
            return  # La planification n'existe pas
            
        if not schedule.get('enabled', True) or schedule.get('schedule_type') != 'service':
            return  # Ce n'est pas un service actif
            
        # Vérifier si le service est en cours d'exécution
        if schedule_id in running_scripts:
            # Le service est déjà en cours d'exécution, tout est bon
            return
            
        # Trouver le dernier log pour ce service
        logs = get_logs()
        last_log = None
        
        # Trier les logs par ID (du plus récent au plus ancien)
        logs_sorted = sorted(logs, key=lambda x: x['id'], reverse=True)
        for log in logs_sorted:
            if log['schedule_id'] == schedule_id:
                last_log = log
                break
                
        # Si pas de log ou si le dernier log indique une erreur, redémarrer le service
        if not last_log or last_log['status'] in ['error', 'timeout']:
            print(f"Redémarrage du service {schedule['name']} (ID: {schedule_id})")
            execute_script(
                schedule['script_path'], 
                schedule_id, 
                schedule['name'], 
                schedule.get('env_path', sys.executable), 
                schedule.get('timeout', 30)
            )
            
    except Exception as e:
        print(f"Erreur lors de la vérification du service {schedule_id}: {str(e)}")

def update_scheduler():
    """
    Met à jour toutes les tâches planifiées dans le planificateur
    """
    # Supprimer toutes les tâches existantes
    scheduler.remove_all_jobs()
    
    # Récupérer toutes les planifications
    schedules = get_schedules()
    
    # Créer une liste des services à démarrer automatiquement
    auto_start_services = []
    
    # Ajouter chaque planification active au planificateur
    for schedule in schedules:
        if schedule.get('enabled', True):
            # Extraire les composants de l'expression cron
            cron_parts = schedule['schedule'].split()
            if len(cron_parts) != 5:
                # Expression cron invalide
                continue
            
            minute, hour, day, month, day_of_week = cron_parts
            
            # Créer un déclencheur cron
            trigger = CronTrigger(
                minute=minute, 
                hour=hour, 
                day=day, 
                month=month, 
                day_of_week=day_of_week
            )
            
            # Si c'est un service, on considère qu'il doit être exécuté plus fréquemment
            # pour s'assurer qu'il reste actif
            if schedule.get('schedule_type') == 'service':
                # Pour les services, on vérifie s'il doit démarrer automatiquement
                auto_start = schedule.get('auto_start', False)
                
                # On ajoute la tâche planifiée selon la configuration cron seulement si autoStart est activé
                if auto_start:
                    print(f"Configuration du démarrage auto pour service {schedule['name']} (ID: {schedule['id']})")
                    scheduler.add_job(
                        execute_script,
                        trigger=trigger,
                        args=[schedule['script_path'], schedule['id'], schedule['name'], schedule.get('env_path', sys.executable), schedule.get('timeout', 30)],
                        id=f"schedule_{schedule['id']}",
                        replace_existing=True
                    )
                    
                    # Ajouter le service à la liste de démarrage automatique différé
                    auto_start_services.append(schedule)
                
                # Ajouter une tâche de surveillance supplémentaire qui vérifie l'état du service
                # et le redémarre si nécessaire (uniquement pour les services actifs)
                if schedule.get('enabled', True):
                    interval_minutes = 5  # Vérifier toutes les 5 minutes
                    scheduler.add_job(
                        check_service_status,
                        'interval',
                        minutes=interval_minutes,
                        args=[schedule['id']],
                        id=f"service_check_{schedule['id']}",
                        replace_existing=True
                    )
            else:
                # Pour les planifications standard, on ajoute simplement la tâche
                scheduler.add_job(
                    execute_script,
                    trigger=trigger,
                    args=[schedule['script_path'], schedule['id'], schedule['name'], schedule.get('env_path', sys.executable), schedule.get('timeout', 30)],
                    id=f"schedule_{schedule['id']}",
                    replace_existing=True
                )
    
    # Planifier le démarrage des services automatiques après 5 secondes
    # pour permettre au serveur de démarrer correctement
    if auto_start_services:
        def delayed_service_start():
            import time
            # Attendre que le serveur soit complètement démarré
            time.sleep(5)
            for service in auto_start_services:
                print(f"Lancement différé du service {service['name']} (ID: {service['id']})")
                execute_script(
                    script_path=service['script_path'],
                    schedule_id=service['id'],
                    schedule_name=service['name'],
                    env_path=service.get('env_path', sys.executable),
                    timeout=service.get('timeout', 30)
                )
        
        # Lancer le démarrage des services dans un thread séparé
        import threading
        service_thread = threading.Thread(target=delayed_service_start)
        service_thread.daemon = True  # Le thread s'arrêtera si le programme principal s'arrête
        service_thread.start()

# Variable globale pour stocker les scripts en cours d'exécution et leurs processus
running_scripts = {}

# Corriger les objets datetime dans running_scripts
def sanitize_running_scripts():
    """Convertit tous les objets datetime en chaînes ISO dans running_scripts"""
    for schedule_id, process_info in list(running_scripts.items()):
        # Vérifier si le processus est toujours en cours d'exécution
        if not is_process_running(process_info['process']):
            del running_scripts[schedule_id]
            continue
            
        # Convertir start_time en chaîne si c'est un objet datetime
        if 'start_time' in process_info and isinstance(process_info['start_time'], datetime):
            process_info['start_time'] = process_info['start_time'].isoformat()
        
        # S'assurer que le nom est défini
        if 'name' not in process_info or not process_info['name']:
            process_info['name'] = os.path.basename(process_info.get('script_path', 'script inconnu'))

def is_process_running(process):
    """Vérifie si un processus est toujours en cours d'exécution"""
    if process is None:
        return False
    try:
        # poll() renvoie None si le processus est toujours en cours d'exécution
        # sinon, il renvoie le code de retour
        return process.poll() is None
    except:
        return False

# Fonction utilitaire pour assainir les objets datetime dans les dictionnaires
def sanitize_dict_datetimes(data):
    """Convertit récursivement tous les objets datetime en chaînes ISO dans un dictionnaire ou une liste"""
    if isinstance(data, dict):
        for key, value in list(data.items()):
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                data[key] = sanitize_dict_datetimes(value)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, datetime):
                data[i] = item.isoformat()
            elif isinstance(item, (dict, list)):
                data[i] = sanitize_dict_datetimes(item)
    return data

# Modifier la fonction jsonify pour convertir automatiquement les objets datetime
original_jsonify = jsonify
def safe_jsonify(*args, **kwargs):
    """Version sécurisée de jsonify qui convertit automatiquement les objets datetime"""
    # Traiter les arguments positionnels
    sanitized_args = [sanitize_dict_datetimes(arg) if isinstance(arg, (dict, list)) else arg for arg in args]
    # Traiter les arguments nommés
    sanitized_kwargs = {k: sanitize_dict_datetimes(v) if isinstance(v, (dict, list)) else v for k, v in kwargs.items()}
    return original_jsonify(*sanitized_args, **sanitized_kwargs)

# Remplacer jsonify par notre version sécurisée
jsonify = safe_jsonify

@app.route('/')
def index():
    schedules = get_schedules()
    logs = get_logs()
    scripts = get_scripts()
    
    # Nettoyer et assainir la liste des scripts en cours d'exécution
    sanitize_running_scripts()
    
    # Ajouter les informations de statut à chaque planification
    for schedule in schedules:
        # Déterminer la couleur du statut
        if not schedule.get('enabled', True):
            schedule['status_color'] = 'gray'
        elif schedule['id'] in running_scripts:
            schedule['status_color'] = 'green'
        else:
            # Chercher le dernier log pour cette planification
            last_log = None
            for log in logs:
                if log.get('schedule_id') == schedule['id']:
                    if not last_log or log['id'] > last_log['id']:
                        last_log = log
            
            if last_log and last_log['status'] == 'success':
                schedule['status_color'] = 'green'
            elif last_log and last_log['status'] == 'error':
                schedule['status_color'] = 'red'
            else:
                schedule['status_color'] = 'indigo'
    
    return render_template(
        'index.html', 
        schedules=schedules, 
        logs=logs, 
        scripts=scripts, 
        running_scripts=running_scripts,
        sys_executable=sys.executable
    )

@app.route('/schedules', methods=['GET', 'POST'])
def manage_schedules():
    if request.method == 'POST':
        schedule_name = request.form.get('scheduleName')
        script_path = request.form.get('scriptPath')
        env_path = request.form.get('envPath')
        frequency_type = request.form.get('frequencyType')
        
        # Récupérer le type de planification (standard ou service)
        schedule_type = request.form.get('scheduleType', 'standard')
        
        if frequency_type == 'simple':
            simple_frequency = request.form.get('simpleFrequency')
            
            # Construire l'expression cron en fonction du type de fréquence simple
            if simple_frequency == 'everyMinutes':
                minutes_value = request.form.get('everyMinutesValue', '5')
                # Convertir en expression cron (*/5 * * * * = toutes les 5 minutes)
                schedule = f"*/{minutes_value} * * * *"
                
            elif simple_frequency == 'hourly':
                minute = request.form.get('hourlyMinute', '0')
                schedule = f"{minute} * * * *"  # À la minute spécifiée de chaque heure
                
            elif simple_frequency == 'daily':
                hour = request.form.get('dailyHour', '0')
                minute = request.form.get('dailyMinute', '0')
                schedule = f"{minute} {hour} * * *"  # À l'heure et minute spécifiées chaque jour
                
            elif simple_frequency == 'weekly':
                weekday = request.form.get('weeklyDay', '0')  # 0=dim, 1=lun, ..., 6=sam
                hour = request.form.get('weeklyHour', '0')
                minute = request.form.get('weeklyMinute', '0')
                schedule = f"{minute} {hour} * * {weekday}"  # À l'heure et minute spécifiées du jour de la semaine choisi
                
            elif simple_frequency == 'monthly':
                day = request.form.get('monthlyDay', '1')
                hour = request.form.get('monthlyHour', '0')
                minute = request.form.get('monthlyMinute', '0')
                schedule = f"{minute} {hour} {day} * *"  # À l'heure et minute spécifiées du jour du mois choisi
                
            else:
                # Valeur par défaut si aucune option valide n'est sélectionnée
                schedule = "0 * * * *"  # Chaque heure
        else:
            # Construction de l'expression cron
            minute = request.form.get('minute', '*')
            hour = request.form.get('hour', '*')
            day = request.form.get('day', '*')
            month = request.form.get('month', '*')
            weekday = request.form.get('weekday', '*')
            schedule = f"{minute} {hour} {day} {month} {weekday}"
        
        schedules = get_schedules()
        schedule_id = len(schedules) + 1
        new_schedule = {
            'id': schedule_id,
            'name': schedule_name,
            'script_path': script_path,
            'env_path': env_path,
            'schedule': schedule,
            'frequency_type': frequency_type,
            'simple_frequency': simple_frequency if frequency_type == 'simple' else None,
            'schedule_type': schedule_type,
            'timeout': int(request.form.get('timeout', 30)),
            'enabled': True,
            'created_at': datetime.now().isoformat()
        }
        
        # Si c'est un service, on ajoute l'option de démarrage automatique
        if schedule_type == 'service':
            new_schedule['auto_start'] = request.form.get('autoStart') == 'on'
        
        schedules.append(new_schedule)
        save_schedules(schedules)
        flash('Planification ajoutée avec succès!', 'success')
        
        # Mettre à jour le planificateur
        update_scheduler()
        
        return redirect(url_for('index'))
    
    return redirect(url_for('index'))

@app.route('/schedules/<int:schedule_id>/toggle', methods=['POST'])
def toggle_schedule(schedule_id):
    schedules = get_schedules()
    for schedule in schedules:
        if schedule['id'] == schedule_id:
            schedule['enabled'] = not schedule.get('enabled', True)
            break
    
    save_schedules(schedules)
    # Mettre à jour le planificateur
    update_scheduler()
    
    flash('État de la planification modifié avec succès!', 'success')
    return redirect(url_for('index'))

@app.route('/schedules/<int:schedule_id>/delete', methods=['POST'])
def delete_schedule(schedule_id):
    schedules = get_schedules()
    schedules = [s for s in schedules if s['id'] != schedule_id]
    save_schedules(schedules)
    flash('Planification supprimée avec succès!', 'success')
    
    # Mettre à jour le planificateur
    update_scheduler()
    
    return redirect(url_for('index'))

@app.route('/schedules/edit', methods=['POST'])
def edit_schedule():
    schedule_id = int(request.form.get('scheduleId'))
    schedule_name = request.form.get('scheduleName')
    script_path = request.form.get('scriptPath')
    env_path = request.form.get('envPath')
    frequency_type = request.form.get('frequencyType')
    
    # Récupérer le type de planification (standard ou service)
    schedule_type = request.form.get('scheduleType', 'standard')
    
    # Récupérer le timeout personnalisé (en secondes)
    timeout = int(request.form.get('timeout', 30))
    
    if frequency_type == 'simple':
        simple_frequency = request.form.get('simpleFrequency')
        
        # Construire l'expression cron en fonction du type de fréquence simple
        if simple_frequency == 'everyMinutes':
            minutes_value = request.form.get('everyMinutesValue', '5')
            # Convertir en expression cron (*/5 * * * * = toutes les 5 minutes)
            schedule = f"*/{minutes_value} * * * *"
            
        elif simple_frequency == 'hourly':
            minute = request.form.get('hourlyMinute', '0')
            schedule = f"{minute} * * * *"  # À la minute spécifiée de chaque heure
            
        elif simple_frequency == 'daily':
            hour = request.form.get('dailyHour', '0')
            minute = request.form.get('dailyMinute', '0')
            schedule = f"{minute} {hour} * * *"  # À l'heure et minute spécifiées chaque jour
            
        elif simple_frequency == 'weekly':
            weekday = request.form.get('weeklyDay', '0')  # 0=dim, 1=lun, ..., 6=sam
            hour = request.form.get('weeklyHour', '0')
            minute = request.form.get('weeklyMinute', '0')
            schedule = f"{minute} {hour} * * {weekday}"  # À l'heure et minute spécifiées du jour de la semaine choisi
            
        elif simple_frequency == 'monthly':
            day = request.form.get('monthlyDay', '1')
            hour = request.form.get('monthlyHour', '0')
            minute = request.form.get('monthlyMinute', '0')
            schedule = f"{minute} {hour} {day} * *"  # À l'heure et minute spécifiées du jour du mois choisi
            
        else:
            # Valeur par défaut si aucune option valide n'est sélectionnée
            schedule = "0 * * * *"  # Chaque heure
    else:
        # Construction de l'expression cron
        minute = request.form.get('minute', '*')
        hour = request.form.get('hour', '*')
        day = request.form.get('day', '*')
        month = request.form.get('month', '*')
        weekday = request.form.get('weekday', '*')
        schedule = f"{minute} {hour} {day} {month} {weekday}"
    
    schedules = get_schedules()
    for s in schedules:
        if s['id'] == schedule_id:
            s['name'] = schedule_name
            s['script_path'] = script_path
            s['env_path'] = env_path
            s['schedule'] = schedule
            s['frequency_type'] = frequency_type
            s['simple_frequency'] = simple_frequency if frequency_type == 'simple' else None
            s['schedule_type'] = schedule_type
            s['timeout'] = timeout  # Ajouter le timeout personnalisé
            s['updated_at'] = datetime.now().isoformat()
            
            # Si c'est un service, on met à jour l'option de démarrage automatique
            if schedule_type == 'service':
                s['auto_start'] = request.form.get('autoStart') == 'on'
            
            break
    
    save_schedules(schedules)
    flash('Planification mise à jour avec succès!', 'success')
    
    # Mettre à jour le planificateur
    update_scheduler()
    
    return redirect(url_for('index'))

@app.route('/schedules/<int:schedule_id>/run', methods=['POST'])
def run_schedule(schedule_id):
    schedules = get_schedules()
    schedule_to_run = None
    
    for schedule in schedules:
        if schedule['id'] == schedule_id:
            schedule_to_run = schedule
            break
    
    if schedule_to_run:
        # Ne pas ajouter le script aux scripts en cours d'exécution ici
        # execute_script le fera avec les informations complètes
        
        try:
            # Exécuter le script avec le timeout personnalisé
            timeout = schedule_to_run.get('timeout', 30)
            result = execute_script(
                schedule_to_run['script_path'],
                schedule_id,
                schedule_to_run['name'],
                schedule_to_run.get('env_path', sys.executable),
                timeout
            )
            
            return jsonify({
                'status': result['status'],
                'output': result['output'] if 'output' in result else 'Exécution terminée'
            })
            
        except Exception as e:
            # En cas d'erreur, s'assurer que le script est marqué comme terminé
            if schedule_id in running_scripts:
                del running_scripts[schedule_id]
            
            return jsonify({
                'status': 'error',
                'output': str(e)
            })
    
    return jsonify({'error': 'Planification non trouvée'}), 404

@app.route('/schedules/<int:schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    schedules = get_schedules()
    for schedule in schedules:
        if schedule['id'] == schedule_id:
            return jsonify(schedule)
    
    return jsonify({'error': 'Planification non trouvée'}), 404

@app.route('/scripts', methods=['GET', 'POST'])
def manage_scripts():
    if request.method == 'POST':
        script_name = request.form.get('scriptName')
        script_path = request.form.get('scriptPath')
        env_path = request.form.get('envPath', sys.executable)
        script_content = request.form.get('scriptContent')
        
        # Gestion de l'upload de fichier
        if 'scriptFile' in request.files:
            script_file = request.files['scriptFile']
            if script_file and allowed_file(script_file.filename):
                filename = secure_filename(script_file.filename)
                script_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                script_file.save(script_path)
        
        # Si pas de fichier uploadé, créer un fichier à partir du contenu
        if not script_path and script_content:
            filename = secure_filename(f"{script_name}.py")
            script_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            with open(script_path, 'w') as f:
                f.write(script_content)
        
        scripts = get_scripts()
        script_id = len(scripts) + 1
        new_script = {
            'id': script_id,
            'name': script_name,
            'path': script_path,
            'env_path': env_path,
            'content': script_content,
            'created_at': datetime.now().isoformat()
        }
        
        scripts.append(new_script)
        save_scripts(scripts)
        flash('Script ajouté avec succès!', 'success')
        
        return redirect(url_for('index'))
    
    return redirect(url_for('index'))

@app.route('/scripts/<int:script_id>', methods=['GET'])
def get_script(script_id):
    scripts = get_scripts()
    for script in scripts:
        if script['id'] == script_id:
            return jsonify(script)
    
    return jsonify({'error': 'Script non trouvé'}), 404

@app.route('/scripts/<int:script_id>/edit', methods=['POST'])
def edit_script(script_id):
    script_name = request.form.get('scriptName')
    script_content = request.form.get('scriptContent')
    
    scripts = get_scripts()
    for script in scripts:
        if script['id'] == script_id:
            script['name'] = script_name
            script['content'] = script_content
            
            # Mettre à jour le fichier physique
            with open(script['path'], 'w') as f:
                f.write(script_content)
            
            save_scripts(scripts)
            flash('Script mis à jour avec succès!', 'success')
            break
    
    return redirect(url_for('index'))

@app.route('/scripts/<int:script_id>/delete', methods=['POST'])
def delete_script(script_id):
    scripts = get_scripts()
    script_to_delete = None
    
    for script in scripts:
        if script['id'] == script_id:
            script_to_delete = script
            break
    
    if script_to_delete:
        # Supprimer le fichier physique
        try:
            if os.path.exists(script_to_delete['path']):
                os.remove(script_to_delete['path'])
        except Exception as e:
            flash(f'Erreur lors de la suppression du fichier: {str(e)}', 'error')
        
        # Supprimer de la liste
        scripts = [s for s in scripts if s['id'] != script_id]
        save_scripts(scripts)
        flash('Script supprimé avec succès!', 'success')
    
    return redirect(url_for('index'))

@app.route('/scripts/<int:script_id>/run', methods=['POST'])
def run_script(script_id):
    scripts = get_scripts()
    script_to_run = None
    
    for script in scripts:
        if script['id'] == script_id:
            script_to_run = script
            break
    
    if script_to_run:
        try:
            # Récupérer le timeout personnalisé s'il existe, sinon utiliser 30 secondes par défaut
            timeout = script_to_run.get('timeout', 30)
            
            # Exécuter le script
            result = subprocess.run(
                [script_to_run['env_path'], script_to_run['path']], 
                capture_output=True, 
                text=True, 
                timeout=timeout  # Utiliser le timeout personnalisé
            )
            
            if result.returncode == 0:
                status = 'success'
                flash('Script exécuté avec succès!', 'success')
            else:
                status = 'error'
                flash('Erreur lors de l\'exécution du script!', 'error')
            
            # Ajouter un log
            add_log(
                schedule_id=None,
                schedule_name='Exécution manuelle',
                script_path=script_to_run['path'],
                status=status,
                output=result.stdout if result.returncode == 0 else result.stderr
            )
            
            return jsonify({
                'status': status,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
        
        except subprocess.TimeoutExpired:
            add_log(
                schedule_id=None,
                schedule_name='Exécution manuelle',
                script_path=script_to_run['path'],
                status='timeout',
                output='L\'exécution du script a dépassé le délai imparti.'
            )
            
            flash('L\'exécution du script a dépassé le délai imparti!', 'error')
            return jsonify({
                'status': 'timeout',
                'output': 'L\'exécution du script a dépassé le délai imparti.'
            })
    
    return jsonify({'error': 'Script non trouvé'}), 404

@app.route('/schedules/<int:schedule_id>/run', methods=['POST'])
def run_scheduled_script(schedule_id):
    schedules = get_schedules()
    schedule_to_run = None
    
    for schedule in schedules:
        if schedule['id'] == schedule_id:
            schedule_to_run = schedule
            break
    
    if schedule_to_run:
        script_path = schedule_to_run['script_path']
        env_path = schedule_to_run.get('env_path', sys.executable)
        timeout = schedule_to_run.get('timeout', 30)  # Récupérer le timeout personnalisé
        
        try:
            # Exécuter le script
            result = subprocess.run(
                [env_path, script_path], 
                capture_output=True, 
                text=True, 
                timeout=timeout  # Utiliser le timeout personnalisé
            )
            
            if result.returncode == 0:
                status = 'success'
                flash('Script planifié exécuté avec succès!', 'success')
            else:
                status = 'error'
                flash('Erreur lors de l\'exécution du script planifié!', 'error')
            
            # Ajouter un log
            add_log(
                schedule_id=schedule_id,
                schedule_name=schedule_to_run['name'],
                script_path=script_path,
                status=status,
                output=result.stdout if result.returncode == 0 else result.stderr
            )
            
            return jsonify({
                'status': status,
                'output': result.stdout if result.returncode == 0 else result.stderr
            })
        
        except subprocess.TimeoutExpired:
            add_log(
                schedule_id=schedule_id,
                schedule_name=schedule_to_run['name'],
                script_path=script_path,
                status='timeout',
                output='L\'exécution du script a dépassé le délai imparti.'
            )
            
            flash('L\'exécution du script a dépassé le délai imparti!', 'error')
            return jsonify({
                'status': 'timeout',
                'output': 'L\'exécution du script a dépassé le délai imparti.'
            })
    
    return jsonify({'error': 'Planification non trouvée'}), 404

@app.route('/logs/clear', methods=['POST'])
def clear_logs():
    save_logs([])
    flash('Logs effacés avec succès!', 'success')
    return redirect(url_for('index'))

@app.route('/logs', methods=['GET'])
def get_logs_api():
    """API pour récupérer les journaux d'exécution"""
    logs = get_logs()
    
    # Convertir explicitement les IDs en chaînes pour garantir la cohérence
    for log in logs:
        if 'id' in log:
            log['id'] = str(log['id'])
    
    # Filtrer par schedule_id si spécifié
    schedule_id = request.args.get('schedule_id')
    if schedule_id:
        # Debug du problème de correspondance de types
        print(f"Recherche de logs pour schedule_id: {schedule_id}, type: {type(schedule_id)}")
        # Assurer que la comparaison est indépendante du type
        logs = [log for log in logs if str(log.get('schedule_id', '')) == str(schedule_id)]
        print(f"Logs trouvés: {len(logs)}")
    
    # Retourner uniquement le dernier log si demandé
    last_only = request.args.get('last') == 'true'
    if last_only and logs:
        # Trier par ID en ordre décroissant (le plus récent en premier)
        logs.sort(key=lambda x: int(x['id']) if x.get('id') else 0, reverse=True)
        # Ne garder que le premier élément (le plus récent)
        logs = [logs[0]]
    
    return jsonify(logs)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    # Simulez des paramètres pour l'instant
    return render_template('settings.html')

@app.route('/browse_files', methods=['GET'])
def browse_files_get():
    """API pour explorer les fichiers et dossiers du système via GET"""
    path = request.args.get('path', '')
    file_type = request.args.get('type', '')  # 'script' ou 'python'
    
    try:
        items = []
        parent_path = None
        
        # Si sur Windows, lister les lecteurs disponibles si nous sommes à la racine
        if os.name == 'nt' and (path == '/' or path == '\\' or path == ''):
            import win32api
            drives = win32api.GetLogicalDriveStrings()
            drives = drives.split('\000')[:-1]
            for drive in drives:
                items.append({
                    'name': drive,
                    'path': drive,
                    'type': 'directory'
                })
            parent_path = None
        else:
            # Vérification et normalisation du chemin pour Windows
            if os.name == 'nt':
                # Remplacer les slashes avant en slashes arrière pour Windows
                normalized_path = path.replace('/', '\\')
                # S'assurer que le chemin a un backslash à la fin pour os.listdir
                if not normalized_path.endswith('\\') and os.path.isdir(normalized_path):
                    normalized_path += '\\'
            else:
                normalized_path = path
                
            # Calculer le chemin parent
            if normalized_path:
                parent_dir = os.path.dirname(normalized_path)
                parent_path = parent_dir if parent_dir != normalized_path else None
                
            # Vérifier si le chemin existe
            if not os.path.exists(normalized_path):
                return jsonify({
                    'error': f'Le répertoire "{normalized_path}" n\'existe pas.',
                    'items': [],
                    'current_path': path,
                    'parent_path': parent_path
                }), 404
                
            # Lister les fichiers et dossiers
            for item in os.listdir(normalized_path):
                try:
                    full_path = os.path.join(normalized_path, item)
                    is_dir = os.path.isdir(full_path)
                    
                    # Pour le type 'script', n'afficher que les .py si ce n'est pas un dossier
                    if file_type == 'script' and not is_dir and not item.endswith('.py'):
                        continue
                        
                    # Pour le type 'python', afficher uniquement les dossiers et le python.exe
                    if file_type == 'python' and not is_dir and not ('python' in item.lower()):
                        continue
                    
                    # Normaliser le chemin pour le web (toujours utiliser les slashes avant)
                    web_path = full_path.replace('\\', '/')
                    
                    items.append({
                        'name': item,
                        'path': web_path,
                        'type': 'directory' if is_dir else 'file'
                    })
                except (PermissionError, FileNotFoundError) as e:
                    # Ignorer les fichiers auxquels on n'a pas accès
                    continue
        
        # Trier : dossiers d'abord, puis par nom
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return jsonify({
            'items': items,
            'current_path': path,
            'parent_path': parent_path
        })
    except Exception as e:
        app.logger.error(f"Erreur lors de la navigation: {str(e)}")
        return jsonify({
            'error': f"Erreur lors du chargement du répertoire: {str(e)}",
            'items': [],
            'current_path': path,
            'parent_path': None
        }), 500

@app.route('/browse_files', methods=['POST'])
def browse_files():
    """API pour explorer les fichiers et dossiers du système via POST"""
    data = request.get_json()
    directory = data.get('path', '')
    
    try:
        items = []
        
        # Si sur Windows, lister les lecteurs disponibles si nous sommes à la racine
        if os.name == 'nt' and (directory == '/' or directory == '\\' or directory == ''):
            import win32api
            drives = win32api.GetLogicalDriveStrings()
            drives = drives.split('\000')[:-1]
            for drive in drives:
                items.append({
                    'name': drive,
                    'path': drive,
                    'type': 'directory'
                })
        else:
            # Vérification et normalisation du chemin pour Windows
            if os.name == 'nt':
                # Remplacer les slashes avant en slashes arrière pour Windows
                normalized_path = directory.replace('/', '\\')
                # S'assurer que le chemin a un backslash à la fin pour os.listdir
                if not normalized_path.endswith('\\') and os.path.isdir(normalized_path):
                    normalized_path += '\\'
            else:
                normalized_path = directory
                
            # Vérifier si le chemin existe
            if not os.path.exists(normalized_path):
                return jsonify({
                    'error': f'Le répertoire "{normalized_path}" n\'existe pas.',
                    'items': []
                }), 404
                
            # Lister les fichiers et dossiers
            for item in os.listdir(normalized_path):
                try:
                    full_path = os.path.join(normalized_path, item)
                    is_dir = os.path.isdir(full_path)
                    
                    # Normaliser le chemin pour le web (toujours utiliser les slashes avant)
                    web_path = full_path.replace('\\', '/')
                    
                    items.append({
                        'name': item,
                        'path': web_path,
                        'type': 'directory' if is_dir else 'file'
                    })
                except (PermissionError, FileNotFoundError) as e:
                    # Ignorer les fichiers auxquels on n'a pas accès
                    continue
        
        # Trier : dossiers d'abord, puis par nom
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return jsonify({
            'items': items,
            'current_path': directory
        })
    except Exception as e:
        app.logger.error(f"Erreur lors de la navigation: {str(e)}")
        return jsonify({
            'error': f"Erreur lors du chargement du répertoire: {str(e)}",
            'items': []
        }), 500

# Routes pour les paramètres avancés
@app.route('/settings/cleanup_logs', methods=['POST'])
def cleanup_logs():
    """Nettoie les journaux plus anciens que 30 jours"""
    try:
        logs = get_logs()
        
        # Calculer la date d'il y a 30 jours
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        # Filtrer les logs pour ne garder que ceux des 30 derniers jours
        new_logs = [log for log in logs if log['timestamp'] > thirty_days_ago]
        
        # Calculer combien de logs ont été supprimés
        removed_count = len(logs) - len(new_logs)
        
        # Sauvegarder les nouveaux logs
        save_logs(new_logs)
        
        return jsonify({
            'success': True, 
            'message': f"{removed_count} journaux anciens ont été supprimés avec succès."
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f"Erreur lors du nettoyage des journaux: {str(e)}"}), 500

@app.route('/settings/backup_data', methods=['POST'])
def backup_data():
    """Sauvegarde les données de l'application dans un fichier ZIP"""
    try:
        import zipfile
        from datetime import datetime
        
        # Créer un dossier de sauvegarde s'il n'existe pas
        backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Nom du fichier de sauvegarde
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'backup_{timestamp}.zip')
        
        # Créer l'archive ZIP
        with zipfile.ZipFile(backup_file, 'w') as zipf:
            # Ajouter les fichiers de données
            data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
            if os.path.exists(data_dir):
                for root, _, files in os.walk(data_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        zipf.write(file_path, os.path.relpath(file_path, os.path.dirname(data_dir)))
        
        return jsonify({
            'success': True,
            'message': f"Sauvegarde créée avec succès: {os.path.basename(backup_file)}",
            'file_path': backup_file
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f"Erreur lors de la sauvegarde: {str(e)}"}), 500

@app.route('/settings/restart_server', methods=['POST'])
def restart_server():
    """Redémarre le serveur Flask"""
    try:
        # En production, cette fonction nécessiterait un mécanisme différent
        # Pour cette démonstration, nous simulons un redémarrage
        
        # Mettre à jour le planificateur
        update_scheduler()
        
        # Dans un environnement de production réel, vous utiliseriez un service
        # ou un gestionnaire de processus comme systemd, supervisord, etc.
        
        return jsonify({
            'success': True,
            'message': "Le serveur a été redémarré avec succès. Le planificateur a été mis à jour."
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f"Erreur lors du redémarrage: {str(e)}"}), 500

@app.route('/settings/check_updates', methods=['POST'])
def check_updates():
    """Vérifie si des mises à jour sont disponibles pour l'application"""
    # Dans une application réelle, cette fonction vérifierait un serveur distant
    # ou un dépôt Git pour les mises à jour
    
    # Pour cette démonstration, nous retournons une réponse statique
    return jsonify({
        'success': True,
        'has_updates': False,
        'current_version': '1.0.0',
        'latest_version': '1.0.0',
        'message': "Votre application est à jour."
    })

@app.route('/stop_script/<schedule_id>', methods=['POST'])
def stop_script(schedule_id):
    """Arrête l'exécution d'un script en cours"""
    try:
        # Nettoyer la liste des scripts en cours d'exécution
        sanitize_running_scripts()
        
        # Essayer avec différents types (chaîne et entier)
        if schedule_id in running_scripts:
            key = schedule_id
        elif int(schedule_id) in running_scripts:
            key = int(schedule_id)
        else:
            # Afficher les clés actuellement en cours pour le débogage
            running_keys = list(running_scripts.keys())
            print(f"Schedule ID reçu: {schedule_id}, type: {type(schedule_id)}")
            print(f"Clés actuelles: {running_keys}")
            flash('Le script n\'est pas en cours d\'exécution.', 'warning')
            return redirect(url_for('index'))
            
        process_info = running_scripts[key]
        process = process_info['process']
        
        # Essayer de tuer le processus et son groupe
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except:
            # Fallback si killpg ne fonctionne pas
            process.kill()
            
        # Mettre à jour le log
        add_log(
            schedule_id=schedule_id,
            schedule_name=process_info['name'],
            script_path=process_info['script_path'],
            status='stopped',
            output='Script arrêté manuellement.'
        )
        
        # Supprimer le script de la liste des scripts en cours
        del running_scripts[key]
        
        flash('Script arrêté avec succès!', 'success')
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Erreur lors de l\'arrêt du script: {str(e)}', 'error')
        return redirect(url_for('index'))

@app.route('/script_status', methods=['GET'])
def script_status():
    """API pour vérifier le statut d'exécution des scripts"""
    # Nettoyer et assainir la liste des scripts en cours d'exécution
    sanitize_running_scripts()
    
    running_status = {}
    for schedule_id, process_info in running_scripts.items():
        running_status[schedule_id] = {
            'running': True,
            'start_time': process_info['start_time'],  # Déjà converti en chaîne par sanitize_running_scripts
            'name': process_info['name']
        }
    
    return jsonify(running_status)

@app.errorhandler(Exception)
def handle_exception(e):
    """Gestionnaire global d'erreurs pour capturer et journaliser toutes les exceptions"""
    # Journaliser l'erreur avec les informations de traçage complètes
    import traceback
    error_details = traceback.format_exc()
    print(f"ERREUR DÉTAILLÉE: {error_details}")
    
    # Si c'est une requête JSON/API, retourner une réponse JSON
    if request.path.startswith('/api') or request.is_json:
        return jsonify({
            'success': False,
            'error': str(e),
            'details': error_details
        }), 500
    
    # Pour une requête web normale, afficher un message d'erreur
    flash(f'Erreur générale: {str(e)}', 'error')
    return redirect(url_for('index'))

# Initialiser le planificateur
scheduler = BackgroundScheduler(timezone=utc)
scheduler.start()

# Mettre à jour le planificateur au démarrage
update_scheduler()

# Lancer l'application si ce fichier est exécuté directement
if __name__ == '__main__':
    app.run(debug=True)
