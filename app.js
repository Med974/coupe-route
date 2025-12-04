// =======================================================================
// FICHIER : app.js
// GESTION DYNAMIQUE DES CLASSEMENTS COUPE DE LA RÉUNION ROUTE (v2 - SheetDB)
// =======================================================================

// --- 1. Configuration et Mappage des Catégories ---

// ID unique fourni par SheetDB (Endpoint URL de base)
const SHEETDB_API_ID = 'cn1mysle9dz6t'; 

// Mappage des catégories vers leurs NOMS DE FEUILLES EXACTS dans Google Sheets.
// sheetName doit correspondre EXACTEMENT au nom de l'onglet dans Google Sheets.
const CATEGORY_MAP = {
    'open': { name: 'OPEN', sheetName: 'Open' },
    'access12': { name: 'Access 1/2', sheetName: 'Access 1/2' }, 
    'access34': { name: 'Access 3/4', sheetName: 'Access 3/4' },
};

const DEFAULT_CATEGORY = 'open';
const container = document.getElementById('classement-container');
const navContainer = document.getElementById('nav-categories');

// --- 2. Fonctions Utilitaires ---

/**
 * Extrait le paramètre 'cat' de l'URL pour déterminer la catégorie à afficher.
 * @returns {string} La clé de la catégorie demandée.
 */
function getCategoryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cat') || DEFAULT_CATEGORY;
}

/**
 * Construit l'URL complète pour la récupération des données JSON via SheetDB.
 * Utilise le format ?sheet= pour cibler la feuille, résolvant le 405/404.
 * @param {string} categoryKey - La clé de la catégorie (ex: 'open').
 * @returns {string | null} L'URL JSON de SheetDB.
 */
function buildJsonUrl(categoryKey) {
    const categoryInfo = CATEGORY_MAP[categoryKey];
    if (!categoryInfo || !SHEETDB_API_ID) {
        return null;
    }
    
    // NOUVEAU FORMAT D'URL : Utilisation de ?sheet=
    // Encodage du nom de la feuille pour gérer les espaces ('Access 1/2')
    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    
    // Endpoint de base + paramètre de feuille
    return `https://sheetdb.io/api/v1/${SHEETDB_API_ID}?sheet=${sheetParam}`;
}

/**
 * Crée les boutons de navigation en haut de page.
 */
function createNavBar() {
    const currentCategory = getCategoryFromURL();
    let navHtml = '';

    Object.keys(CATEGORY_MAP).forEach(key => {
        const category = CATEGORY_MAP[key];
        const isActive = key === currentCategory ? 'active' : '';
        // Les liens utilisent les clés sans espace (open, access12, access34)
        navHtml += `<a href="?cat=${key}" class="${isActive}">${category.name}</a>`;
    });

    if (navContainer) {
        navContainer.innerHTML = navHtml;
    }
}

// --- 3. Fonctions de Récupération et de Traitement des Données ---

/**
 * Récupère les données JSON via l'API SheetDB.
 * @param {string} url - L'URL JSON de la feuille de classement.
 * @returns {Promise<Array<Object>>} - Tableau de coureurs.
 */
async function fetchClassementData(url) {
    try {
        console.log("Tentative de récupération de l'URL JSON :", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez les noms de feuilles dans SheetDB. Réponse: ${errorBody.substring(0, 100)}...`);
        }
        
        // Les données sont au format JSON !
        const data = await response.json(); 
        
        // La structure des données est déjà bonne (tableau d'objets)
        return data;

    } catch (error) {
        container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. L'API SheetDB a échoué. Détails : ${error.message}</p>`;
        console.error("Erreur de récupération :", error);
        return [];
    }
}

/**
 * Génère le tableau HTML de classement.
 * @param {Array<Object>} data - Le tableau de coureurs filtré.
 */
function renderTable(data) {
    if (data.length === 0 || typeof data[0] !== 'object') {
        // Vérification de la structure des données (vide ou non un tableau d'objets)
        container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie. Vérifiez le nom de l\'onglet et les données.</p>';
        return;
    }

    // On utilise les en-têtes de la première ligne de données
    const headers = Object.keys(data[0]);

    let html = '<table class="classement-table">';

    // Construction de l'en-tête (TH)
    html += '<thead><tr>';
    headers.forEach(header => {
        // Afficher des titres plus propres pour l'utilisateur
        const displayHeader = header.replace('Points Total', 'Total Pts').replace('NbCourses', 'Nb Courses');
        html += `<th>${displayHeader}</th>`;
    });
    html += '</tr></thead>';

    // Construction du corps (TBODY)
    html += '<tbody>';
    data.forEach(coureur => {
        html += '<tr>';
        headers.forEach(header => {
            // S'assurer que les valeurs numériques sont bien traitées
            let content = coureur[header];
            if (header === 'Classement' || header === 'Points Total') {
                // Conversion en nombre pour la sécurité, car SheetDB renvoie souvent des chaînes
                content = parseFloat(content) || content; 
            }

            // Mise en forme spécifique pour le Classement
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

    // Mettre à jour les titres de la page
    const categoryName = CATEGORY_MAP[currentCategoryKey] ? CATEGORY_MAP[currentCategoryKey].name : currentCategoryKey.toUpperCase();
    document.title = `Classement ${categoryName} - Route 2026`; 

    // Créer la barre de navigation
    createNavBar();
    
    // Mettre à jour le titre principal (H1)
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = `Classement ${categoryName}`;

    if (jsonUrl) {
        // Afficher un message de chargement
        container.innerHTML = '<p>Chargement des données...</p>';
        
        const rawData = await fetchClassementData(jsonUrl); 
        renderTable(rawData);
    } else {
        container.innerHTML = `<p style="color: red;">Configuration incorrecte ou catégorie "${currentCategoryKey}" non trouvée. Vérifiez CATEGORY_MAP.</p>`;
    }
}

init();

