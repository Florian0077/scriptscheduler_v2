// Stockage global des derniers logs pour maintenir l'état entre les rafraîchissements
if (typeof window.globalLastLogsByScheduleId === 'undefined') {
    window.globalLastLogsByScheduleId = {};
}

document.addEventListener('DOMContentLoaded', function() {
    // Créer un dictionnaire pour stocker l'état initial des badges
    const initialBadgeStates = {};
    
    // Stocker l'état initial de tous les badges
    document.querySelectorAll('.status-badge').forEach(badge => {
        const scheduleId = badge.getAttribute('data-schedule-id');
        if (!scheduleId) return;
        
        initialBadgeStates[scheduleId] = {
            html: badge.innerHTML,
            className: badge.className,
            color: badge.closest('.rounded-lg').className
        };
    });
    
    console.log("États initiaux des badges :", initialBadgeStates);
    
    // Rafraîchir le statut des scripts toutes les 2 secondes
    setInterval(updateRunningScripts, 2000);
    // Mettre à jour immédiatement au chargement
    updateRunningScripts();
    
    // Gestion du modal d'édition de script
    const scriptEditorModal = document.getElementById('scriptEditorModal');
    const newScriptBtn = document.getElementById('newScriptBtn');
    const closeScriptEditor = document.getElementById('closeScriptEditor');
    const cancelScriptEdit = document.getElementById('cancelScriptEdit');
    const editScriptBtns = document.querySelectorAll('.edit-script');
    
    if (newScriptBtn) {
        newScriptBtn.addEventListener('click', function() {
            document.getElementById('scriptForm').reset();
            document.getElementById('scriptIdInput').value = '';
            document.getElementById('scriptEditorTitle').textContent = 'Nouveau Script';
            scriptEditorModal.classList.remove('hidden');
        });
    }
    
    if (closeScriptEditor) {
        closeScriptEditor.addEventListener('click', function() {
            scriptEditorModal.classList.add('hidden');
        });
    }
    
    if (cancelScriptEdit) {
        cancelScriptEdit.addEventListener('click', function() {
            scriptEditorModal.classList.add('hidden');
        });
    }
    
    editScriptBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scriptId = this.getAttribute('data-script-id');
            
            // Récupérer les détails du script via une requête AJAX
            fetch(`/scripts/${scriptId}`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('scriptIdInput').value = scriptId;
                    document.getElementById('scriptName').value = data.name;
                    document.getElementById('scriptContent').value = data.content;
                    document.getElementById('scriptEditorTitle').textContent = 'Modifier Script';
                    
                    // Afficher le modal
                    scriptEditorModal.classList.remove('hidden');
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    alert('Erreur lors de la récupération des détails du script');
                });
        });
    });
    
    // Gestion de l'exécution de script
    const runScriptBtns = document.querySelectorAll('.run-script');
    const scriptOutputModal = document.getElementById('scriptOutputModal');
    const closeScriptOutput = document.getElementById('closeScriptOutput');
    const closeOutputBtn = document.getElementById('closeOutputBtn');
    const scriptOutputContainer = document.getElementById('scriptOutputContainer');
    
    runScriptBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scriptId = this.getAttribute('data-script-id');
            
            // Afficher le modal avec un message de chargement
            scriptOutputContainer.innerHTML = 'Exécution du script en cours...';
            scriptOutputModal.classList.remove('hidden');
            
            // Exécuter le script via une requête AJAX
            fetch(`/scripts/${scriptId}/run`, {
                method: 'POST'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        scriptOutputContainer.innerHTML = `<div class="text-green-500">Exécution réussie:</div><div class="mt-2">${data.output || 'Aucune sortie'}</div>`;
                    } else if (data.status === 'timeout') {
                        scriptOutputContainer.innerHTML = `<div class="text-yellow-500">Timeout:</div><div class="mt-2">${data.output || 'L\'exécution du script a dépassé le délai imparti.'}</div>`;
                    } else {
                        scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">${data.output || 'Une erreur est survenue lors de l\'exécution.'}</div>`;
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">Une erreur est survenue lors de la communication avec le serveur.</div>`;
                });
        });
    });
    
    if (closeScriptOutput) {
        closeScriptOutput.addEventListener('click', function() {
            scriptOutputModal.classList.add('hidden');
        });
    }
    
    if (closeOutputBtn) {
        closeOutputBtn.addEventListener('click', function() {
            scriptOutputModal.classList.add('hidden');
        });
    }
    
    // Gestion du bouton d'enregistrement pour éviter les soumissions multiples
    const scriptForm = document.querySelector('form#scriptForm');
    if (scriptForm) {
        scriptForm.addEventListener('submit', function(event) {
            const submitButton = document.getElementById('submitScriptButton');
            if (submitButton) {
                // Désactiver le bouton immédiatement
                submitButton.disabled = true;
                submitButton.classList.add('opacity-70', 'cursor-not-allowed');
                
                // Afficher le spinner
                const submitText = submitButton.querySelector('.submit-text');
                const spinner = submitButton.querySelector('.spinner');
                if (submitText) submitText.textContent = 'Enregistrement en cours...';
                if (spinner) spinner.classList.remove('hidden');
                
                // Afficher une notification après l'envoi du formulaire
                setTimeout(function() {
                    // Cette notification ne s'affichera que si la page n'a pas été rechargée
                    // Ce qui indique que la soumission du formulaire a échoué
                    submitButton.disabled = false;
                    submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
                    if (submitText) submitText.textContent = 'Enregistrer';
                    if (spinner) spinner.classList.add('hidden');
                    
                    // Afficher un message d'erreur si nous arrivons ici (car normalement la page aurait dû se recharger)
                    alert('Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.');
                }, 5000); // Attendre 5 secondes avant de considérer qu'il y a eu un problème
            }
        });
    }
    
    // Faire la même chose pour les autres formulaires importants
    const scheduleForm = document.querySelector('form#scheduleForm');
    if (scheduleForm) {
        const submitButton = scheduleForm.querySelector('button[type="submit"]');
        if (submitButton) {
            // Ajouter les éléments nécessaires s'ils n'existent pas
            if (!submitButton.querySelector('.submit-text')) {
                const textSpan = document.createElement('span');
                textSpan.className = 'submit-text';
                textSpan.textContent = submitButton.textContent.trim();
                submitButton.textContent = '';
                submitButton.appendChild(textSpan);
                
                const spinnerSpan = document.createElement('span');
                spinnerSpan.className = 'spinner hidden';
                spinnerSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                submitButton.appendChild(spinnerSpan);
            }
            
            scheduleForm.addEventListener('submit', function(event) {
                // Désactiver le bouton immédiatement
                submitButton.disabled = true;
                submitButton.classList.add('opacity-70', 'cursor-not-allowed');
                
                // Afficher le spinner
                const submitText = submitButton.querySelector('.submit-text');
                const spinner = submitButton.querySelector('.spinner');
                if (submitText) submitText.textContent = 'Enregistrement en cours...';
                if (spinner) spinner.classList.remove('hidden');
                
                // Afficher une notification après l'envoi du formulaire
                setTimeout(function() {
                    // Cette notification ne s'affichera que si la page n'a pas été rechargée
                    submitButton.disabled = false;
                    submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
                    if (submitText) submitText.textContent = 'Enregistrer';
                    if (spinner) spinner.classList.add('hidden');
                    
                    // Afficher un message d'erreur
                    alert('Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.');
                }, 5000);
            });
        }
    }
    
    // Faire la même chose pour le formulaire d'édition de script
    const editScriptForm = document.querySelector('form#editScriptForm');
    if (editScriptForm) {
        const submitButton = editScriptForm.querySelector('button[type="submit"]');
        if (submitButton) {
            // Structure similaire à celle ci-dessus
            // Ajouter les éléments nécessaires s'ils n'existent pas
            if (!submitButton.querySelector('.submit-text')) {
                const textSpan = document.createElement('span');
                textSpan.className = 'submit-text';
                textSpan.textContent = submitButton.textContent.trim();
                submitButton.textContent = '';
                submitButton.appendChild(textSpan);
                
                const spinnerSpan = document.createElement('span');
                spinnerSpan.className = 'spinner hidden';
                spinnerSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                submitButton.appendChild(spinnerSpan);
            }
            
            editScriptForm.addEventListener('submit', function(event) {
                // Désactiver le bouton immédiatement
                submitButton.disabled = true;
                submitButton.classList.add('opacity-70', 'cursor-not-allowed');
                
                // Afficher le spinner
                const submitText = submitButton.querySelector('.submit-text');
                const spinner = submitButton.querySelector('.spinner');
                if (submitText) submitText.textContent = 'Enregistrement en cours...';
                if (spinner) spinner.classList.remove('hidden');
                
                // Afficher une notification après l'envoi du formulaire
                setTimeout(function() {
                    // Cette notification ne s'affichera que si la page n'a pas été rechargée
                    submitButton.disabled = false;
                    submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
                    if (submitText) submitText.textContent = 'Enregistrer';
                    if (spinner) spinner.classList.add('hidden');
                    
                    // Afficher un message d'erreur
                    alert('Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.');
                }, 5000);
            });
        }
    }
});

// Fonction modifiée qui ne met à jour que les scripts en cours d'exécution
function updateRunningScripts() {
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
                
                console.log(`Carte ${scheduleId}: isService=${isService}, isRunning=${isRunning}`);
                
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
                                            if (initialBadgeStates[scheduleId]) {
                                                badge.innerHTML = initialBadgeStates[scheduleId].html;
                                                badge.className = initialBadgeStates[scheduleId].className;
                                                card.className = initialBadgeStates[scheduleId].color;
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
                                    if (initialBadgeStates[scheduleId]) {
                                        badge.innerHTML = initialBadgeStates[scheduleId].html;
                                        badge.className = initialBadgeStates[scheduleId].className;
                                        card.className = initialBadgeStates[scheduleId].color;
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
                                if (initialBadgeStates[scheduleId]) {
                                    badge.innerHTML = initialBadgeStates[scheduleId].html;
                                    badge.className = initialBadgeStates[scheduleId].className;
                                    card.className = initialBadgeStates[scheduleId].color;
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

// Fonction pour basculer l'affichage de la section de fréquence en fonction du type de planification sélectionné
function toggleEditFrequencySection() {
    const scheduleType = document.getElementById('editScheduleType');
    if (!scheduleType) return;
    
    const scheduleTypeValue = scheduleType.value;
    console.log("Type de planification sélectionné:", scheduleTypeValue);
    
    // Sections à afficher/masquer
    const timeoutField = document.getElementById('editTimeout');
    const timeoutSection = timeoutField ? timeoutField.closest('.mb-4') : null;
    const frequencySection = document.querySelector('form#editScheduleForm div:nth-child(6)');
    const serviceOptions = document.getElementById('editServiceOptions');
    
    console.log("Éléments trouvés:", {
        timeoutSection: timeoutSection !== null,
        frequencySection: frequencySection !== null,
        serviceOptions: serviceOptions !== null
    });
    
    if (scheduleTypeValue === 'service') {
        // Pour les services, on cache les sections de fréquence et timeout
        if (frequencySection) frequencySection.classList.add('hidden');
        if (timeoutSection) timeoutSection.classList.add('hidden');
        if (serviceOptions) serviceOptions.classList.remove('hidden');
        
        // On rend les champs de fréquence non requis
        const frequencyFields = document.querySelectorAll('.frequency-field');
        frequencyFields.forEach(field => {
            field.removeAttribute('required');
        });
        
        // Le délai d'exécution n'est pas requis pour les services
        if (timeoutField) {
            timeoutField.removeAttribute('required');
            // Valeur par défaut pour services (très longue durée)
            timeoutField.value = '3600';
        }
    } else {
        // Pour les planifications standard, on affiche les sections de fréquence et timeout
        if (frequencySection) frequencySection.classList.remove('hidden');
        if (timeoutSection) timeoutSection.classList.remove('hidden');
        if (serviceOptions) serviceOptions.classList.add('hidden');
        
        // On rend les champs de fréquence requis
        const frequencyFields = document.querySelectorAll('.frequency-field');
        frequencyFields.forEach(field => {
            field.setAttribute('required', 'required');
        });
        
        // Le délai d'exécution est requis pour les planifications standard
        if (timeoutField) {
            timeoutField.setAttribute('required', 'required');
            // Valeur par défaut pour scripts standards
            timeoutField.value = '30';
        }
    }
}
