document.addEventListener('DOMContentLoaded', function() {
    // Gestion des onglets principaux
    const navTabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log("Initialisation de la navigation : boutons trouvés =", navTabButtons.length);
    
    navTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            console.log("Navigation vers l'onglet :", targetId);
            
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
                console.log("Contenu d'onglet affiché :", targetId);
            } else {
                console.error("Contenu d'onglet introuvable :", targetId);
            }
        });
    });
    
    // Initialiser l'onglet actif au chargement (optionnel)
    const defaultActiveTab = document.querySelector('.tab-btn.active');
    if (defaultActiveTab) {
        defaultActiveTab.click();
    } else if (navTabButtons.length > 0) {
        navTabButtons[0].click();
    }
});