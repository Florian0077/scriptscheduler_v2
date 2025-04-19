// Stockage global des derniers logs pour maintenir l'état entre les rafraîchissements
// S'assurer que la variable est définie dans le scope global (window)
if (!window.globalLastLogsByScheduleId) {
    window.globalLastLogsByScheduleId = {};
}

document.addEventListener('DOMContentLoaded', function() {
    // Créer un dictionnaire pour stocker l'état initial des badges
    // S'assurer que la variable est définie dans le scope global (window)
    if (!window.initialBadgeStates) {
        window.initialBadgeStates = {};
    }
    
    // Stocker l'état initial de tous les badges
    document.querySelectorAll('.status-badge').forEach(badge => {
        const scheduleId = badge.getAttribute('data-schedule-id');
        if (!scheduleId) return;
        
        window.initialBadgeStates[scheduleId] = {
            html: badge.innerHTML,
            className: badge.className,
            color: badge.closest('.rounded-lg').className
        };
    });
    
    console.log("États initiaux des badges :", window.initialBadgeStates);
    
    // Utiliser la fonction centralisée pour éviter les doublons d'initialisation
    if (window.checkAndInitializeScripts) {
        window.checkAndInitializeScripts();
    }
});

// Fonction modifiée qui ne met à jour que les scripts en cours d'exécution
window.updateRunningScripts = function() {
    console.log("Mise à jour des scripts en cours uniquement");
    
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
                        console.log(`Carte pour ${scheduleId} mise à jour avec couleur: ${color}`);
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
                else if (playButton && playButton.getAttribute('data-schedule-type') === 'service') {
                    isService = true;
                } 
                // Méthode 3: Vérifier la présence d'un formulaire d'arrêt
                else if (stopForm) {
                    isService = true;
                }
                
                // Si le script était en cours mais ne l'est plus, il vient de terminer
                if (wasRunning && !isRunning) {
                    console.log(`Script ${scheduleId} vient de terminer son exécution`);
                    // On récupère le dernier log pour savoir le statut final
                    fetch('/logs')
                        .then(response => response.json())
                        .then(logs => {
                            // Filtrer pour trouver les logs de ce schedule
                            const scheduleLogs = logs.filter(log => 
                                String(log.schedule_id) === String(scheduleId)
                            );
                            
                            if (scheduleLogs.length > 0) {
                                // Trier par date (plus récent en premier)
                                scheduleLogs.sort((a, b) => 
                                    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
                                );
                                
                                const lastLog = scheduleLogs[0];
                                console.log(`Dernier log pour script ${scheduleId}:`, lastLog);
                                
                                // Mettre à jour la couleur en fonction du statut du dernier log
                                if (lastLog.status === 'success') {
                                    setCardColor('green');
                                    setBadge('Succès <i class="fas fa-check-circle"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 status-badge');
                                } else if (lastLog.status === 'error') {
                                    setCardColor('red');
                                    setBadge('Erreur <i class="fas fa-exclamation-circle"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 status-badge');
                                } else if (lastLog.status === 'timeout') {
                                    setCardColor('yellow');
                                    setBadge('Timeout <i class="fas fa-clock"></i>', 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 status-badge');
                                }
                                
                                // Sauvegarder ce log pour référence future
                                window.globalLastLogsByScheduleId[scheduleId] = lastLog;
                            }
                        })
                        .catch(error => console.error(`Erreur lors de la récupération des logs pour ${scheduleId}:`, error));
                }
                
                // Mettre à jour l'attribut pour le prochain cycle
                badge.setAttribute('data-was-running', isRunning.toString());
                
                // Gestion des scripts en cours ou des services
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
                                <button type="submit" class="text-red-600 hover:text-red-900" title="Arrêter ${isService ? 'le service' : 'le script'} en cours">
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
                    const scriptId = playButton ? playButton.getAttribute('data-script-id') : null;
                    if (scriptId) {
                        // Récupérer le dernier log pour ce script
                        fetch(`/logs?script_id=${scriptId}&last=true`)
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
                }
                
                // Toujours préserver l'attribut data-schedule-id
                badge.setAttribute('data-schedule-id', scheduleId);
                if (isService) {
                    badge.setAttribute('data-is-service', 'true');
                }
            });
        })
        .catch(error => console.error('Erreur lors de la mise à jour des scripts en cours:', error));
}
