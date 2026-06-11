/* ── Flags ──────────────────────────────────────────────────────── */
const FLAGS = {
  'Ägypten':'🇪🇬','Algerien':'🇩🇿','Argentinien':'🇦🇷','Australien':'🇦🇺',
  'Belgien':'🇧🇪','Bosnien-Herzegowina':'🇧🇦','Brasilien':'🇧🇷',
  'Curaçao':'🇨🇼','DR Kongo':'🇨🇩','Deutschland':'🇩🇪',
  'Ecuador':'🇪🇨','Elfenbeinküste':'🇨🇮','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Frankreich':'🇫🇷','Ghana':'🇬🇭','Haiti':'🇭🇹','Irak':'🇮🇶','Iran':'🇮🇷',
  'Japan':'🇯🇵','Jordanien':'🇯🇴','Kanada':'🇨🇦','Kap Verde':'🇨🇻',
  'Katar':'🇶🇦','Kolumbien':'🇨🇴','Kroatien':'🇭🇷','Marokko':'🇲🇦',
  'Mexiko':'🇲🇽','Neuseeland':'🇳🇿','Niederlande':'🇳🇱','Norwegen':'🇳🇴',
  'Panama':'🇵🇦','Paraguay':'🇵🇾','Portugal':'🇵🇹','Saudi-Arabien':'🇸🇦',
  'Schottland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Schweden':'🇸🇪','Schweiz':'🇨🇭','Senegal':'🇸🇳',
  'Spanien':'🇪🇸','Südafrika':'🇿🇦','Südkorea':'🇰🇷','Tschechien':'🇨🇿',
  'Tunesien':'🇹🇳','Türkei':'🇹🇷','USA':'🇺🇸','Uruguay':'🇺🇾',
  'Usbekistan':'🇺🇿','Österreich':'🇦🇹',
};
function flagFor(name) { return FLAGS[name] ? FLAGS[name] + ' ' : ''; }

/* ── State ──────────────────────────────────────────────────────── */
let player = null;          // 'david' | 'frank' | 'admin'
let adminPassword = null;
let navItems = [];
let activeTab = null;       // { round, spieltag }
let activeSection = 'spieltage';
let liveScoreInterval = null;

const ROUND_LABELS = {
  gruppe:        null,       // resolved dynamically per spieltag
  r32:           'Runde der letzten 32',
  r16:           'Achtelfinale',
  viertelfinale: 'Viertelfinale',
  halbfinale:    'Halbfinale',
  platz3:        'Spiel um Platz 3',
  finale:        'Finale',
};

/* ── Init ───────────────────────────────────────────────────────── */
async function init() {
  const stored = sessionStorage.getItem('wm_player');
  const storedPw = sessionStorage.getItem('wm_admin_pw');
  if (stored) {
    player = stored;
    adminPassword = storedPw;
    applyPlayer();
    hideModal();
  } else {
    showModal();
  }

  navItems = await api('api/nav');
  renderSpieltageNav();
  await loadScores();
}

/* ── Player Selection ───────────────────────────────────────────── */
function showModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function selectPlayer(p) {
  if (p === 'admin') {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('admin-modal-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('admin-pw-input').focus(), 100);
    return;
  }
  player = p;
  adminPassword = null;
  sessionStorage.setItem('wm_player', p);
  sessionStorage.removeItem('wm_admin_pw');
  delete document.getElementById('regeln-content').dataset.loaded;
  if (activeSection === 'regeln') renderRegeln();
  applyPlayer();
  hideModal();
  if (activeTab) loadMatches(activeTab);
}

async function submitAdminPassword() {
  const pw = document.getElementById('admin-pw-input').value;
  const res = await fetch('api/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_id: 0, home_score: 0, away_score: 0, password: pw }),
  });
  // 401 = wrong, 404 = correct pw (match not found), success = correct
  const data = await res.json();
  if (res.status === 401) {
    document.getElementById('admin-pw-error').classList.remove('hidden');
    return;
  }
  player = 'admin';
  adminPassword = pw;
  sessionStorage.setItem('wm_player', 'admin');
  sessionStorage.setItem('wm_admin_pw', pw);
  delete document.getElementById('regeln-content').dataset.loaded;
  if (activeSection === 'regeln') renderRegeln();
  document.getElementById('admin-modal-overlay').classList.add('hidden');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('admin-pw-error').classList.add('hidden');
  applyPlayer();
  if (activeTab) loadMatches(activeTab);
}

function cancelAdmin() {
  document.getElementById('admin-modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('admin-pw-error').classList.add('hidden');
}

document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitAdminPassword();
});

function applyPlayer() {
  const badge = document.getElementById('player-badge');
  if (player === 'david') badge.textContent = '🟦 David';
  else if (player === 'frank') badge.textContent = '🟥 Frank';
  else if (player === 'admin') badge.textContent = '🔑 Admin';
  document.getElementById('score-badge').classList.remove('hidden');
}

/* ── Section Nav ────────────────────────────────────────────────── */
function showSection(name) {
  activeSection = name;
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById(`section-${name}`);
  sec.classList.add('active');
  sec.classList.remove('hidden');
  document.getElementById(`nav-${name}`).classList.add('active');

  if (name === 'gruppen')   { loadGroups(); startLivePolling(); }
  else if (name === 'spieltage' && activeTab) loadMatches(activeTab);
  else stopLivePolling();
  if (name === 'rangliste') loadRangliste();
  if (name === 'regeln')    renderRegeln();
}

/* ── Spieltage Nav ──────────────────────────────────────────────── */
function renderSpieltageNav() {
  const container = document.getElementById('spieltag-tabs');
  container.innerHTML = '';

  navItems.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'stab';
    btn.textContent = tabLabel(item);
    btn.onclick = () => {
      document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = item;
      loadMatches(item);
    };
    container.appendChild(btn);

    if (i === 0) {
      btn.classList.add('active');
      activeTab = item;
      loadMatches(item);
    }
  });

  initScrollNav(container);
}

function initScrollNav(el) {
  const wrap = document.getElementById('spieltag-scroll-wrap');

  // Fade indicators based on scroll position
  const updateFade = () => {
    const atStart = el.scrollLeft <= 4;
    const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    wrap.classList.toggle('fade-left',  !atStart);
    wrap.classList.toggle('fade-right', atEnd);
  };
  el.addEventListener('scroll', updateFade, { passive: true });
  // Run once after layout settles
  requestAnimationFrame(updateFade);

  // Mouse drag-to-scroll
  let dragging = false, startX = 0, scrollStart = 0, moved = false;

  el.addEventListener('mousedown', e => {
    dragging = true; moved = false;
    startX = e.pageX;
    scrollStart = el.scrollLeft;
    el.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 4) moved = true;
    el.scrollLeft = scrollStart - dx;
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    el.classList.remove('dragging');
  });

  // Suppress click after drag so tabs don't fire
  el.addEventListener('click', e => {
    if (moved) { e.stopPropagation(); moved = false; }
  }, true);
}

function tabLabel(item) {
  if (item.round === 'gruppe') return `Spieltag ${item.spieltag}`;
  return ROUND_LABELS[item.round] || item.round;
}

/* ── Load Matches ───────────────────────────────────────────────── */
async function loadMatches(tab) {
  const container = document.getElementById('spieltag-content');
  container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Lädt…</div>';

  let url;
  if (tab.round === 'gruppe') url = `api/matches?spieltag=${tab.spieltag}`;
  else                        url = `api/matches?round=${tab.round}`;

  const matches = await api(url);
  renderMatches(matches, container);
  startLivePolling();
}

function renderMatches(matches, container) {
  container.innerHTML = '';
  if (!matches.length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Keine Spiele</div>';
    return;
  }

  // Group by gruppe for group stage
  const grouped = {};
  matches.forEach(m => {
    const key = m.gruppe || 'ko';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  Object.keys(grouped).sort().forEach(key => {
    grouped[key].forEach((m, idx) => {
      container.appendChild(renderMatchCard(m, idx));
    });
  });
}

function renderMatchCard(m, idx) {
  const now = new Date();
  const kickoff = new Date(m.kickoff);
  const isLocked = now >= kickoff;
  const hasResult = m.home_score !== null && m.home_score !== undefined;
  const isKO = m.round !== 'gruppe';

  const card = document.createElement('div');
  card.className = `match-card${hasResult ? ' has-result' : ''}${isLocked ? ' locked' : ''}`;
  card.style.animationDelay = `${idx * 0.04}s`;
  card.dataset.matchId = m.id;
  card.dataset.round = m.round;

  // ── Header
  let statusHtml;
  if (hasResult)      statusHtml = `<span class="match-status-badge status-done">Ergebnis</span>`;
  else if (isLocked)  statusHtml = `<span class="match-status-badge status-locked">Läuft/Beendet</span>`;
  else                statusHtml = `<span class="match-status-badge status-open">Offen</span>`;

  const gruppeLabel = m.gruppe ? `Gruppe ${m.gruppe}` : (ROUND_LABELS[m.round] || m.round);

  card.innerHTML = `
    <div class="match-header">
      <span class="match-gruppe">${gruppeLabel}</span>
      <span class="match-kickoff">${formatKickoff(kickoff)}</span>
      ${statusHtml}
    </div>

    <div class="match-body">
      <div class="team-name team-home">${flagFor(m.home_team)}${m.home_team}</div>
      <div class="result-box">
        ${hasResult
          ? `<div class="result-score">${m.home_score} : ${m.away_score}</div>`
          : `<div class="result-empty">– : –</div>`}
        ${hasResult && m.penalty_winner ? `<div class="result-flag">n.E.</div>` : ''}
      </div>
      <div class="team-name team-away">${flagFor(m.away_team)}${m.away_team}</div>
    </div>

    <div class="preds-row">
      ${renderPredCell('david', m, hasResult)}
      ${renderPredCell('frank', m, hasResult)}
    </div>

    ${renderInputArea(m, isLocked, hasResult, isKO)}
  `;

  return card;
}

function renderPredCell(p, m, hasResult) {
  const pred = m.predictions[p];
  const pts  = m.points[p];
  const ptsClass = pts === null ? 'pts-null' : `pts-${pts}`;

  let scoreHtml;
  if (pred) {
    // Only show other player's tip after kickoff or if it's your own
    const show = (player === p || player === 'admin' || new Date() >= new Date(m.kickoff));
    scoreHtml = show
      ? `<span class="pred-score">${pred.home_score} : ${pred.away_score}</span>`
      : `<span class="pred-score pending">verdeckt</span>`;
  } else {
    scoreHtml = `<span class="pred-score pending">kein Tipp</span>`;
  }

  const ptsHtml = hasResult && pts !== null
    ? `<span class="pred-pts ${ptsClass}">${pts}P</span>`
    : '';

  return `
    <div class="pred-cell">
      <span class="pred-label ${p}">${p === 'david' ? 'David' : 'Frank'}</span>
      ${scoreHtml}
      ${ptsHtml}
    </div>`;
}

function renderInputArea(m, isLocked, hasResult, isKO) {
  if (player === 'admin') {
    return renderAdminForm(m, hasResult);
  }
  if (!player || isLocked) return '';

  const myPred = m.predictions[player];
  const h = myPred?.home_score ?? '';
  const a = myPred?.away_score ?? '';

  return `
    <div class="pred-form">
      <span class="pred-form-label">Dein Tipp${myPred ? ' (ändern)' : ''}:</span>
      <div class="score-inputs">
        <input type="number" class="score-input" id="h-${m.id}" value="${h}" min="0" max="20" placeholder="–" />
        <span class="score-sep-colon">:</span>
        <input type="number" class="score-input" id="a-${m.id}" value="${a}" min="0" max="20" placeholder="–" />
      </div>
      <button class="btn-save" onclick="savePrediction(${m.id})">Tippen</button>
    </div>`;
}

function renderAdminForm(m, hasResult) {
  const h = hasResult ? m.home_score : '';
  const a = hasResult ? m.away_score : '';

  return `
    <div class="admin-result-form">
      <div class="form-row">
        <span class="admin-form-label">Ergebnis:</span>
        <div class="score-inputs">
          <input type="number" class="score-input" id="rh-${m.id}" value="${h}" min="0" max="20" placeholder="–" />
          <span class="score-sep-colon">:</span>
          <input type="number" class="score-input" id="ra-${m.id}" value="${a}" min="0" max="20" placeholder="–" />
        </div>
        <button class="btn-save" onclick="saveResult(${m.id})">Speichern</button>
        ${hasResult ? `<button class="btn-admin" style="padding:8px 10px;font-size:.78rem;" onclick="deleteResult(${m.id})">✕</button>` : ''}
      </div>
      <div class="admin-checks" style="margin-top:6px;">
        <span class="admin-form-label" style="font-size:.72rem">Teams:</span>
        <input type="text" id="th-${m.id}" value="${m.home_team}" class="score-input" style="width:130px;font-size:.78rem;" />
        <span class="score-sep-colon">vs</span>
        <input type="text" id="ta-${m.id}" value="${m.away_team}" class="score-input" style="width:130px;font-size:.78rem;" />
        <button class="btn-admin" style="padding:7px 10px;font-size:.76rem;" onclick="saveTeams(${m.id})">Teams speichern</button>
      </div>
    </div>`;
}

/* ── API Actions ────────────────────────────────────────────────── */
async function savePrediction(matchId) {
  const h = document.getElementById(`h-${matchId}`)?.value;
  const a = document.getElementById(`a-${matchId}`)?.value;

  if (h === '' || a === '') { showToast('Bitte beide Tore eingeben', 'error'); return; }

  const res = await api('api/predict', 'POST', {
    match_id: matchId,
    player,
    home_score: parseInt(h),
    away_score: parseInt(a),
  });

  if (res.error) { showToast(res.error, 'error'); return; }

  // Update only this player's pred-cell in the DOM — no full reload
  const cell = document.querySelector(`.match-card .pred-cell .pred-label.${player}`)
    ? [...document.querySelectorAll('.match-card')]
        .find(card => card.querySelector(`#h-${matchId}`))
        ?.querySelector(`.pred-cell .pred-label.${player}`)
        ?.closest('.pred-cell')
    : null;
  if (cell) {
    cell.querySelector('.pred-score').textContent = `${parseInt(h)} : ${parseInt(a)}`;
  }

  // Update label to "(ändern)"
  const label = document.querySelector(`#h-${matchId}`)
    ?.closest('.pred-form')
    ?.querySelector('.pred-form-label');
  if (label) label.textContent = 'Dein Tipp (ändern):';

  showToast('Tipp gespeichert ✓', 'success');
}


async function saveResult(matchId) {
  const h = document.getElementById(`rh-${matchId}`)?.value;
  const a = document.getElementById(`ra-${matchId}`)?.value;

  if (h === '' || a === '') { showToast('Bitte beide Tore eingeben', 'error'); return; }

  const res = await api('api/result', 'POST', {
    match_id: matchId,
    home_score: parseInt(h),
    away_score: parseInt(a),
    extra_time: false,
    penalties: false,
    penalty_winner: null,
    password: adminPassword,
  });

  if (res.error) { showToast(res.error, 'error'); return; }
  showToast('Ergebnis gespeichert ✓', 'success');
  replaceMatchCard(matchId, res.match);
  loadScores();
}

async function deleteResult(matchId) {
  const res = await fetch(`api/result/${matchId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword }),
  });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  showToast('Ergebnis gelöscht', 'success');
  // Re-fetch this match to get clean state, then replace card
  const round = activeTab?.round === 'gruppe' ? null : activeTab?.round;
  const param = round ? `round=${round}` : `spieltag=${activeTab?.spieltag}`;
  const matches = await api(`api/matches?${param}`);
  const updated = matches?.find(m => m.id === matchId);
  if (updated) replaceMatchCard(matchId, updated);
  loadScores();
}

function replaceMatchCard(matchId, matchData) {
  const old = [...document.querySelectorAll('.match-card')]
    .find(c => c.querySelector(`#rh-${matchId}`) || c.querySelector(`#h-${matchId}`));
  if (!old) { refreshTab(); return; }
  const idx = [...old.parentElement.children].indexOf(old);
  const fresh = renderMatchCard(matchData, idx);
  old.replaceWith(fresh);
}

async function saveTeams(matchId) {
  const ht = document.getElementById(`th-${matchId}`)?.value;
  const at = document.getElementById(`ta-${matchId}`)?.value;

  const res = await fetch(`api/match/${matchId}/teams`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ home_team: ht, away_team: at, password: adminPassword }),
  });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  showToast('Teams gespeichert ✓', 'success');
  refreshTab();
}

function refreshTab() {
  if (activeTab) loadMatches(activeTab);
}

/* ── Scores ─────────────────────────────────────────────────────── */
async function loadScores() {
  const data = await api('api/standings');
  document.getElementById('score-david').textContent = data.totals.david;
  document.getElementById('score-frank').textContent = data.totals.frank;
}

/* ── Groups ─────────────────────────────────────────────────────── */
async function loadGroups() {
  const container = document.getElementById('gruppen-content');
  container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Lädt…</div>';
  const groups = await api('api/groups');
  container.innerHTML = '';

  Object.keys(groups).sort().forEach(g => {
    const teams = groups[g];
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.gruppe = g;
    card.innerHTML = `
      <div class="group-card-header">Gruppe ${g}</div>
      <table class="group-table">
        <thead>
          <tr>
            <th>Team</th>
            <th title="Spiele">Sp</th>
            <th title="Siege">S</th>
            <th title="Unentschieden">U</th>
            <th title="Niederlagen">N</th>
            <th title="Tore">Tore</th>
            <th title="Tordifferenz">TD</th>
            <th title="Punkte">Pkt</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map((t, i) => {
            let rowClass = '';
            if (i < 2) rowClass = 'qualifies';        // direkt qualifiziert
            else if (i === 2) rowClass = 'qualified3'; // mögl. als bester Dritter
            return `<tr class="${rowClass}">
              <td>${flagFor(t.team)}${t.team}</td>
              <td>${t.played}</td>
              <td>${t.won}</td>
              <td>${t.drawn}</td>
              <td>${t.lost}</td>
              <td>${t.gf}:${t.ga}</td>
              <td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
              <td class="pts-cell">${t.pts}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    container.appendChild(card);
  });

  if (!Object.keys(groups).length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Noch keine Ergebnisse eingetragen.</div>';
  }
}

/* ── Rangliste ──────────────────────────────────────────────────── */
async function loadRangliste() {
  const container = document.getElementById('rangliste-content');
  container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Lädt…</div>';
  const [data, live] = await Promise.all([api('api/standings'), api('api/livescores')]);

  const { totals, details } = data;
  const disp = (live?.has_live && live?.provisional_totals) ? live.provisional_totals : totals;
  const suffix = live?.has_live ? '*' : '';
  const leader = disp.david > disp.frank ? 'david' : disp.frank > disp.david ? 'frank' : null;

  container.innerHTML = `
    <div class="standings-header">
      <div class="standings-player-card ${leader === 'david' ? 'leader' : ''}">
        ${leader === 'david' ? '<div class="standings-crown">👑</div>' : ''}
        <div class="standings-name david">David</div>
        <div class="standings-pts david">${disp.david}${suffix}</div>
        <div class="standings-sub">Punkte</div>
      </div>
      <div class="standings-player-card ${leader === 'frank' ? 'leader' : ''}">
        ${leader === 'frank' ? '<div class="standings-crown">👑</div>' : ''}
        <div class="standings-name frank">Frank</div>
        <div class="standings-pts frank">${disp.frank}${suffix}</div>
        <div class="standings-sub">Punkte</div>
      </div>
    </div>`;

  if (!details.length) {
    container.innerHTML += '<div style="padding:24px;text-align:center;color:var(--muted)">Noch keine Ergebnisse eingetragen.</div>';
    return;
  }

  // Group by round/spieltag
  const byRound = {};
  details.forEach(d => {
    const key = d.round === 'gruppe' ? `gruppe_${d.spieltag}` : d.round;
    if (!byRound[key]) byRound[key] = { label: roundDetailLabel(d), items: [] };
    byRound[key].items.push(d);
  });

  const table = document.createElement('div');
  table.className = 'standings-table-wrap';
  table.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Spiel</th>
          <th>Ergebnis</th>
          <th>David</th>
          <th>Frank</th>
        </tr>
      </thead>
      <tbody id="standings-tbody"></tbody>
    </table>`;
  container.appendChild(table);

  const tbody = table.querySelector('#standings-tbody');

  Object.entries(byRound).forEach(([, group]) => {
    const labelRow = document.createElement('tr');
    labelRow.innerHTML = `<td colspan="4" class="round-label">${group.label}</td>`;
    tbody.appendChild(labelRow);

    group.items.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="team-vs">
            <span>${flagFor(d.home_team)}${d.home_team}</span>
            <span style="color:var(--muted);font-size:.75rem">vs</span>
            <span>${flagFor(d.away_team)}${d.away_team}</span>
            ${d.result ? `<span class="score">${d.result}${d.penalties ? ' n.E.' : d.extra_time ? ' n.V.' : ''}</span>` : ''}
          </div>
        </td>
        <td style="color:var(--gold);font-weight:700">${d.result || '–'}</td>
        <td>
          <span style="color:var(--muted);font-size:.78rem">${d.david_pred ?? '–'}</span>
          <span class="pred-pts pts-${d.david_pts}" style="margin-left:4px">${d.david_pts}P</span>
        </td>
        <td>
          <span style="color:var(--muted);font-size:.78rem">${d.frank_pred ?? '–'}</span>
          <span class="pred-pts pts-${d.frank_pts}" style="margin-left:4px">${d.frank_pts}P</span>
        </td>`;
      tbody.appendChild(tr);
    });
  });
}

function roundDetailLabel(d) {
  if (d.round === 'gruppe') return `Spieltag ${d.spieltag}`;
  return ROUND_LABELS[d.round] || d.round;
}

/* ── Live Scores ────────────────────────────────────────────────── */
function startLivePolling() {
  stopLivePolling();
  fetchLiveScores();
  liveScoreInterval = setInterval(fetchLiveScores, 60000);
}

function stopLivePolling() {
  if (liveScoreInterval) { clearInterval(liveScoreInterval); liveScoreInterval = null; }
}

async function fetchLiveScores() {
  if (activeSection !== 'spieltage' && activeSection !== 'gruppen') return;
  const data = await api('api/livescores');
  if (!data || data.error) return;

  // Update provisional group tables
  if (data.provisional_groups) {
    Object.entries(data.provisional_groups).forEach(([gruppe, table]) => {
      const card = document.querySelector(`.group-card[data-gruppe="${gruppe}"]`);
      if (!card) return;
      const tbody = card.querySelector('tbody');
      if (!tbody) return;
      tbody.innerHTML = table.map((t, i) => {
        const rowClass = i < 2 ? 'qualifies' : i === 2 ? 'qualified3' : '';
        return `<tr class="${rowClass}">
          <td>${flagFor(t.team)}${t.team} <span style="font-size:.7rem;color:#dc2626">●</span></td>
          <td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td>
          <td>${t.gf}:${t.ga}</td>
          <td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
          <td class="pts-cell">${t.pts}</td>
        </tr>`;
      }).join('');
    });
  }

  // Apply live badges / admin Übernehmen buttons
  data.matches?.forEach(lm => {
    const card = document.querySelector(`.match-card[data-match-id="${lm.match_id}"]`);
    if (!card) return;

    // Running match: LIVE badge + live score
    const badge = card.querySelector('.match-status-badge');
    if (badge && !badge.classList.contains('status-live')) {
      badge.className = 'match-status-badge status-live';
      badge.textContent = '🔴 LIVE';
    }
    const resultBox = card.querySelector('.result-box');
    if (resultBox) {
      resultBox.innerHTML = `<div class="result-score live-score">${lm.home_score} : ${lm.away_score}</div>`;
    }
    // Pre-fill admin inputs with live score
    const rhInput = card.querySelector(`#rh-${lm.match_id}`);
    const raInput = card.querySelector(`#ra-${lm.match_id}`);
    if (rhInput) rhInput.value = lm.home_score;
    if (raInput) raInput.value = lm.away_score;
  });

  // Update score badge with provisional totals (live or confirmed)
  if (data.provisional_totals) {
    const d = document.getElementById('score-david');
    const f = document.getElementById('score-frank');
    if (d) d.textContent = data.provisional_totals.david + (data.has_live ? '*' : '');
    if (f) f.textContent = data.provisional_totals.frank + (data.has_live ? '*' : '');
  }

  // Replace cards for auto-saved matches and refresh scores
  if (data.auto_saved_matches?.length) {
    data.auto_saved_matches.forEach(m => replaceMatchCard(m.id, m));
    loadScores();
  }
}

/* ── Utilities ──────────────────────────────────────────────────── */
function formatKickoff(date) {
  return date.toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }) + ' Uhr';
}

async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 3000);
}

/* ── Spielregeln ────────────────────────────────────────────────── */
function renderRegeln() {
  const el = document.getElementById('regeln-content');
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';

  const isAdmin = player === 'admin';

  el.innerHTML = `
    <div class="regeln-grid">

      <div class="regel-card">
        <h3><span class="icon">⏱️</span> Tipp-Deadline</h3>
        <ul>
          <li><span class="pts pts-gray">!</span> Tipps sind nur bis zum Anpfiff des jeweiligen Spiels möglich</li>
          <li><span class="pts pts-gray">!</span> Nach dem Anpfiff sind die Tipps beider Spieler sichtbar</li>
          <li><span class="pts pts-gray">!</span> Vor dem Anpfiff bleibt der Tipp des anderen verdeckt</li>
        </ul>
      </div>

      <div class="regel-card">
        <h3><span class="icon">🏟️</span> Gruppenphase</h3>
        <ul>
          <li><span class="pts">3P</span> Exaktes Ergebnis (z.B. 2:1 getippt, 2:1 gespielt)</li>
          <li><span class="pts">2P</span> Richtige Tordifferenz (z.B. 2:0 getippt, 3:1 gespielt)</li>
          <li><span class="pts">1P</span> Richtige Tendenz – Sieg, Unentschieden oder Niederlage</li>
          <li><span class="pts pts-gray">0P</span> Alles andere</li>
        </ul>
      </div>

      <div class="regel-card">
        <h3><span class="icon">⚔️</span> KO-Runden</h3>
        <ul>
          <li><span class="pts">3P</span> Exaktes Endergebnis (inkl. Verlängerung / Elfmeter)</li>
          <li><span class="pts">1P</span> Richtiger Sieger – kein Unentschieden möglich</li>
          <li><span class="pts pts-gray">0P</span> Falscher Sieger</li>
        </ul>
        <div class="note">
          Bei Verlängerung oder Elfmeterschießen zählt das Ergebnis nach 90 Minuten für die Punktewertung. Der Admin markiert n.V. / n.E. entsprechend.
        </div>
      </div>

      <div class="regel-card">
        <h3><span class="icon">🏆</span> Wertung</h3>
        <ul>
          <li><span class="pts pts-gray">72</span> Spiele in der Gruppenphase</li>
          <li><span class="pts pts-gray">32</span> KO-Spiele (R32 bis Finale)</li>
          <li><span class="pts pts-gray">∑</span> Wer am Ende die meisten Punkte hat, gewinnt</li>
        </ul>
        <div class="note">
          Rangliste jederzeit live einsehbar — Punkte werden sofort nach Ergebniseintrag berechnet.
        </div>
      </div>

      ${isAdmin ? `
      <div class="regel-card">
        <h3><span class="icon">🔑</span> Admin-Passwort ändern</h3>
        <div class="pw-change-form" id="pw-change-form">
          <input type="password" id="pw-current" placeholder="Aktuelles Passwort" />
          <input type="password" id="pw-new"     placeholder="Neues Passwort (min. 6 Zeichen)" />
          <input type="password" id="pw-confirm" placeholder="Neues Passwort bestätigen" />
          <button onclick="changeAdminPassword()">Passwort ändern</button>
          <span id="pw-msg" style="font-size:.8rem;color:var(--muted)"></span>
        </div>
      </div>` : ''}

    </div>`;
}

async function changeAdminPassword() {
  const cur  = document.getElementById('pw-current').value;
  const nw   = document.getElementById('pw-new').value;
  const conf = document.getElementById('pw-confirm').value;
  const msg  = document.getElementById('pw-msg');

  if (nw !== conf) { msg.textContent = '❌ Passwörter stimmen nicht überein'; return; }
  if (nw.length < 6) { msg.textContent = '❌ Mindestens 6 Zeichen'; return; }

  const res = await fetch('api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: cur, new_password: nw })
  });
  const data = await res.json();

  if (res.ok) {
    adminPassword = nw;
    msg.style.color = 'var(--green-dark)';
    msg.textContent = '✓ Passwort erfolgreich geändert';
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } else {
    msg.style.color = 'var(--frank)';
    msg.textContent = '❌ ' + (data.error || 'Fehler');
  }
}

/* ── Boot ───────────────────────────────────────────────────────── */
init();
