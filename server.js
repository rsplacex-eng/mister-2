require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { simulateMatch, quickSim, updateMoral, agePlayers } = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'db.json');
function readDB()   { if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ leagues: {} })); return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
function writeDB(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }
function genCode()  { return 'MSTR-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }

// ══════════════════════════════════════════════════════════════
//  DIVISÕES — Times reais Brasileirão 2026
// ══════════════════════════════════════════════════════════════
const DIVISIONS = {
  'serie-a': {
    name: 'Série A', label: 'Brasileirão Série A 2026',
    promoteTop: 0, relegateBottom: 4, up: null, down: 'serie-b',
    teams: [
      { name:'Flamengo',       badge:'🔴⚫', ov:91 },
      { name:'Palmeiras',      badge:'🟢',   ov:90 },
      { name:'Atlético-MG',    badge:'⚫⚪', ov:87 },
      { name:'Cruzeiro',       badge:'🔵',   ov:85 },
      { name:'Corinthians',    badge:'⚫⚪', ov:84 },
      { name:'Grêmio',         badge:'🔵⚫', ov:83 },
      { name:'São Paulo',      badge:'🔴⚫', ov:82 },
      { name:'Internacional',  badge:'🔴',   ov:82 },
      { name:'Botafogo',       badge:'⚫⚪', ov:81 },
      { name:'Fluminense',     badge:'🔴🟢', ov:80 },
      { name:'Santos',         badge:'⚪⚫', ov:79 },
      { name:'Vasco',          badge:'⚫⚪', ov:77 },
      { name:'Bahia',          badge:'🔵🔴', ov:76 },
      { name:'RB Bragantino',  badge:'🔴⚪', ov:75 },
      { name:'Mirassol',       badge:'🟡🔵', ov:74 },
      { name:'Vitória',        badge:'🔴⚫', ov:72 },
      { name:'Coritiba',       badge:'🟢⚪', ov:74 },
      { name:'Athletico-PR',   badge:'🔴⚫', ov:73 },
      { name:'Chapecoense',    badge:'🟢',   ov:70 },
      { name:'Remo',           badge:'🔵',   ov:68 },
    ],
  },
  'serie-b': {
    name: 'Série B', label: 'Brasileirão Série B 2026',
    promoteTop: 4, relegateBottom: 4, up: 'serie-a', down: 'serie-c',
    teams: [
      { name:'Fortaleza',      badge:'🔴🔵', ov:74 },
      { name:'Ceará',          badge:'⚫⚪', ov:72 },
      { name:'Juventude',      badge:'🟢⚪', ov:70 },
      { name:'Sport',          badge:'🔴⚫', ov:69 },
      { name:'Criciúma',       badge:'🟡⚫', ov:68 },
      { name:'Goiás',          badge:'🟢⚪', ov:67 },
      { name:'Ponte Preta',    badge:'⚫⚪', ov:67 },
      { name:'Novorizontino',  badge:'🟡⚫', ov:66 },
      { name:'Londrina',       badge:'🔴⚪', ov:64 },
      { name:'CRB',            badge:'🔴⚫', ov:65 },
      { name:'Avaí',           badge:'🔵⚪', ov:64 },
      { name:'Cuiabá',         badge:'🟡⚫', ov:63 },
      { name:'Atlético-GO',    badge:'🔴⚫', ov:62 },
      { name:'Operário-PR',    badge:'⚫⚪', ov:61 },
      { name:'Vila Nova',      badge:'🔴⚫', ov:60 },
      { name:'América-MG',     badge:'🟢',   ov:60 },
      { name:'Athletic Club',  badge:'🔴⚫', ov:59 },
      { name:'Botafogo-SP',    badge:'⚫⚪', ov:58 },
      { name:'Náutico',        badge:'🔴⚪', ov:62 },
      { name:'São Bernardo',   badge:'🔴⚪', ov:60 },
    ],
  },
  'serie-c': {
    name: 'Série C', label: 'Brasileirão Série C 2026',
    promoteTop: 4, relegateBottom: 4, up: 'serie-b', down: 'serie-d',
    teams: [
      { name:'Paysandu',         badge:'🔵⚪', ov:58 },
      { name:'Amazonas',         badge:'⚫🔴', ov:56 },
      { name:'Ferroviária',      badge:'🔴⚫', ov:55 },
      { name:'Volta Redonda',    badge:'🔴⚫', ov:54 },
      { name:'Santa Cruz',       badge:'🔴⚫', ov:53 },
      { name:'Inter de Limeira', badge:'🟡⚫', ov:55 },
      { name:'Guarani',          badge:'🟢⚪', ov:58 },
      { name:'Brusque',          badge:'🔵⚪', ov:51 },
      { name:'Caxias',           badge:'🔴⚫', ov:50 },
      { name:'Barra',            badge:'🔵⚪', ov:52 },
      { name:'Maranhão',         badge:'🔵🔴', ov:51 },
      { name:'Floresta',         badge:'🟢⚪', ov:52 },
      { name:'Confiança',        badge:'🔵🔴', ov:49 },
      { name:'Ypiranga',         badge:'🔴🟡', ov:49 },
      { name:'Maringá',          badge:'🔵⚪', ov:48 },
      { name:'Ituano',           badge:'🔴⚪', ov:48 },
      { name:'Botafogo-PB',      badge:'⚫⚪', ov:47 },
      { name:'Figueirense',      badge:'⚫⚪', ov:47 },
      { name:'Anápolis',         badge:'🔴⚫', ov:46 },
      { name:'Itabaiana',        badge:'🔵⚪', ov:45 },
    ],
  },
  'serie-d': {
    name: 'Série D', label: 'Brasileirão Série D 2026',
    promoteTop: 6, relegateBottom: 0, up: 'serie-c', down: null,
    teams: [
      { name:'ABC-RN',           badge:'🔴⚫', ov:48 },
      { name:'Treze-PB',         badge:'🔴⚫', ov:46 },
      { name:'Ferroviário-CE',   badge:'🔴⚫', ov:47 },
      { name:'Retrô-PE',         badge:'🟢⚫', ov:46 },
      { name:'CSA-AL',           badge:'🔵⚪', ov:45 },
      { name:'Juazeirense-BA',   badge:'🔴🔵', ov:44 },
      { name:'Gama-DF',          badge:'🔵',   ov:45 },
      { name:'Brasiliense-DF',   badge:'🟢',   ov:44 },
      { name:'Luverdense-MT',    badge:'🟢⚫', ov:43 },
      { name:'Aparecidense-GO',  badge:'🔴⚪', ov:43 },
      { name:'Tombense-MG',      badge:'🔴⚫', ov:48 },
      { name:'Portuguesa-SP',    badge:'🔴⚪', ov:47 },
      { name:'Água Santa-SP',    badge:'🟡⚫', ov:46 },
      { name:'XV de Piracicaba', badge:'⚫⚪', ov:46 },
      { name:'Madureira-RJ',     badge:'🔴⚫', ov:44 },
      { name:'Athletic-MG',      badge:'🔴⚫', ov:45 },
      { name:'Joinville-SC',     badge:'🔵⚪', ov:46 },
      { name:'Cianorte-PR',      badge:'🔴',   ov:44 },
      { name:'Brasil-RS',        badge:'🟡⚫', ov:43 },
      { name:'Ser Caxias-RS',    badge:'🔴⚫', ov:42 },
    ],
  },
};

// ══════════════════════════════════════════════════════════════
//  COPA DO BRASIL 2026
// ══════════════════════════════════════════════════════════════
function buildCopaBrasil(divisionId, teams) {
  const guests = getCupGuests(divisionId);
  const cupTeams = [...teams.slice(0, 8), ...guests.slice(0, 8)];
  const bracket  = buildBracket(cupTeams);
  return { phase: 1, maxPhase: 5, status: 'active', bracket, teams: cupTeams, winner: null };
}

function getCupGuests(divId) {
  const pools = {
    'serie-a': [
      { name:'Flamengo', badge:'🔴⚫', ov:91 }, { name:'Palmeiras',    badge:'🟢',   ov:90 },
      { name:'Grêmio',   badge:'🔵⚫', ov:83 }, { name:'Corinthians',  badge:'⚫⚪', ov:84 },
      { name:'Cruzeiro', badge:'🔵',   ov:85 }, { name:'Santos',       badge:'⚪⚫', ov:79 },
      { name:'Botafogo', badge:'⚫⚪', ov:81 }, { name:'Fluminense',   badge:'🔴🟢', ov:80 },
    ],
    'serie-b': [
      { name:'Fortaleza',  badge:'🔴🔵', ov:74 }, { name:'Ceará',       badge:'⚫⚪', ov:72 },
      { name:'Criciúma',   badge:'🟡⚫', ov:68 }, { name:'Goiás',       badge:'🟢⚪', ov:67 },
      { name:'Ponte Preta',badge:'⚫⚪', ov:67 }, { name:'América-MG',  badge:'🟢',   ov:60 },
      { name:'CRB',        badge:'🔴⚫', ov:65 }, { name:'Vila Nova',   badge:'🔴⚫', ov:60 },
    ],
    'serie-c': [
      { name:'Paysandu',     badge:'🔵⚪', ov:58 }, { name:'Guarani',      badge:'🟢⚪', ov:58 },
      { name:'Santa Cruz',   badge:'🔴⚫', ov:53 }, { name:'Volta Redonda',badge:'🔴⚫', ov:54 },
      { name:'Caxias',       badge:'🔴⚫', ov:50 }, { name:'Brusque',      badge:'🔵⚪', ov:51 },
      { name:'Botafogo-PB',  badge:'⚫⚪', ov:47 }, { name:'Ituano',       badge:'🔴⚪', ov:48 },
    ],
    'serie-d': [
      { name:'Tombense-MG',  badge:'🔴⚫', ov:48 }, { name:'Portuguesa-SP',badge:'🔴⚪', ov:47 },
      { name:'ABC-RN',       badge:'🔴⚫', ov:48 }, { name:'Joinville-SC', badge:'🔵⚪', ov:46 },
      { name:'Retrô-PE',     badge:'🟢⚫', ov:46 }, { name:'CSA-AL',       badge:'🔵⚪', ov:45 },
      { name:'Ferroviário-CE',badge:'🔴⚫',ov:47 }, { name:'Gama-DF',      badge:'🔵',   ov:45 },
    ],
  };
  return (pools[divId] || pools['serie-b']).map(t => ({ ...t, id: uuidv4(), isHuman: false }));
}

function buildBracket(teams) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const matches  = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({ id: uuidv4(), phase: 1, homeId: shuffled[i].id, awayId: (shuffled[i + 1] || shuffled[0]).id, sh: null, sa: null, played: false, winnerId: null });
  }
  return matches;
}

function advanceBracket(copa) {
  const pm = copa.bracket.filter(m => m.phase === copa.phase);
  if (!pm.every(m => m.played)) return false;
  if (copa.phase >= copa.maxPhase) {
    copa.status  = 'finished';
    copa.winner  = copa.teams.find(t => t.id === pm[0].winnerId)?.name || 'Campeão';
    return true;
  }
  const winners = pm.map(m => m.winnerId).filter(Boolean);
  copa.phase++;
  for (let i = 0; i < winners.length; i += 2) {
    copa.bracket.push({ id: uuidv4(), phase: copa.phase, homeId: winners[i], awayId: winners[i + 1] || winners[0], sh: null, sa: null, played: false, winnerId: null });
  }
  return true;
}

// ══════════════════════════════════════════════════════════════
//  FIXTURES & STANDINGS
// ══════════════════════════════════════════════════════════════
function generateFixtures(teams) {
  const ids = teams.map(t => t.id);
  const n   = ids.length;
  const all = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) all.push({ homeId: ids[i], awayId: ids[j], round: 0, played: false, sh: null, sa: null, summary: '' });
  const perRound = Math.floor(n / 2);
  let ri = 1;
  const pool = [...all].sort(() => Math.random() - 0.5);
  const result = [];
  while (pool.length > 0) {
    const used = new Set(), batch = [];
    for (let i = pool.length - 1; i >= 0; i--) {
      const m = pool[i];
      if (!used.has(m.homeId) && !used.has(m.awayId)) {
        m.round = ri; batch.push(m); used.add(m.homeId); used.add(m.awayId); pool.splice(i, 1);
        if (batch.length >= perRound) break;
      }
    }
    if (batch.length)    { result.push(...batch); ri++; }
    else if (pool.length){ pool[0].round = ri; result.push(pool.shift()); ri++; }
  }
  return result;
}

function calcStandings(teams, matches) {
  const s = {};
  teams.forEach(t => { s[t.id] = { id: t.id, name: t.name, badge: t.badge || '⚽', ov: t.ov, isHuman: !!t.isHuman, moral: t.moral || 50, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }; });
  matches.filter(m => m.played).forEach(m => {
    const h = s[m.homeId], a = s[m.awayId]; if (!h || !a) return;
    h.j++; a.j++; h.gp += m.sh; h.gc += m.sa; a.gp += m.sa; a.gc += m.sh;
    if      (m.sh > m.sa) { h.v++; h.pts += 3; a.d++; }
    else if (m.sh === m.sa){ h.e++; h.pts++;    a.e++; a.pts++; }
    else                   { a.v++; a.pts += 3; h.d++; }
  });
  return Object.values(s).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp);
}

function applyZones(st, divId) {
  const d = DIVISIONS[divId]; if (!d) return st;
  return st.map((t, i) => ({ ...t, zone: d.promoteTop > 0 && i < d.promoteTop ? 'promote' : d.relegateBottom > 0 && i >= st.length - d.relegateBottom ? 'relegate' : 'stay' }));
}

function evolveMVP(team, mvpName) {
  if (!team.players || !mvpName) return;
  const p = team.players.find(pl => mvpName.split(' ').some(w => pl.name.includes(w)));
  if (!p) return;
  const attrs = ['spd','str','tec','fin','pas','int'];
  const a = attrs[Math.floor(Math.random() * attrs.length)];
  if (p[a] < 99) p[a]++;
  p.ov = Math.round((p.spd + p.str + p.tec + p.fin + p.pas + p.int) / 6);
  if (team.players.length) team.ov = Math.round(team.players.slice(0, 11).reduce((s, pl) => s + pl.ov, 0) / 11);
}

function advanceRound(league) {
  const round   = league.currentRound;
  const allDone = league.matches.filter(m => m.round === round).every(m => m.played);
  if (!allDone) return;
  if (round < league.totalRounds) { league.currentRound = round + 1; return; }
  league.status = 'finished';
  const st = applyZones(calcStandings(league.teams, league.matches), league.divisionId);
  league.finalStandings = st;
  if (!league.history) league.history = [];
  league.history.push({ season: league.season, divisionId: league.divisionId, divisionName: league.divisionName, standings: st.map(t => ({ name: t.name, isHuman: t.isHuman, pts: t.pts, v: t.v, e: t.e, d: t.d, gp: t.gp, gc: t.gc, zone: t.zone })) });
}

// ══════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════
app.get('/api/divisions', (req, res) => {
  res.json({ divisions: Object.entries(DIVISIONS).map(([id, d]) => ({ id, name: d.name, label: d.label, promoteTop: d.promoteTop, relegateBottom: d.relegateBottom, teamCount: d.teams.length })) });
});

app.post('/api/leagues', (req, res) => {
  try {
    const { leagueName, playerName, teamName, formation, divisionId } = req.body;
    if (!playerName || !teamName) return res.status(400).json({ error: 'Dados inválidos' });
    const divId   = divisionId || 'serie-b';
    const divData = DIVISIONS[divId]; if (!divData) return res.status(400).json({ error: 'Divisão inválida' });
    const db = readDB(), code = genCode(), playerId = uuidv4();
    const aiTeams = divData.teams.map(t => ({ ...t, id: uuidv4(), isHuman: false, strategy: 'Pressão alta', moral: 50 }));
    const squad   = defaultSquad(divId);
    const humanTeam = { id: playerId, name: teamName, badge: '⚽', isHuman: true, playerName, formation: formation || '4-3-3', strategy: 'Pressão alta', coins: 200, moral: 50, players: squad, ov: Math.round(squad.slice(0, 11).reduce((s, p) => s + p.ov, 0) / 11) };
    const teams   = [...aiTeams.slice(0, -1), humanTeam];
    const matches = generateFixtures(teams);
    const copa    = buildCopaBrasil(divId, teams);
    db.leagues[code] = { code, name: leagueName || `Liga de ${playerName}`, created: Date.now(), divisionId: divId, divisionName: divData.name, season: 1, currentRound: 1, totalRounds: Math.max(...matches.map(m => m.round)), status: 'active', teams, matches, humanPlayers: [playerId], chat: [], history: [], copa };
    writeDB(db);
    res.json({ code, playerId, league: db.leagues[code] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/join', (req, res) => {
  try {
    const { playerName, teamName, formation } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    if (league.humanPlayers.length >= 6) return res.status(400).json({ error: 'Liga cheia' });
    const slot = league.teams.find(t => !t.isHuman); if (!slot) return res.status(400).json({ error: 'Sem vagas' });
    const playerId = uuidv4(), oldId = slot.id;
    const squad = defaultSquad(league.divisionId);
    Object.assign(slot, { id: playerId, name: teamName || slot.name, badge: '⚽', isHuman: true, playerName, formation: formation || '4-3-3', strategy: 'Pressão alta', coins: 200, moral: 50, players: squad, ov: Math.round(squad.slice(0, 11).reduce((s, p) => s + p.ov, 0) / 11) });
    league.matches.forEach(m => { if (m.homeId === oldId) m.homeId = playerId; if (m.awayId === oldId) m.awayId = playerId; });
    if (league.copa) { league.copa.bracket.forEach(m => { if (m.homeId === oldId) m.homeId = playerId; if (m.awayId === oldId) m.awayId = playerId; }); league.copa.teams = league.copa.teams.map(t => t.id === oldId ? { ...t, id: playerId, isHuman: true } : t); }
    league.humanPlayers.push(playerId);
    writeDB(db); res.json({ playerId, league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leagues/:code', (req, res) => {
  try {
    const db = readDB(), l = db.leagues[req.params.code];
    if (!l) return res.status(404).json({ error: 'Liga não encontrada' });
    res.json({ league: l });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/simulate-round', (req, res) => {
  try {
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const round   = league.currentRound;
    const pending = league.matches.filter(m => m.round === round && !m.played);
    const humanP  = pending.find(m => league.humanPlayers.some(hp => m.homeId === hp || m.awayId === hp));
    if (humanP) return res.status(400).json({ error: 'Jogue sua partida antes de simular os NPCs!' });
    pending.forEach(m => {
      const h = league.teams.find(t => t.id === m.homeId), a = league.teams.find(t => t.id === m.awayId); if (!h || !a) return;
      const r = quickSim(h.ov, a.ov, h.moral || 50, a.moral || 50);
      m.sh = r.sh; m.sa = r.sa; m.played = true; m.summary = `${h.name} ${r.sh}×${r.sa} ${a.name}`;
      updateMoral(h, r.sh > r.sa, r.sh === r.sa); updateMoral(a, r.sa > r.sh, r.sh === r.sa);
    });
    advanceRound(league); writeDB(db); res.json({ league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/match', (req, res) => {
  try {
    const { homeId, awayId } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const match = league.matches.find(m => ((m.homeId === homeId && m.awayId === awayId) || (m.homeId === awayId && m.awayId === homeId)) && m.round === league.currentRound && !m.played);
    if (!match) return res.status(400).json({ error: 'Partida não encontrada ou já disputada' });
    const hTm = league.teams.find(t => t.id === match.homeId), aTm = league.teams.find(t => t.id === match.awayId);
    if (!hTm || !aTm) return res.status(404).json({ error: 'Time não encontrado' });
    const result = simulateMatch(hTm, aTm);
    match.sh = result.sh; match.sa = result.sa; match.events = result.events; match.summary = result.summary; match.mvp = result.mvp; match.played = true;
    const won = result.sh > result.sa, drew = result.sh === result.sa;
    updateMoral(hTm, won, drew); updateMoral(aTm, !won && !drew, drew);
    if (league.humanPlayers.includes(homeId)) { hTm.coins = (hTm.coins || 200) + (won ? 30 : drew ? 15 : 10); evolveMVP(hTm, result.mvp); }
    if (league.humanPlayers.includes(awayId)) { aTm.coins = (aTm.coins || 200) + (result.sa > result.sh ? 30 : drew ? 15 : 10); }
    advanceRound(league); writeDB(db); res.json({ result, league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Copa do Brasil
app.post('/api/leagues/:code/copa/match', (req, res) => {
  try {
    const { matchId } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league || !league.copa) return res.status(404).json({ error: 'Copa não encontrada' });
    const copa  = league.copa;
    const match = copa.bracket.find(m => m.id === matchId && !m.played && m.phase === copa.phase);
    if (!match) return res.status(400).json({ error: 'Partida não encontrada ou já disputada' });
    const allT  = [...league.teams, ...(copa.teams || [])];
    const hTm   = allT.find(t => t.id === match.homeId), aTm = allT.find(t => t.id === match.awayId);
    if (!hTm || !aTm) return res.status(404).json({ error: 'Time não encontrado' });
    const result = simulateMatch(hTm, aTm);
    match.sh = result.sh; match.sa = result.sa; match.events = result.events; match.summary = result.summary; match.mvp = result.mvp; match.played = true;
    match.winnerId = result.sh > result.sa ? match.homeId : result.sa > result.sh ? match.awayId : (hTm.ov >= aTm.ov ? match.homeId : match.awayId);
    const humanTeam = league.teams.find(t => league.humanPlayers.includes(t.id));
    if (humanTeam) { humanTeam.coins = (humanTeam.coins || 200) + (match.winnerId === humanTeam.id ? 40 : 20); evolveMVP(humanTeam, result.mvp); }
    const phaseDone = copa.bracket.filter(m => m.phase === copa.phase).every(m => m.played);
    if (phaseDone) advanceBracket(copa);
    writeDB(db); res.json({ result, copa, league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/copa/simulate-phase', (req, res) => {
  try {
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league || !league.copa) return res.status(404).json({ error: 'Copa não encontrada' });
    const copa    = league.copa;
    const pending = copa.bracket.filter(m => m.phase === copa.phase && !m.played);
    const humanP  = pending.find(m => league.humanPlayers.some(hp => m.homeId === hp || m.awayId === hp));
    if (humanP) return res.status(400).json({ error: 'Jogue sua partida da Copa antes de simular!' });
    const allT = [...league.teams, ...(copa.teams || [])];
    pending.forEach(m => {
      const h = allT.find(t => t.id === m.homeId), a = allT.find(t => t.id === m.awayId); if (!h || !a) return;
      const r = quickSim(h.ov, a.ov); m.sh = r.sh; m.sa = r.sa; m.played = true; m.summary = `${h.name} ${r.sh}×${r.sa} ${a.name}`;
      m.winnerId = r.sh > r.sa ? m.homeId : r.sa > r.sh ? m.awayId : (h.ov >= a.ov ? m.homeId : m.awayId);
    });
    advanceBracket(copa); writeDB(db); res.json({ copa, league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/leagues/:code/player/:playerId', (req, res) => {
  try {
    const { strategy, formation } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const team = league.teams.find(t => t.id === req.params.playerId); if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    if (strategy)  team.strategy  = strategy;
    if (formation) team.formation = formation;
    writeDB(db); res.json({ team });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/train', (req, res) => {
  try {
    const { playerId, playerIdx, attr } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const team = league.teams.find(t => t.id === playerId);
    if (!team?.players?.[playerIdx]) return res.status(404).json({ error: 'Jogador não encontrado' });
    if ((team.coins || 0) < 10) return res.status(400).json({ error: 'Moedas insuficientes (10 por treino)' });
    const p = team.players[playerIdx];
    if (p[attr] >= 99) return res.status(400).json({ error: 'Atributo já no máximo' });
    p[attr] = Math.min(99, p[attr] + 1);
    p.ov = Math.round((p.spd + p.str + p.tec + p.fin + p.pas + p.int) / 6);
    team.ov   = Math.round(team.players.slice(0, 11).reduce((s, pl) => s + pl.ov, 0) / 11);
    team.coins -= 10;
    writeDB(db); res.json({ player: p, coins: team.coins, teamOv: team.ov });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/market', (req, res) => res.json({ players: marketPlayers() }));

app.post('/api/leagues/:code/buy', (req, res) => {
  try {
    const { playerId, marketPlayerId, sellIdx } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const team = league.teams.find(t => t.id === playerId); if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    const mkt = marketPlayers(), toBuy = mkt.find(p => p.id === marketPlayerId);
    if (!toBuy) return res.status(404).json({ error: 'Jogador não encontrado' });
    if ((team.coins || 0) < toBuy.price) return res.status(400).json({ error: 'Moedas insuficientes' });
    const sellVal = (sellIdx != null && team.players[sellIdx]) ? Math.floor(team.players[sellIdx].ov * 2) : 0;
    if (sellIdx != null && team.players[sellIdx]) team.players[sellIdx] = { ...toBuy, id: uuidv4() };
    else { if (team.players.length >= 23) return res.status(400).json({ error: 'Elenco cheio' }); team.players.push({ ...toBuy, id: uuidv4() }); }
    team.coins = (team.coins || 0) - toBuy.price + sellVal;
    team.ov    = Math.round(team.players.slice(0, 11).reduce((s, p) => s + p.ov, 0) / 11);
    writeDB(db); res.json({ team });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/new-season', (req, res) => {
  try {
    const { playerId } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league || league.status !== 'finished') return res.status(400).json({ error: 'Temporada não encerrada' });
    const divData = DIVISIONS[league.divisionId]; if (!divData) return res.status(400).json({ error: 'Divisão inválida' });
    const humanTeam = league.teams.find(t => t.id === playerId); if (!humanTeam) return res.status(404).json({ error: 'Time não encontrado' });
    agePlayers(humanTeam); humanTeam.moral = 50;
    const aiTeams = divData.teams.map(t => ({ ...t, id: uuidv4(), isHuman: false, strategy: 'Pressão alta', moral: 50 }));
    const teams   = [...aiTeams.slice(0, -1), humanTeam];
    const matches = generateFixtures(teams);
    const copa    = buildCopaBrasil(league.divisionId, teams);
    league.season++;  league.status = 'active'; league.currentRound = 1;
    league.totalRounds = Math.max(...matches.map(m => m.round));
    league.teams   = teams; league.matches = matches; league.finalStandings = null; league.copa = copa;
    writeDB(db); res.json({ league });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leagues/:code/chat', (req, res) => {
  try {
    const { playerId, message } = req.body;
    const db = readDB(), league = db.leagues[req.params.code];
    if (!league) return res.status(404).json({ error: 'Liga não encontrada' });
    const team = league.teams.find(t => t.id === playerId); if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    if (!league.chat) league.chat = [];
    league.chat.push({ playerName: team.playerName, teamName: team.name, message, time: Date.now() });
    if (league.chat.length > 80) league.chat = league.chat.slice(-80);
    writeDB(db); res.json({ chat: league.chat });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leagues/:code/chat', (req, res) => {
  try {
    const db = readDB(), l = db.leagues[req.params.code];
    if (!l) return res.status(404).json({ error: 'Liga não encontrada' });
    res.json({ chat: l.chat || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Handler global de erros — sempre retorna JSON, nunca HTML
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(500).json({ error: err.message || 'Erro interno' });
});
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada: ' + req.path }));

// ══════════════════════════════════════════════════════════════
//  DATA HELPERS
// ══════════════════════════════════════════════════════════════
function defaultSquad(divId) {
  const base = { 'serie-a':{ gk:78,zag:80,lat:76,vol:80,mei:83,ata:85 }, 'serie-b':{ gk:70,zag:72,lat:68,vol:72,mei:76,ata:78 }, 'serie-c':{ gk:62,zag:64,lat:61,vol:63,mei:67,ata:70 }, 'serie-d':{ gk:55,zag:58,lat:55,vol:57,mei:60,ata:63 } }[divId] || { gk:70,zag:72,lat:68,vol:72,mei:76,ata:78 };
  const sp = 4;
  const v  = b => Math.max(40, Math.min(95, b + Math.floor(Math.random() * sp * 2) - sp));
  const n  = arr => arr[Math.floor(Math.random() * arr.length)];
  const gks  = ['Rafael','Diego','Victor','Weverton','Mauro'];
  const zags = ['Thiago','Léo','Gustavo','Anderson','Eduardo'];
  const lats = ['Caio','Renan','Guilherme','João','Matheus'];
  const vols = ['Douglas','Allan','Ederson','Maycon','Fabinho'];
  const meis = ['Everton','Lucas','Marquinhos','Bruno','Oscar'];
  const atas = ['Pedro','Hulk','Vitor','Rodrygo','Richarlison'];
  const mk   = (nm, nu, po, age, bspd, bstr, btec, bfin, bpas, bint) => {
    const spd=v(bspd),str=v(bstr),tec=v(btec),fin=v(bfin),pas=v(bpas),int=v(bint);
    return { id:uuidv4(), name:nm, num:nu, pos:po, age, ov:Math.round((spd+str+tec+fin+pas+int)/6), spd, str, tec, fin, pas, int };
  };
  const b = base;
  return [
    mk(n(gks),  1,'GK', 28, b.gk-10,b.gk-5, b.gk,   b.gk-30,b.gk-10,b.gk+5),
    mk(n(zags), 4,'ZAG',27, b.zag-5,b.zag+8,b.zag-8,b.zag-30,b.zag-15,b.zag+5),
    mk(n(zags), 5,'ZAG',26, b.zag-7,b.zag+6,b.zag-10,b.zag-32,b.zag-18,b.zag+3),
    mk(n(lats), 6,'LAT',25, b.lat+8,b.lat,  b.lat,  b.lat-20,b.lat+2, b.lat-2),
    mk(n(lats), 3,'LAT',24, b.lat+6,b.lat-2,b.lat-2,b.lat-22,b.lat,   b.lat-4),
    mk(n(vols), 8,'VOL',26, b.vol-2,b.vol+5,b.vol,  b.vol-18,b.vol+5, b.vol+8),
    mk(n(meis),10,'MEI',25, b.mei-5,b.mei-8,b.mei+8,b.mei-8, b.mei+8, b.mei+5),
    mk(n(meis), 7,'MEI',23, b.mei-3,b.mei-10,b.mei+5,b.mei-12,b.mei+5,b.mei+2),
    mk(n(atas), 9,'ATA',26, b.ata+2,b.ata,  b.ata,  b.ata+8, b.ata-5, b.ata-2),
    mk(n(atas),11,'ATA',22, b.ata+8,b.ata-12,b.ata+8,b.ata+5,b.ata-5, b.ata-5),
    mk(n(atas),17,'ATA',24, b.ata+5,b.ata-10,b.ata+5,b.ata+2,b.ata-8, b.ata-8),
    mk(n(gks), 22,'GK', 22, b.gk-16,b.gk-10,b.gk-6,b.gk-35,b.gk-15, b.gk),
    mk(n(zags),15,'ZAG',21, b.zag-12,b.zag, b.zag-15,b.zag-35,b.zag-22,b.zag-2),
    mk(n(lats), 2,'LAT',20, b.lat+2,b.lat-5,b.lat-5,b.lat-25,b.lat-5, b.lat-8),
    mk(n(meis),14,'MEI',21, b.mei-8,b.mei-12,b.mei, b.mei-18,b.mei,   b.mei-3),
    mk(n(atas),18,'ATA',19, b.ata+2,b.ata-18,b.ata-6,b.ata-8,b.ata-18,b.ata-12),
  ];
}

function marketPlayers() {
  return [
    { id:'mkt-1',  name:'Neymarinho',       num:11, pos:'ATA', age:28, ov:92, spd:90, str:60, tec:95, fin:85, pas:80, int:82, price:500 },
    { id:'mkt-2',  name:'Gabizão',          num:9,  pos:'ATA', age:27, ov:90, spd:76, str:82, tec:82, fin:93, pas:68, int:84, price:450 },
    { id:'mkt-3',  name:'Craque Véio',      num:10, pos:'MEI', age:30, ov:88, spd:72, str:62, tec:92, fin:75, pas:90, int:88, price:400 },
    { id:'mkt-4',  name:'Zé Muralha',       num:1,  pos:'GK',  age:29, ov:87, spd:58, str:75, tec:88, fin:35, pas:72, int:92, price:350 },
    { id:'mkt-5',  name:'Samba Lateral',    num:6,  pos:'LAT', age:24, ov:85, spd:92, str:72, tec:80, fin:65, pas:82, int:78, price:320 },
    { id:'mkt-6',  name:'Muro de Pedra',    num:5,  pos:'ZAG', age:31, ov:84, spd:65, str:92, tec:72, fin:45, pas:65, int:88, price:300 },
    { id:'mkt-7',  name:'Velocidade Pura',  num:7,  pos:'ATA', age:21, ov:83, spd:96, str:62, tec:82, fin:80, pas:70, int:76, price:280 },
    { id:'mkt-8',  name:'Maestro',          num:8,  pos:'VOL', age:26, ov:82, spd:74, str:80, tec:82, fin:62, pas:86, int:88, price:260 },
    { id:'mkt-9',  name:'Canhotinha',       num:11, pos:'ATA', age:20, ov:80, spd:88, str:58, tec:85, fin:78, pas:75, int:74, price:220 },
    { id:'mkt-10', name:'Goleiro Elástico', num:22, pos:'GK',  age:23, ov:78, spd:52, str:70, tec:80, fin:28, pas:68, int:86, price:180 },
    { id:'mkt-11', name:'Guerreiro',        num:4,  pos:'ZAG', age:28, ov:76, spd:68, str:88, tec:65, fin:40, pas:60, int:80, price:150 },
    { id:'mkt-12', name:'Passe Cirúrgico',  num:8,  pos:'MEI', age:22, ov:75, spd:70, str:60, tec:80, fin:68, pas:92, int:78, price:130 },
    { id:'mkt-13', name:'Promessa',         num:99, pos:'ATA', age:17, ov:62, spd:82, str:55, tec:72, fin:65, pas:58, int:60, price:60  },
    { id:'mkt-14', name:'Jovem Lateral',    num:99, pos:'LAT', age:18, ov:60, spd:84, str:60, tec:66, fin:48, pas:66, int:58, price:50  },
  ];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏟️  Míster FC em http://localhost:${PORT}`);
  console.log(`📋 Série A, B, C, D — Times reais 2026`);
  console.log(`🏆 Copa do Brasil 2026`);
  console.log(`⚡ Motor JS puro\n`);
});
