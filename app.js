// =======================================================================
// FICHIER : app.js (v14 - Code Final et Stabilisé)
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
            // Les futurs Masters seront ajoutés ici
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

const DEFAULT_SAISON = '2026'; 
const DEFAULT_CATEGORY = 'open';

// Stockage global pour le filtrage Masters (sera rempli par fetchClassementData)
let globalClassementData = []; 


// --- 2. Fonctions Utilitaires ---

function getSaisonFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('saison') || DEFAULT_SAISON;
}

function getCategoryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cat') || DEFAULT_CATEGORY;
}

/**
 * Construit l'URL complète pour la récupération des données JSON via SheetDB.
 */
function buildJsonUrl(saisonKey, categoryKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    if (!saisonConfig) return null;

    const categoryInfo = saisonConfig.categories[categoryKey];
    if (!categoryInfo) return null;
    
    const SHEETDB_API_ID = saisonConfig.apiId;

    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    
    return `https://sheetdb.io/api/v1/${SHEETDB_API_ID}?sheet=${sheetParam}`;
}

/**
 * Crée les boutons de navigation (Saisons et Catégories).
 */
function createNavBar(currentSaison, currentCategory) {
    // Les références sont récupérées localement pour plus de sécurité
    const seasonsContainer = document.getElementById('nav-seasons');
    const categoriesContainer = document.getElementById('nav-categories');

    // 1. Navigation Saisons
    let seasonsHtml = '';
    Object.keys(SAISONS_CONFIG).forEach(saisonKey => {
        const saison = SAISONS_CONFIG[saisonKey];
        const isActive = saisonKey === currentSaison ? 'active' : '';
        seasonsHtml += `<a href="?saison=${saisonKey}&cat=${currentCategory}" class="${isActive}">${saison.name}</a>`;
    });
    if (seasonsContainer) {
        seasonsContainer.innerHTML = seasonsHtml;
    }

    // 2. Navigation Catégories
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
}

// --- 3. Fonctions de Données et Rendu ---

async function fetchClassementData(url) {
    // Récupération du conteneur dans la fonction
    const container = document.getElementById('classement-container');
    
    try {
        console.log("Tentative de récupération de l'URL JSON :", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez les noms de feuilles dans SheetDB. Réponse: ${errorBody.substring(0, 100)}...`);
        }
        
        const data = await response.json(); 
        
        if (data && data.error) {
             throw new Error(`Erreur API: ${data.error}`);
        }
        
        return data;

    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. L'API SheetDB a échoué. Détails : ${error.message}</p>`;
        }
        console.error("Erreur de récupération :", error);
        return [];
    }
}

function renderTable(data) {
    const container = document.getElementById('classement-container');

    if (data.length === 0 || typeof data[0] !== 'object') {
        if (container) {
            container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie. Vérifiez les données.</p>';
        }
        return;
    }

    const headers = Object.keys(data[0]);

    let html = '<table class="classement-table">';

    html += '<thead><tr>';
    headers.forEach(header => {
        const displayHeader = header.replace('PointsTotal', 'Total Pts').replace('NbCourses', 'Nb Courses').replace('SousCategorie', 'Sous Catégorie');
        html += `<th>${displayHeader}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';
    data.forEach(coureur => {
        html += '<tr>';
        headers.forEach(header => {
            let content = coureur[header];
            if (header === 'Classement' || header === 'PointsTotal') {
                content = parseFloat(content) || content; 
            }

            const displayContent = (header === 'Classement') ? `<strong>${content}</strong>` : content;
            html += `<td>${displayContent}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';

    if (container) {
        container.innerHTML = html;
    }
}

// --- 4. Fonction Principale ---

async function init() {
    let currentSaison = getSaisonFromURL();
    const currentCategoryKey = getCategoryFromURL();
    
    // Vérifie si la saison demandée existe, sinon utilise la saison par défaut
    if (!SAISONS_CONFIG[currentSaison]) {
        console.warn(`Saison ${currentSaison} non configurée. Chargement de ${DEFAULT_SAISON}.`);
        currentSaison = DEFAULT_SAISON; 
    }

    const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey); 

    const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
    
    // Mise à jour de l'année dans le titre du navigateur
    document.title = `Classement ${categoryName} - Route ${currentSaison}`; 

    // Créer les barres de navigation (Saisons et Catégories)
    createNavBar(currentSaison, currentCategoryKey);
    
    // Mise à jour des éléments de titre
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "Coupe de la Réunion Route"; 
    
    const categoryTitleElement = document.getElementById('category-title');
    if (categoryTitleElement) {
        categoryTitleElement.textContent = ""; 
    }

    // Mise à jour de la saison affichée dans la balise <p>
    const seasonParagraph = document.querySelector('header p');
    if (seasonParagraph) {
        seasonParagraph.textContent = `Saison ${currentSaison}`;
    }

    const container = document.getElementById('classement-container');

    if (jsonUrl) {
        if (container) {
            container.innerHTML = `<p>Chargement des données de ${currentSaison}...</p>`;
        }
        
        const rawData = await fetchClassementData(jsonUrl); 
        globalClassementData = rawData;
        
        renderTable(rawData);
    } else {
        if (container) {
            container.innerHTML = `<p style="color: red;">Configuration des données manquante pour la saison ${currentSaison} ou la catégorie "${currentCategoryKey}".</p>`;
        }
    }
}

init();
