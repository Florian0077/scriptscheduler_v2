/**
 * Card-manager.js - Gestion des boutons d'action sur les cartes de planification
 * Ce fichier gère les interactions avec les boutons sur les cartes (éditer, exécuter, voir logs, etc.)
 */

// FONCTIONS GLOBALES EXPOSÉES IMMÉDIATEMENT
// Ces fonctions sont définies immédiatement pour être disponibles
// dès que le fichier JavaScript est chargé, même avant DOMContentLoaded

// Fonction pour éditer une planification (disponible globalement immédiatement)
window.editScheduleDirectly = function(scheduleId) {
    console.log("Édition de la planification:", scheduleId);
    
    // Récupérer les détails de la planification via une requête AJAX
    fetch(`/schedules/${scheduleId}`)
        .then(response => response.json())
        .then(data => {
            console.log("Données de planification reçues:", data);
            
            // Trouver le modal d'édition
            const scheduleEditorModal = document.getElementById('scheduleEditorModal');
            
            // Remplir le formulaire avec les données récupérées
            document.getElementById('editScheduleId').value = scheduleId;
            document.getElementById('editScheduleName').value = data.name;
            document.getElementById('editScriptPath').value = data.script_path;
            document.getElementById('editEnvPath').value = data.env_path || "";
            document.getElementById('editTimeout').value = data.timeout || 30;
            
            // Sélectionner le type de planification
            if (data.schedule_type === 'service') {
                document.getElementById('editServiceType').checked = true;
                
                // Afficher les options supplémentaires service
                const serviceOptions = document.getElementById('editServiceOptions');
                if (serviceOptions) serviceOptions.classList.remove('hidden');
                // Définir l'option de démarrage automatique
                const autoStartCheckbox = document.getElementById('editAutoStart');
                if (autoStartCheckbox) autoStartCheckbox.checked = data.auto_start || false;
                // Masquer la section fréquence pour un service
                const editFrequencySection = document.querySelector('#editScheduleForm .frequency-section, #editScheduleForm .frequency-section, #editFrequencySection, #editFrequencySection, .frequency-section');
                if (editFrequencySection) {
                    editFrequencySection.style.display = 'none';
                } else {
                    // fallback : masquer via le label
                    const editFormLabels = document.querySelectorAll('form#editScheduleForm label.block');
                    for (const label of editFormLabels) {
                        if (label.textContent.includes("Fréquence d'exécution")) {
                            const freqDiv = label.closest('div.mb-4');
                            if (freqDiv) freqDiv.style.display = 'none';
                        }
                    }
                }
            } else {
                document.getElementById('editStandardType').checked = true;
                // Masquer les options de service
                const serviceOptions = document.getElementById('editServiceOptions');
                if (serviceOptions) serviceOptions.classList.add('hidden');
                // Réafficher la section fréquence
                const editFrequencySection = document.querySelector('#editScheduleForm .frequency-section, #editFrequencySection, .frequency-section');
                if (editFrequencySection) {
                    editFrequencySection.style.display = '';
                } else {
                    // fallback : afficher via le label
                    const editFormLabels = document.querySelectorAll('form#editScheduleForm label.block');
                    for (const label of editFormLabels) {
                        if (label.textContent.includes("Fréquence d'exécution")) {
                            const freqDiv = label.closest('div.mb-4');
                            if (freqDiv) freqDiv.style.display = '';
                        }
                    }
                }
            }
            
            // Gérer le type de fréquence (simple ou cron)
            if (data.frequency_type === 'cron') {
                document.getElementById('editCronFrequencyType').checked = true;
                // Mettre à jour l'UI pour montrer les options cron et masquer les options simples
                document.getElementById('editSimpleFrequencyOptions').classList.add('hidden');
                document.getElementById('editCronFrequencyOptions').classList.remove('hidden');
                
                // Remplir les champs cron
                const cronParts = data.schedule.split(' ');
                if (cronParts.length === 5) {
                    document.getElementById('editCronMinute').value = cronParts[0];
                    document.getElementById('editCronHour').value = cronParts[1];
                    document.getElementById('editCronDay').value = cronParts[2];
                    document.getElementById('editCronMonth').value = cronParts[3];
                    document.getElementById('editCronWeekday').value = cronParts[4];
                }
                
                // Mettre à jour l'expression cron affichée
                const cronExpression = document.getElementById('editCronExpression');
                if (cronExpression) cronExpression.textContent = data.schedule;
            } else {
                document.getElementById('editSimpleFrequencyType').checked = true;
                // Mettre à jour l'UI pour montrer les options simples et masquer les options cron
                document.getElementById('editSimpleFrequencyOptions').classList.remove('hidden');
                document.getElementById('editCronFrequencyOptions').classList.add('hidden');
                
                try {
                    // Simplifions complètement cette partie
                    // 1. Identifier le type de fréquence
                    const frequencyType = data.selected_frequency;
                    console.log("Type de fréquence:", frequencyType);
                    
                    if (frequencyType) {
                        // Cocher le bon bouton radio
                        const radioId = 'edit' + frequencyType.charAt(0).toUpperCase() + frequencyType.slice(1);
                        const radio = document.getElementById(radioId);
                        if (radio) {
                            radio.checked = true;
                            console.log(`Bouton radio coché: ${radioId}`);
                        }
                        
                        // Masquer toutes les options
                        [
                            'editEveryMinutesOptions',
                            'editHourlyOptions',
                            'editDailyOptions',
                            'editWeeklyOptions',
                            'editMonthlyOptions'
                        ].forEach(id => {
                            const opt = document.getElementById(id);
                            if (opt) opt.classList.add('hidden');
                        });
                        
                        // Afficher les options correspondantes
                        const optionsId = radioId + 'Options';
                        const options = document.getElementById(optionsId);
                        if (options) {
                            options.classList.remove('hidden');
                            console.log(`Options affichées: ${optionsId}`);
                        }
                        
                        // Définir les valeurs spécifiques en fonction du type
                        switch(frequencyType) {
                            case 'everyMinutes':
                                if (data.minutes_value !== undefined) {
                                    const el = document.getElementById('editEveryMinutesValue');
                                    if (el) el.value = data.minutes_value;
                                }
                                break;
                            case 'hourly':
                                if (data.hourly_minute !== undefined) {
                                    const el = document.getElementById('editHourlyMinute');
                                    if (el) el.value = data.hourly_minute;
                                }
                                break;
                            case 'daily':
                                if (data.daily_hour !== undefined) {
                                    const el = document.getElementById('editDailyHour');
                                    if (el) el.value = data.daily_hour;
                                }
                                if (data.daily_minute !== undefined) {
                                    const el = document.getElementById('editDailyMinute');
                                    if (el) el.value = data.daily_minute;
                                }
                                break;
                            case 'weekly':
                                if (data.weekly_day !== undefined) {
                                    const el = document.getElementById('editWeeklyDay');
                                    if (el) el.value = data.weekly_day;
                                }
                                if (data.weekly_hour !== undefined) {
                                    const el = document.getElementById('editWeeklyHour');
                                    if (el) el.value = data.weekly_hour;
                                }
                                if (data.weekly_minute !== undefined) {
                                    const el = document.getElementById('editWeeklyMinute');
                                    if (el) el.value = data.weekly_minute;
                                }
                                break;
                            case 'monthly':
                                if (data.monthly_day !== undefined) {
                                    const el = document.getElementById('editMonthlyDay');
                                    if (el) el.value = data.monthly_day;
                                }
                                if (data.monthly_hour !== undefined) {
                                    const el = document.getElementById('editMonthlyHour');
                                    if (el) el.value = data.monthly_hour;
                                }
                                if (data.monthly_minute !== undefined) {
                                    const el = document.getElementById('editMonthlyMinute');
                                    if (el) el.value = data.monthly_minute;
                                }
                                break;
                        }
                    }
                } catch (e) {
                    console.error("Erreur lors de la détection du type de fréquence:", e);
                }
            }
            
            // Afficher le modal d'édition
            if (scheduleEditorModal) {
                scheduleEditorModal.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de la récupération des détails de la planification');
        });
};

// Fonction qui exécute un script/service
window.runSchedule = function(scheduleId, scheduleType) {
    console.log(`Lancement de la planification: ${scheduleId}, type: ${scheduleType || 'standard'}`);
    
    // Mettre à jour l'UI immédiatement pour montrer que le script est en cours d'exécution
    const cards = document.querySelectorAll(`.schedule-card[data-schedule-id="${scheduleId}"]`);
    cards.forEach(card => {
        // Trouver et mettre à jour le badge de statut
        const statusBadge = card.querySelector('.status-badge');
        if (statusBadge) {
            // Sauvegarder l'état initial du badge si ce n'est pas déjà fait
            if (!window.initialBadgeStates[scheduleId]) {
                window.initialBadgeStates[scheduleId] = {
                    text: statusBadge.textContent,
                    className: statusBadge.className
                };
            }
            
            // Mettre à jour le texte et la classe du badge
            statusBadge.textContent = 'En cours';
            statusBadge.className = statusBadge.className.replace(/bg-\w+-\d+/g, 'bg-yellow-500');
            
            // Masquer le bouton d'exécution si présent
            const runButton = card.querySelector('.run-schedule');
            if (runButton) runButton.style.display = 'none';
            
            // Afficher le bouton d'arrêt si présent
            const stopForm = card.querySelector('form[action*="stop_script"]');
            if (stopForm) stopForm.style.display = 'inline';
        }
    });
    
    // Envoyer la requête d'exécution avec le bon endpoint
    fetch(`/schedules/${scheduleId}/run`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Ne pas afficher d'alerte, juste log et mise à jour de l'UI
            console.log('Script démarré avec succès');
        } else {
            // Restaurer l'état initial du badge en cas d'erreur
            if (window.initialBadgeStates[scheduleId]) {
                cards.forEach(card => {
                    const statusBadge = card.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.textContent = window.initialBadgeStates[scheduleId].text;
                        statusBadge.className = window.initialBadgeStates[scheduleId].className;
                    }
                    
                    // Réafficher le bouton d'exécution
                    const runButton = card.querySelector('.run-schedule');
                    if (runButton) runButton.style.display = '';
                    
                    // Masquer le bouton d'arrêt
                    const stopForm = card.querySelector('form[action*="stop_script"]');
                    if (stopForm) stopForm.style.display = 'none';
                });
            }
            
            alert('Erreur: ' + (data.message || 'Erreur inconnue'));
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de la communication avec le serveur');
        
        // Restaurer l'état initial du badge en cas d'erreur
        if (window.initialBadgeStates[scheduleId]) {
            cards.forEach(card => {
                const statusBadge = card.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = window.initialBadgeStates[scheduleId].text;
                    statusBadge.className = window.initialBadgeStates[scheduleId].className;
                }
                
                // Réafficher le bouton d'exécution
                const runButton = card.querySelector('.run-schedule');
                if (runButton) runButton.style.display = '';
                
                // Masquer le bouton d'arrêt
                const stopForm = card.querySelector('form[action*="stop_script"]');
                if (stopForm) stopForm.style.display = 'none';
            });
        }
    });
};

// Fonction qui affiche les derniers logs
window.viewLastLogs = function(scheduleId) {
    console.log(`Affichage du dernier log pour: ${scheduleId}`);
    const logDetailsModal = document.getElementById('logDetailsModal');
    
    // Utiliser la route API correcte avec les bons paramètres de requête
    fetch(`/logs?schedule_id=${scheduleId}&last=true`)
        .then(response => response.json())
        .then(logs => {
            // L'API retourne un tableau, même avec last=true
            if (logs && logs.length > 0) {
                const log = logs[0];  // Prendre le premier log (le plus récent)
                
                // Remplir les détails du log
                document.getElementById('logScriptPath').textContent = log.script_path || 'Non spécifié';
                
                // Formater la date si elle existe
                let timestamp = log.timestamp || log.created_at || 'Non spécifié';
                if (timestamp && !timestamp.includes('/')) {
                    try {
                        // Essayer de convertir le format ISO en format plus lisible
                        const date = new Date(timestamp);
                        timestamp = date.toLocaleString('fr-FR');
                    } catch (e) {
                        console.warn("Impossible de formater la date:", e);
                    }
                }
                document.getElementById('logTimestamp').textContent = timestamp;
                
                // Définir le statut
                const statusElement = document.getElementById('logStatus');
                if (statusElement) {
                    if (log.status === 'success') {
                        statusElement.textContent = 'Succès';
                        statusElement.className = 'text-green-600';
                    } else {
                        statusElement.textContent = 'Erreur';
                        statusElement.className = 'text-red-600';
                    }
                }
                
                // Afficher la sortie
                document.getElementById('logOutput').textContent = log.output || 'Aucune sortie';
                
                // Gérer l'affichage de l'erreur si présente
                const errorContainer = document.getElementById('logErrorContainer');
                const errorElement = document.getElementById('logError');
                
                if (log.error && errorElement) {
                    errorElement.textContent = log.error;
                    if (errorContainer) errorContainer.classList.remove('hidden');
                } else if (errorContainer) {
                    errorContainer.classList.add('hidden');
                }
                
                // Afficher le modal
                if (logDetailsModal) logDetailsModal.classList.remove('hidden');
            } else {
                // Aucun log trouvé pour cette planification
                console.log(`Aucun log trouvé pour la planification ID: ${scheduleId}`);
                alert(`Aucun log disponible pour cette planification.\nVeuillez d'abord exécuter la planification pour générer des logs.`);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des logs:', error);
            alert('Erreur lors de la récupération des logs. Veuillez consulter la console pour plus de détails.');
        });
};

// Fonction qui met à jour les scripts en cours d'exécution
window.updateRunningScripts = function() {
    console.log("Mise à jour des scripts en cours");
    
    // Récupérer les statuts des scripts en cours
    fetch('/script_status')
        .then(response => response.json())
        .then(data => {
            console.log("Scripts en cours d'exécution:", data);
            
            // Créer un ensemble des scripts en cours d'exécution
            const runningScriptIds = new Set();
            for (const scheduleId in data) {
                runningScriptIds.add(scheduleId);
                runningScriptIds.add(parseInt(scheduleId));
            }
            
            // Mettre à jour UNIQUEMENT les badges des scripts en cours ou ceux qui viennent de terminer
            document.querySelectorAll('.status-badge').forEach(badge => {
                const scheduleId = badge.getAttribute('data-schedule-id');
                if (!scheduleId) return;
                
                const wasRunning = badge.getAttribute('data-was-running') === 'true';
                const isRunning = runningScriptIds.has(scheduleId) || runningScriptIds.has(parseInt(scheduleId));
                
                // Trouver la carte associée à ce badge
                const card = badge.closest('.rounded-lg');
                if (!card) return;
                
                // Fonction pour mettre à jour la couleur de la carte
                const setCardColor = (color) => {
                    const classes = card.className.split(' ');
                    const newClasses = classes.filter(cls => !cls.match(/^bg-\w+-\d+$/));
                    const wantedClass = `bg-${color}-100`;
                    if (!newClasses.includes(wantedClass)) {
                        newClasses.push(wantedClass);
                        card.className = newClasses.join(' ');
                    }
                };
                
                // Fonction pour mettre à jour le badge SANS flicker
                const setBadge = (html, className) => {
                    if (badge.innerHTML !== html || badge.className !== className) {
                        badge.innerHTML = html;
                        badge.className = className;
                    }
                };
                
                // Trouver les boutons dans la même carte
                const playButton = card.querySelector('.run-schedule');
                const stopForm = card.querySelector('form[action^="/stop_script/"]');
                
                // Identifier le type d'exécutable
                let isService = false;
                
                // Méthode 1: Vérifier l'attribut data-is-service du badge (prioritaire)
                if (badge.hasAttribute('data-is-service') && badge.getAttribute('data-is-service') === 'true') {
                    isService = true;
                } 
                // Méthode 2: Vérifier le data-schedule-type du bouton play
                else if (playButton && playButton.hasAttribute('data-schedule-type')) {
                    isService = playButton.getAttribute('data-schedule-type') === 'service';
                }
                
                // Si le script/service est en cours d'exécution, mettre à jour son apparence
                if (isRunning) {
                    // Mettre à jour l'attribut data-was-running pour suivre l'état
                    badge.setAttribute('data-was-running', 'true');
                    
                    // Cacher le bouton play et montrer le bouton stop
                    if (playButton) playButton.classList.add('hidden');
                    if (stopForm) {
                        stopForm.classList.remove('hidden');
                    } else if (playButton) {
                        // Créer un bouton stop s'il n'existe pas
                        const buttonsContainer = playButton.parentElement;
                        if (buttonsContainer) {
                            const newStopForm = document.createElement('form');
                            newStopForm.setAttribute('action', `/stop_script/${scheduleId}`);
                            newStopForm.setAttribute('method', 'POST');
                            newStopForm.classList.add('inline');
                            
                            newStopForm.innerHTML = `
                                <button type="submit" class="text-red-600 hover:text-red-900 mr-1" title="Arrêter ${isService ? 'le service' : 'le script'} en cours">
                                    <i class="fas fa-stop-circle"></i>
                                </button>
                            `;
                            
                            buttonsContainer.insertBefore(newStopForm, playButton);
                        }
                    }
                    
                    // Appliquer le style "en cours d'exécution"
                    setCardColor('orange');
                    
                    if (isService) {
                        setBadge('Démarré <i class="fas fa-cog fa-spin"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 status-badge');
                        badge.setAttribute('data-is-service', 'true');
                    } else {
                        setBadge('En cours <i class="fas fa-spinner fa-spin ml-1"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 status-badge');
                    }
                } else if (wasRunning) {
                    // UNIQUEMENT pour les scripts qui viennent de TERMINER
                    badge.removeAttribute('data-was-running');
                    
                    // Réafficher le bouton play et cacher le bouton stop
                    if (playButton) playButton.classList.remove('hidden');
                    if (stopForm) stopForm.classList.add('hidden');
                    
                    // Récupérer le statut du script via l'API
                    fetch(`/logs?schedule_id=${scheduleId}&last=true`)
                        .then(response => response.json())
                        .then(logs => {
                            const scriptLog = logs.length > 0 ? logs[0] : null;
                            
                            if (scriptLog) {
                                switch (scriptLog.status) {
                                    case 'success':
                                        setCardColor('green');
                                        setBadge('Succès <i class="fas fa-check-circle"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 status-badge');
                                        break;
                                    case 'error':
                                        setCardColor('red');
                                        setBadge('Erreur <i class="fas fa-exclamation-circle"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 status-badge');
                                        break;
                                    case 'timeout':
                                        setCardColor('yellow');
                                        setBadge('Timeout <i class="fas fa-clock"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 status-badge');
                                        break;
                                    default:
                                        // Restaurer l'état initial
                                        if (window.initialBadgeStates[scheduleId]) {
                                            badge.innerHTML = window.initialBadgeStates[scheduleId].html;
                                            badge.className = window.initialBadgeStates[scheduleId].className;
                                            card.className = window.initialBadgeStates[scheduleId].color;
                                        } else {
                                            // Fallback si l'état initial n'est pas disponible
                                            setCardColor('blue');
                                            if (isService) {
                                                setBadge('Stoppé', 'px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 status-badge');
                                            } else {
                                                setBadge('En attente', 'px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 status-badge');
                                            }
                                        }
                                }
                            } else {
                                // Restaurer l'état initial
                                if (window.initialBadgeStates[scheduleId]) {
                                    badge.innerHTML = window.initialBadgeStates[scheduleId].html;
                                    badge.className = window.initialBadgeStates[scheduleId].className;
                                    card.className = window.initialBadgeStates[scheduleId].color;
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Erreur lors de la récupération des logs:', error);
                            // Restaurer l'état initial en cas d'erreur
                            if (window.initialBadgeStates[scheduleId]) {
                                badge.innerHTML = window.initialBadgeStates[scheduleId].html;
                                badge.className = window.initialBadgeStates[scheduleId].className;
                                card.className = window.initialBadgeStates[scheduleId].color;
                            }
                        });
                }
                
                // Toujours préserver l'attribut data-schedule-id
                badge.setAttribute('data-schedule-id', scheduleId);
                if (isService) {
                    badge.setAttribute('data-is-service', 'true');
                }
            });
        })
        .catch(error => console.error('Erreur lors de la mise à jour des scripts en cours:', error));
};

// Stockage global des derniers logs pour maintenir l'état entre les rafraîchissements
// Utiliser window pour éviter les redéclarations entre fichiers
if (!window.globalLastLogsByScheduleId) window.globalLastLogsByScheduleId = {};
// Dictionnaire pour stocker l'état initial des badges
if (!window.initialBadgeStates) window.initialBadgeStates = {};

// Variable globale pour suivre si les écouteurs ont déjà été configurés
window.eventListenersConfigured = false;

// Fonction qui configure tous les écouteurs d'événements sur les cartes
window.setupCardEventListeners = function() {
    // Éviter la configuration multiple des écouteurs
    if (window.eventListenersConfigured) {
        console.log("Les écouteurs d'événements sont déjà configurés, on évite la duplication");
        return;
    }
    
    console.log("Configuration des écouteurs d'événements sur les cartes");
    
    // Gestionnaire pour fermer le modal d'édition
    const scheduleEditorModal = document.getElementById('scheduleEditorModal');
    const closeScheduleEditor = document.getElementById('closeScheduleEditor');
    const cancelScheduleEdit = document.getElementById('cancelScheduleEdit');
    
    if (closeScheduleEditor) {
        closeScheduleEditor.addEventListener('click', function() {
            scheduleEditorModal.classList.add('hidden');
        });
    }
    
    if (cancelScheduleEdit) {
        cancelScheduleEdit.addEventListener('click', function() {
            scheduleEditorModal.classList.add('hidden');
        });
    }
    
    // Gestion des boutons d'édition de planification
    const editButtons = document.querySelectorAll('.edit-schedule');
    console.log(`Trouvé ${editButtons.length} boutons d'édition`);
    
    editButtons.forEach(button => {
        console.log("Bouton d'édition trouvé:", button);
        
        // Supprimer tous les écouteurs d'événements existants
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Ajouter le nouvel écouteur d'événements
        newButton.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            console.log("Clic sur édition pour scheduleId:", scheduleId);
            window.editScheduleDirectly(scheduleId);
        });
    });
    
    // Gestion des boutons d'exécution manuelle de planification
    const runScheduleButtons = document.querySelectorAll('.run-schedule');
    console.log(`Trouvé ${runScheduleButtons.length} boutons d'exécution`);
    
    runScheduleButtons.forEach(button => {
        console.log("Bouton d'exécution trouvé:", button);
        
        // Supprimer tous les écouteurs d'événements existants
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Ajouter le nouvel écouteur d'événements
        newButton.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            const scheduleType = this.getAttribute('data-schedule-type') || 'standard';
            console.log(`Lancement de la planification: ${scheduleId}, type: ${scheduleType}`);
            window.runSchedule(scheduleId, scheduleType);
        });
    });
    
    // Gestion des boutons pour voir la dernière exécution
    const viewLastExecutionButtons = document.querySelectorAll('.view-last-execution');
    console.log(`Trouvé ${viewLastExecutionButtons.length} boutons de visualisation de logs`);
    
    const logDetailsModal = document.getElementById('logDetailsModal');
    const closeLogDetails = document.getElementById('closeLogDetails');
    const closeLogDetailsBtn = document.getElementById('closeLogDetailsBtn');
    
    viewLastExecutionButtons.forEach(button => {
        console.log("Bouton de visualisation des logs trouvé:", button);
        
        // Supprimer tous les écouteurs d'événements existants
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Ajouter le nouvel écouteur d'événements
        newButton.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            console.log("Clic sur visualisation pour scheduleId:", scheduleId);
            window.viewLastLogs(scheduleId);
        });
    });
    
    // Fermer le modal de détails de log
    if (closeLogDetails) {
        closeLogDetails.addEventListener('click', function() {
            logDetailsModal.classList.add('hidden');
        });
    }
    
    if (closeLogDetailsBtn) {
        closeLogDetailsBtn.addEventListener('click', function() {
            logDetailsModal.classList.add('hidden');
        });
    }
    
    // === Gestion dynamique du chargement des fichiers dans la modale (parent_path amélioré) ===
    if (typeof window.lastParentPath === 'undefined') {
        window.lastParentPath = '';
    }
    function setupFileBrowserNav() {
        const parentDirBtn = document.getElementById('parentDirBtn');
        const homeBtn = document.getElementById('homeBtn');
        const refreshDirBtn = document.getElementById('refreshDirBtn');
        const currentPathInput = document.getElementById('currentPath');

        // Nettoyer les anciens écouteurs si déjà présents
        if (parentDirBtn) {
            parentDirBtn.replaceWith(parentDirBtn.cloneNode(true));
        }
        if (homeBtn) {
            homeBtn.replaceWith(homeBtn.cloneNode(true));
        }
        if (refreshDirBtn) {
            refreshDirBtn.replaceWith(refreshDirBtn.cloneNode(true));
        }

        // Re-récupérer les boutons après clone
        const parentDirBtnNew = document.getElementById('parentDirBtn');
        const homeBtnNew = document.getElementById('homeBtn');
        const refreshDirBtnNew = document.getElementById('refreshDirBtn');

        if (parentDirBtnNew) {
            parentDirBtnNew.addEventListener('click', function() {
                // Aller au dossier parent du chemin courant
                const current = currentPathInput.value;
                if (current) {
                    const parent = current.replace(/\\$/,'').replace(/\/[^\/]+$/, '');
                    window.lastParentPath = parent;
                    loadFileBrowser(parent);
                }
            });
        }
        if (homeBtnNew) {
            homeBtnNew.addEventListener('click', function() {
                loadFileBrowser('');
            });
        }
        if (refreshDirBtnNew) {
            refreshDirBtnNew.addEventListener('click', function() {
                loadFileBrowser(currentPathInput.value);
            });
        }
    }

    function loadFileBrowser(path = null) {
        const fileList = document.getElementById('fileList');
        const currentPathInput = document.getElementById('currentPath');
        if (!fileList) return;
        fileList.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><p>Chargement...</p></div>';
        fetch('/browse_files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path || '' })
        })
        .then(resp => resp.json())
        .then(data => {
            if (data.error) {
                fileList.innerHTML = '<div class="text-red-500">Erreur : ' + data.error + '</div>';
                return;
            }
            currentPathInput.value = data.current_path || '';
            window.lastParentPath = data.parent_path || '';
            let html = '<ul class="divide-y divide-gray-200">';
            for (const entry of data.items) {
                html += `<li class="file-item flex items-center px-2 py-1 cursor-pointer hover:bg-indigo-100 rounded" data-path="${entry.path}" data-type="${entry.type}">
                    <i class="fas ${entry.type === 'directory' ? 'fa-folder text-yellow-500' : 'fa-file text-gray-400'} mr-2"></i>
                    <span>${entry.name}</span>
                </li>`;
            }
            html += '</ul>';
            fileList.innerHTML = html;
        })
        .catch(e => {
            fileList.innerHTML = '<div class="text-red-500">Erreur lors du chargement</div>';
        });
    }

    // === Gestion des boutons de sélection de fichiers pour l'édition ===
    const editScriptBrowseBtn = document.getElementById('editScriptBrowseBtn');
    const editEnvBrowseBtn = document.getElementById('editEnvBrowseBtn');
    const fileBrowserModal = document.getElementById('fileBrowserModal');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileList = document.getElementById('fileList');
    const currentPathInput = document.getElementById('currentPath');

    let fileTargetInput = null; // Pour savoir quel champ remplir

    // --- Correction définitive openFileBrowser ---
    // Cette fonction ne doit JAMAIS utiliser currentPathInput, mais charger sur le dernier chemin connu ou racine
    function openFileBrowser(targetInput) {
        fileTargetInput = targetInput;
        if (fileBrowserModal) fileBrowserModal.classList.remove('hidden');
        setupFileBrowserNav(); // S'assurer que les boutons sont bien connectés
        loadFileBrowser(window.lastParentPath || '');
        
        // Bouton Annuler dans la modale de sélection de fichier
        const cancelFileBrowse = document.getElementById('cancelFileBrowse');
        if (cancelFileBrowse) {
            cancelFileBrowse.addEventListener('click', function() {
                if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
            });
        }
        // Bouton Sélectionner dans la modale de sélection de fichier
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', function() {
                if (window.selectedFilePath && fileTargetInput) {
                    fileTargetInput.value = window.selectedFilePath;
                    if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
                }
            });
        }
    }

    if (editScriptBrowseBtn) {
        editScriptBrowseBtn.addEventListener('click', function() {
            openFileBrowser(document.getElementById('editScriptPath'));
        });
    }
    if (editEnvBrowseBtn) {
        editEnvBrowseBtn.addEventListener('click', function() {
            openFileBrowser(document.getElementById('editEnvPath'));
        });
    }
    // Sélection d'un fichier dans la liste (supposons que chaque fichier a une classe .file-item)
    if (fileList) {
        fileList.addEventListener('click', function(e) {
            const li = e.target.closest('.file-item');
            if (li) {
                const type = li.getAttribute('data-type');
                const path = li.getAttribute('data-path');
                if (type === 'file') {
                    window.selectedFilePath = path;
                    highlightSelectedFile(li);
                }
            }
        });
    }
    // Sélection d'un dossier dans la liste (supposons que chaque dossier a une classe .file-item)
    if (fileList) {
        fileList.addEventListener('dblclick', function(e) {
            const li = e.target.closest('.file-item');
            if (li) {
                const type = li.getAttribute('data-type');
                const path = li.getAttribute('data-path');
                if (type === 'directory') {
                    loadFileBrowser(path);
                } else if (fileTargetInput) {
                    fileTargetInput.value = path;
                    if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
                }
            }
        });
    }
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', function() {
            if (window.selectedFilePath && fileTargetInput) {
                fileTargetInput.value = window.selectedFilePath;
                if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
            }
        });
    }
    function highlightSelectedFile(li) {
        document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected', 'bg-indigo-100'));
        li.classList.add('selected', 'bg-indigo-100');
    }
    window.selectedFilePath = null;
    
    setupFileBrowserNav();
    
    // Marquer que les écouteurs ont été configurés
    window.eventListenersConfigured = true;
}

// Ajouter cette fonction pour vérifier si une autre bibliothèque a déjà initialisé les scripts
window.checkAndInitializeScripts = function() {
    // Éviter les initialisations multiples
    if (window.scriptsInitialized) {
        console.log("Les scripts sont déjà initialisés, on évite la duplication");
        return;
    }
    
    console.log("Initialisation des scripts (version centralisée)");
    
    // Initialiser les gestionnaires d'événements
    window.setupCardEventListeners();
    
    // Rafraîchir le statut des scripts toutes les 2 secondes (une seule fois)
    if (!window.updateScriptsInterval) {
        window.updateScriptsInterval = setInterval(window.updateRunningScripts, 2000);
        // Mettre à jour immédiatement au chargement
        window.updateRunningScripts();
    }
    
    // Marquer comme initialisé
    window.scriptsInitialized = true;
};

// === Gestion dynamique du chargement des fichiers dans la modale (parent_path amélioré) ===
if (typeof window.lastParentPath === 'undefined') {
    window.lastParentPath = '';
}
function setupFileBrowserNav() {
    const parentDirBtn = document.getElementById('parentDirBtn');
    const homeBtn = document.getElementById('homeBtn');
    const refreshDirBtn = document.getElementById('refreshDirBtn');
    const currentPathInput = document.getElementById('currentPath');

    // Nettoyer les anciens écouteurs si déjà présents
    if (parentDirBtn) {
        parentDirBtn.replaceWith(parentDirBtn.cloneNode(true));
    }
    if (homeBtn) {
        homeBtn.replaceWith(homeBtn.cloneNode(true));
    }
    if (refreshDirBtn) {
        refreshDirBtn.replaceWith(refreshDirBtn.cloneNode(true));
    }

    // Re-récupérer les boutons après clone
    const parentDirBtnNew = document.getElementById('parentDirBtn');
    const homeBtnNew = document.getElementById('homeBtn');
    const refreshDirBtnNew = document.getElementById('refreshDirBtn');

    if (parentDirBtnNew) {
        parentDirBtnNew.addEventListener('click', function() {
            // Aller au dossier parent du chemin courant
            const current = currentPathInput.value;
            if (current) {
                const parent = current.replace(/\\$/,'').replace(/\/[^\/]+$/, '');
                window.lastParentPath = parent;
                loadFileBrowser(parent);
            }
        });
    }
    if (homeBtnNew) {
        homeBtnNew.addEventListener('click', function() {
            loadFileBrowser('');
        });
    }
    if (refreshDirBtnNew) {
        refreshDirBtnNew.addEventListener('click', function() {
            loadFileBrowser(currentPathInput.value);
        });
    }
}

function loadFileBrowser(path = null) {
    const fileList = document.getElementById('fileList');
    const currentPathInput = document.getElementById('currentPath');
    if (!fileList) return;
    fileList.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><p>Chargement...</p></div>';
    fetch('/browse_files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path || '' })
    })
    .then(resp => resp.json())
    .then(data => {
        if (data.error) {
            fileList.innerHTML = '<div class="text-red-500">Erreur : ' + data.error + '</div>';
            return;
        }
        currentPathInput.value = data.current_path || '';
        window.lastParentPath = data.parent_path || '';
        let html = '<ul class="divide-y divide-gray-200">';
        for (const entry of data.items) {
            html += `<li class="file-item flex items-center px-2 py-1 cursor-pointer hover:bg-indigo-100 rounded" data-path="${entry.path}" data-type="${entry.type}">
                <i class="fas ${entry.type === 'directory' ? 'fa-folder text-yellow-500' : 'fa-file text-gray-400'} mr-2"></i>
                <span>${entry.name}</span>
            </li>`;
        }
        html += '</ul>';
        fileList.innerHTML = html;
    })
    .catch(e => {
        fileList.innerHTML = '<div class="text-red-500">Erreur lors du chargement</div>';
    });
}

// Attacher les gestionnaires immédiatement si le DOM est déjà chargé,
// sinon attendre que le DOM soit entièrement chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM chargé - Initialisation des gestionnaires d'événements");
    window.checkAndInitializeScripts();
    setupFileBrowserNav();
    // Remplace openFileBrowser pour charger la liste
    function openFileBrowser(targetInput) {
        fileTargetInput = targetInput;
        if (fileBrowserModal) fileBrowserModal.classList.remove('hidden');
        setupFileBrowserNav(); // S'assurer que les boutons sont bien connectés
        loadFileBrowser(window.lastParentPath || '');
        
        // Bouton Annuler dans la modale de sélection de fichier
        const cancelFileBrowse = document.getElementById('cancelFileBrowse');
        if (cancelFileBrowse) {
            cancelFileBrowse.addEventListener('click', function() {
                if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
            });
        }
        // Bouton Sélectionner dans la modale de sélection de fichier
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', function() {
                if (window.selectedFilePath && fileTargetInput) {
                    fileTargetInput.value = window.selectedFilePath;
                    if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
                }
            });
        }
    }
    // Clic sur un dossier dans la liste pour naviguer dedans
    document.getElementById('fileList').addEventListener('dblclick', function(e) {
        const li = e.target.closest('.file-item');
        if (li) {
            const type = li.getAttribute('data-type');
            const path = li.getAttribute('data-path');
            if (type === 'directory') {
                loadFileBrowser(path);
            } else if (fileTargetInput) {
                fileTargetInput.value = path;
                if (fileBrowserModal) fileBrowserModal.classList.add('hidden');
            }
        }
    });
    
    // --- Ajout gestion du sélecteur de fichier pour le formulaire "Nouveau script" ---
    // Sélecteur pour le champ "Chemin du script" du formulaire principal
    const scriptPathInput = document.getElementById('scriptPath');
    const browseBtn = document.getElementById('browseBtn');
    if (scriptPathInput && browseBtn) {
        browseBtn.addEventListener('click', function() {
            // Ouvre la modale et cible le champ scriptPathInput
            if (typeof openFileBrowser === 'function') {
                openFileBrowser(scriptPathInput);
            }
        });
    }
    
    // --- Gestion du sélecteur de fichier pour le champ "Environnement Python" ---
    const pythonEnvInput = document.getElementById('pythonEnvPath');
    const pythonEnvBrowseBtn = document.getElementById('pythonEnvBrowseBtn');
    if (pythonEnvInput && pythonEnvBrowseBtn) {
        pythonEnvBrowseBtn.addEventListener('click', function() {
            if (typeof openFileBrowser === 'function') {
                openFileBrowser(pythonEnvInput);
            }
        });
    }
    
    // --- Gestion du sélecteur de fichier pour le champ "Environnement Python" dans le tab Planificateur (Scheduler) ---
    const envInput = document.getElementById('envPath');
    const envBrowseBtn = document.getElementById('envBrowseBtn');
    if (envInput && envBrowseBtn) {
        envBrowseBtn.addEventListener('click', function() {
            if (typeof openFileBrowser === 'function') {
                openFileBrowser(envInput);
            }
        });
    }
});
