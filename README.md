# Python Script Scheduler

Une application web basée sur Flask pour planifier et gérer l'exécution de scripts Python.

## Fonctionnalités

- Planification de scripts Python avec différentes fréquences :
  - Toutes les X minutes
  - Horaire
  - Quotidien
  - Hebdomadaire 
  - Mensuel
  - Expression cron personnalisée
- Exécution automatique des scripts en arrière-plan via APScheduler
- Gestion des scripts (création, édition, exécution, suppression)
- Journal d'exécution détaillé avec statut et sortie des scripts
- Paramètres avancés (nettoyage des journaux, sauvegarde des données, redémarrage du serveur)
- Interface utilisateur moderne et réactive avec TailwindCSS

## Structure du projet

```
script_scheduler/
├── app.py                 # Application Flask principale
├── data/                  # Dossier pour les fichiers de données JSON
│   ├── schedules.json     # Données des planifications
│   ├── scripts.json       # Données des scripts
│   └── logs.json          # Journaux d'exécution
├── scripts/               # Dossier pour stocker les scripts Python
├── static/                # Fichiers statiques
│   ├── css/
│   │   └── style.css      # Styles personnalisés
│   └── js/
│       └── script.js      # JavaScript pour l'interface utilisateur
└── templates/             # Templates Jinja2
    ├── index.html         # Page principale
    └── settings.html      # Page de paramètres
```

## Installation

1. Assurez-vous d'avoir Python 3.7+ installé sur votre système
2. Clonez ce dépôt ou téléchargez les fichiers
3. Installez les dépendances requises :

```bash
pip install -r requirements.txt
```

## Utilisation

1. Lancez l'application :

```bash
python app.py
```

2. Ouvrez votre navigateur et accédez à `http://localhost:5000`

3. Utilisez l'interface pour :
   - Créer et gérer des planifications
   - Ajouter et modifier des scripts Python
   - Exécuter manuellement des scripts
   - Consulter les journaux d'exécution

## Notes importantes

- Les scripts sont exécutés automatiquement selon leur planification, même lorsque le navigateur est fermé, tant que l'application Flask est en cours d'exécution.
- Pour garantir une exécution continue des planifications, il est recommandé d'utiliser un gestionnaire de processus comme systemd, supervisord ou PM2 en production.
- Les scripts sont exécutés avec le même niveau de privilèges que l'application Flask. Veillez à ne pas exécuter de scripts potentiellement dangereux.
- Pour un déploiement en production, il est recommandé d'utiliser un serveur WSGI comme Gunicorn ou uWSGI plutôt que le serveur de développement intégré à Flask.

## Personnalisation

Vous pouvez facilement personnaliser cette application en :
- Ajoutant des fonctionnalités supplémentaires dans `app.py`
- Modifiant les templates HTML dans le dossier `templates`
- Ajustant les styles dans `static/css/style.css`
- Étendant les fonctionnalités JavaScript dans `static/js/script.js`
