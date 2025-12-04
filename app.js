// =======================================================================
// FICHIER : app.js (v9 - Gestion des Saisons et Default 2026)
// =======================================================================

// --- 1. Configuration Multi-Saisons ---

const SAISONS_CONFIG = {
    '2025': {
        name: 'Saison 2025',
        apiId: 'hiydnpj4xuxdz', // API actuelle de 2025
        categories: {
            'open': { name: 'OPEN', sheetName: 'Open' },
            'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
            'access34': { name: 'Access 3/4', sheetName: 'Access34' },
            // Les masters de 2025 iront ici
        }
    },
    '2026': {
        name: 'Saison 2026',
        apiId: 'NOUVEL_ID_API_2026', // <<< REMPLACER CECI PAR L'ID DE L'API 2026
        categories: {
            'open': { name: 'OPEN', sheetName: 'Open' }, 
            'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
            'access34': { name: 'Access 3/4', sheetName: 'Access34' },
            // Les masters de 2026 iront ici
        }
    }
};

const DEFAULT_SAISON = '2026'; // <<< Changement de la saison par défaut
const DEFAULT_CATEGORY = 'open';

// Références aux éléments HTML
const container = document.getElementById('classement-container');
const navCategoriesContainer = document.getElementById('nav-categories');
const navSeasonsContainer = document.getElementById('nav-seasons');


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

    // Utilisation du format ?sheet=
    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    
    return `https://sheetdb.io/api/v1/${SHEETDB_API_ID}?sheet=${sheetParam}`;
}

/**
 * Crée les boutons de navigation (Saisons et Catégories).
 */
function createNavBar(currentSaison, currentCategory) {
    // 1. Navigation Saisons
    let seasonsHtml = '';
    Object.keys(SAISONS_CONFIG).forEach(saisonKey => {
        const saison = SAISONS_CONFIG[saisonKey];
        const isActive = saisonKey === currentSaison ? 'active' : '';
        // On garde la même catégorie en changeant de saison
        seasonsHtml += `<a href="?saison=${saisonKey}&cat=${currentCategory}" class="${isActive}">${saison.name}</a>`;
    });
    if (navSeasonsContainer) {
        navSeasonsContainer.innerHTML = seasonsHtml;
    }

    // 2. Navigation Catégories
    const currentCategories = SAISONS_CONFIG[currentSaison]?.categories;
    let categoriesHtml = '';
    if (currentCategories) {
        Object.keys(currentCategories).forEach(categoryKey => {
            const category = currentCategories[categoryKey];
            const isActive = categoryKey === currentCategory ? 'active' : '';
            // On garde la même saison en changeant de catégorie
            categoriesHtml += `<a href="?saison=${currentSaison}&cat=${categoryKey}" class="${isActive}">${category.name}</a>`;
        });
    }
    if (navCategoriesContainer) {
        navCategoriesContainer.innerHTML = categoriesHtml;
    }
}

// --- 3. Fonctions de Données et Rendu ---

async function fetchClassementData(url) {
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
        container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. L'API SheetDB a échoué. Détails : ${error.message}</p>`;
        console.error("Erreur de récupération :", error);
        return [];
    }
}

function renderTable(data) {
    if (data.length === 0 || typeof data[0] !== 'object') {
        container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie. Vérifiez les données.</p>';
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

    container.innerHTML = html;
}

// --- 4. Fonction Principale ---

async function init() {
    const currentSaison = getSaisonFromURL();
    const currentCategory
