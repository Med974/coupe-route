// =======================================================================
// FICHIER : app.js
// GESTION DYNAMIQUE DES CLASSEMENTS COUPE DE LA RÉUNION ROUTE (v2 - SheetDB)
// =======================================================================

// --- 1. Configuration et Mappage des Catégories ---

// ID unique fourni par SheetDB (Endpoint URL de base)
const SHEETDB_API_ID = 'cn1mysle9dz6t'; 

// Mappage des catégories vers leurs NOMS DE FEUILLES EXACTS dans Google Sheets.
const CATEGORY_MAP = {
    // Les clés des URLs (ex: ?cat=open)
    'open': { name: 'OPEN', sheetName: 'Classement Open' },
    'access12': { name: 'Access 1/2', sheetName: 'Classement Access 1/2' }, 
    'access34': { name: 'Access 3/4', sheetName: 'Classement Access 3/4' },
    // J'ai modifié les clés des URLs ('Access 1/2' et 'Access 3/4') en 'access12' et 'access34' 
    // pour éviter les espaces et slashes dans les paramètres d'URL, ce qui est une bonne pratique.
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
 * Remplace l'ancienne fonction buildTsvUrl.
 * @param {string} categoryKey - La clé de la catégorie (ex: 'open').
 * @returns {string | null} L'URL JSON de SheetDB.
 */
function buildJsonUrl(categoryKey) {
    const categoryInfo = CATEGORY_MAP[categoryKey];
    if (!categoryInfo || !SHEETDB_API_ID) {
        return null;
    }
    // Format de l'API SheetDB pour accéder à une feuille spécifique
    return `https://sheetdb.io/api/v1/${SHEETDB_API_ID}/sheets/${categoryInfo.sheetName}`;
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
        // Utilisation de l'URL avec les nouvelles clés sans espace
        navHtml += `<a href="?cat=${key}" class="${isActive}">${category.name}</a>`;
    });

    if (navContainer) {
        navContainer.innerHTML = navHtml;
    }
}

// --- 3. Fonctions de Récupération et de Traitement des Données ---

/**
 * Récupère les données JSON via l'API SheetDB.
 * Remplace l'ancienne fonction fetchClassementData (qui traitait le TSV).
 * @param {string} url - L'URL JSON de la feuille de classement.
 * @returns {Promise<Array<Object>>} - Tableau de coureurs.
 */
async function fetchClassementData(url) {
    try {
        console.log("Tentative de récupération de l'URL JSON :", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            // Si le statut est 404, c'est probablement le nom de la feuille qui est incorrect
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le nom de l'onglet dans SheetDB. Réponse: ${errorBody.substring(0, 100)}...`);
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
 * Génère le tableau HTML de classement. Cette fonction ne change pas, car elle lit les objets.
 * @param {Array<Object>} data - Le tableau de coureurs filtré.
 */
function renderTable(data) {
    if (data.length === 0) {
        container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie. Vérifiez le nom de l\'onglet dans SheetDB.</p>';
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
                content = parseFloat(content) || 0; // Conversion en nombre pour la sécurité
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
    // Utiliser la nouvelle fonction pour obtenir l'URL JSON
    const jsonUrl = buildJsonUrl(currentCategoryKey); 

    // Mettre à jour les titres de la page
    const categoryName = CATEGORY_MAP[currentCategoryKey] ? CATEGORY_MAP[currentCategoryKey].name : currentCategoryKey.toUpperCase();
    document.title = `Classement ${categoryName} - Route 2026`; // Mettre à jour l'année

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
