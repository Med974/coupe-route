// =======================================================================
// FICHIER : app.js (v52 - Correction Finale Filtre Club)
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
let globalRawData = {}; 

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

function buildJsonUrl(saisonKey, categoryKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    if (!saisonConfig) return null;
    const categoryInfo = saisonConfig.categories[categoryKey];
    if (!categoryInfo) return null;
    const sheetParam = encodeURIComponent(categoryInfo.sheetName);
    return `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=${sheetParam}`;
}

async function loadAllRawResults(saisonKey) {
    if (globalRawData[saisonKey] && globalRawData[saisonKey].length > 0) {
        return globalRawData[saisonKey];
    }
    const sheetName = "Résultats Bruts";
    const url = `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=${encodeURIComponent(sheetName)}`; 

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Worker/API: ${response.status}`);
        }
        const data = await response.json();
        globalRawData[saisonKey] = data; 
        return data;
    } catch (e) {
        console.error("Erreur critique lors du chargement des résultats bruts:", e);
        return [];
    }
}

function createNavBar(currentSaison, currentCategory) {
    const seasonsContainer = document.getElementById('nav-seasons');
    const categoriesContainer = document.getElementById('nav-categories');
    const mastersContainer = document.getElementById('nav-masters');

    let seasonsHtml = '';
    Object.keys(SAISONS_CONFIG).forEach(saisonKey => {
        const saison = SAISONS_CONFIG[saisonKey];
        const isActive = saisonKey === currentSaison ? 'active' : '';
        seasonsHtml += `<a href="?saison=${saisonKey}&cat=${currentCategory}" class="${isActive}">${saison.name}</a>`;
    });
    if (seasonsContainer) {
        seasonsContainer.innerHTML = seasonsHtml;
    }

    let categoriesHtml = '';
    if (SAISONS_CONFIG[currentSaison]?.categories) {
        Object.keys(SAISONS_CONFIG[currentSaison].categories).forEach(categoryKey => {
            const category = SAISONS_CONFIG[currentSaison].categories[categoryKey];
            const isActive = categoryKey === currentCategory ? 'active' : '';
            categoriesHtml += `<a href="?saison=${currentSaison}&cat=${categoryKey}" class="${isActive}">${category.name}</a>`;
        });
    }
    if (categoriesContainer) {
        categoriesContainer.innerHTML = categoriesHtml;
    }
    
    let mastersHtml = '';
    MASTERS_CONFIG.forEach(master => {
        const isActive = master.key === 'all' ? 'active' : '';
        mastersHtml += `<a href="#" data-master="${master.key}" class="master-button ${isActive}">${master.name}</a>`;
    });
    if (mastersContainer) {
        mastersContainer.innerHTML = mastersHtml;
    }
}

async function fetchClassementData(url) {
    const container = document.getElementById('classement-container');
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Réponse: ${errorBody.substring(0, 100)}...`);
        }
        const data = await response.json(); 
        if (data && data.error) {
             throw new Error(`Erreur API: ${data.error}`);
        }
        return data;
    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors du chargement des données. Détails : ${error.message}</p>`;
        }
        return [];
    }
}

function renderTable(data) {
    const container = document.getElementById('classement-container');
    if (data.length === 0 || typeof data[0] !== 'object') {
        if (container) {
            container.innerHTML = '<p>Aucun coureur trouvé dans cette catégorie.</p>';
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
            let displayContent = content; 
            if (header === 'Dossard') {
                displayContent = getDisplayDossard(content);
            } else if (header === 'Nom') {
                displayContent = `<a href="#" class="coureur-link" data-nom="${coureur.Nom}">${content}</a>`;
            } else if (header === 'Club') {
                 displayContent = `<a href="#" class="club-link" data-club="${coureur.Club}">${content}</a>`;
            } else if (header === 'Classement') {
                displayContent = `<strong>${content}</strong>`;
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

    // Calcul du total des points (Détail)
    let totalPoints = 0;
    details.forEach(course => {
        const points = parseInt(String(course.Points).replace(/[^\d.]/g, '')) || 0; 
        if (!isNaN(points)) {
            totalPoints += points;
        }
    });

    // --- NOUVEAU : LOGIQUE DE COMPARAISON (ÉCARTS) ---
    let gapsHtml = '<div class="gap-container">';
    
    // On cherche le coureur dans le classement global (qui est trié)
    // Note: On utilise le Nom comme clé de comparaison car c'est la donnée stable ici
    const rankIndex = globalClassementData.findIndex(c => c.Nom === coureurNom);

    if (rankIndex !== -1) {
        const currentPoints = parseInt(globalClassementData[rankIndex].PointsTotal) || 0;

        // 1. Coureur devant (Rang inférieur, donc index - 1)
        if (rankIndex > 0) {
            const runnerAhead = globalClassementData[rankIndex - 1];
            const pointsAhead = parseInt(runnerAhead.PointsTotal) || 0;
            const diff = pointsAhead - currentPoints;
            
            gapsHtml += `
                <div class="gap-card chase">
                    <strong>🛑 Retard : -${diff} pts</strong>
                    <span class="gap-name">sur ${runnerAhead.Nom} (#${runnerAhead.Classement})</span>
                </div>`;
        } else {
            // C'est le premier !
             gapsHtml += `
                <div class="gap-card lead">
                    <strong>👑 Leader du classement</strong>
                </div>`;
        }

        // 2. Coureur derrière (Rang supérieur, donc index + 1)
        if (rankIndex < globalClassementData.length - 1) {
            const runnerBehind = globalClassementData[rankIndex + 1];
            const pointsBehind = parseInt(runnerBehind.PointsTotal) || 0;
            const diff = currentPoints - pointsBehind;

            gapsHtml += `
                <div class="gap-card lead">
                    <strong>✅ Avance : +${diff} pts</strong>
                    <span class="gap-name">sur ${runnerBehind.Nom} (#${runnerBehind.Classement})</span>
                </div>`;
        }
    }
    gapsHtml += '</div>';
    // ---------------------------------------------------


    let html = `<h3 style="color:var(--color-volcan);">Résultats Détaillés : ${coureurNom} (Dossard ${coureurDossardAffichage})</h3>`;
    html += `<p style="font-size: 1.2em; font-weight: bold; margin-bottom: 10px;">TOTAL DES POINTS: ${totalPoints}</p>`;
    
    // Insertion des badges d'écart
    html += gapsHtml;

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
    html += `<button onclick="init()">Retour au Classement Général</button>`;
    container.innerHTML = html;
}

async function showCoureurDetails(nom, saisonKey, allRawResults) {
    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p>Chargement des résultats pour ${nom}...</p>`;
    }
    const rawResults = await allRawResults;
    const filteredDetails = rawResults.filter(course => 
        course.Nom && course.Nom.toString().trim() === nom.toString().trim()
    );
    renderCoureurDetails(filteredDetails); 
}


// --- 5. Logique Club ---

function renderClubDetails(members, clubNom) {
    const container = document.getElementById('classement-container');
    if (!container) return;
    
    // --- 1. Tri (Ordre personnalisé + Points) ---
    const categoryOrder = [
        "OPEN", "Access 1/2", "Access 3/4", "Femmes", "U17", "U15", "U15/U17 Filles", "U15U17F"
    ];

    const getCategoryRank = (catName) => {
        const index = categoryOrder.indexOf(catName);
        return index === -1 ? 999 : index;
    };

    members.sort((a, b) => {
        const rankA = getCategoryRank(a.Catégorie);
        const rankB = getCategoryRank(b.Catégorie);
        
        if (rankA !== rankB) return rankA - rankB;
        
        const pointsA = parseInt(a["Points Total"]) || 0; 
        const pointsB = parseInt(b["Points Total"]) || 0; 
        return pointsB - pointsA; 
    });
    
    // --- 2. Calculs des Totaux et des Effectifs par Catégorie ---
    let totalClubPoints = 0;
    let categoryCounts = {}; // Objet pour stocker le nombre de coureurs par catégorie

    members.forEach(member => {
        // Calcul Points
        totalClubPoints += parseInt(member["Points Total"]) || 0;
        
        // Calcul Effectifs par catégorie
        const cat = member.Catégorie;
        if (categoryCounts[cat]) {
            categoryCounts[cat]++;
        } else {
            categoryCounts[cat] = 1;
        }
    });

    // --- 3. Affichage ---
    let html = `<h3 style="color:var(--color-lagon);">Classement du Club : ${clubNom}</h3>`;
    
    // Affichage des deux totaux globaux
    html += `<p style="font-size: 1.1em; margin-bottom: 20px;">
                <strong>Points Total :</strong> ${totalClubPoints} <span style="margin: 0 10px;">|</span> 
                <strong>Nombre de Coureurs :</strong> ${members.length}
             </p>`;
    
    let currentCategory = '';
    
    // Ouverture du tableau unique
    html += '<table class="details-table club-table">';
    html += '<thead><tr><th>Nom</th><th>Points Total</th></tr></thead><tbody>';
    
    members.forEach(member => {
        const points = parseInt(member["Points Total"]) || 0;
        
        // Changement de Catégorie
        if (member.Catégorie !== currentCategory) {
            currentCategory = member.Catégorie;
            
            // Récupération du nombre de coureurs pour cette catégorie spécifique
            const countInCat = categoryCounts[currentCategory] || 0;
            
            // Ligne de séparation avec le Nom de la catégorie ET le Nombre de coureurs
            html += `<tr class="category-separator">
                        <td colspan="2">
                            ${currentCategory} <span style="font-size:0.8em; font-weight:normal;">(${countInCat} coureurs)</span>
                        </td>
                     </tr>`;
        }
        
        html += `<tr>
                    <td>${member.Nom}</td> 
                    <td><strong>${points}</strong></td>
                 </tr>`;
    });
    
    html += '</tbody></table>'; 
    html += `<button onclick="init()">Retour au Classement Général</button>`;

    container.innerHTML = html;
}

async function showClubClassement(clubNom, saisonKey) {
    const saisonConfig = SAISONS_CONFIG[saisonKey];
    const sheetdbApiId = saisonConfig.apiId;
    
    const encodedClub = encodeURIComponent(clubNom);
    const searchUrl = `${WORKER_BASE_URL}search?Club=${encodedClub}&sheet=Coureurs&saison=${saisonKey}`;

    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p>Chargement du classement pour le club ${clubNom}...</p>`;
    }
    
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}.`);
        }
        const data = await response.json();
        
        // CORRECTION CRITIQUE : Filtrer les données reçues pour ne garder que le club concerné
        // et éliminer les lignes vides éventuelles.
        const filteredMembers = data.filter(member => 
            member.Club && member.Club.trim() === clubNom.trim()
        );

        renderClubDetails(filteredMembers, clubNom); 

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
    
    document.querySelectorAll('#nav-masters .master-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    let filteredData = globalClassementData;
    if (selectedMaster !== 'all') {
        filteredData = globalClassementData.filter(coureur => {
            return coureur.Master === selectedMaster; 
        });
    }
    renderTable(filteredData);
}

// --- 7. Fonction Principale ---

async function init() {
    const container = document.getElementById('classement-container');
    let currentSaison = getSaisonFromURL(); 
    const currentCategoryKey = getCategoryFromURL();
    
    if (!SAISONS_CONFIG[currentSaison]) {
        currentSaison = DEFAULT_SAISON; 
    }
    const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey); 
    const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
    
    document.title = `Classement ${categoryName} - Route ${currentSaison}`; 
    createNavBar(currentSaison, currentCategoryKey);
    
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "Coupe de la Réunion Route"; 
    const categoryTitleElement = document.getElementById('category-title');
    if (categoryTitleElement) {
        categoryTitleElement.textContent = ""; 
    }
    
    if (jsonUrl) {
        if (container) {
            container.innerHTML = `<p>Chargement des données de ${currentSaison}...</p>`;
        }
        const rawData = await fetchClassementData(jsonUrl); 
        globalClassementData = rawData;
        const rawResultsPromise = loadAllRawResults(currentSaison);
        
        const mastersContainer = document.getElementById('nav-masters');
        if (mastersContainer) {
            mastersContainer.addEventListener('click', handleMasterFilterChange);
        }
        
        const classementContainer = document.getElementById('classement-container');
        if (classementContainer) {
            classementContainer.addEventListener('click', async (e) => {
                const link = e.target.closest('.coureur-link');
                if (link) {
                    e.preventDefault();
                    const nom = link.getAttribute('data-nom'); 
                    const currentSaison = getSaisonFromURL(); 
                    showCoureurDetails(nom, currentSaison, await rawResultsPromise); 
                }
            });
            
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
            container.innerHTML = `<p style="color: red;">Configuration des données manquante.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', init);




