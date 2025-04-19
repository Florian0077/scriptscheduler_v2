// Gestion des options de fréquence d'exécution
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initialisation du gestionnaire de fréquence");
    
    // NIVEAU 1: Simple vs Cron
    const simpleRadio = document.getElementById('simpleFrequencyType');
    const cronRadio = document.getElementById('cronFrequencyType');
    
    if (simpleRadio && cronRadio) {
        console.log("Radios Simple/Cron trouvés");
        
        const simpleOptions = document.getElementById('simpleFrequencyOptions');
        const cronOptions = document.getElementById('cronFrequencyOptions');
        
        function toggleMainFrequencyType() {
            if (simpleRadio.checked) {
                console.log("Type: Simple sélectionné");
                if (simpleOptions) simpleOptions.classList.remove('hidden');
                if (cronOptions) cronOptions.classList.add('hidden');
            } else if (cronRadio.checked) {
                console.log("Type: Cron sélectionné");
                if (simpleOptions) simpleOptions.classList.add('hidden');
                if (cronOptions) cronOptions.classList.remove('hidden');
            }
        }
        
        simpleRadio.addEventListener('change', toggleMainFrequencyType);
        cronRadio.addEventListener('change', toggleMainFrequencyType);
        
        // Initialiser l'affichage
        toggleMainFrequencyType();
    }
    
    // NIVEAU 2: Options de fréquence simple (Minutes, Horaire, etc.)
    const everyMinutesRadio = document.getElementById('everyMinutes');
    const hourlyRadio = document.getElementById('hourly');
    const dailyRadio = document.getElementById('daily');
    const weeklyRadio = document.getElementById('weekly');
    const monthlyRadio = document.getElementById('monthly');
    
    if (everyMinutesRadio && hourlyRadio && dailyRadio) {
        console.log("Options de fréquence simple trouvées");
        
        const everyMinutesOptions = document.getElementById('everyMinutesOptions');
        const hourlyOptions = document.getElementById('hourlyOptions');
        const dailyOptions = document.getElementById('dailyOptions');
        const weeklyOptions = document.getElementById('weeklyOptions');
        const monthlyOptions = document.getElementById('monthlyOptions');
        
        function toggleSimpleFrequencyType() {
            // Cacher toutes les options
            [everyMinutesOptions, hourlyOptions, dailyOptions, weeklyOptions, monthlyOptions].forEach(option => {
                if (option) option.classList.add('hidden');
            });
            
            // Afficher l'option sélectionnée
            if (everyMinutesRadio.checked) {
                console.log("Option: Toutes les X minutes sélectionnée");
                if (everyMinutesOptions) everyMinutesOptions.classList.remove('hidden');
            } else if (hourlyRadio.checked) {
                console.log("Option: Horaire sélectionnée");
                if (hourlyOptions) hourlyOptions.classList.remove('hidden');
            } else if (dailyRadio.checked) {
                console.log("Option: Quotidien sélectionné");
                if (dailyOptions) dailyOptions.classList.remove('hidden');
            } else if (weeklyRadio && weeklyRadio.checked) {
                console.log("Option: Hebdomadaire sélectionné");
                if (weeklyOptions) weeklyOptions.classList.remove('hidden');
            } else if (monthlyRadio && monthlyRadio.checked) {
                console.log("Option: Mensuel sélectionné");
                if (monthlyOptions) monthlyOptions.classList.remove('hidden');
            }
        }
        
        // Ajouter les écouteurs d'événements
        [everyMinutesRadio, hourlyRadio, dailyRadio].forEach(radio => {
            radio.addEventListener('change', toggleSimpleFrequencyType);
        });
        
        if (weeklyRadio) weeklyRadio.addEventListener('change', toggleSimpleFrequencyType);
        if (monthlyRadio) monthlyRadio.addEventListener('change', toggleSimpleFrequencyType);
        
        // Initialiser l'affichage
        toggleSimpleFrequencyType();
    }
    
    // NIVEAU 3: Options Cron
    const cronFields = document.querySelectorAll('.cron-field');
    const cronExpression = document.getElementById('cronExpression');
    
    if (cronFields.length > 0 && cronExpression) {
        console.log("Champs cron trouvés:", cronFields.length);
        
        function updateCronExpression() {
            const minute = document.querySelector('[name="minute"]')?.value || '*';
            const hour = document.querySelector('[name="hour"]')?.value || '*';
            const day = document.querySelector('[name="day"]')?.value || '*';
            const month = document.querySelector('[name="month"]')?.value || '*';
            const weekday = document.querySelector('[name="weekday"]')?.value || '*';
            
            cronExpression.textContent = `${minute} ${hour} ${day} ${month} ${weekday}`;
            console.log("Expression cron mise à jour:", cronExpression.textContent);
        }
        
        cronFields.forEach(field => {
            field.addEventListener('input', updateCronExpression);
        });
        
        // Initialiser l'expression
        updateCronExpression();
    }
    
    // Gestion du type d'exécution (Planification standard / Service)
    const standardTypeRadio = document.getElementById('standardType');
    const serviceTypeRadio = document.getElementById('serviceType');
    const serviceOptions = document.getElementById('serviceOptions');
    const timeoutInput = document.getElementById('timeout');
    
    // Trouver la section de fréquence de manière native
    let frequencySection = null;
    
    // Parcourir tous les éléments label pour trouver celui qui contient "Fréquence d'exécution"
    const allLabels = document.querySelectorAll('label.block');
    for (const label of allLabels) {
        if (label.textContent.includes('Fréquence d\'exécution')) {
            frequencySection = label.closest('div.mb-4');
            break;
        }
    }
    
    // Si on ne trouve pas avec le label, essayons de trouver la div qui contient les éléments de fréquence
    if (!frequencySection) {
        const simpleFrequencyType = document.getElementById('simpleFrequencyType');
        if (simpleFrequencyType) {
            frequencySection = simpleFrequencyType.closest('div.mb-4');
        }
    }

    if (standardTypeRadio && serviceTypeRadio && serviceOptions) {
        console.log("Radios Type d'exécution trouvés");
        
        function toggleExecutionType() {
            if (standardTypeRadio.checked) {
                console.log("Type: Planification standard sélectionné");
                serviceOptions.classList.add('hidden');
                
                // Réactiver la section de fréquence pour les planifications standard
                if (frequencySection) {
                    frequencySection.style.display = '';
                }
                
                // Réinitialiser le timeout à une valeur par défaut si nécessaire
                if (timeoutInput && timeoutInput.value === "3600") {
                    timeoutInput.value = "30";
                }
            } else if (serviceTypeRadio.checked) {
                console.log("Type: Service sélectionné");
                serviceOptions.classList.remove('hidden');
                
                // Définir automatiquement le timeout à 3600 pour les services
                if (timeoutInput) {
                    timeoutInput.value = "3600";
                }
                
                // Masquer la section de fréquence pour les services
                if (frequencySection) {
                    frequencySection.style.display = 'none';
                }
            }
        }
        
        standardTypeRadio.addEventListener('change', toggleExecutionType);
        serviceTypeRadio.addEventListener('change', toggleExecutionType);
        
        // Vérification initiale au chargement
        toggleExecutionType();
    }
    
    // Gestion du formulaire d'édition
    const editSimpleRadio = document.getElementById('editSimpleFrequencyType');
    const editCronRadio = document.getElementById('editCronFrequencyType');
    
    if (editSimpleRadio && editCronRadio) {
        console.log("Radios Simple/Cron trouvés (édition)");
        
        const simpleOptions = document.getElementById('editSimpleFrequencyOptions');
        const cronOptions = document.getElementById('editCronFrequencyOptions');
        
        function toggleMainFrequencyType() {
            if (editSimpleRadio.checked) {
                if (simpleOptions) simpleOptions.classList.remove('hidden');
                if (cronOptions) cronOptions.classList.add('hidden');
            } else if (editCronRadio.checked) {
                if (simpleOptions) simpleOptions.classList.add('hidden');
                if (cronOptions) cronOptions.classList.remove('hidden');
            }
        }
        
        editSimpleRadio.addEventListener('change', toggleMainFrequencyType);
        editCronRadio.addEventListener('change', toggleMainFrequencyType);
        
        // Initialiser l'affichage
        toggleMainFrequencyType();
    }
    
    // Options de fréquence simple dans le formulaire d'édition
    const editEveryMinutesRadio = document.getElementById('editEveryMinutes');
    const editHourlyRadio = document.getElementById('editHourly');
    const editDailyRadio = document.getElementById('editDaily');
    const editWeeklyRadio = document.getElementById('editWeekly');
    const editMonthlyRadio = document.getElementById('editMonthly');
    
    if (editEveryMinutesRadio && editHourlyRadio && editDailyRadio) {
        const editEveryMinutesOptions = document.getElementById('editEveryMinutesOptions');
        const editHourlyOptions = document.getElementById('editHourlyOptions');
        const editDailyOptions = document.getElementById('editDailyOptions');
        const editWeeklyOptions = document.getElementById('editWeeklyOptions');
        const editMonthlyOptions = document.getElementById('editMonthlyOptions');
        
        function toggleSimpleFrequencyType() {
            // Cacher toutes les options
            [editEveryMinutesOptions, editHourlyOptions, editDailyOptions, editWeeklyOptions, editMonthlyOptions].forEach(option => {
                if (option) option.classList.add('hidden');
            });
            
            // Afficher l'option sélectionnée
            if (editEveryMinutesRadio.checked) {
                console.log("Édition - Option: Toutes les X minutes sélectionnée");
                if (editEveryMinutesOptions) editEveryMinutesOptions.classList.remove('hidden');
            } else if (editHourlyRadio.checked) {
                console.log("Édition - Option: Horaire sélectionnée");
                if (editHourlyOptions) editHourlyOptions.classList.remove('hidden');
            } else if (editDailyRadio.checked) {
                console.log("Édition - Option: Quotidien sélectionné");
                if (editDailyOptions) editDailyOptions.classList.remove('hidden');
            } else if (editWeeklyRadio && editWeeklyRadio.checked) {
                console.log("Édition - Option: Hebdomadaire sélectionné");
                if (editWeeklyOptions) editWeeklyOptions.classList.remove('hidden');
            } else if (editMonthlyRadio && editMonthlyRadio.checked) {
                console.log("Édition - Option: Mensuel sélectionné");
                if (editMonthlyOptions) editMonthlyOptions.classList.remove('hidden');
            }
        }
        
        // Ajouter les écouteurs d'événements
        [editEveryMinutesRadio, editHourlyRadio, editDailyRadio].forEach(radio => {
            radio.addEventListener('change', toggleSimpleFrequencyType);
        });
        
        if (editWeeklyRadio) editWeeklyRadio.addEventListener('change', toggleSimpleFrequencyType);
        if (editMonthlyRadio) editMonthlyRadio.addEventListener('change', toggleSimpleFrequencyType);
        
        // Initialiser l'affichage
        toggleSimpleFrequencyType();
    }
    
    // Options Cron dans le formulaire d'édition
    const editCronFields = document.querySelectorAll('#editCronFrequencyOptions .cron-field');
    const editCronExpression = document.getElementById('editCronExpression');
    
    if (editCronFields.length > 0 && editCronExpression) {
        function updateCronExpression() {
            const minute = document.getElementById('editCronMinute')?.value || '*';
            const hour = document.getElementById('editCronHour')?.value || '*';
            const day = document.getElementById('editCronDay')?.value || '*';
            const month = document.getElementById('editCronMonth')?.value || '*';
            const weekday = document.getElementById('editCronWeekday')?.value || '*';
            
            editCronExpression.textContent = `${minute} ${hour} ${day} ${month} ${weekday}`;
        }
        
        editCronFields.forEach(field => {
            field.addEventListener('input', updateCronExpression);
        });
        
        // Initialiser l'expression
        updateCronExpression();
    }
    
    // Gestion du type d'exécution dans le formulaire d'édition
    const editStandardTypeRadio = document.getElementById('editStandardType');
    const editServiceTypeRadio = document.getElementById('editServiceType');
    const editServiceOptions = document.getElementById('editServiceOptions');
    const editTimeoutInput = document.getElementById('editTimeout');
    
    // Trouver la section de fréquence dans le formulaire d'édition
    let editFrequencySection = null;
    
    // Parcourir tous les éléments label du formulaire d'édition pour trouver celui qui contient "Fréquence d'exécution"
    const editFormLabels = document.querySelectorAll('form#editScheduleForm label.block');
    for (const label of editFormLabels) {
        if (label.textContent.includes('Fréquence d\'exécution')) {
            editFrequencySection = label.closest('div.mb-4');
            break;
        }
    }
    
    // Si on ne trouve pas avec le label, essayons de trouver la div qui contient les éléments de fréquence
    if (!editFrequencySection) {
        const editSimpleFrequencyType = document.getElementById('editSimpleFrequencyType');
        if (editSimpleFrequencyType) {
            editFrequencySection = editSimpleFrequencyType.closest('div.mb-4');
        }
    }

    if (editStandardTypeRadio && editServiceTypeRadio && editServiceOptions) {
        console.log("Radios Type d'exécution trouvés (édition)");
        
        function toggleEditExecutionType() {
            if (editStandardTypeRadio.checked) {
                console.log("Type (édition): Planification standard sélectionné");
                editServiceOptions.classList.add('hidden');
                
                // Réactiver la section de fréquence pour les planifications standard
                if (editFrequencySection) {
                    editFrequencySection.style.display = '';
                }
                
                // Réinitialiser le timeout à une valeur par défaut si nécessaire
                if (editTimeoutInput && editTimeoutInput.value === "3600") {
                    editTimeoutInput.value = "30";
                }
            } else if (editServiceTypeRadio.checked) {
                console.log("Type (édition): Service sélectionné");
                editServiceOptions.classList.remove('hidden');
                
                // Définir automatiquement le timeout à 3600 pour les services
                if (editTimeoutInput) {
                    editTimeoutInput.value = "3600";
                }
                
                // Masquer la section de fréquence pour les services
                if (editFrequencySection) {
                    editFrequencySection.style.display = 'none';
                }
            }
        }
        
        editStandardTypeRadio.addEventListener('change', toggleEditExecutionType);
        editServiceTypeRadio.addEventListener('change', toggleEditExecutionType);
        
        // Initialiser l'affichage
        toggleEditExecutionType();
    }
});
