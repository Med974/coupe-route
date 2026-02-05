// =======================================================================
// FICHIER : app.js (v68 - Stable v45 + Calendrier Complet)
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
let globalRawData = {}; // Stocke les résultats bruts par saison

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

// Convertit "23/03/2026" en objet Date JS
function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
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
        if (!response.ok) throw new Error(`Worker/API: ${response.status}`);
        const data = await response.json();
        globalRawData[saisonKey] = data; 
        return data;
    } catch (e) {
        console.error("Erreur critique lors du chargement des résultats bruts:", e);
        return [];
    }
}

// --- GESTION CALENDRIER ---

async function loadCalendar(saisonKey) {
    const container = document.getElementById('calendrier-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Chargement du calendrier...</p>';
    
    // On interroge l'onglet 'Calendrier' via le Worker
    const url = `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=Calendrier`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Impossible de charger le calendrier");
        const races = await response.json();
        renderCalendar(races);
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Calendrier non disponible pour cette saison.</p>`;
    }
}

function renderCalendar(races) {
    const container = document.getElementById('calendrier-container');
    
    if (!races || races.length === 0 || races[0].error) {
        container.innerHTML = '<p style="text-align:center;">Aucune course trouvée pour cette saison.</p>';
        return;
    }

    // Tri chronologique
    races.sort((a, b) => {
        const dateA = parseFrenchDate(a.Date);
        const dateB = parseFrenchDate(b.Date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    let html = '<div class="calendar-list">';
    
    const today = new Date();
    today.setHours(0,0,0,0); // Comparer dates sans heure
    
    let nextRaceFound = false;

    races.forEach(race => {
        const raceDate = parseFrenchDate(race.Date);
        let cardClass = 'race-card';
        let badgeHtml = '';
        let countdownHtml = '';
        let dateDisplay = { day: '??', month: '???' };

        if (raceDate) {
            // Formatage date
            const day = String(raceDate.getDate()).padStart(2, '0');
            const month = raceDate.toLocaleString('fr-FR', { month: 'short' }).replace('.', '');
            dateDisplay = { day, month };

            // Logique Passé / Futur
            if (raceDate < today) {
                cardClass += ' past';
                countdownHtml = '<span class="countdown-tag" style="border-color:#555; color:#666;">TERMINÉ</span>';
            } else {
                // Calcul J-X
                const diffTime = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));
                
                if (!nextRaceFound) {
                    // C'est la PROCHAINE course
                    cardClass += ' next-race';
                    nextRaceFound = true;
                    badgeHtml = '<div class="next-badge">PROCHAINE COURSE</div>';
                    
                    if (diffTime === 0) countdownHtml = '<span class="countdown-tag pulse">AUJOURD\'HUI !</span>';
                    else if (diffTime === 1) countdownHtml = '<span class="countdown-tag pulse">DEMAIN !</span>';
                    else countdownHtml = `<span class="countdown-tag pulse">J-${diffTime}</span>`;
                } else {
                    // Course future
                    countdownHtml = `<span class="countdown-tag">Dans ${diffTime} jours</span>`;
                }
            }
        }
        
        // Construction HTML de la carte
        html += `
            <div class="${cardClass}">
                ${badgeHtml}
                <div class="race-date">
                    <span class="race-day">${dateDisplay.day}</span>
                    <span class="race-month">${dateDisplay.month}</span>
                </div>
                <div class="race-info">
                    <h4>${race.Nom}</h4>
                    <div style="margin-top:5px;">
                        ${countdownHtml}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// --- GESTION VIDÉOS ---

async function loadVideos(saisonKey) {
    const container = document.getElementById('videos-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Chargement des vidéos...</p>';
    
    const url = `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=Videos`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Impossible de charger les vidéos");
        const videos = await response.json();
        renderVideos(videos);
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Erreur : ${error.message}</p>`;
    }
}

function renderVideos(videos) {
    const container = document.getElementById('videos-container');
    
    if (!videos || videos.length === 0 || videos[0].error) {
        container.innerHTML = '<p style="text-align:center;">Aucune vidéo disponible pour le moment.</p>';
        return;
    }

    let html = '<div class="videos-grid">';
    videos.forEach(video => {
        if (video.YoutubeID) {
            html += `
                <div class="video-card">
                    <div class="video-wrapper">
                        <iframe src="https://www.youtube.com/embed/${video.YoutubeID}" 
                                title="${video.Titre}" frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                    </div>
                    <div class="video-info">
                        <h4>${video.Titre || 'Course'}</h4>
                        <p>${video.Date || ''}</p>
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';
    container.innerHTML = html;
}

// --- NAVIGATION & TABS ---

function initTabs(currentSaison) {
    const btnClassement = document.getElementById('btn-tab-classement');
    const btnCalendrier = document.getElementById('btn-tab-calendrier');
    const btnVideos = document.getElementById('btn-tab-videos');
    
    const viewClassement = document.getElementById('classement-container');
    const viewCalendrier = document.getElementById('calendrier-container');
    const viewVideos = document.getElementById('videos-container');
    
    // Conteneurs à masquer/afficher selon l'onglet
    const filtersContainer = document.getElementById('filters-container'); // Contient Saisons + Catégories
    const navCategories = document.getElementById('nav-categories');
    const navMasters = document.getElementById('nav-masters');
    const searchContainer = document.querySelector('.search-container');
    const categoryTitle = document.getElementById('category-title');

    const tabs = [btnClassement, btnCalendrier, btnVideos];
    const views = [viewClassement, viewCalendrier, viewVideos];

    // Fonction de bascule d'onglet
    function switchTab(targetBtn, targetView, mode) {
        tabs.forEach(btn => btn && btn.classList.remove('active'));
        views.forEach(view => view && (view.style.display = 'none'));

        if(targetBtn) targetBtn.classList.add('active');
        if(targetView) targetView.style.display = 'block';

        // GESTION AFFICHAGE DES FILTRES
        if (mode === 'classement') {
            // Onglet Classement : On affiche tout
            if(navCategories) navCategories.style.display = 'block';
            if(navMasters) navMasters.style.display = 'block';
            if(searchContainer) searchContainer.style.display = 'flex';
            if(categoryTitle) categoryTitle.style.display = 'block';
        } else {
            // Onglet Calendrier ou Vidéos : On garde SEULEMENT les Saisons
            if(navCategories) navCategories.style.display = 'none';
            if(navMasters) navMasters.style.display = 'none';
            if(searchContainer) searchContainer.style.display = 'none';
            if(categoryTitle) categoryTitle.style.display = 'none';
        }
    }

    if (btnClassement) {
        btnClassement.addEventListener('click', () => switchTab(btnClassement, viewClassement, 'classement'));
    }

    if (btnCalendrier) {
        btnCalendrier.addEventListener('click', () => {
            switchTab(btnCalendrier, viewCalendrier, 'calendrier');
            // Charge le calendrier pour la saison active (bouton saison actif)
            const activeSaisonBtn = document.querySelector('.season-link.active');
            const activeSaison = activeSaisonBtn ? activeSaisonBtn.getAttribute('data-saison') : getSaisonFromURL();
            loadCalendar(activeSaison);
        });
    }

    if (btnVideos) {
        btnVideos.addEventListener('click', () => {
            switchTab(btnVideos, viewVideos, 'videos');
            const activeSaisonBtn = document.querySelector('.season-link.active');
            const activeSaison = activeSaisonBtn ? activeSaisonBtn.getAttribute('data-saison') : getSaisonFromURL();
            loadVideos(activeSaison);
        });
    }
}

function createNavBar(currentSaison, currentCategory) {
    const seasonsContainer = document.getElementById('nav-seasons');
    const categoriesContainer = document.getElementById('nav-categories');
    const mastersContainer = document.getElementById('nav-masters');

    // 1. Navigation Saisons (MODIFIÉ : data-saison au lieu de href pour gestion JS)
    let seasonsHtml = '';
    Object.keys(SAISONS_CONFIG).forEach(saisonKey => {
        const saison = SAISONS_CONFIG[saisonKey];
        const isActive = saisonKey === currentSaison ? 'active' : '';
        seasonsHtml += `<a href="#" class="season-link ${isActive}" data-saison="${saisonKey}">${saison.name}</a>`;
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

// --- 3. Fonctions de Données et Rendu ---

async function fetchClassementData(url) {
    const container = document.getElementById('classement-container');
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le Worker Cloudflare.`);
        }
        const data = await response.json(); 
        if (data && data.error) throw new Error(`Erreur API: ${data.error}`);
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
        const displayHeader = header.replace('PointsTotal', 'Total Pts')
                                    .replace('NbCourses', 'Nb Courses')
                                    .replace('SousCategorie', 'Sous Catégorie')
                                    .replace('Master', 'Catégorie Master');
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

    let totalPoints = 0;
    details.forEach(course => {
        const points = parseFloat(String(course.Points).replace(/[^\d.]/g, '')) || 0; 
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
    html += `<button onclick="init()">Retour au Classement Général</button>`;
    container.innerHTML = html;
}

async function showCoureurDetails(nom, saisonKey, allRawResults) {
    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p>Chargement des résultats pour ${nom}...</p>`;
    }
    
    // V45 STABLE : Filtre côté client
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
    
    // Tri
    members.sort((a, b) => {
        if (a.Catégorie < b.Catégorie) return -1;
        if (a.Catégorie > b.Catégorie) return 1;
        // Points : on utilise parseInt (entiers)
        const pointsA = parseInt(a["Points Total"]) || 0;
        const pointsB = parseInt(b["Points Total"]) || 0;
        return pointsB - pointsA; 
    });
    
    let html = `<h3 style="color:var(--color-lagon);">Classement du Club : ${clubNom}</h3>`;
    
    // Calcul Total Club
    let totalClubPoints = 0;
    members.forEach(member => {
        totalClubPoints += parseInt(member["Points Total"]) || 0;
    });

    html += `<p style="font-size: 1.2em; margin-bottom: 20px;">Total des Points du Club: ${totalClubPoints}</p>`;
    
    // Regroupement
    let currentCategory = '';
    html += '<div class="club-details-list">'; 
    
    members.forEach(member => {
        const points = parseInt(member["Points Total"]) || 0;
        
        if (member.Catégorie !== currentCategory) {
            if (currentCategory !== '') {
                html += '</tbody></table>'; 
            }
            currentCategory = member.Catégorie;
            html += `<h4 class="category-group-title" style="margin-top:20px;">${currentCategory}</h4>`; 
            html += '<table class="details-table club-category-table">';
            html += '<thead><tr><th>Nom</th><th>Points Total</th></tr></thead><tbody>';
        }
        
        html += `<tr>
                    <td>${member.Nom}</td> 
                    <td><strong>${points}</strong></td>
                 </tr>`;
    });
    
    if (members.length > 0) {
        html += '</tbody></table>'; 
    }
    html += '</div>';

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
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}.`);
        const data = await response.json();
        
        // Filtre client de sécurité
        const filteredMembers = data.filter(member => member.Club && member.Club.trim() === clubNom.trim());
        renderClubDetails(filteredMembers, clubNom); 

    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur récupération club : ${error.message}</p>`;
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

// --- 7. Fonction Principale (Init) ---

async function init() {
    const container = document.getElementById('classement-container');
    
    // Variables d'état
    let currentSaison = getSaisonFromURL(); 
    let currentCategoryKey = getCategoryFromURL();
    
    if (!SAISONS_CONFIG[currentSaison]) {
        currentSaison = DEFAULT_SAISON; 
    }

    // --- LOGIQUE DE RAFRAICHISSEMENT DE CONTENU (Sans rechargement de page) ---
    const refreshContent = async () => {
        // Mettre à jour titre et nav
        const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
        document.title = `Classement ${categoryName} - Route ${currentSaison}`; 
        
        createNavBar(currentSaison, currentCategoryKey);
        attachSeasonListeners(); // Réattacher les clics sur les nouveaux boutons

        // Déterminer l'onglet actif pour savoir quoi charger
        const btnCalendrier = document.getElementById('btn-tab-calendrier');
        const btnVideos = document.getElementById('btn-tab-videos');
        
        if (btnCalendrier && btnCalendrier.classList.contains('active')) {
            loadCalendar(currentSaison);
        } else if (btnVideos && btnVideos.classList.contains('active')) {
            loadVideos(currentSaison);
        } else {
            // Onglet Classement
            const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey);
            if (jsonUrl) {
                container.innerHTML = `<p style="text-align:center; padding:20px;">Chargement ${currentSaison}...</p>`;
                const rawData = await fetchClassementData(jsonUrl); 
                globalClassementData = rawData;
                renderTable(rawData);
                // On recharge aussi les données brutes pour le détail coureur
                loadAllRawResults(currentSaison);
            }
        }
    };

    // Gestion des clics Saisons
    const attachSeasonListeners = () => {
        const seasonLinks = document.querySelectorAll('.season-link');
        seasonLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); 
                const newSaison = link.getAttribute('data-saison');
                if (newSaison !== currentSaison) {
                    currentSaison = newSaison;
                    refreshContent(); 
                }
            });
        });
    };

    // --- DÉMARRAGE ---
    const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey); 
    const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
    
    document.title = `Classement ${categoryName} - Route ${currentSaison}`; 
    createNavBar(currentSaison, currentCategoryKey);
    attachSeasonListeners();
    initTabs(currentSaison); // Gestion des onglets principaux

    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "Coupe de la Réunion Route"; 
    const categoryTitleElement = document.getElementById('category-title');
    if (categoryTitleElement) categoryTitleElement.textContent = ""; 
    
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
            // Clic Coureur
            classementContainer.addEventListener('click', async (e) => {
                const link = e.target.closest('.coureur-link');
                if (link) {
                    e.preventDefault();
                    const nom = link.getAttribute('data-nom'); 
                    
                    classementContainer.innerHTML = `<p style="text-align:center; padding:20px;">Chargement du détail pour ${nom}...</p>`;
                    const results = await loadAllRawResults(currentSaison);
                    showCoureurDetails(nom, currentSaison, results); 
                }
            });
            
            // Clic Club
            classementContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.club-link');
                if (link) {
                    e.preventDefault();
                    const clubNom = link.getAttribute('data-club'); 
                    // showClubClassement utilisera la saison courante (mise à jour par refreshContent)
                    showClubClassement(clubNom, currentSaison);
                }
            });
            
            // Gestion Recherche Globale
            const searchBtn = document.getElementById('global-search-btn');
            const searchInput = document.getElementById('global-search-input');
            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', performGlobalSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') performGlobalSearch();
                });
            }
        }
        
        renderTable(rawData);
    } else {
        if (container) {
            container.innerHTML = `<p style="color: red;">Configuration des données manquante.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
