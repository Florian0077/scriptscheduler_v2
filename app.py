from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import os
import json
from datetime import datetime
import subprocess
import sys
from werkzeug.utils import secure_filename
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import utc
from datetime import timedelta

app = Flask(__name__)
app.secret_key = 'votre_clé_secrète_ici'  # À changer en production

# Activer les extensions Jinja2
app.jinja_env.add_extension('jinja2.ext.do')

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
    with open(LOGS_FILE, 'r') as f:
        return json.load(f)

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

def execute_script(script_path, env_path, schedule_id=None, schedule_name=None):
    """
    Fonction qui exécute un script Python et enregistre le résultat
    """
    try:
        # Si le chemin de script ou d'environnement Python n'existe pas, on utilise des valeurs par défaut
        if not os.path.exists(script_path):
            return add_log(
                schedule_id=schedule_id,
                schedule_name=schedule_name,
                script_path=script_path,
                status='error',
                output=f'Le chemin du script "{script_path}" n\'existe pas.'
            )
        
        if not env_path or not os.path.exists(env_path):
            env_path = sys.executable
            
        # Exécuter le script
        result = subprocess.run(
            [env_path, script_path], 
            capture_output=True, 
            text=True, 
            timeout=30  # Timeout après 30 secondes
        )
        
        if result.returncode == 0:
            status = 'success'
            output = result.stdout
        else:
            status = 'error'
            output = result.stderr
        
        # Ajouter un log
        return add_log(
            schedule_id=schedule_id,
            schedule_name=schedule_name,
            script_path=script_path,
            status=status,
            output=output
        )
    
    except subprocess.TimeoutExpired:
        return add_log(
            schedule_id=schedule_id,
            schedule_name=schedule_name,
            script_path=script_path,
            status='timeout',
            output='L\'exécution du script a dépassé le délai imparti.'
        )
    except Exception as e:
        return add_log(
            schedule_id=schedule_id,
            schedule_name=schedule_name,
            script_path=script_path,
            status='error',
            output=f'Erreur lors de l\'exécution: {str(e)}'
        )

def update_scheduler():
    """
    Met à jour toutes les tâches planifiées dans le planificateur
    """
    # Supprimer toutes les tâches existantes
    scheduler.remove_all_jobs()
    
    # Récupérer toutes les planifications
    schedules = get_schedules()
    
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
            
            # Ajouter la tâche au planificateur
            scheduler.add_job(
                execute_script,
                trigger=trigger,
                args=[schedule['script_path'], schedule.get('env_path', sys.executable), schedule['id'], schedule['name']],
                id=f"schedule_{schedule['id']}",
                replace_existing=True
            )

@app.route('/')
def index():
    schedules = get_schedules()
    scripts = get_scripts()
    logs = get_logs()
    return render_template('index.html', schedules=schedules, scripts=scripts, logs=logs)

@app.route('/schedules', methods=['GET', 'POST'])
def manage_schedules():
    if request.method == 'POST':
        schedule_name = request.form.get('scheduleName')
        script_path = request.form.get('scriptPath')
        env_path = request.form.get('envPath')
        frequency_type = request.form.get('frequencyType')
        
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
            'enabled': True,
            'created_at': datetime.now().isoformat()
        }
        
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
            s['updated_at'] = datetime.now().isoformat()
            break
    
    save_schedules(schedules)
    flash('Planification mise à jour avec succès!', 'success')
    
    # Mettre à jour le planificateur
    update_scheduler()
    
    return redirect(url_for('index'))

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
            # Exécuter le script
            result = subprocess.run(
                [script_to_run['env_path'], script_to_run['path']], 
                capture_output=True, 
                text=True, 
                timeout=30  # Timeout après 30 secondes
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
        
        try:
            # Exécuter le script
            result = subprocess.run(
                [env_path, script_path], 
                capture_output=True, 
                text=True, 
                timeout=30
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

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    # Simulez des paramètres pour l'instant
    return render_template('settings.html')

@app.route('/browse_files', methods=['GET'])
def browse_files_get():
    """API pour explorer les fichiers et dossiers du système via GET"""
    path = request.args.get('path', '')
    
    try:
        items = []
        
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
        else:
            # Sinon, lister les fichiers et dossiers dans le répertoire spécifié
            if not os.path.exists(path):
                return jsonify({'error': f'Directory {path} does not exist'}), 404
                
            for item in os.listdir(path):
                full_path = os.path.join(path, item)
                item_type = 'directory' if os.path.isdir(full_path) else 'file'
                items.append({
                    'name': item,
                    'path': full_path.replace('\\', '/'),  # Normaliser les chemins pour le web
                    'type': item_type
                })
        
        # Trier : dossiers d'abord, puis par nom
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return jsonify({
            'items': items
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/browse_files', methods=['POST'])
def browse_files():
    """API pour explorer les fichiers et dossiers du système via POST"""
    directory = request.json.get('directory', '/')
    
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
            # Sinon, lister les fichiers et dossiers dans le répertoire spécifié
            if not os.path.exists(directory):
                return jsonify({'error': f'Directory {directory} does not exist'}), 404
                
            for item in os.listdir(directory):
                full_path = os.path.join(directory, item)
                item_type = 'directory' if os.path.isdir(full_path) else 'file'
                items.append({
                    'name': item,
                    'path': full_path.replace('\\', '/'),  # Normaliser les chemins pour le web
                    'type': item_type
                })
        
        # Trier : dossiers d'abord, puis par nom
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return jsonify({
            'items': items
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

scheduler = BackgroundScheduler(timezone=utc)
scheduler.start()

if __name__ == '__main__':
    # Initialiser le planificateur au démarrage de l'application
    update_scheduler()
    app.run(debug=True, use_reloader=False)  # Désactiver use_reloader pour éviter les problèmes avec APScheduler
