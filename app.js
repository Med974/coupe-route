// =======================================================================
// FICHIER : app.js (v16 - Tuiles Masters)
// =======================================================================

// --- 1. Configuration Multi-Saisons ---

const SAISONS_CONFIG = {
    '2025': {
        name: 'Saison 2025',
        apiId: 'hiydnpj4xuxdz', 
        categories: {
            'open': { name: 'OPEN', sheetName: 'Open' },
            'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
            'access34': { name: 'Access 3/4', sheetName: 'Access34' },
        }
    },
    '2026': {
        name: 'Saison 2026',
        apiId: 'guq5nvsip34b6', 
        categories: {
            'open': { name: 'OPEN', sheetName: 'Open' }, 
            'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
            'access34': { name: 'Access 3/4', sheetName: 'Access34' },
        }
    }
};

// NOUVEAU : Configuration des boutons Masters
const MASTERS_CONFIG = [
    { key: 'all', name: 'Général' }, // Clé 'all' pour les non-filtrés
    { key: 'M1', name: 'M1' },
    { key: 'M2', name: 'M2' },
    { key: 'M3', name: 'M3' },
    { key: 'M4', name: 'M4' },
    { key: 'M5', name: 'M5' },
    { key: 'M6', name: 'M6' },
];

const DEFAULT_SAISON = '2026'; 
const DEFAULT_CATEGORY = 'open';

let globalClassementData = []; 
let currentMasterFilter = 'all'; // État actuel du filtre Master


// --- 2. Fonctions Utilitaires ---
// (Fonctions inchangées : getSaisonFromURL, getCategoryFromURL, buildJsonUrl)

// ... (fonctions inchangées) ...

/**
 * Crée les boutons de navigation (Saisons et Catégories).
 */
function createNavBar(currentSaison, currentCategory) {
    const seasonsContainer = document.getElementById('nav-seasons');
    const categoriesContainer = document.getElementById('nav-categories');
    const mastersContainer = document.getElementById('nav-masters'); // NOUVEAU

    // 1. Navigation Saisons (inchangée)
    let seasonsHtml = '';
    Object.keys(SAISONS_CONFIG).forEach(saisonKey => {
        const saison = SAISONS_CONFIG[saisonKey];
        const isActive = saisonKey === currentSaison ? 'active' : '';
        seasonsHtml += `<a href="?saison=${saisonKey}&cat=${currentCategory}" class="${isActive}">${saison.name}</a>`;
    });
    if (seasonsContainer) {
        seasonsContainer.innerHTML = seasonsHtml;
    }

    // 2. Navigation Catégories (inchangée)
    const currentCategories = SAISONS_CONFIG[currentSaison]?.categories;
    let categoriesHtml = '';
    if (currentCategories) {
        Object.keys(currentCategories).forEach(categoryKey => {
            const category = currentCategories[categoryKey];
            const isActive = categoryKey === currentCategory ? 'active' : '';
            categoriesHtml += `<a href="?saison=${currentSaison}&cat=${categoryKey}" class="${isActive}">${category.name}</a>`;
        });
    }
    if (categoriesContainer) {
        categoriesContainer.innerHTML = categoriesHtml;
    }
    
    // 3. Navigation Masters (Tuiles)
    let mastersHtml = '';
    MASTERS_CONFIG.forEach(master => {
        const isActive = master.key === currentMasterFilter ? 'active' : '';
        // Utilisation d'un attribut data-master pour le JS et d'un href="#" pour le style
        mastersHtml += `<a href="#" data-master="${master.key}" class="master-button ${isActive}">${master.name}</a>`;
    });
    if (mastersContainer) {
        mastersContainer.innerHTML = mastersHtml;
    }
}


// --- 3. Fonctions de Données et Rendu ---

// ... (fetchClassementData et renderTable inchangées) ...

// --- 4. Logique Master (Nouvelle gestion des clics) ---

function handleMasterFilterChange(event) {
    // Empêche le navigateur de remonter en haut de page
    event.preventDefault(); 
    
    // S'assure que l'élément cliqué est bien le lien (ou son parent)
    const button = event.target.closest('a.master-button');
    if (!button) return;

    // Récupération de la clé Master
    const selectedMaster = button.getAttribute('data-master');
    
    // Mise à jour de l'état global et du style
    currentMasterFilter = selectedMaster;
    
    // 1. Mise à jour du style des boutons Masters
    document.querySelectorAll('#nav-masters .master-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // 2. Application du filtre
    let filteredData = globalClassementData;

    if (selectedMaster !== 'all') {
        filteredData = globalClassementData.filter(coureur => {
            // 'Master' doit correspondre au label exact de la colonne (ex: M1, M2, etc.)
            // On inclut les coureurs qui ont leur Master correspondant
            return coureur.Master === selectedMaster; 
        });
    }

    // 3. Affichage du tableau filtré
    renderTable(filteredData);
}

// --- 5. Fonction Principale ---

async function init() {
    let currentSaison = getSaisonFromURL();
    const currentCategoryKey = getCategoryFromURL();
    
    if (!SAISONS_CONFIG[currentSaison]) {
        console.warn(`Saison ${currentSaison} non configurée. Chargement de ${DEFAULT_SAISON}.`);
        currentSaison = DEFAULT_SAISON; 
    }

    const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey); 

    const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
    
    document.title = `Classement ${categoryName} - Route ${currentSaison}`; 

    // Créer les barres de navigation
    createNavBar(currentSaison, currentCategoryKey);
    
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "Coupe de la Réunion Route"; 
    
    const categoryTitleElement = document.getElementById('category-title');
    if (categoryTitleElement) {
        categoryTitleElement.textContent = ""; 
    }

    const container = document.getElementById('classement-container');

    if (jsonUrl) {
        if (container) {
            container.innerHTML = `<p>Chargement des données de ${currentSaison}...</p>`;
        }
        
        const rawData = await fetchClassementData(jsonUrl); 
        globalClassementData = rawData;
        
        // CORRECTION : Attache l'écouteur d'événement sur le conteneur principal
        const mastersContainer = document.getElementById('nav-masters');
        if (mastersContainer) {
            mastersContainer.addEventListener('click', handleMasterFilterChange);
        }
        
        // Affichage initial (Général par défaut)
        renderTable(rawData);
    } else {
        if (container) {
            container.innerHTML = `<p style="color: red;">Configuration des données manquante pour la saison ${currentSaison} ou la catégorie "${currentCategoryKey}".</p>`;
        }
    }
}

init();
