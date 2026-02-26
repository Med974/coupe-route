// =======================================================================
// FICHIER : app.js (v75 - FINAL : Navigation avec onglet Règlement)
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
        console.error("Erreur chargement résultats bruts:", e);
        return [];
    }
}

// --- RECHERCHE GLOBALE ---

async function performGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const query = input.value.trim().toLowerCase();
    
    if (query.length < 2) return; 

    const container = document.getElementById('classement-container');
    container.innerHTML = '<p style="text-align:center; padding:20px; color:#fff;">Recherche en cours...</p>';

    const btnClassement = document.getElementById('btn-tab-classement');
    if(btnClassement && !btnClassement.classList.contains('active')) btnClassement.click();

    const activeSaisonBtn = document.querySelector('.season-link.active');
    const currentSaison = activeSaisonBtn ? activeSaisonBtn.getAttribute('data-saison') : getSaisonFromURL();

    const rawResults = await loadAllRawResults(currentSaison);

    const matches = [];
    const seen = new Set();

    if (rawResults && rawResults.length > 0) {
         rawResults.forEach(row => {
            if (row.Nom && row.Nom.toLowerCase().includes(query)) {
                if (!seen.has(row.Nom)) {
                    seen.add(row.Nom);
                    matches.push(row);
                }
            }
        });
    }

    if (matches.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#fff;">Aucun coureur trouvé pour "${input.value}" en ${currentSaison}.</p><button onclick="window.location.reload()">Retour</button>`;
    } else if (matches.length === 1) {
        const exactMatch = rawResults.filter(r => r.Nom === matches[0].Nom);
        renderCoureurDetails(exactMatch);
    } else {
        renderSearchResults(matches);
    }
}

function renderSearchResults(matches) {
    const container = document.getElementById('classement-container');
    let html = `<h3 style="color:var(--color-lagon); margin-bottom:20px;">Résultats de recherche (${matches.length})</h3>`;
    
    html += '<table class="classement-table search-results-table">';
    html += '<thead><tr><th>Nom</th><th>Catégorie</th><th>Club</th></tr></thead><tbody>';
    
    matches.forEach(m => {
        html += `<tr>
                    <td><a href="#" class="coureur-link" data-nom="${m.Nom}">${m.Nom}</a></td>
                    <td>${m.Catégorie || '-'}</td>
                    <td>${m.Club || '-'}</td>
                 </tr>`;
    });
    
    html += '</tbody></table>';
    html += `<button onclick="window.location.reload()">Retour</button>`;
    container.innerHTML = html;
}

// --- GESTION CALENDRIER ---

async function loadCalendar(saisonKey) {
    const container = document.getElementById('calendrier-container');
    container.innerHTML = '<p style="text-align:center; padding:20px; color:#fff;">Chargement du calendrier...</p>';
    
    const url = `${WORKER_BASE_URL}?saison=${saisonKey}&sheet=Calendrier`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Impossible de charger le calendrier");
        const races = await response.json();
        renderCalendar(races);
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Calendrier non disponible pour le moment.</p>`;
    }
}

function renderCalendar(races) {
    const container = document.getElementById('calendrier-container');
    
    if (!races || races.length === 0 || races[0].error) {
        container.innerHTML = '<p style="text-align:center; color:#fff;">Aucune course trouvée pour cette saison.</p>';
        return;
    }

    races.sort((a, b) => {
        const dateA = parseFrenchDate(a.Date);
        const dateB = parseFrenchDate(b.Date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    let html = '<div class="calendar-list">';
    const today = new Date();
    today.setHours(0,0,0,0);
    let nextRaceFound = false;

    races.forEach(race => {
        const raceDate = parseFrenchDate(race.Date);
        let cardClass = 'race-card';
        let badgeHtml = '';
        let countdownHtml = '';
        let dateDisplay = { day: '??', month: '???' };

        if (raceDate) {
            const day = String(raceDate.getDate()).padStart(2, '0');
            const month = raceDate.toLocaleString('fr-FR', { month: 'short' }).replace('.', '');
            dateDisplay = { day, month };

            if (raceDate < today) {
                cardClass += ' past';
                countdownHtml = '<span class="countdown-tag" style="border-color:#555; color:#666;">TERMINÉ</span>';
            } else {
                const diffTime = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));
                if (!nextRaceFound) {
                    cardClass += ' next-race';
                    nextRaceFound = true;
                    badgeHtml = '<div class="next-badge">PROCHAINE COURSE</div>';
                    if (diffTime === 0) countdownHtml = '<span class="countdown-tag pulse">AUJOURD\'HUI !</span>';
                    else if (diffTime === 1) countdownHtml = '<span class="countdown-tag pulse">DEMAIN !</span>';
                    else countdownHtml = `<span class="countdown-tag pulse">J-${diffTime}</span>`;
                } else {
                    countdownHtml = `<span class="countdown-tag">Dans ${diffTime} jours</span>`;
                }
            }
        }
        
        html += `
            <div class="${cardClass}">
                ${badgeHtml}
                <div class="race-date">
                    <span class="race-day">${dateDisplay.day}</span>
                    <span class="race-month">${dateDisplay.month}</span>
                </div>
                <div class="race-info">
                    <h4>${race.Nom}</h4>
                    <div style="margin-top:5px;">${countdownHtml}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// --- NAVIGATION & TABS ---

function initTabs(currentSaison) {
    const btnClassement = document.getElementById('btn-tab-classement');
    const btnCalendrier = document.getElementById('btn-tab-calendrier');
    const btnReglement = document.getElementById('btn-tab-reglement');
    
    const viewClassement = document.getElementById('classement-container');
    const viewCalendrier = document.getElementById('calendrier-container');
    const viewReglement = document.getElementById('reglement-container');
    
    const filtersContainer = document.getElementById('filters-container');
    const navCategories = document.getElementById('nav-categories');
    const navMasters = document.getElementById('nav-masters');
    const searchContainer = document.querySelector('.search-container');
    const categoryTitle = document.getElementById('category-title');

    const tabs = [btnClassement, btnCalendrier, btnReglement];
    const views = [viewClassement, viewCalendrier, viewReglement];

    function switchTab(targetBtn, targetView, mode) {
        tabs.forEach(btn => btn && btn.classList.remove('active'));
        views.forEach(view => view && (view.style.display = 'none'));

        if(targetBtn) targetBtn.classList.add('active');
        if(targetView) targetView.style.display = 'block';

        if(filtersContainer) filtersContainer.style.display = 'block';

        if (mode === 'classement') {
            if(navCategories) navCategories.style.display = 'block';
            if(navMasters) navMasters.style.display = 'block';
            if(searchContainer) searchContainer.style.display = 'flex';
            if(categoryTitle) categoryTitle.style.display = 'block';
        } else if (mode === 'calendrier') {
            if(navCategories) navCategories.style.display = 'none';
            if(navMasters) navMasters.style.display = 'none';
            if(searchContainer) searchContainer.style.display = 'none';
            if(categoryTitle) categoryTitle.style.display = 'none';
        } else if (mode === 'reglement') {
            if(filtersContainer) filtersContainer.style.display = 'none';
            if(searchContainer) searchContainer.style.display = 'none';
            if(categoryTitle) categoryTitle.style.display = 'none';
        }
    }

    if (btnClassement) btnClassement.addEventListener('click', () => switchTab(btnClassement, viewClassement, 'classement'));
    
    if (btnCalendrier) {
        btnCalendrier.addEventListener('click', () => {
            switchTab(btnCalendrier, viewCalendrier, 'calendrier');
            const activeSaisonBtn = document.querySelector('.season-link.active');
            const activeSaison = activeSaisonBtn ? activeSaisonBtn.getAttribute('data-saison') : getSaisonFromURL();
            loadCalendar(activeSaison);
        });
    }

    if (btnReglement) {
        btnReglement.addEventListener('click', () => switchTab(btnReglement, viewReglement, 'reglement'));
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
        const displayHeader = header.replace('PointsTotal', 'Points')
                                    .replace('Points Total', 'Points')
                                    .replace('NbCourses', 'Nb Courses')
                                    .replace('SousCategorie', 'Catégorie')
                                    .replace('Master', 'Cat. Master')
                                    .replace('Classement', 'Pos.');
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

    // --- CALCUL INTELLIGENT DU JOKER ---
    
    // 1. Récupérer les données de la saison pour savoir combien il y a eu de courses AU TOTAL
    const currentSaisonBtn = document.querySelector('.season-link.active');
    const currentSaison = currentSaisonBtn ? currentSaisonBtn.getAttribute('data-saison') : getSaisonFromURL();
    const allResults = globalRawData[currentSaison] || [];
    
    const allUniqueRaces = new Set(allResults.map(r => r.Course).filter(c => c && c.trim() !== ""));
    const totalRacesInSeason = allUniqueRaces.size || 1; 

    // 2. Compter le nombre de courses du coureur
    const runnerRacesCount = details.length;

    // 3. JOKER ACTIF ? Seulement si participation à TOUTES les courses ET au moins 4 courses dans la saison
    const jokerActive = (runnerRacesCount === totalRacesInSeason) && (totalRacesInSeason >= 4);

    // 4. Calcul des points
    let totalPoints = 0;
    let scores = [];

    details.forEach(course => {
        const points = parseInt(String(course.Points).replace(/[^\d.]/g, '')) || 0; 
        if (!isNaN(points)) {
            scores.push(points);
        }
    });

    const minScore = (scores.length > 0) ? Math.min(...scores) : -1;

    // Somme totale - Min (si joker actif)
    const sumAll = scores.reduce((a, b) => a + b, 0);
    const finalTotal = jokerActive ? (sumAll - minScore) : sumAll;

    
    // --- HTML ---
    let html = `<h3 style="color:var(--color-volcan);">Résultats Détaillés : ${coureurNom} (Dossard ${coureurDossardAffichage})</h3>`;
    html += `<p style="font-size: 1.2em; font-weight: bold; margin-bottom: 20px;">TOTAL DES POINTS: ${finalTotal}</p>`;

    // --- GAP LOGIC (Ecarts) ---
    let gapsHtml = '<div class="gap-container">';
    const getPointsSafe = (row) => {
        const val = row.PointsTotal || row["Points Total"] || "0";
        return parseInt(String(val).replace(/[^\d]/g, '')) || 0;
    };
    const rankIndex = globalClassementData.findIndex(c => c.Nom === coureurNom);
    if (rankIndex !== -1) {
        const currentPoints = getPointsSafe(globalClassementData[rankIndex]);
        if (rankIndex > 0) {
            const runnerAhead = globalClassementData[rankIndex - 1];
            const pointsAhead = getPointsSafe(runnerAhead);
            const diff = pointsAhead - currentPoints;
            gapsHtml += `<div class="gap-card chase"><strong>🛑 Retard : -${diff} pts</strong><span class="gap-name">sur ${runnerAhead.Nom} (#${runnerAhead.Classement})</span></div>`;
        } else {
             gapsHtml += `<div class="gap-card lead"><strong>👑 Leader du classement</strong></div>`;
        }
        if (rankIndex < globalClassementData.length - 1) {
            const runnerBehind = globalClassementData[rankIndex + 1];
            const pointsBehind = getPointsSafe(runnerBehind);
            const diff = currentPoints - pointsBehind;
            gapsHtml += `<div class="gap-card lead"><strong>✅ Avance : +${diff} pts</strong><span class="gap-name">sur ${runnerBehind.Nom} (#${runnerBehind.Classement})</span></div>`;
        }
    }
    gapsHtml += '</div>';
    
    // --- CAMEMBERT ---
    const participationPercent = Math.round((runnerRacesCount / totalRacesInSeason) * 100);
    const chartDegree = Math.round((participationPercent * 360) / 100);
    
    const chartHtml = `
        <div class="stats-container">
            <div class="participation-chart" style="background: conic-gradient(var(--color-lagon) ${chartDegree}deg, #444 0deg);">
                <span class="chart-text">${participationPercent}%</span>
            </div>
            <div class="stats-info">
                <h4>PARTICIPATION</h4>
                <div class="big-number">${runnerRacesCount} / ${totalRacesInSeason}</div>
                <div style="font-size:0.8em; color:#888;">Courses courues</div>
            </div>
        </div>
    `;
    
    html += chartHtml;
    html += gapsHtml;

    html += '<table class="details-table">';
    html += '<thead><tr><th>Date</th><th>Course</th><th>Pos.</th><th>Catégorie</th><th>Points</th></tr></thead><tbody>';
    
    let jokerMarked = false; 

    details.forEach(course => {
        const points = parseInt(String(course.Points).replace(/[^\d]/g, '')) || 0;
        let rowClass = "";
        let jokerBadge = "";

        // Application visuelle du Joker
        if (jokerActive && points === minScore && !jokerMarked) {
            rowClass = "worst-performance";
            jokerBadge = `<span class="joker-badge">Joker</span>`;
            jokerMarked = true;
        }

        html += `<tr class="${rowClass}">
                    <td>${course.Date}</td> 
                    <td>${course.Course}</td> 
                    <td>${course.Position}</td>
                    <td>${course.Catégorie}</td>
                    <td><strong>${course.Points}</strong>${jokerBadge}</td>
                 </tr>`;
    });
    html += '</tbody></table>';
    html += `<button onclick="init()">Retour au Classement Général</button>`;
    container.innerHTML = html;
}

async function showCoureurDetails(nom, saisonKey, allRawResults) {
    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p style="color:#fff;">Chargement des résultats pour ${nom}...</p>`;
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
    
    const categoryOrder = ["OPEN", "Access 1/2", "Access 3/4", "Femmes", "U17", "U15", "U15/U17 Filles", "U15U17F"];
    const getCategoryRank = (catName) => { const index = categoryOrder.indexOf(catName); return index === -1 ? 999 : index; };

    members.sort((a, b) => {
        const rankA = getCategoryRank(a.Catégorie);
        const rankB = getCategoryRank(b.Catégorie);
        if (rankA !== rankB) return rankA - rankB;
        
        const valA = a["Points Total"] || a.PointsTotal || "0";
        const valB = b["Points Total"] || b.PointsTotal || "0";
        const pointsA = parseInt(String(valA).replace(/[^\d]/g, '')) || 0;
        const pointsB = parseInt(String(valB).replace(/[^\d]/g, '')) || 0;
        
        return pointsB - pointsA; 
    });
    
    let html = `<h3 style="color:var(--color-lagon);">Classement du Club : ${clubNom}</h3>`;
    
    let totalClubPoints = 0;
    members.forEach(member => {
        const rawPoints = member["Points Total"] || member.PointsTotal || "0";
        totalClubPoints += parseInt(String(rawPoints).replace(/[^\d]/g, '')) || 0;
    });

    html += `<p style="font-size: 1.1em; margin-bottom: 20px; color:#fff;"><strong>Points Total :</strong> ${totalClubPoints} <span style="margin: 0 10px;">|</span> <strong>Nombre de Coureurs :</strong> ${members.length}</p>`;
    
    let currentCategory = '';
    html += '<table class="details-table club-table">';
    html += '<thead><tr><th>Nom</th><th>Points</th></tr></thead><tbody>';
    
    members.forEach(member => {
        const rawPoints = member["Points Total"] || member.PointsTotal || "0";
        const points = parseInt(String(rawPoints).replace(/[^\d]/g, '')) || 0;
        
        if (member.Catégorie !== currentCategory) {
            currentCategory = member.Catégorie;
            html += `<tr class="category-separator"><td colspan="2">${currentCategory}</td></tr>`;
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
    const encodedClub = encodeURIComponent(clubNom);
    const searchUrl = `${WORKER_BASE_URL}search?Club=${encodedClub}&sheet=Coureurs&saison=${saisonKey}`;

    const container = document.getElementById('classement-container');
    if (container) {
        container.innerHTML = `<p style="color:#fff;">Chargement du classement pour le club ${clubNom}...</p>`;
    }
    
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}.`);
        const data = await response.json();
        
        const filteredMembers = data.filter(member => member.Club && member.Club.trim() === clubNom.trim());
        renderClubDetails(filteredMembers, clubNom); 
    } catch (error) {
        if (container) {
            container.innerHTML = `<p style="color: red;">Erreur lors de la récupération des membres du club.</p>`;
        }
    }
}

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
    let currentCategoryKey = getCategoryFromURL();
    
    if (!SAISONS_CONFIG[currentSaison]) {
        currentSaison = DEFAULT_SAISON; 
    }

    const refreshContent = async () => {
        const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
        document.title = `Classement ${categoryName} - Route ${currentSaison}`; 
        
        createNavBar(currentSaison, currentCategoryKey);
        attachSeasonListeners();

        const btnCalendrier = document.getElementById('btn-tab-calendrier');

        if (btnCalendrier && btnCalendrier.classList.contains('active')) {
            loadCalendar(currentSaison);
        } else {
            const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey);
            const seasonParagraph = document.querySelector('header p');
            if(seasonParagraph) seasonParagraph.textContent = `Saison ${currentSaison}`;
            
            if (jsonUrl) {
                container.innerHTML = `<p style="text-align:center; padding:20px; color:#fff;">Chargement ${currentSaison}...</p>`;
                const rawData = await fetchClassementData(jsonUrl); 
                globalClassementData = rawData;
                renderTable(rawData);
                
                globalRawData = {}; 
                loadAllRawResults(currentSaison);
            }
        }
    };

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

    const jsonUrl = buildJsonUrl(currentSaison, currentCategoryKey); 
    const categoryName = SAISONS_CONFIG[currentSaison]?.categories[currentCategoryKey]?.name || currentCategoryKey.toUpperCase();
    
    document.title = `Classement ${categoryName} - Route ${currentSaison}`; 
    createNavBar(currentSaison, currentCategoryKey);
    attachSeasonListeners();
    initTabs(currentSaison); 
    
    const searchBtn = document.getElementById('global-search-btn');
    const searchInput = document.getElementById('global-search-input');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performGlobalSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performGlobalSearch();
        });
    }

    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "Coupe de la Réunion Route"; 
    const categoryTitleElement = document.getElementById('category-title');
    if (categoryTitleElement) categoryTitleElement.textContent = ""; 
    
    if (jsonUrl) {
        if (container) {
            container.innerHTML = `<p style="color:#fff;">Chargement des données de ${currentSaison}...</p>`;
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
                    
                    classementContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#fff;">Chargement du détail pour ${nom}...</p>`;
                    
                    const results = await loadAllRawResults(currentSaison);
                    showCoureurDetails(nom, currentSaison, results); 
                }
            });
            
            classementContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.club-link');
                if (link) {
                    e.preventDefault();
                    const clubNom = link.getAttribute('data-club'); 
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
