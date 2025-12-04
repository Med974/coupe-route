// =======================================================================
// FICHIER : app.js
// GESTION DYNAMIQUE DES CLASSEMENTS COUPE DE LA RÉUNION ROUTE
// =======================================================================

// --- 1. Configuration et Mappage des Catégories ---

// Remplacez VOTRE_ID_DU_FICHIER par l'identifiant unique de votre fichier Google Sheets
// (Exemple: '1BixR...c2JgG')
const SHEET_FILE_ID = '1hRFXjctBI6csXthOYXooDhhXplX03OeQmTOgr7r06hI'; 

// Mappage des catégories vers leurs GID (Identifiant de la feuille)
// Assurez-vous d'avoir publié chaque feuille de classement sur le web (TSV)
const CATEGORY_MAP = {
    'Open': { name: 'OPEN', gid: '59291840' },   // GID de la feuille Classement Open
    'Access 1/2': { name: 'Access 1/2', gid: '372122761' }, // GID de la feuille Classement Access
    'Access 3/4': { name: 'Access 3/4', gid: '1167957081' }, // GID de la feuille Classement Autres
    // Ajoutez ici des catégories spécifiques si vous avez créé des feuilles dédiées (ex: M1)
    // 'open_m1': { name: 'OPEN M1', gid: '334567890' }, 
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
 * Construit l'URL complète pour la récupération des données TSV d'une feuille spécifique.
 * @param {string} categoryKey - La clé de la catégorie (ex: 'open').
 * @returns {string | null} L'URL TSV.
 */
function buildTsvUrl(categoryKey) {
    const categoryInfo = CATEGORY_MAP[categoryKey];
    if (!categoryInfo || !SHEET_FILE_ID) {
        return null;
    }
    // Utilisation de l'API de requête GVIZ
    return `https://docs.google.com/spreadsheets/d/${SHEET_FILE_ID}/gviz/tq?tqx=out:tsv&gid=${categoryInfo.gid}`;
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
        // Utilisation de l'URL pour changer la catégorie
        navHtml += `<a href="?cat=${key}" class="${isActive}">${category.name}</a>`;
    });

    if (navContainer) {
        navContainer.innerHTML = navHtml;
    }
}

// --- 3. Fonctions de Récupération et de Traitement des Données ---

/**
 * Récupère et traite les données TSV.
 * @param {string} url - L'URL TSV de la feuille de classement.
 * @returns {Promise<Array<Object>>} - Tableau de coureurs.
 */
async function fetchClassementData(url) {
    try {
        const response = await fetch(url);
        const tsvText = await response.text();

        // Nettoyer les lignes (surtout pour les fins de fichier)
        const rows = tsvText.split('\n').filter(row => row.trim() !== '');
        
        // La première ligne contient les en-têtes (labels de la QUERY)
        // Utilisation de .replaceAll() pour nettoyer les sauts de ligne dans les en-têtes
        const headers = rows[0].split('\t').map(header => header.trim().replaceAll('\r', ''));
        
        // Traiter les lignes de données
        const data = rows.slice(1).map(row => {
            const values = row.split('\t').map(value => value.trim().replaceAll('\r', ''));
            const coureur = {};
            
            headers.forEach((header, index) => {
                // S'assurer que le classement (dernière colonne) est un nombre
                if (header === 'Classement' || header === 'Points Total') {
                    coureur[header] = parseFloat(values[index]) || 0;
                } else {
                    coureur[header] = values[index];
                }
            });
            return coureur;
        });

        return data;

    } catch (error) {
        container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. Veuillez vérifier l'URL TSV et votre connexion.</p>`;
        console.error("Erreur de récupération :", error);
        return [];
    }
}

/**
 * Génère le tableau HTML de classement.
 * @param {Array<Object>} data - Le tableau de coureurs filtré.
 */
function renderTable(data) {
    if (data.length === 0) {
        container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie.</p>';
        return;
    }

    // On utilise les en-têtes de la première ligne de données
    const headers = Object.keys(data[0]);

    let html = '<table class="classement-table">';

    // Construction de l'en-tête (TH)
    html += '<thead><tr>';
    headers.forEach(header => {
        // Optionnel : Afficher des titres plus propres pour l'utilisateur
        const displayHeader = header.replace('Points Total', 'Total Pts').replace('NbCourses', 'Nb Courses');
        html += `<th>${displayHeader}</th>`;
    });
    html += '</tr></thead>';

    // Construction du corps (TBODY)
    html += '<tbody>';
    data.forEach(coureur => {
        html += '<tr>';
        headers.forEach(header => {
            // Mise en forme spécifique pour le Classement
            const content = (header === 'Classement') ? `<strong>${coureur[header]}</strong>` : coureur[header];
            html += `<td>${content}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';

    container.innerHTML = html;
}

// --- 4. Fonction Principale ---

async function init() {
    const currentCategoryKey = getCategoryFromURL();
    const tsvUrl = buildTsvUrl(currentCategoryKey);

    // Mettre à jour les titres de la page
    const categoryName = CATEGORY_MAP[currentCategoryKey] ? CATEGORY_MAP[currentCategoryKey].name : currentCategoryKey.toUpperCase();
    document.title = `Classement ${categoryName} - Route 2025`;
    
    // Créer la barre de navigation
    createNavBar();
    
    // Mettre à jour le titre principal (H1)
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = `Classement ${categoryName}`;

    if (tsvUrl) {
        // Afficher un message de chargement
        container.innerHTML = '<p>Chargement des données...</p>';
        
        const rawData = await fetchClassementData(tsvUrl);
        renderTable(rawData);
    } else {
        container.innerHTML = `<p style="color: red;">Configuration incorrecte ou catégorie "${currentCategoryKey}" non trouvée.</p>`;
    }
}

init();

