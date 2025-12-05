// =======================================================================
// FICHIER : app.js (v51 - Correction Totaux Club Stricts)
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
            'femmes': { name: 'Femmes', sheetName: 'Femmes' },
            'u17': { name: 'U17', sheetName: 'U17' },
            'u15': { name: 'U15', sheetName: 'U15' },
            'u15u17f': { name: 'U15/U17 Filles', sheetName: 'U15U17Femmes' },
        }
    },
    '2026': {
        name: 'Saison 2026',
        apiId: 'guq5nvsip34b6', 
        categories: {
            'open': { name: 'OPEN', sheetName: 'Open' }, 
            'access12': { name: 'Access 1/2', sheetName: 'Access12' }, 
            'access34': { name: 'Access 3/4', sheetName: 'Access34' },
            'femmes': { name: 'Femmes', sheetName: 'Femmes' },
            'u17': { name: 'U17', sheetName: 'U17' },
            'u15': { name: 'U15', sheetName: 'U15' },
            'u15u17f': { name: 'U15/U17 Filles', sheetName: 'U15U17Femmes' },
        }
    }
};

const DEFAULT_SAISON = '2026'; 
const DEFAULT_CATEGORY = 'open';

let globalClassementData = []; 

const MASTERS_CONFIG = [
    { key: 'all', name: 'Général' },
    { key: 'M1', name: 'M1' },
    { key: 'M2', name: 'M2' },
    { key: 'M3', name: 'M3' },
    { key: 'M4', name: 'M4' },
    { key: 'M5', name: 'M5' },
    { key: 'M6', name: 'M6' },
];

const WORKER_BASE_URL = 'https://morning-darkness-4a2d.med97400.workers.dev/';


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
 * Convertit l'ID de dossard de recherche (ex: '52000') en ID d'affichage (ex: '52').
 */
function getDisplayDossard(dossardRecherche) {
    if (!dossardRecherche) return dossardRecherche;
    
    const dossardStr = String(dossardRecherche); 

    const suffixes = ['1517', '000', '170', '150'];
    
    for (const suffix of suffixes) {
        if (dossardStr.endsWith(suffix)) {
            return dossardStr.slice(0, -suffix.length);
        }
    }
    
    return dossardRecherche; 
}


/**
 * Construit l'URL complète pour la récupération des données JSON via le WORKER.
 */
function buildJsonUrl(saisonKey, categoryKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    if (!saisonConfig) return null;

    const categoryInfo = saisonConfig.categories[categoryKey];
    if (!categoryInfo) return null;
    
    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    
    return `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=${sheetParam}`;
}

/**
 * Crée les boutons de navigation (Saisons et Catégories).
 */
function createNavBar(currentSaison, currentCategory) {
    const seasonsContainer = document.getElementById('nav-seasons');
    const categoriesContainer = document.getElementById('nav-categories');
    const mastersContainer = document.getElementById('nav-masters');

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
    
    // 3. Navigation Masters
    let mastersHtml = '';
    MASTERS_CONFIG.forEach(master => {
        const isActive = master.key === 'all' ? 'active' : '';
        mastersHtml += `<a href="#" data-master="${master.key}" class="master-button ${isActive}">${master.name}</a>`;
    });
    if (mastersContainer) {
        mastersContainer.innerHTML = mastersHtml;
    }
}

// --- 3. Fonctions de Données et Rendu ---

async function fetchClassementData(url) {
    const container = document.getElementById('classement-container');
    
    try {
        console.log("Tentative de récupération de l'URL JSON :", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le Worker Cloudflare/SheetDB. Réponse: ${errorBody.substring(0, 100)}...`);
        }
        
        const data = await response.json(); 
        
        if (data && data.error) {
             throw new Error(`Erreur API: ${data.error}`);
        }
        
        return data;

    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. L'API (Worker/SheetDB) a échoué. Détails : ${error.message}</p>`;
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
        const displayHeader = header.replace('PointsTotal', 'Total Pts').replace('NbCourses', 'Nb Courses').replace('SousCategorie', 'Sous Catégorie').replace('Master', 'Catégorie Master');
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

            // Rendre le Nom et le Club cliquables
            let displayContent = content; 
            
            if (header === 'Dossard') {
                displayContent = getDisplayDossard(content);
            } else if (header === 'Nom') {
                displayContent = `<a href="#" class="coureur-link" data-nom="${coureur.Nom}">${content}</a>`;
            } else if (header === 'Club') {
                 displayContent = `<a href="#" class="club-link" data-club="${coureur.Club}">${content}</a>`;
            } else if (header === 'Classement') {
                displayContent = `<strong>${content}</strong>`;
            } else {
                 displayContent = content;
            }

            html += `<td>${displayContent}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';

    if (container) {
        container.innerHTML = html;
    }
}


// --- 4. Logique Détaillée du Coureur ---

function renderCoureurDetails(details) {
    const container = document.getElementById('classement-container');
    if (!container) return;
    
    if (details.length === 0) {
        container.innerHTML = '<p>Aucun résultat de course trouvé pour ce coureur.</p>';
        return;
    }
    
    const coureurNom = details[0].Nom;
    const coureurDossardRecherche = details[0].Dossard; 
    
    const coureurDossardAffichage = getDisplayDossard(coureurDossardRecherche); 

    // Calcul et Affichage du total des points
    let totalPoints = 0;
    details.forEach(course => {
        // CORRECTION : Utilise parseInt()
        const points = parseInt(String(course.Points)) || 0; 
        if (!isNaN(points)) {
            totalPoints += points;
        }
    });
    let html = `<h3 style="color:var(--color-volcan);">Résultats Détaillés : ${coureurNom} (Dossard ${coureurDossardAffichage})</h3>`;
    html += `<p style="font-size: 1.2em; font-weight: bold; margin-bottom: 20px;">TOTAL DES POINTS: ${totalPoints}</p>`;


    html += '<table class="details-table">';
    
    html += '<thead><tr><th>Date</th><th>Course</th><th>Position</th><th>Catégorie</th><th>Points</th></tr></thead><tbody>';

    details.forEach(course => {
        html += `<tr>
                    <td>${course.Date}</td> 
                    <td>${course.Course}</td> 
                    <td>${course.Position}</td>
                    <td>${course.Catégorie}</td>
                    <td><strong>${course.Points}</strong></td>
                 </tr>`;
    });
    
    html += '</tbody></table>';

    // Bouton de retour au classement général
    html += `<button onclick="init()">Retour au Classement Général</button>`;

    container.innerHTML = html;
}


async function showCoureurDetails(nom, saisonKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    
    // 1. URL de recherche : Recherche par Nom (Texte) via Worker
    const encodedNom = encodeURIComponent(nom);
    const encodedSheetName = encodeURIComponent("Résultats Bruts"); 
    
    // CORRECTION CRITIQUE : L'URL utilise la casse correcte "Nom=" pour la recherche API
    const searchUrl = `${WORKER_BASE_URL}search?Nom=${encodedNom}&sheet=${encodedSheetName}&saison=${saisonKey}`; 

    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p>Chargement des résultats pour ${nom}...</p>`;
    }
    
    try {
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le Worker Cloudflare.`);
        }
        
        const data = await response.json();
        
        renderCoureurDetails(data); 

    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors de la récupération des détails : ${error.message}</p>`;
        }
    }
}


// --- 5. Logique Club ---

/**
 * Affiche la liste des coureurs du club triés par catégorie et points.
 */
function renderClubDetails(members, clubNom) {
    const container = document.getElementById('classement-container');
    if (!container) return;
    
    // 1. Triez les membres
    members.sort((a, b) => {
        // Tri primaire par Catégorie Principale (Alphabetique)
        if (a.Catégorie < b.Catégorie) return -1;
        if (a.Catégorie > b.Catégorie) return 1;
        
        // Tri secondaire par Points Total (Décroissant)
        // CORRECTION : Utilise parseInt() pour les points entiers
        const pointsA = parseInt(a.PointsTotal) || 0; 
        const pointsB = parseInt(b.PointsTotal) || 0; 
        
        return pointsB - pointsA; 
    });
    
    let html = `<h3 style="color:var(--color-lagon);">Classement du Club : ${clubNom}</h3>`;
    
    // Calcul du Total des Points du Club
    let totalClubPoints = 0;
    members.forEach(member => {
        // CORRECTION : Utilise la conversion numérique simple
        totalClubPoints += parseInt(member.PointsTotal) || 0;
    });

    html += `<p style="font-size: 1.2em; margin-bottom: 20px;">Total des Points du Club: ${totalClubPoints}</p>`;
    
    // 2. Regroupement et Rendu
    let currentCategory = '';
    
    // Début du conteneur pour le regroupement
    html += '<div class="club-details-list">'; 
    
    members.forEach(member => {
        // Conversion en nombre strict pour l'affichage dans le tableau
        const points = parseInt(member.PointsTotal) || 0;
        
        // NOUVEAU : Changement de Catégorie (Début du Regroupement)
        if (member.Catégorie !== currentCategory) {
            // Fermer le tableau précédent (si ce n'est pas le tout premier titre)
            if (currentCategory !== '') {
                html += '</tbody></table>'; 
            }
            currentCategory = member.Catégorie;
            
            // Insérer le titre de regroupement
            html += `<h4 class="category-group-title">${currentCategory}</h4>`; 
            
            // Ouvrir un nouveau tableau pour cette catégorie
            html += '<table class="details-table club-category-table">';
            html += '<thead><tr><th>Nom</th><th>Points Total</th></tr></thead><tbody>';
        }
        
        // Ligne du coureur
        html += `<tr>
                    <td>${member.Nom}</td> 
                    <td><strong>${points}</strong></td>
                 </tr>`;
    });
    
    // Fermeture finale du dernier tableau et du conteneur de regroupement
    if (members.length > 0) {
        html += '</tbody></table>'; 
    }
    
    html += '</div>';

    // Bouton de retour au classement général
    html += `<button onclick="init()">Retour au Classement Général</button>`;

    container.innerHTML = html;
}

/**
 * Gère le clic sur le nom du club et récupère tous ses membres.
 */
async function showClubClassement(clubNom, saisonKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    const sheetdbApiId = saisonConfig.apiId;
    
    // 1. Construire l'URL de recherche pour la feuille COUREURS
    // On recherche par Nom du Club
    const encodedClub = encodeURIComponent(clubNom);
    const searchUrl = `https://sheetdb.io/api/v1/${sheetdbApiId}/search?Club=${encodedClub}&sheet=Coureurs`;

    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p>Chargement du classement pour le club ${clubNom}...</p>`;
    }
    
    // 2. Récupérer les données
    try {
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez que l'onglet 'Coureurs' est accessible.`);
        }
        
        const data = await response.json();
        
        // 3. Afficher les détails du club
        renderClubDetails(data, clubNom); 

    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors de la récupération des membres du club : ${error.message}</p>`;
        }
    }
}


// --- 6. Logique Master ---

function handleMasterFilterChange(event) {
    event.preventDefault(); 
    
    const button = event.target.closest('a.master-button');
    if (!button) return;

    const selectedMaster = button.getAttribute('data-master');
    
    // 1. Mise à jour du style des boutons Masters
    document.querySelectorAll('#nav-masters .master-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // 2. Application du filtre
    let filteredData = globalClassementData;

    if (selectedMaster !== 'all') {
        filteredData = globalClassementData.filter(coureur => {
            return coureur.Master === selectedMaster; 
        });
    }

    // 3. Affichage du tableau filtré
    renderTable(filteredData);
}

// --- 7. Fonction Principale ---

async function init() {
    
    const container = document.getElementById('classement-container');
    
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
    
    const categoryTitleElement = document.querySelector('header h2');
    if (categoryTitleElement) {
        categoryTitleElement.textContent = ""; 
    }

    const seasonParagraph = document.querySelector('header p');
    if (seasonParagraph) {
        seasonParagraph.textContent = `Saison ${currentSaison}`;
    }

    if (jsonUrl) {
        if (container) {
            container.innerHTML = `<p>Chargement des données de ${currentSaison}...</p>`;
        }
        
        const rawData = await fetchClassementData(jsonUrl); 
        globalClassementData = rawData;
        
        // Initialisation des écouteurs
        const mastersContainer = document.getElementById('nav-masters');
        if (mastersContainer) {
            mastersContainer.addEventListener('click', handleMasterFilterChange);
        }
        
        const classementContainer = document.getElementById('classement-container');
        if (classementContainer) {
            // Écouteur pour la vue détaillée (Nom du coureur)
            classementContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.coureur-link');
                if (link) {
                    e.preventDefault();
                    const nom = link.getAttribute('data-nom'); 
                    const currentSaison = getSaisonFromURL(); 
                    
                    showCoureurDetails(nom, currentSaison);
                }
            });
            
            // Écouteur pour le classement Club
            classementContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.club-link');
                if (link) {
                    e.preventDefault();
                    const clubNom = link.getAttribute('data-club'); 
                    const currentSaison = getSaisonFromURL(); 
                    
                    showClubClassement(clubNom, currentSaison);
                }
            });
        }
        
        renderTable(rawData);
    } else {
        if (container) {
            container.innerHTML = `<p style="color: red;">Configuration des données manquante pour la saison ${currentSaison} ou la catégorie "${currentCategoryKey}".</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
