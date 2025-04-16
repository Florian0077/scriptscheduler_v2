// Fonction pour basculer l'affichage de la section de fréquence en fonction du type de planification sélectionné
function toggleEditFrequencySection() {
    console.log("Exécution de toggleEditFrequencySection");
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked');
    if (!scheduleType) {
        console.error("Aucun type de planification sélectionné");
        return;
    }
    
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

// Fonction directe pour éditer une planification
function editScheduleDirectly(scheduleId) {
    console.log("Édition directe pour schedule_id:", scheduleId);
    
    // Ouvrir la modal d'édition
    const modal = document.getElementById('scheduleEditorModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error("La modal d'édition est introuvable!");
        return;
    }
    
    try {
        // Récupérer et remplir les données de la planification
        fetch(`/schedules/${scheduleId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP! Statut: ${response.status}`);
                }
                return response.json();
            })
            .then(schedule => {
                console.log("Données reçues:", schedule);
                
                // Remplir les champs du formulaire avec les données récupérées
                document.getElementById('editScheduleId').value = schedule.id || '';
                document.getElementById('editScheduleName').value = schedule.name || '';
                document.getElementById('editScriptPath').value = schedule.script_path || '';
                document.getElementById('editEnvPath').value = schedule.env_path || '';
                document.getElementById('editTimeout').value = schedule.timeout || 30;
                
                // Sélectionner le type de planification (standard ou service)
                const editServiceTypeRadio = document.getElementById('editServiceType');
                const editStandardTypeRadio = document.getElementById('editStandardType');
                
                if (schedule.schedule_type === 'service' && editServiceTypeRadio) {
                    editServiceTypeRadio.checked = true;
                    // Précharger l'option de démarrage automatique
                    const autoStartCheckbox = document.getElementById('editAutoStart');
                    if (autoStartCheckbox) {
                        autoStartCheckbox.checked = schedule.auto_start || false;
                    }
                } else if (editStandardTypeRadio) {
                    editStandardTypeRadio.checked = true;
                }
                
                // Mettre à jour l'interface en fonction du type sélectionné
                setTimeout(toggleEditFrequencySection, 100); // Petit délai pour s'assurer que le DOM est à jour
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors de la récupération des détails de la planification');
            });
    } catch (e) {
        console.error("Erreur générale dans editScheduleDirectly:", e);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let logsRefreshInterval = null;
    const REFRESH_INTERVAL = 5000; // 5 secondes
    
    // Assigner les écouteurs d'événements pour les types de planification
    const editFormRadios = document.querySelectorAll('#editScheduleForm input[name="scheduleType"]');
    editFormRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            console.log(`Type ${this.value} sélectionné`);
            toggleEditFrequencySection();
        });
    });
    
    // Gestion des onglets principaux
    const navTabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            // Désactiver tous les onglets et cacher tous les contenus
            navTabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
                btn.classList.add('text-gray-500');
            });
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            this.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
            this.classList.remove('text-gray-500');
            
            // Afficher le contenu correspondant
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            
            const tabContent = document.getElementById(targetId);
            if (tabContent) {
                tabContent.classList.remove('hidden');
                tabContent.classList.add('active');
            }
        });
    });

    // === Gestion des logs ===
    // Boutons pour voir les logs
    document.querySelectorAll('.view-last-execution').forEach(btn => {
        btn.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            const logModal = document.getElementById('logDetailsModal');
            const logOutputElement = document.getElementById('logOutput');
            const logScriptPath = document.getElementById('logScriptPath');
            const logTimestamp = document.getElementById('logTimestamp');
            const logStatus = document.getElementById('logStatus');
            
            console.log("Récupération du log pour schedule_id:", scheduleId);
            
            if (!logModal || !logOutputElement) {
                console.error("Éléments du modal de logs introuvables");
                return;
            }
            
            // Message de chargement
            logOutputElement.innerHTML = 'Chargement des journaux...';
            logModal.classList.remove('hidden');
            
            // Faire une requête pour récupérer tous les logs
            fetch('/logs')
                .then(response => response.json())
                .then(allLogs => {
                    console.log("Tous les logs reçus:", allLogs);
                    
                    // Filtrer les logs pour ce schedule_id côté client
                    // Astuce: convertir les deux côtés en chaînes pour la comparaison
                    const scheduleLogs = allLogs.filter(log => 
                        String(log.schedule_id) === String(scheduleId)
                    );
                    
                    console.log(`Logs trouvés pour schedule_id ${scheduleId}:`, scheduleLogs);
                    
                    if (scheduleLogs.length > 0) {
                        // Trier par date (plus récent en premier)
                        scheduleLogs.sort((a, b) => 
                            new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
                        );
                        
                        const lastLog = scheduleLogs[0];
                        console.log("Log le plus récent:", lastLog);
                        
                        // Mettre à jour les informations du modal
                        logOutputElement.innerHTML = lastLog.output || 'Aucune sortie disponible.';
                        
                        // Ajouter les détails supplémentaires si les éléments existent
                        if (logScriptPath) logScriptPath.textContent = lastLog.script_path || '';
                        if (logTimestamp) logTimestamp.textContent = new Date(lastLog.timestamp).toLocaleString();
                        if (logStatus) {
                            logStatus.textContent = lastLog.status === 'success' ? 'Succès' : 'Erreur';
                            logStatus.className = lastLog.status === 'success' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
                        }
                        
                        const errorContainer = document.getElementById('logErrorContainer');
                        if (errorContainer) {
                            if (lastLog.status === 'error' && lastLog.error) {
                                errorContainer.classList.remove('hidden');
                                document.getElementById('logError').textContent = lastLog.error;
                            } else {
                                errorContainer.classList.add('hidden');
                            }
                        }
                    } else {
                        console.log("Aucun log trouvé pour ce schedule_id");
                        logOutputElement.innerHTML = 'Aucun journal d\'exécution trouvé pour cette planification.';
                        
                        // Réinitialiser les autres champs
                        if (logScriptPath) logScriptPath.textContent = '';
                        if (logTimestamp) logTimestamp.textContent = '';
                        if (logStatus) logStatus.textContent = '';
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    logOutputElement.innerHTML = 'Erreur lors de la récupération des journaux d\'exécution.';
                });
        });
    });
    
    // Fonctions pour le rafraîchissement des journaux
    function startLogsRefresh() {
        // Rafraîchir immédiatement puis toutes les X secondes
        refreshLogs();
        logsRefreshInterval = setInterval(refreshLogs, REFRESH_INTERVAL);
    }
    
    function stopLogsRefresh() {
        if (logsRefreshInterval) {
            clearInterval(logsRefreshInterval);
            logsRefreshInterval = null;
        }
    }
    
    function refreshLogs() {
        fetch('/logs')
            .then(response => response.json())
            .then(logs => {
                updateLogsTable(logs);
            })
            .catch(error => console.error('Erreur lors du rafraîchissement des journaux:', error));
    }
    
    function updateLogsTable(logs) {
        const logsContainer = document.getElementById('logsContainer');
        if (!logsContainer) return;
        
        // Trier les logs du plus récent au plus ancien
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let html = '';
        
        if (logs.length === 0) {
            html = `
                <div class="p-6 text-center text-gray-500">
                    <i class="fas fa-file-alt text-4xl mb-4"></i>
                    <p>Aucun journal d'exécution</p>
                    <p class="text-sm">Les journaux apparaîtront ici après l'exécution d'un script</p>
                </div>
            `;
        } else {
            html = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Script</th>
                                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            logs.forEach(log => {
                const date = new Date(log.timestamp);
                const formattedDate = date.toLocaleString();
                const statusClass = log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                const statusText = log.status === 'success' ? 'Succès' : 'Erreur';
                
                html += `
                    <tr>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">${log.script_path}</td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                        <td class="px-3 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button class="view-log-btn text-indigo-600 hover:text-indigo-900" data-log-id="${log.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        logsContainer.innerHTML = html;
        
        // Réattacher les écouteurs d'événements pour les boutons de visualisation de logs
        attachViewLogButtonHandlers();
    }
    
    // Fonction pour attacher les gestionnaires d'événements aux boutons view-log-btn
    function attachViewLogButtonHandlers() {
        document.querySelectorAll('.view-log-btn').forEach(button => {
            button.addEventListener('click', function() {
                const logId = this.getAttribute('data-log-id');
                console.log('Clic sur le log avec ID:', logId);
                
                // Récupérer tous les logs
                fetch('/logs')
                    .then(response => response.json())
                    .then(logs => {
                        // Conversion explicite des IDs en chaînes de caractères pour la comparaison
                        const log = logs.find(l => String(l.id) === String(logId));
                        
                        if (log) {
                            console.log('Log trouvé:', log);
                            showLogDetails(log);
                        } else {
                            console.error('Log non trouvé avec ID:', logId);
                            alert('Log non trouvé.');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                        alert('Erreur lors de la récupération des logs.');
                    });
            });
        });
    }
    
    // Fonction pour afficher les détails d'un log
    function showLogDetails(log) {
        console.log('Affichage des détails du log:', log);
        const modal = document.getElementById('logDetailsModal');
        const scriptPath = document.getElementById('logScriptPath');
        const timestamp = document.getElementById('logTimestamp');
        const status = document.getElementById('logStatus');
        const output = document.getElementById('logOutput');
        
        if (modal && scriptPath && timestamp && status && output) {
            scriptPath.textContent = log.script_path;
            timestamp.textContent = new Date(log.timestamp).toLocaleString();
            
            status.textContent = log.status === 'success' ? 'Succès' : 'Erreur';
            status.className = log.status === 'success' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
            
            output.textContent = log.output || 'Aucune sortie';
            
            // Afficher les erreurs s'il y en a
            const errorContainer = document.getElementById('logErrorContainer');
            if (errorContainer) {
                if (log.error) {
                    errorContainer.classList.remove('hidden');
                    document.getElementById('logError').textContent = log.error;
                } else {
                    errorContainer.classList.add('hidden');
                }
            }
            
            modal.classList.remove('hidden');
        }
    }
    
    // Fermer le modal des logs
    const closeLogDetailsBtn = document.getElementById('closeLogDetailsBtn');
    const closeLogDetails = document.getElementById('closeLogDetails');
    
    if (closeLogDetailsBtn) {
        closeLogDetailsBtn.addEventListener('click', function() {
            document.getElementById('logDetailsModal').classList.add('hidden');
        });
    }
    
    if (closeLogDetails) {
        closeLogDetails.addEventListener('click', function() {
            document.getElementById('logDetailsModal').classList.add('hidden');
        });
    }
    
    // Gestion des onglets secondaires
    const secondaryTabButtons = document.querySelectorAll('.tab-button');
    const secondaryTabContents = document.querySelectorAll('.tab-content');
    
    secondaryTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Mettre à jour les classes des boutons
            secondaryTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Afficher l'onglet correspondant
            const targetTab = button.getAttribute('data-tab');
            secondaryTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Gestion des types de fréquence
    const simpleFreqRadio = document.getElementById('simpleFrequencyType');
    const cronFreqRadio = document.getElementById('cronFrequencyType');
    const simpleFreqOptions = document.getElementById('simpleFrequencyOptions');
    const cronFreqOptions = document.getElementById('cronFrequencyOptions');
    
    if (simpleFreqRadio && cronFreqRadio) {
        simpleFreqRadio.addEventListener('change', toggleFrequencyOptions);
        cronFreqRadio.addEventListener('change', toggleFrequencyOptions);
        
        function toggleFrequencyOptions() {
            if (simpleFreqRadio.checked) {
                simpleFreqOptions.classList.remove('hidden');
                cronFreqOptions.classList.add('hidden');
            } else {
                simpleFreqOptions.classList.add('hidden');
                cronFreqOptions.classList.remove('hidden');
            }
        }
    }
    
    // Gestion des options spécifiques pour chaque type de fréquence simple
    const hourlyRadio = document.getElementById('hourly');
    const dailyRadio = document.getElementById('daily');
    const weeklyRadio = document.getElementById('weekly');
    const monthlyRadio = document.getElementById('monthly');
    const everyMinutesRadio = document.getElementById('everyMinutes');
    
    const hourlyOptions = document.getElementById('hourlyOptions');
    const dailyOptions = document.getElementById('dailyOptions');
    const weeklyOptions = document.getElementById('weeklyOptions');
    const monthlyOptions = document.getElementById('monthlyOptions');
    const everyMinutesOptions = document.getElementById('everyMinutesOptions');
    
    if (hourlyRadio && dailyRadio && weeklyRadio && monthlyRadio && everyMinutesRadio) {
        // Fonction pour gérer l'affichage des options spécifiques
        function toggleSpecificOptions() {
            // Cacher toutes les options
            hourlyOptions.classList.add('hidden');
            dailyOptions.classList.add('hidden');
            weeklyOptions.classList.add('hidden');
            monthlyOptions.classList.add('hidden');
            everyMinutesOptions.classList.add('hidden');
            
            // Afficher uniquement les options correspondant à la fréquence sélectionnée
            if (hourlyRadio.checked) {
                hourlyOptions.classList.remove('hidden');
            } else if (dailyRadio.checked) {
                dailyOptions.classList.remove('hidden');
            } else if (weeklyRadio.checked) {
                weeklyOptions.classList.remove('hidden');
            } else if (monthlyRadio.checked) {
                monthlyOptions.classList.remove('hidden');
            } else if (everyMinutesRadio.checked) {
                everyMinutesOptions.classList.remove('hidden');
            }
        }
        
        // Initialisation et ajout des événements
        toggleSpecificOptions();
        hourlyRadio.addEventListener('change', toggleSpecificOptions);
        dailyRadio.addEventListener('change', toggleSpecificOptions);
        weeklyRadio.addEventListener('change', toggleSpecificOptions);
        monthlyRadio.addEventListener('change', toggleSpecificOptions);
        everyMinutesRadio.addEventListener('change', toggleSpecificOptions);
    }
    
    // Mise à jour de l'expression cron
    const cronFields = document.querySelectorAll('.cron-field');
    const cronExpression = document.getElementById('cronExpression');
    
    if (cronFields.length > 0 && cronExpression) {
        cronFields.forEach(field => {
            field.addEventListener('input', updateCronExpression);
        });
        
        function updateCronExpression() {
            const minute = document.querySelector('[data-field="minute"]').value || '*';
            const hour = document.querySelector('[data-field="hour"]').value || '*';
            const day = document.querySelector('[data-field="day"]').value || '*';
            const month = document.querySelector('[data-field="month"]').value || '*';
            const weekday = document.querySelector('[data-field="weekday"]').value || '*';
            
            cronExpression.textContent = `${minute} ${hour} ${day} ${month} ${weekday}`;
        }
    }
    
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
                        scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">${data.output || 'Une erreur s\'est produite lors de l\'exécution du script.'}</div>`;
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">Une erreur s'est produite lors de la communication avec le serveur.</div>`;
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
    
    // Gestion des détails de log
    const viewLogBtns = document.querySelectorAll('.view-log-output');
    const logOutputModal = document.getElementById('logOutputModal');
    const closeLogOutput = document.getElementById('closeLogOutput');
    const closeLogOutputBtn = document.getElementById('closeLogOutputBtn');
    const logOutputContainer = document.getElementById('logOutputContainer');
    
    viewLogBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const logOutput = this.getAttribute('data-output');
            
            logOutputContainer.textContent = logOutput || 'Aucune sortie disponible';
            logOutputModal.classList.remove('hidden');
        });
    });
    
    if (closeLogOutput) {
        closeLogOutput.addEventListener('click', function() {
            logOutputModal.classList.add('hidden');
        });
    }
    
    if (closeLogOutputBtn) {
        closeLogOutputBtn.addEventListener('click', function() {
            logOutputModal.classList.add('hidden');
        });
    }
    
    // Clear logs
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', function(e) {
            if (!confirm('Êtes-vous sûr de vouloir effacer tous les journaux d\'exécution?')) {
                e.preventDefault();
            }
        });
    }
    
    // Navigateur de fichiers
    const fileBrowserModal = document.getElementById('fileBrowserModal');
    const closeFileBrowser = document.getElementById('closeFileBrowser');
    const cancelFileBrowse = document.getElementById('cancelFileBrowse');
    const fileList = document.getElementById('fileList');
    const currentPath = document.getElementById('currentPath');
    const parentDirBtn = document.getElementById('parentDirBtn');
    const homeBtn = document.getElementById('homeBtn');
    const refreshDirBtn = document.getElementById('refreshDirBtn');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileBrowserTitle = document.getElementById('fileBrowserTitle');
    
    // Boutons pour ouvrir le navigateur de fichiers
    const browseBtn = document.getElementById('browseBtn');
    const envBrowseBtn = document.getElementById('envBrowseBtn');
    const editorEnvBrowseBtn = document.getElementById('editorEnvBrowseBtn');
    const editorScriptBrowseBtn = document.getElementById('editorScriptBrowseBtn');
    
    // Variables pour stocker le type de navigation et le champ cible
    let currentBrowseType = 'script';
    let targetInputField = null;
    
    // Fonction pour ouvrir le navigateur de fichiers
    function openFileBrowser(type, targetInput) {
        currentBrowseType = type;
        targetInputField = targetInput;
        
        // Mettre à jour le titre du modal
        if (type === 'script') {
            fileBrowserTitle.textContent = 'Sélectionner un script Python';
        } else if (type === 'python') {
            fileBrowserTitle.textContent = 'Sélectionner un environnement Python';
        } else {
            fileBrowserTitle.textContent = 'Sélectionner un fichier';
        }
        
        // Afficher le modal
        fileBrowserModal.classList.remove('hidden');
        
        // Charger le contenu du répertoire
        loadDirectoryContent('', type);
    }
    
    // Gestion des événements pour les boutons de navigation
    if (browseBtn) {
        browseBtn.addEventListener('click', function() {
            openFileBrowser('script', document.getElementById('scriptPath'));
        });
    }
    
    if (envBrowseBtn) {
        envBrowseBtn.addEventListener('click', function() {
            openFileBrowser('python', document.getElementById('envPath'));
        });
    }
    
    if (editorEnvBrowseBtn) {
        editorEnvBrowseBtn.addEventListener('click', function() {
            openFileBrowser('python', document.getElementById('editorEnvPath'));
        });
    }
    
    if (editorScriptBrowseBtn) {
        editorScriptBrowseBtn.addEventListener('click', function() {
            openFileBrowser('script', document.getElementById('editorScriptPath'));
        });
    }
    
    // Fermer le navigateur de fichiers
    if (closeFileBrowser) {
        closeFileBrowser.addEventListener('click', function() {
            fileBrowserModal.classList.add('hidden');
        });
    }
    
    if (cancelFileBrowse) {
        cancelFileBrowse.addEventListener('click', function() {
            fileBrowserModal.classList.add('hidden');
        });
    }
    
    // Charger le contenu d'un répertoire
    function loadDirectoryContent(path, type) {
        // Afficher un indicateur de chargement
        fileList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                <p>Chargement...</p>
            </div>
        `;
        
        // Appeler l'API de navigation
        fetch(`/browse_files?path=${encodeURIComponent(path)}&type=${type}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur réseau');
                }
                return response.json();
            })
            .then(data => {
                // Mettre à jour le chemin actuel
                currentPath.value = data.current_path;
                
                // Activer/désactiver le bouton de dossier parent
                parentDirBtn.disabled = !data.parent_path;
                parentDirBtn.classList.toggle('opacity-50', !data.parent_path);
                
                // Générer la liste des fichiers et dossiers
                let html = '';
                
                if (data.items.length === 0) {
                    html = `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-folder-open text-3xl mb-2"></i>
                            <p>Dossier vide</p>
                        </div>
                    `;
                } else {
                    html = '<ul class="space-y-1">';
                    
                    data.items.forEach(item => {
                        const icon = item.type === 'directory' ? 'fa-folder text-yellow-500' : 'fa-file text-gray-500';
                        const itemClass = item.type === 'directory' ? 'cursor-pointer hover:bg-gray-100' : 'cursor-pointer hover:bg-gray-100';
                        
                        html += `
                            <li class="px-2 py-1 rounded ${itemClass}" data-path="${item.path}" data-type="${item.type}">
                                <div class="flex items-center">
                                    <i class="fas ${icon} mr-2"></i>
                                    <span>${item.name}</span>
                                </div>
                            </li>
                        `;
                    });
                    
                    html += '</ul>';
                }
                
                fileList.innerHTML = html;
                
                // Ajouter des écouteurs d'événements pour les éléments de la liste
                const items = fileList.querySelectorAll('li');
                items.forEach(item => {
                    item.addEventListener('click', function() {
                        const path = this.getAttribute('data-path');
                        const type = this.getAttribute('data-type');
                        
                        if (type === 'directory') {
                            // Naviguer dans le dossier
                            loadDirectoryContent(path, currentBrowseType);
                        } else {
                            // Sélectionner le fichier (mise en évidence)
                            items.forEach(i => i.classList.remove('bg-indigo-100'));
                            this.classList.add('bg-indigo-100');
                        }
                    });
                    
                    item.addEventListener('dblclick', function() {
                        const path = this.getAttribute('data-path');
                        const type = this.getAttribute('data-type');
                        
                        if (type === 'directory') {
                            // Naviguer dans le dossier
                            loadDirectoryContent(path, currentBrowseType);
                        } else {
                            // Sélectionner le fichier et fermer le modal
                            selectFile(path);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erreur:', error);
                fileList.innerHTML = `
                    <div class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                        <p>Erreur lors du chargement du répertoire.</p>
                    </div>
                `;
            });
    }
    
    // Gérer le clic sur le bouton de dossier parent
    if (parentDirBtn) {
        parentDirBtn.addEventListener('click', function() {
            const parent = currentPath.value;
            if (parent) {
                const parentDir = parent.substring(0, parent.lastIndexOf('\\') > -1 ? parent.lastIndexOf('\\') : parent.lastIndexOf('/'));
                loadDirectoryContent(parentDir, currentBrowseType);
            }
        });
    }
    
    // Gérer le clic sur le bouton d'accueil
    if (homeBtn) {
        homeBtn.addEventListener('click', function() {
            loadDirectoryContent('', currentBrowseType);
        });
    }
    
    // Gérer le clic sur le bouton d'actualisation
    if (refreshDirBtn) {
        refreshDirBtn.addEventListener('click', function() {
            loadDirectoryContent(currentPath.value, currentBrowseType);
        });
    }
    
    // Gérer le clic sur le bouton de sélection
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', function() {
            const selectedItem = fileList.querySelector('li.bg-indigo-100');
            if (selectedItem && selectedItem.getAttribute('data-type') === 'file') {
                selectFile(selectedItem.getAttribute('data-path'));
            } else {
                alert('Veuillez sélectionner un fichier.');
            }
        });
    }
    
    // Fonction pour sélectionner un fichier
    function selectFile(path) {
        if (targetInputField) {
            targetInputField.value = path;
        }
        fileBrowserModal.classList.add('hidden');
    }
    
    // Gestion des boutons pour éditer une planification
    document.addEventListener('click', function(event) {
        // Vérifier si le clic est sur un bouton d'édition
        if (event.target.closest('.edit-schedule')) {
            const btn = event.target.closest('.edit-schedule');
            const scheduleId = btn.getAttribute('data-schedule-id');
            console.log("Édition demandée pour schedule_id:", scheduleId);
            
            // Ouvrir la modal d'édition
            const modal = document.getElementById('scheduleEditorModal'); 
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                console.error("La modal d'édition est introuvable! ID attendu: scheduleEditorModal");
                // Liste tous les modals disponibles pour aider au débogage
                document.querySelectorAll('.fixed.inset-0').forEach(el => {
                    console.log("Modal trouvé:", el.id);
                });
            }
            
            // Récupérer et remplir les données de la planification
            fetch(`/schedules/${scheduleId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP! Statut: ${response.status}`);
                    }
                    return response.json();
                })
                .then(schedule => {
                    console.log("Données reçues:", schedule);
                    document.getElementById('editScheduleId').value = schedule.id;
                    document.getElementById('editScheduleName').value = schedule.name;
                    document.getElementById('editScriptPath').value = schedule.script_path;
                    document.getElementById('editEnvPath').value = schedule.env_path || '';
                    document.getElementById('editTimeout').value = schedule.timeout || 30;
                    
                    // Sélectionner le type de planification (standard ou service)
                    const editServiceTypeRadio = document.getElementById('editServiceType');
                    const editStandardTypeRadio = document.getElementById('editStandardType');
                    
                    if (schedule.schedule_type === 'service' && editServiceTypeRadio) {
                        editServiceTypeRadio.checked = true;
                        // Précharger l'option de démarrage automatique
                        const autoStartCheckbox = document.getElementById('editAutoStart');
                        if (autoStartCheckbox) {
                            autoStartCheckbox.checked = schedule.auto_start || false;
                        }
                    } else if (editStandardTypeRadio) {
                        editStandardTypeRadio.checked = true;
                    }
                    
                    // Mettre à jour l'interface en fonction du type sélectionné
                    toggleEditFrequencySection();
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    alert('Erreur lors de la récupération des détails de la planification');
                });
        }
    });
    
    // Gestion des boutons pour ajouter une planification depuis la liste des scripts
    const addScheduleBtns = document.querySelectorAll('.add-schedule');
    
    addScheduleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scriptId = this.getAttribute('data-script-id');
            const scriptPath = this.getAttribute('data-script-path');
            
            // Changer d'onglet pour aller à la planification
            const schedulerTabBtn = document.querySelector('.tab-btn[data-tab="scheduler"]');
            schedulerTabBtn.click();
            
            // Remplir le formulaire de planification avec le script sélectionné
            document.getElementById('scriptPath').value = scriptPath;
            
            // Faire défiler la page jusqu'au formulaire
            document.getElementById('scheduleForm').scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Gestion des boutons pour exécuter une planification
    const runScheduleBtns = document.querySelectorAll('.run-schedule');
    
    runScheduleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            
            // Changer immédiatement la couleur de la carte en orange
            const scheduleCard = this.closest('.bg-white').querySelector('div:first-child');
            if (scheduleCard) {
                // Sauvegarder la classe actuelle pour pouvoir la restaurer en cas d'erreur
                scheduleCard.dataset.originalClass = scheduleCard.className;
                
                // Remplacer la classe de couleur par orange
                scheduleCard.className = scheduleCard.className.replace(/bg-\w+-\d+/, 'bg-orange-100');
            }
            
            // Mettre à jour le badge de statut
            const statusBadge = scheduleCard.querySelector(`.status-badge[data-schedule-id="${scheduleId}"]`);
            if (statusBadge) {
                // Sauvegarder le contenu original du badge
                statusBadge.dataset.originalHtml = statusBadge.outerHTML;
                
                // Remplacer le badge par un badge "En cours"
                statusBadge.className = "px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 status-badge";
                statusBadge.textContent = "En cours";
            }
            
            // Afficher le modal avec un message de chargement
            scriptOutputContainer.innerHTML = 'Exécution du script en cours...';
            scriptOutputModal.classList.remove('hidden');
            
            // Exécuter le script via une requête AJAX
            fetch(`/schedules/${scheduleId}/run`, {
                method: 'POST'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        scriptOutputContainer.innerHTML = `<div class="text-green-500">Exécution réussie:</div><div class="mt-2">${data.output || 'Aucune sortie'}</div>`;
                        
                        // Quand l'exécution est terminée, changer la couleur en vert
                        if (scheduleCard) {
                            scheduleCard.className = scheduleCard.className.replace(/bg-\w+-\d+/, 'bg-green-100');
                        }
                        
                        // Mettre à jour le badge en "Succès"
                        if (statusBadge) {
                            statusBadge.className = "px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 status-badge";
                            statusBadge.textContent = "Succès";
                        }
                        
                    } else if (data.status === 'timeout') {
                        scriptOutputContainer.innerHTML = `<div class="text-yellow-500">Timeout:</div><div class="mt-2">${data.output || 'L\'exécution du script a dépassé le délai imparti.'}</div>`;
                        
                        // En cas de timeout, changer la couleur en rouge
                        if (scheduleCard) {
                            scheduleCard.className = scheduleCard.className.replace(/bg-\w+-\d+/, 'bg-red-100');
                        }
                        
                        // Mettre à jour le badge en "Échec"
                        if (statusBadge) {
                            statusBadge.className = "px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 status-badge";
                            statusBadge.textContent = "Échec";
                        }
                        
                    } else {
                        scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">${data.output || 'Une erreur est survenue lors de l\'exécution.'}</div>`;
                        
                        // En cas d'erreur, changer la couleur en rouge
                        if (scheduleCard) {
                            scheduleCard.className = scheduleCard.className.replace(/bg-\w+-\d+/, 'bg-red-100');
                        }
                        
                        // Mettre à jour le badge en "Échec"
                        if (statusBadge) {
                            statusBadge.className = "px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 status-badge";
                            statusBadge.textContent = "Échec";
                        }
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    scriptOutputContainer.innerHTML = `<div class="text-red-500">Erreur:</div><div class="mt-2">Une erreur est survenue lors de la communication avec le serveur.</div>`;
                    
                    // En cas d'erreur de communication, restaurer la couleur d'origine
                    if (scheduleCard && scheduleCard.dataset.originalClass) {
                        scheduleCard.className = scheduleCard.dataset.originalClass;
                    }
                    
                    // Restaurer le badge d'origine
                    if (statusBadge && statusBadge.dataset.originalHtml) {
                        const parent = statusBadge.parentNode;
                        parent.insertAdjacentHTML('beforeend', statusBadge.dataset.originalHtml);
                        statusBadge.remove();
                    }
                });
        });
    });
    
    // Mise à jour de l'expression cron dans le modal d'édition
    const editCronFields = document.querySelectorAll('#editCronFrequencyOptions .cron-field');
    const editCronExpression = document.getElementById('editCronExpression');
    
    if (editCronFields.length > 0 && editCronExpression) {
        editCronFields.forEach(field => {
            field.addEventListener('input', updateEditCronExpression);
        });
        
        function updateEditCronExpression() {
            const minute = document.getElementById('editCronMinute').value || '*';
            const hour = document.getElementById('editCronHour').value || '*';
            const day = document.getElementById('editCronDay').value || '*';
            const month = document.getElementById('editCronMonth').value || '*';
            const weekday = document.getElementById('editCronWeekday').value || '*';
            
            editCronExpression.textContent = `${minute} ${hour} ${day} ${month} ${weekday}`;
        }
    }
    
    // Gestion des boutons pour visualiser la dernière exécution
    const viewLastExecutionBtns = document.querySelectorAll('.view-last-execution');
    
    viewLastExecutionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            
            // Faire une requête pour récupérer le dernier log d'exécution
            fetch(`/logs?schedule_id=${scheduleId}&last=true`)
                .then(response => response.json())
                .then(logs => {
                    if (logs.length > 0) {
                        const lastLog = logs[0];
                        logOutput.innerHTML = lastLog.output || 'Aucune sortie disponible.';
                        logDetailsModal.classList.remove('hidden');
                    } else {
                        logOutput.innerHTML = 'Aucun journal d\'exécution trouvé pour cette planification.';
                        logDetailsModal.classList.remove('hidden');
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    logOutput.innerHTML = 'Erreur lors de la récupération des journaux d\'exécution.';
                    logDetailsModal.classList.remove('hidden');
                });
        });
    });
    
    // Gestion des boutons d'édition de planification
    const editScheduleForm = document.getElementById('editScheduleForm');
    
    // Gestion des options dans le modal d'édition de planification
    const editSimpleFreqRadio = document.getElementById('editSimpleFrequencyType');
    const editCronFreqRadio = document.getElementById('editCronFrequencyType');
    const editSimpleFreqOptions = document.getElementById('editSimpleFrequencyOptions');
    const editCronFreqOptions = document.getElementById('editCronFrequencyOptions');
    
    const editHourlyRadio = document.getElementById('editHourly');
    const editDailyRadio = document.getElementById('editDaily');
    const editWeeklyRadio = document.getElementById('editWeekly');
    const editMonthlyRadio = document.getElementById('editMonthly');
    const editEveryMinutesRadio = document.getElementById('editEveryMinutes');
    
    const editHourlyOptions = document.getElementById('editHourlyOptions');
    const editDailyOptions = document.getElementById('editDailyOptions');
    const editWeeklyOptions = document.getElementById('editWeeklyOptions');
    const editMonthlyOptions = document.getElementById('editMonthlyOptions');
    const editEveryMinutesOptions = document.getElementById('editEveryMinutesOptions');
    
    // Boutons pour explorer les fichiers dans le modal d'édition de planification
    const editScriptBrowseBtn = document.getElementById('editScriptBrowseBtn');
    const editEnvBrowseBtn = document.getElementById('editEnvBrowseBtn');
    
    // Fonctions pour gérer les options de planification
    if (editSimpleFreqRadio && editCronFreqRadio) {
        editSimpleFreqRadio.addEventListener('change', toggleEditFrequencyOptions);
        editCronFreqRadio.addEventListener('change', toggleEditFrequencyOptions);
        
        function toggleEditFrequencyOptions() {
            if (editSimpleFreqRadio.checked) {
                editSimpleFreqOptions.classList.remove('hidden');
                editCronFreqOptions.classList.add('hidden');
            } else {
                editSimpleFreqOptions.classList.add('hidden');
                editCronFreqOptions.classList.remove('hidden');
            }
        }
    }
    
    if (editHourlyRadio && editDailyRadio && editWeeklyRadio && editMonthlyRadio && editEveryMinutesRadio) {
        function toggleEditSpecificOptions() {
            editHourlyOptions.classList.add('hidden');
            editDailyOptions.classList.add('hidden');
            editWeeklyOptions.classList.add('hidden');
            editMonthlyOptions.classList.add('hidden');
            editEveryMinutesOptions.classList.add('hidden');
            
            if (editHourlyRadio.checked) {
                editHourlyOptions.classList.remove('hidden');
            } else if (editDailyRadio.checked) {
                editDailyOptions.classList.remove('hidden');
            } else if (editWeeklyRadio.checked) {
                editWeeklyOptions.classList.remove('hidden');
            } else if (editMonthlyRadio.checked) {
                editMonthlyOptions.classList.remove('hidden');
            } else if (editEveryMinutesRadio.checked) {
                editEveryMinutesOptions.classList.remove('hidden');
            }
        }
        
        editHourlyRadio.addEventListener('change', toggleEditSpecificOptions);
        editDailyRadio.addEventListener('change', toggleEditSpecificOptions);
        editWeeklyRadio.addEventListener('change', toggleEditSpecificOptions);
        editMonthlyRadio.addEventListener('change', toggleEditSpecificOptions);
        editEveryMinutesRadio.addEventListener('change', toggleEditSpecificOptions);
    }
    
    // Gestion des boutons de navigation dans le modal d'édition de planification
    if (editScriptBrowseBtn) {
        editScriptBrowseBtn.addEventListener('click', function() {
            openFileBrowser('script', document.getElementById('editScriptPath'));
        });
    }
    
    if (editEnvBrowseBtn) {
        editEnvBrowseBtn.addEventListener('click', function() {
            openFileBrowser('python', document.getElementById('editEnvPath'));
        });
    }
    
    // Fermer le modal d'édition de planification
    const closeScheduleEditor = document.getElementById('closeScheduleEditor');
    const cancelScheduleEdit = document.getElementById('cancelScheduleEdit');
    
    if (closeScheduleEditor) {
        closeScheduleEditor.addEventListener('click', function() {
            document.getElementById('scheduleEditorModal').classList.add('hidden');
        });
    }
    
    if (cancelScheduleEdit) {
        cancelScheduleEdit.addEventListener('click', function() {
            document.getElementById('scheduleEditorModal').classList.add('hidden');
        });
    }
    
    // Suppression automatique des messages flash après 5 secondes
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.remove();
        }, 8000);
    });
    
    // Gestion du type d'exécution (standard ou service)
    const editStandardTypeRadio = document.getElementById('editStandardType');
    const editServiceTypeRadio = document.getElementById('editServiceType');
    // Sélectionner la section de fréquence par son conteneur
    const frequencySections = document.querySelectorAll('.mb-4');
    let frequencySection = null;
    let timeoutSection = null;
    
    // Trouver la section de fréquence d'exécution
    frequencySections.forEach(section => {
        const label = section.querySelector('label');
        if (label && label.textContent.includes('Fréquence d\'exécution')) {
            frequencySection = section;
        }
        if (label && label.textContent.includes('Délai d\'exécution')) {
            timeoutSection = section;
        }
    });
    
    function toggleEditFrequencySection() {
        if (!editStandardTypeRadio || !editServiceTypeRadio) return;
        
        // Trouver également la section de timeout
        const timeoutSections = document.querySelectorAll('.mb-4');
        let timeoutSection = null;
        let timeoutInput = document.getElementById('editTimeout');
        
        timeoutSections.forEach(section => {
            const label = section.querySelector('label');
            if (label && label.textContent.includes('Délai d\'exécution')) {
                timeoutSection = section;
            }
        });
        
        // Afficher/masquer les options supplémentaires pour les services
        const editServiceOptions = document.getElementById('editServiceOptions');
        
        if (editServiceTypeRadio.checked) {
            // Afficher les options de service
            if (editServiceOptions) {
                editServiceOptions.classList.remove('hidden');
            }
            
            // Masquer la section de fréquence
            if (frequencySection) {
                frequencySection.style.display = 'none';
            }
            
            // Masquer la section de timeout et gérer l'attribut required
            if (timeoutSection) {
                timeoutSection.style.display = 'none';
                if (timeoutInput) {
                    // Stocker la valeur actuelle
                    if (!timeoutInput.getAttribute('data-original-value') && timeoutInput.value) {
                        timeoutInput.setAttribute('data-original-value', timeoutInput.value);
                    }
                    // Fournir une valeur par défaut et retirer l'attribut required
                    timeoutInput.value = '30';
                    timeoutInput.removeAttribute('required');
                }
            }
            
            // Si on choisit service, on sélectionne automatiquement une planification simple horaire
            if (document.getElementById('editSimpleFrequencyType')) {
                document.getElementById('editSimpleFrequencyType').checked = true;
            }
            if (document.getElementById('editHourly')) {
                document.getElementById('editHourly').checked = true;
            }
            // Masquer les options avancées également
            if (document.getElementById('editSimpleFrequencyOptions')) {
                document.getElementById('editSimpleFrequencyOptions').style.display = 'none';
            }
            if (document.getElementById('editCronFrequencyOptions')) {
                document.getElementById('editCronFrequencyOptions').style.display = 'none';
            }
        } else {
            // Masquer les options de service
            if (editServiceOptions) {
                editServiceOptions.classList.add('hidden');
            }
            
            // Afficher la section de fréquence
            if (frequencySection) {
                frequencySection.style.display = 'block';
            }
            
            // Afficher la section de timeout et restaurer l'attribut required
            if (timeoutSection) {
                timeoutSection.style.display = 'block';
                if (timeoutInput) {
                    // Restaurer la valeur d'origine si elle existe
                    if (timeoutInput.getAttribute('data-original-value')) {
                        timeoutInput.value = timeoutInput.getAttribute('data-original-value');
                        timeoutInput.removeAttribute('data-original-value');
                    }
                    // Réajouter l'attribut required
                    timeoutInput.setAttribute('required', '');
                }
            }
            
            // Réafficher les options de fréquence appropriées
            if (document.getElementById('editSimpleFrequencyType') && document.getElementById('editSimpleFrequencyType').checked) {
                if (document.getElementById('editSimpleFrequencyOptions')) {
                    document.getElementById('editSimpleFrequencyOptions').style.display = 'block';
                }
            } else if (document.getElementById('editCronFrequencyType') && document.getElementById('editCronFrequencyType').checked) {
                if (document.getElementById('editCronFrequencyOptions')) {
                    document.getElementById('editCronFrequencyOptions').style.display = 'block';
                }
            }
        }
    }
    
    // Pour le formulaire d'édition
    if (editStandardTypeRadio && editServiceTypeRadio) {
        editStandardTypeRadio.addEventListener('change', toggleEditFrequencySection);
        editServiceTypeRadio.addEventListener('change', toggleEditFrequencySection);
        
        // Vérifier l'état initial
        toggleEditFrequencySection();
    }
    
    // Gestion des options "Toutes les X minutes"
    const frequencyTypeRadios = document.querySelectorAll('input[name="frequencyType"]');
    const simpleFrequencyOptions = document.getElementById('simpleFrequencyOptions');
    const cronFrequencyOptions = document.getElementById('cronFrequencyOptions');
    
    frequencyTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'simple') {
                simpleFrequencyOptions.classList.remove('hidden');
                cronFrequencyOptions.classList.add('hidden');
            } else {
                simpleFrequencyOptions.classList.add('hidden');
                cronFrequencyOptions.classList.remove('hidden');
            }
        });
    });
    
    const simpleFrequencyRadios = document.querySelectorAll('input[name="simpleFrequency"]');
    
    simpleFrequencyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            hourlyOptions.classList.add('hidden');
            dailyOptions.classList.add('hidden');
            weeklyOptions.classList.add('hidden');
            monthlyOptions.classList.add('hidden');
            everyMinutesOptions.classList.add('hidden');
            
            if (this.value === 'everyMinutes') {
                everyMinutesOptions.classList.remove('hidden');
            } else if (this.value === 'hourly') {
                hourlyOptions.classList.remove('hidden');
            } else if (this.value === 'daily') {
                dailyOptions.classList.remove('hidden');
            } else if (this.value === 'weekly') {
                weeklyOptions.classList.remove('hidden');
            } else if (this.value === 'monthly') {
                monthlyOptions.classList.remove('hidden');
            }
        });
    });
    
    const editFrequencyTypeRadios = document.querySelectorAll('#editScheduleModal input[name="frequencyType"]');
    
    editFrequencyTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'simple') {
                editSimpleFrequencyOptions.classList.remove('hidden');
                editCronFrequencyOptions.classList.add('hidden');
            } else {
                editSimpleFrequencyOptions.classList.add('hidden');
                editCronFrequencyOptions.classList.remove('hidden');
            }
        });
    });
    
    const editSimpleFrequencyRadios = document.querySelectorAll('#editScheduleModal input[name="simpleFrequency"]');
    
    editSimpleFrequencyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            editHourlyOptions.classList.add('hidden');
            editDailyOptions.classList.add('hidden');
            editWeeklyOptions.classList.add('hidden');
            editMonthlyOptions.classList.add('hidden');
            editEveryMinutesOptions.classList.add('hidden');
            
            if (this.value === 'everyMinutes') {
                editEveryMinutesOptions.classList.remove('hidden');
            } else if (this.value === 'hourly') {
                editHourlyOptions.classList.remove('hidden');
            } else if (this.value === 'daily') {
                editDailyOptions.classList.remove('hidden');
            } else if (this.value === 'weekly') {
                editWeeklyOptions.classList.remove('hidden');
            } else if (this.value === 'monthly') {
                editMonthlyOptions.classList.remove('hidden');
            }
        });
    });
    
    // Ajout de l'appel à attachViewLogButtonHandlers() dès le chargement de la page
    attachViewLogButtonHandlers();
});

document.addEventListener('click', function(event) {
    // Vérifier si l'élément cliqué ou un de ses parents est un bouton view-log-btn
    let target = event.target;
    while (target && target !== document) {
        if (target.classList && target.classList.contains('view-log-btn')) {
            // C'est un bouton view-log-btn
            const logId = target.getAttribute('data-log-id');
            console.log('Clic sur le log avec ID:', logId);
            
            // Récupérer tous les logs
            fetch('/logs')
                .then(response => response.json())
                .then(logs => {
                    // Conversion explicite des IDs en chaînes de caractères pour la comparaison
                    const log = logs.find(l => String(l.id) === String(logId));
                    
                    if (log) {
                        console.log('Log trouvé:', log);
                        
                        // Afficher les détails du log dans le modal
                        const modal = document.getElementById('logDetailsModal');
                        const scriptPath = document.getElementById('logScriptPath');
                        const timestamp = document.getElementById('logTimestamp');
                        const status = document.getElementById('logStatus');
                        const output = document.getElementById('logOutput');
                        
                        if (modal && scriptPath && timestamp && status && output) {
                            scriptPath.textContent = log.script_path;
                            timestamp.textContent = new Date(log.timestamp).toLocaleString();
                            
                            status.textContent = log.status === 'success' ? 'Succès' : 'Erreur';
                            status.className = log.status === 'success' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
                            
                            output.textContent = log.output || 'Aucune sortie';
                            
                            // Afficher les erreurs s'il y en a
                            const errorContainer = document.getElementById('logErrorContainer');
                            if (errorContainer) {
                                if (log.error) {
                                    errorContainer.classList.remove('hidden');
                                    document.getElementById('logError').textContent = log.error;
                                } else {
                                    errorContainer.classList.add('hidden');
                                }
                            }
                            
                            modal.classList.remove('hidden');
                        }
                    } else {
                        console.error('Log non trouvé avec ID:', logId);
                        alert('Log non trouvé.');
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    alert('Erreur lors de la récupération des logs.');
                });
            
            event.preventDefault();
            return false;
        }
        target = target.parentNode;
    }
});

// Fonction pour mettre à jour les statuts des scripts en cours d'exécution
function updateRunningScripts() {
    // Récupérer les statuts des scripts en cours
    fetch('/script_status')
        .then(response => response.json())
        .then(data => {
            console.log("Mise à jour des statuts scripts:", data);
            
            // Récupérer tous les éléments à mettre à jour
            const playButtons = document.querySelectorAll('.run-schedule');
            const stopButtons = document.querySelectorAll('form[action^="/stop_script/"]');
            const statusBadges = document.querySelectorAll('.status-badge');
            const cardHeaders = document.querySelectorAll('.bg-white > div[class*="bg-"]');
            
            // Récupérer les derniers logs pour déterminer le statut des scripts qui ne sont plus en cours
            fetch('/logs?last=true')
                .then(response => response.json())
                .then(logs => {
                    console.log("Derniers logs:", logs);
                    
                    // Créer un dictionnaire des derniers logs par schedule_id
                    const lastLogsByScheduleId = {};
                    logs.forEach(log => {
                        if (log.schedule_id) {
                            lastLogsByScheduleId[log.schedule_id] = log;
                        }
                    });
                    
                    // Créer un ensemble des scripts en cours d'exécution
                    const runningScriptIds = new Set();
                    for (const scheduleId in data) {
                        runningScriptIds.add(scheduleId);
                        runningScriptIds.add(parseInt(scheduleId));
                    }
                    
                    // Mettre à jour les boutons play/stop
                    playButtons.forEach(button => {
                        const scheduleId = button.getAttribute('data-schedule-id');
                        const isRunning = runningScriptIds.has(scheduleId) || runningScriptIds.has(parseInt(scheduleId));
                        
                        // Trouver le formulaire d'arrêt correspondant
                        let stopForm = null;
                        stopButtons.forEach(form => {
                            const formAction = form.getAttribute('action');
                            if (formAction && formAction.includes(scheduleId)) {
                                stopForm = form;
                            }
                        });
                        
                        // Trouver la carte parente et son en-tête
                        const card = button.closest('.bg-white');
                        let header = null;
                        if (card) {
                            header = card.querySelector('div[class*="bg-"]');
                        }
                        
                        // Trouver le badge de statut correspondant
                        let badge = null;
                        statusBadges.forEach(b => {
                            if (b.getAttribute('data-schedule-id') === scheduleId) {
                                badge = b;
                            }
                        });
                        
                        if (isRunning) {
                            // Script en cours d'exécution
                            button.classList.add('hidden');
                            if (stopForm) {
                                stopForm.classList.remove('hidden');
                            } else {
                                // Créer un formulaire d'arrêt s'il n'existe pas
                                const buttonsContainer = button.parentElement;
                                if (buttonsContainer) {
                                    const newStopForm = document.createElement('form');
                                    newStopForm.setAttribute('action', `/stop_script/${scheduleId}`);
                                    newStopForm.setAttribute('method', 'POST');
                                    newStopForm.classList.add('inline');
                                    
                                    newStopForm.innerHTML = `
                                        <button type="submit" class="text-red-600 hover:text-red-900 mr-1" title="Arrêter le script en cours">
                                            <i class="fas fa-stop-circle"></i>
                                        </button>
                                    `;
                                    
                                    buttonsContainer.insertBefore(newStopForm, button);
                                }
                            }
                            
                            // Mettre à jour l'en-tête de la carte en orange
                            if (header) {
                                header.className = header.className.replace(/bg-\w+-100/g, 'bg-orange-100');
                            }
                            
                            // Mettre à jour le badge
                            if (badge) {
                                badge.innerHTML = 'En cours <i class="fas fa-spinner fa-spin ml-1"></i>';
                                badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 status-badge';
                            }
                        } else {
                            // Script arrêté ou terminé
                            button.classList.remove('hidden');
                            if (stopForm) {
                                stopForm.classList.add('hidden');
                            }
                            
                            // Mettre à jour l'en-tête et le badge en fonction du dernier log
                            const lastLog = lastLogsByScheduleId[scheduleId];
                            if (lastLog) {
                                // Mettre à jour en fonction du statut du dernier log
                                if (lastLog.status === 'success') {
                                    // Succès
                                    if (header) {
                                        header.className = header.className.replace(/bg-\w+-100/g, 'bg-green-100');
                                    }
                                    if (badge) {
                                        badge.innerHTML = 'Succès';
                                        badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 status-badge';
                                    }
                                } else if (lastLog.status === 'error' || lastLog.status === 'timeout') {
                                    // Erreur ou timeout
                                    if (header) {
                                        header.className = header.className.replace(/bg-\w+-100/g, 'bg-red-100');
                                    }
                                    if (badge) {
                                        badge.innerHTML = 'Erreur';
                                        badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 status-badge';
                                    }
                                } else if (lastLog.status === 'stopped') {
                                    // Arrêté manuellement
                                    if (header) {
                                        header.className = header.className.replace(/bg-\w+-100/g, 'bg-yellow-100');
                                    }
                                    if (badge) {
                                        badge.innerHTML = 'Arrêté';
                                        badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 status-badge';
                                    }
                                } else {
                                    // Statut inconnu ou en attente
                                    if (header) {
                                        header.className = header.className.replace(/bg-\w+-100/g, 'bg-indigo-100');
                                    }
                                    if (badge) {
                                        badge.innerHTML = 'En attente';
                                        badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 status-badge';
                                    }
                                }
                            }
                        }
                    });
                })
                .catch(error => console.error('Erreur lors de la récupération des logs:', error));
        })
        .catch(error => console.error('Erreur lors de la mise à jour des statuts:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    // Rafraîchir le statut des scripts toutes les 2 secondes
    setInterval(updateRunningScripts, 2000);
    // Mettre à jour immédiatement au chargement
    updateRunningScripts();
});

// Fonction pour basculer l'affichage de la section de fréquence en fonction du type de planification sélectionné
function toggleFrequencySection() {
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked');
    if (!scheduleType) return;
    
    const frequencySection = document.querySelector('#scheduleForm div:nth-child(6)');
    const serviceOptions = document.getElementById('serviceOptions');
    const frequencyFields = document.querySelectorAll('.frequency-field');
    const timeoutField = document.getElementById('timeout');
    
    if (scheduleType.value === 'service') {
        // Pour les services, on cache la section de fréquence
        if (frequencySection) frequencySection.classList.add('hidden');
        if (serviceOptions) serviceOptions.classList.remove('hidden');
        
        // On rend les champs de fréquence et le timeout non requis
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
        // Pour les planifications standard, on affiche la section de fréquence
        if (frequencySection) frequencySection.classList.remove('hidden');
        if (serviceOptions) serviceOptions.classList.add('hidden');
        
        // On rend les champs de fréquence et le timeout requis
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

// Ajouter un écouteur d'événement pour les changements de type de planification
document.addEventListener('DOMContentLoaded', function() {
    const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
    scheduleTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleFrequencySection);
    });
    
    // Appeler la fonction au chargement de la page
    toggleFrequencySection();
    
    // Validation du formulaire
    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', function(event) {
            const scheduleType = document.querySelector('input[name="scheduleType"]:checked');
            
            // Si c'est un service, on ne valide pas les règles de fréquence
            if (scheduleType && scheduleType.value === 'service') {
                return true;
            }
            
            // Pour les planifications standard, vérifier que les champs de fréquence sont remplis
            const frequencyType = document.querySelector('input[name="frequencyType"]:checked');
            if (!frequencyType) {
                alert('Veuillez sélectionner un type de fréquence');
                event.preventDefault();
                return false;
            }
            
            return true;
        });
    }
});
