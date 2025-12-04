// =======================================================================
// FICHIER : app.js
// GESTION DYNAMIQUE DES CLASSEMENTS COUPE DE LA RÉUNION ROUTE (v4 - Final)
// =======================================================================

// --- 1. Configuration et Mappage des Catégories ---

// ID unique fourni par SheetDB (Endpoint URL de base)
const SHEETDB_API_ID = 'hiydnpj4xuxdz'; 

// Mappage des catégories vers leurs NOMS DE FEUILLES EXACTS dans Google Sheets.
// Utilisez les noms renommés SANS caractères spéciaux.
const CATEGORY_MAP = {
    'open': { name: 'OPEN', sheetName: 'Open' },
    'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
    'access34': { name: 'Access 3/4', sheetName: 'Access34' },
};

const DEFAULT_CATEGORY = 'open';
const container = document.getElementById('classement-container');
const navContainer = document.getElementById('nav-categories');

// --- 2. Fonctions Utilitaires ---

function getCategoryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cat') || DEFAULT_CATEGORY;
}

/**
 * Construit l'URL complète pour la récupération des données JSON via SheetDB.
 */
function buildJsonUrl(categoryKey) {
    const categoryInfo = CATEGORY_MAP[categoryKey];
    if (!categoryInfo || !SHEETDB_API_ID) {
        return null;
    }
    
    // Utilisation du format simple ?sheet=
    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    
    return `https://sheetdb.io/api/v1/${SHEETDB_API_ID}?sheet=${sheetParam}`;
}

function createNavBar() {
    const currentCategory = getCategoryFromURL();
    let navHtml = '';

    Object.keys(CATEGORY_MAP).forEach(key => {
        const category = CATEGORY_MAP[key];
        const isActive = key === currentCategory ? 'active' : '';
        navHtml += `<a href="?cat=${key}" class="${isActive}">${category.name}</a>`;
    });

    if (navContainer) {
        navContainer.innerHTML = navHtml;
    }
}

// --- 3. Fonctions de Récupération et de Traitement des Données ---

async function fetchClassementData(url) {
    try {
        console.log("Tentative de récupération de l'URL JSON :", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez les noms de feuilles dans SheetDB. Réponse: ${errorBody.substring(0, 100)}...`);
        }
        
        const data = await response.json(); 
        
        // La seule complexité que SheetDB peut renvoyer, c'est un message d'erreur JSON ou un tableau de données.
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
        container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie. Vérifiez les données ou la configuration de l\'API.</p>';
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
    const currentCategoryKey = getCategoryFromURL();
    const jsonUrl = buildJsonUrl(currentCategoryKey); 

    const categoryName = CATEGORY_MAP[currentCategoryKey] ? CATEGORY_MAP[currentCategoryKey].name : currentCategoryKey.toUpperCase();
    document.title = `Classement ${categoryName} - Route 2026`; 

    createNavBar();
    
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = `Classement ${categoryName}`;

    if (jsonUrl) {
        container.innerHTML = '<p>Chargement des données...</p>';
        
        const rawData = await fetchClassementData(jsonUrl); 
        renderTable(rawData);
    } else {
        container.innerHTML = `<p style="color: red;">Configuration incorrecte ou catégorie "${currentCategoryKey}" non trouvée. Vérifiez CATEGORY_MAP.</p>`;
    }
}

init();
