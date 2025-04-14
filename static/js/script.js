document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let logsRefreshInterval = null;
    const REFRESH_INTERVAL = 5000; // 5 secondes

    // Gestion des onglets principaux
    const navTabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Gestionnaire pour les onglets de navigation principaux
    navTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Mettre à jour les classes des boutons
            navTabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
                btn.classList.add('text-gray-500');
            });
            
            this.classList.add('active');
            this.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
            this.classList.remove('text-gray-500');
            
            // Afficher le contenu de l'onglet
            const targetId = this.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
            
            // Gérer le rafraîchissement des journaux si l'onglet logs est actif
            if (targetId === 'logs') {
                startLogsRefresh();
            } else {
                stopLogsRefresh();
            }
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
        document.querySelectorAll('.view-log-btn').forEach(button => {
            button.addEventListener('click', function() {
                const logId = this.getAttribute('data-log-id');
                console.log('Clic sur le log avec ID:', logId);
                
                // Conversion explicite des IDs en chaînes de caractères pour la comparaison
                const log = logs.find(l => String(l.id) === String(logId));
                
                if (log) {
                    console.log('Log trouvé:', log);
                    showLogDetails(log);
                } else {
                    console.error('Log non trouvé avec ID:', logId);
                    console.log('Logs disponibles:', logs);
                }
            });
        });
    }
    
    // Gestion de la modal des détails de logs
    const logDetailsModal = document.getElementById('logDetailsModal');
    const closeLogDetailsBtn = document.getElementById('closeLogDetailsBtn');
    const closeLogDetailsX = document.getElementById('closeLogDetails');
    
    if (closeLogDetailsBtn) {
        closeLogDetailsBtn.addEventListener('click', function() {
            logDetailsModal.classList.add('hidden');
        });
    }
    
    if (closeLogDetailsX) {
        closeLogDetailsX.addEventListener('click', function() {
            logDetailsModal.classList.add('hidden');
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
    
    // Initialiser le rafraîchissement si l'onglet logs est actif au chargement
    if (document.querySelector('.tab-btn[data-tab="logs"].active')) {
        startLogsRefresh();
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
        clearLogsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all logs?')) {
                alert('Logs cleared!');
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
    const editScheduleBtns = document.querySelectorAll('.edit-schedule');
    const scheduleEditorModal = document.getElementById('scheduleEditorModal');
    const closeScheduleEditor = document.getElementById('closeScheduleEditor');
    const cancelScheduleEdit = document.getElementById('cancelScheduleEdit');
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
    
    // Gestion des boutons pour éditer une planification
    editScheduleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            
            // Récupérer les détails de la planification
            fetch(`/schedules/${scheduleId}`)
                .then(response => response.json())
                .then(data => {
                    // Remplir le formulaire
                    document.getElementById('editScheduleId').value = data.id;
                    document.getElementById('editScheduleName').value = data.name;
                    document.getElementById('editScriptPath').value = data.script_path;
                    document.getElementById('editEnvPath').value = data.env_path || '';
                    
                    // Sélectionner le type de fréquence
                    if (data.frequency_type === 'simple') {
                        editSimpleFreqRadio.checked = true;
                        editCronFreqRadio.checked = false;
                        editSimpleFreqOptions.classList.remove('hidden');
                        editCronFreqOptions.classList.add('hidden');
                        
                        // Analyser l'expression cron pour déterminer le type de fréquence simple
                        const cronParts = data.schedule.split(' ');
                        
                        if (cronParts[1] === '*' && cronParts[2] === '*' && cronParts[3] === '*' && cronParts[4] === '*') {
                            // Horaire (minute * * * *)
                            editHourlyRadio.checked = true;
                            document.getElementById('editHourlyMinute').value = cronParts[0];
                        } else if (cronParts[2] === '*' && cronParts[3] === '*' && cronParts[4] === '*') {
                            // Quotidien (minute heure * * *)
                            editDailyRadio.checked = true;
                            document.getElementById('editDailyMinute').value = cronParts[0];
                            document.getElementById('editDailyHour').value = cronParts[1];
                        } else if (cronParts[2] === '*' && cronParts[3] === '*' && cronParts[4] !== '*') {
                            // Hebdomadaire (minute heure * * jour_semaine)
                            editWeeklyRadio.checked = true;
                            document.getElementById('editWeeklyMinute').value = cronParts[0];
                            document.getElementById('editWeeklyHour').value = cronParts[1];
                            document.getElementById('editWeeklyDay').value = cronParts[4];
                        } else if (cronParts[2] !== '*' && cronParts[3] === '*' && cronParts[4] === '*') {
                            // Mensuel (minute heure jour * *)
                            editMonthlyRadio.checked = true;
                            document.getElementById('editMonthlyMinute').value = cronParts[0];
                            document.getElementById('editMonthlyHour').value = cronParts[1];
                            document.getElementById('editMonthlyDay').value = cronParts[2];
                        } else if (cronParts[0] !== '*' && cronParts[1] === '*' && cronParts[2] === '*' && cronParts[3] === '*' && cronParts[4] === '*') {
                            // Toutes les X minutes (minute * * * *)
                            editEveryMinutesRadio.checked = true;
                            document.getElementById('editEveryMinutes').value = cronParts[0];
                        }
                        
                        toggleEditSpecificOptions();
                    } else {
                        editSimpleFreqRadio.checked = false;
                        editCronFreqRadio.checked = true;
                        editSimpleFreqOptions.classList.add('hidden');
                        editCronFreqOptions.classList.remove('hidden');
                        
                        // Remplir les champs cron
                        const cronParts = data.schedule.split(' ');
                        document.getElementById('editCronMinute').value = cronParts[0];
                        document.getElementById('editCronHour').value = cronParts[1];
                        document.getElementById('editCronDay').value = cronParts[2];
                        document.getElementById('editCronMonth').value = cronParts[3];
                        document.getElementById('editCronWeekday').value = cronParts[4];
                        document.getElementById('editCronExpression').textContent = data.schedule;
                    }
                    
                    // Afficher le modal
                    scheduleEditorModal.classList.remove('hidden');
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    alert('Erreur lors de la récupération des détails de la planification');
                });
        });
    });
    
    // Fermer le modal d'édition de planification
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
            
            // Afficher le modal avec un message de chargement
            scriptOutputContainer.innerHTML = 'Exécution du script planifié en cours...';
            scriptOutputModal.classList.remove('hidden');
            
            // Exécuter le script via une requête AJAX
            fetch(`/schedules/${scheduleId}/run`, {
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
    
    // Suppression automatique des messages flash après 5 secondes
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.remove();
        }, 8000);
    });
    
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
});
