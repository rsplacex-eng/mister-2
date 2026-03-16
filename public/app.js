// ── Míster FC ── Frontend completo ──────────────────────────
const API = '';
const FORMATIONS = {
  '4-3-3':   [[50,88],[15,70],[35,72],[65,72],[85,70],[25,50],[50,46],[75,50],[18,18],[50,13],[82,18]],
  '4-4-2':   [[50,88],[15,70],[35,72],[65,72],[85,70],[15,50],[38,50],[62,50],[85,50],[32,18],[68,18]],
  '3-5-2':   [[50,88],[22,72],[50,74],[78,72],[10,50],[28,50],[50,46],[72,50],[90,50],[33,18],[67,18]],
  '4-2-3-1': [[50,88],[15,70],[35,72],[65,72],[85,70],[32,56],[68,56],[18,34],[50,30],[82,34],[50,10]],
  '5-3-2':   [[50,88],[5,72],[20,74],[50,76],[80,74],[95,72],[25,50],[50,46],[75,50],[32,18],[68,18]],
  '4-1-4-1': [[50,88],[15,70],[35,72],[65,72],[85,70],[50,58],[12,40],[34,38],[66,38],[88,40],[50,10]],
};
const STRATS = ['Pressão alta','Contra-ataque','Posse de bola','Jogo direto','Defesa sólida','Gegenpressing'];
const STRAT_MOD = {
  'Pressão alta':  'ATK+8  DEF-5  | Alta pressão, cansa mais',
  'Contra-ataque': 'ATK-3  DEF+7  | Solidez e transições',
  'Posse de bola': 'ATK+2  DEF+3  | Equilíbrio e controle',
  'Jogo direto':   'ATK+5  DEF-3  | Objetivo e rápido',
  'Defesa sólida': 'ATK-8  DEF+14 | Muralha defensiva',
  'Gegenpressing': 'ATK+11 DEF-7  | Máximo risco/ganho',
};
const POS_C = { GK:'#ffd740', ZAG:'#448aff', LAT:'#00e676', VOL:'#ff9800', MEI:'#00bcd4', ATA:'#ff5252' };
const EV_ICONS = { gol:'⚽', chance:'🎯', defesa:'🧤', falta:'🟡', cartao_amarelo:'🟨', cartao_vermelho:'🟥', substituicao:'🔄', escanteio:'🚩', fim:'🏁' };
const PHASE_NAME = p => (['','Oitavas','Quartas','Semifinal','Final','Campeão'][p] || `Fase ${p}`);
const MORAL_LABEL = v => v >= 80 ? '🔥 Em chamas' : v >= 65 ? '😤 Motivado' : v >= 45 ? '😐 Normal' : v >= 30 ? '😟 Abalado' : '😢 Em crise';
const DIV_NAME = id => ({ 'serie-a':'Série A', 'serie-b':'Série B', 'serie-c':'Série C', 'serie-d':'Série D' })[id] || id;

let G = { code:null, playerId:null, league:null, me:null, formation:'4-3-3', strategy:'Pressão alta', divisions:[], chatTimer:null };

// ── Utils ────────────────────────────────────────────────────
const $   = id => document.getElementById(id);
const txt = (id,v) => $(id) && ($(id).textContent = v);
const htm = (id,v) => $(id) && ($(id).innerHTML  = v);
function banner(id, msg, ok=false) {
  const e=$(id); if(!e) return;
  e.textContent=msg; e.className='banner '+(ok?'ok':'err')+' on';
}
function clearBanner(id) { const e=$(id); if(e) e.className='banner'; }
function spin(on, msg='') { $('overlay').classList.toggle('on',on); txt('overlay-msg',msg); }
function timeAgo(ts) {
  const d=Date.now()-ts;
  if(d<60000)  return 'agora';
  if(d<3600000) return Math.floor(d/60000)+'min';
  if(d<86400000) return Math.floor(d/3600000)+'h';
  return Math.floor(d/86400000)+'d';
}
function ovClass(v) { return v>=88?'ov-gold':v>=78?'ov-green':v>=68?'ov-blue':'ov-gray'; }

async function api(path, method='GET', body=null) {
  const opts = { method, headers:{'Content-Type':'application/json'} };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch(API+path, opts);
  const d = await r.json();
  if(!r.ok) throw new Error(d.error||'Erro desconhecido');
  return d;
}
function saveLocal() { localStorage.setItem('mfc5', JSON.stringify({code:G.code, playerId:G.playerId})); }
function loadLocal() { try { return JSON.parse(localStorage.getItem('mfc5')||'null'); } catch { return null; } }

// ── Session ──────────────────────────────────────────────────
async function tryRestore() {
  const s = loadLocal(); if(!s) return false;
  try {
    const d = await api(`/api/leagues/${s.code}`);
    G.league=d.league; G.code=s.code; G.playerId=s.playerId;
    G.me = G.league.teams.find(t=>t.id===G.playerId);
    if(G.me) { G.formation=G.me.formation||'4-3-3'; G.strategy=G.me.strategy||'Pressão alta'; return true; }
  } catch {}
  return false;
}
async function refresh() {
  try {
    const d = await api(`/api/leagues/${G.code}`);
    G.league=d.league; G.me=G.league.teams.find(t=>t.id===G.playerId);
  } catch {}
}

// ── Lobby ────────────────────────────────────────────────────
async function loadDivs() {
  try {
    const d = await api('/api/divisions');
    G.divisions = d.divisions;
    const s = $('inp-div'); if(!s) return;
    s.innerHTML = d.divisions.map(d => `<option value="${d.id}">${d.label} (${d.teamCount} times)</option>`).join('');
    s.value = 'serie-b';
  } catch {}
}

async function createLeague() {
  const name  = $('inp-name')?.value.trim();
  const team  = $('inp-team')?.value;
  const lname = $('inp-lname')?.value.trim() || name+"'s Liga";
  const div   = $('inp-div')?.value || 'serie-b';
  if(!name) { banner('lobby-err','Digite seu nome.'); return; }
  clearBanner('lobby-err');
  try {
    spin(true,'Criando liga, calendário e Copa do Brasil...');
    const d = await api('/api/leagues','POST',{playerName:name, teamName:team, leagueName:lname, divisionId:div});
    G.code=d.code; G.playerId=d.playerId; G.league=d.league;
    G.me = G.league.teams.find(t=>t.id===G.playerId);
    G.formation = G.me?.formation||'4-3-3';
    G.strategy  = G.me?.strategy||'Pressão alta';
    saveLocal(); spin(false); showApp(); goTab('home');
  } catch(e) { spin(false); banner('lobby-err',e.message); }
}

async function joinLeague() {
  const name = $('inp-name')?.value.trim();
  const team = $('inp-team')?.value;
  const code = $('inp-code')?.value.trim().toUpperCase();
  if(!name) { banner('lobby-err','Digite seu nome.'); return; }
  if(!code) { banner('lobby-err','Digite o código.'); return; }
  clearBanner('lobby-err');
  try {
    spin(true,'Entrando na liga...');
    const d = await api(`/api/leagues/${code}/join`,'POST',{playerName:name, teamName:team});
    G.code=code; G.playerId=d.playerId; G.league=d.league;
    G.me = G.league.teams.find(t=>t.id===G.playerId);
    G.formation = G.me?.formation||'4-3-3';
    G.strategy  = G.me?.strategy||'Pressão alta';
    saveLocal(); spin(false); showApp(); goTab('home');
  } catch(e) { spin(false); banner('lobby-err',e.message); }
}

function logout() {
  localStorage.removeItem('mfc5');
  if(G.chatTimer) { clearInterval(G.chatTimer); G.chatTimer=null; }
  G = { code:null, playerId:null, league:null, me:null, formation:'4-3-3', strategy:'Pressão alta', divisions:G.divisions, chatTimer:null };
  $('lobby').style.display='flex';
  $('app').style.display='none';
}

function showApp() {
  $('lobby').style.display='none';
  $('app').style.display='block';
  updateTopbar();
}
function updateTopbar() {
  if(!G.me) return;
  txt('tb-team', G.me.name);
  txt('tb-info', `${G.league.divisionName} · T${G.league.season} · R${G.league.currentRound}/${G.league.totalRounds}`);
}

// ── Tabs ─────────────────────────────────────────────────────
function goTab(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('on'));
  $(`s-${id}`)?.classList.add('on');
  document.querySelectorAll('.tab-btn').forEach(b=>{ if(b.dataset.tab===id) b.classList.add('on'); });
  updateTopbar();
  ({ home:renderHome, match:renderMatch, copa:renderCopa, division:renderDivision,
     squad:renderSquad, tactics:renderTactics, market:renderMarket,
     history:renderHistory, chat:renderChat })[id]?.();
}

// ── Local standings ──────────────────────────────────────────
function getStandings() {
  const s = {};
  (G.league.teams||[]).forEach(t => {
    s[t.id] = { id:t.id, name:t.name, badge:t.badge||'⚽', ov:t.ov, state:t.state||'', isHuman:!!t.isHuman, moral:t.moral||50, pts:0, j:0, v:0, e:0, d:0, gp:0, gc:0 };
  });
  (G.league.matches||[]).filter(m=>m.played).forEach(m => {
    const h=s[m.homeId], a=s[m.awayId]; if(!h||!a) return;
    h.j++; a.j++; h.gp+=m.sh; h.gc+=m.sa; a.gp+=m.sa; a.gc+=m.sh;
    if(m.sh>m.sa)      { h.v++; h.pts+=3; a.d++; }
    else if(m.sh===m.sa){ h.e++; h.pts++;  a.e++; a.pts++; }
    else                { a.v++; a.pts+=3; h.d++; }
  });
  return Object.values(s).sort((a,b)=>b.pts-a.pts||(b.gp-b.gc)-(a.gp-a.gc)||b.gp-a.gp);
}

// ── HOME ─────────────────────────────────────────────────────
function renderHome() {
  if(!G.me) return;
  const st  = getStandings();
  const pos = st.findIndex(t=>t.id===G.playerId)+1;
  const me  = st.find(t=>t.id===G.playerId) || {pts:0,v:0,e:0,d:0,gp:0,gc:0};
  const div = G.divisions.find(d=>d.id===G.league.divisionId)||{};
  const myM = G.league.matches.find(m=>m.round===G.league.currentRound&&!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));
  const opp = myM ? G.league.teams.find(t=>t.id===(myM.homeId===G.playerId?myM.awayId:myM.homeId)) : null;
  const copa = G.league.copa;
  const copaM = copa?.bracket.find(m=>m.phase===copa.phase&&!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));
  const copaOpp = copaM ? [...(copa?.teams||[]),...G.league.teams].find(t=>t.id===(copaM.homeId===G.playerId?copaM.awayId:copaM.homeId)) : null;
  const finished = G.league.status==='finished';

  htm('home-body', `
    <div class="page-title">${G.me.name} <span class="badge-div">${G.league.divisionName}</span></div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <span class="code-chip" onclick="navigator.clipboard?.writeText('${G.code}');banner('home-banner','Código ${G.code} copiado!',true);setTimeout(()=>clearBanner('home-banner'),3000)">📋 ${G.code}</span>
      <span style="font-size:12px;color:var(--t3)">Temporada ${G.league.season} · ${G.league.totalRounds} rodadas</span>
      <span class="moral-tag">${MORAL_LABEL(G.me.moral||50)}</span>
    </div>
    <div id="home-banner" class="banner" style="margin-bottom:12px"></div>
    ${finished ? finishedHtml(st,div) : ''}
    <div class="stat-row">
      <div class="stat-box"><div class="stat-n green">${G.me.ov}</div><div class="stat-l">Força</div></div>
      <div class="stat-box"><div class="stat-n yellow">${me.pts}</div><div class="stat-l">Pontos</div></div>
      <div class="stat-box"><div class="stat-n">${pos>0?pos+'º':'—'}</div><div class="stat-l">Posição</div></div>
      <div class="stat-box"><div class="stat-n green">${me.v}</div><div class="stat-l">Vitórias</div></div>
      <div class="stat-box"><div class="stat-n">${me.e}</div><div class="stat-l">Empates</div></div>
      <div class="stat-box"><div class="stat-n red">${me.d}</div><div class="stat-l">Derrotas</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${myM&&!finished
        ? `<div class="next-match-card" onclick="goTab('match')">
            <div style="font-size:10px;color:var(--green);text-transform:uppercase;letter-spacing:.7px;font-weight:700;margin-bottom:4px">Campeonato · R${G.league.currentRound}</div>
            <div style="font-weight:700;font-size:14px">${G.me.name}</div>
            <div style="font-size:12px;color:var(--t2);margin:2px 0">vs</div>
            <div style="font-weight:700;font-size:14px">${opp?.name||'?'}</div>
            <div style="font-size:11px;color:var(--green);margin-top:4px">Toque para jogar ▶</div>
          </div>`
        : `<div class="card" style="cursor:pointer" onclick="goTab('division')">
            <div style="font-size:10px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:6px">Campeonato</div>
            <div style="font-size:20px;font-weight:700">${pos}º lugar</div>
            <div style="font-size:12px;color:var(--t3)">${me.pts} pts · ${G.league.divisionName}</div>
          </div>`}
      ${copa&&copaM
        ? `<div class="copa-match-card" onclick="goTab('copa')">
            <div style="font-size:10px;color:var(--yellow);text-transform:uppercase;letter-spacing:.7px;font-weight:700;margin-bottom:4px">🏆 Copa · ${PHASE_NAME(copa.phase)}</div>
            <div style="font-weight:700;font-size:14px">${G.me.name}</div>
            <div style="font-size:12px;color:rgba(255,215,64,.7);margin:2px 0">vs</div>
            <div style="font-weight:700;font-size:14px">${copaOpp?.name||'?'}</div>
            <div style="font-size:11px;color:var(--yellow);margin-top:4px">Toque para jogar ▶</div>
          </div>`
        : copa?.status==='finished'
          ? `<div class="card" style="border-color:rgba(255,215,64,.3);background:rgba(255,215,64,.05)">
              <div style="font-size:10px;color:var(--yellow);font-weight:700;margin-bottom:6px">🏆 Copa do Brasil</div>
              <div style="font-size:13px;font-weight:600;color:var(--yellow)">Campeão:</div>
              <div style="font-size:14px;font-weight:700">${copa.winner||'—'}</div>
            </div>`
          : `<div class="card" style="cursor:pointer" onclick="goTab('copa')">
              <div style="font-size:10px;color:var(--t3);text-transform:uppercase;font-weight:700;margin-bottom:6px">🏆 Copa do Brasil</div>
              <div style="font-size:14px;font-weight:600">${copa ? PHASE_NAME(copa.phase) : '—'}</div>
              <div style="font-size:11px;color:var(--t3);margin-top:4px">Ver chaveamento</div>
            </div>`}
    </div>
    <div class="section-title">Últimos resultados</div>
    <div class="card">${recentResultsHtml()}</div>
    <div class="section-title" style="margin-top:14px">Próximos jogos</div>
    <div class="card">${upcomingHtml()}</div>
  `);
}

function finishedHtml(st, div) {
  const pos  = st.findIndex(t=>t.id===G.playerId)+1;
  const zone = st.find(t=>t.id===G.playerId)?.zone;
  const msg  = zone==='promote' ? `🎉 PROMOVIDO para a ${DIV_NAME(div.up||'')}! ${pos}º lugar`
             : zone==='relegate'? `😢 REBAIXADO. ${pos}º lugar`
             : `✅ Temporada ${G.league.season} encerrada. ${pos}º lugar`;
  const c = zone==='promote'?'var(--green)':zone==='relegate'?'var(--red)':'var(--yellow)';
  return `<div class="card" style="margin-bottom:14px;border-color:${c};background:${c}18;text-align:center">
    <div style="font-family:var(--fh);font-size:20px;font-weight:900;color:${c}">${msg}</div>
    <button class="btn green" style="margin-top:12px" onclick="newSeason()">▶ Iniciar Temporada ${G.league.season+1}</button>
  </div>`;
}

function recentResultsHtml() {
  const mine = (G.league.matches||[])
    .filter(m=>m.played&&(m.homeId===G.playerId||m.awayId===G.playerId))
    .slice(-5).reverse();
  if(!mine.length) return '<div class="empty">Nenhum jogo ainda. Vá em Campeonato!</div>';
  return mine.map(m=>{
    const isH=m.homeId===G.playerId, my=isH?m.sh:m.sa, th=isH?m.sa:m.sh;
    const won=my>th, drew=my===th;
    const c=won?'var(--green)':drew?'var(--yellow)':'var(--red)';
    const oppT=G.league.teams.find(t=>t.id===(isH?m.awayId:m.homeId));
    return `<div class="result-row clickable" onclick="showMatchLog('${m.homeId}','${m.awayId}',${m.round})">
      <span class="res-badge" style="background:${c}22;color:${c};border-color:${c}44">${won?'V':drew?'E':'D'}</span>
      <span class="res-teams">${isH?G.me.name:oppT?.name||'?'} <b>${m.sh}–${m.sa}</b> ${isH?oppT?.name||'?':G.me.name}</span>
      <span class="res-sum">${m.summary||''}</span>
    </div>`;
  }).join('');
}

function upcomingHtml() {
  const upc = (G.league.matches||[])
    .filter(m=>!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId))
    .slice(0,4);
  if(!upc.length) return '<div class="empty">Nenhum jogo agendado.</div>';
  return upc.map(m=>{
    const isH=m.homeId===G.playerId;
    const oppT=G.league.teams.find(t=>t.id===(isH?m.awayId:m.homeId));
    return `<div class="result-row">
      <span style="font-size:11px;color:var(--t3);min-width:28px">R${m.round}</span>
      <span class="res-teams">${isH?G.me.name:oppT?.name||'?'} vs ${isH?oppT?.name||'?':G.me.name}</span>
      <span style="font-size:11px;color:var(--t3)">${isH?'Casa':'Fora'}</span>
    </div>`;
  }).join('');
}

async function newSeason() {
  try {
    spin(true,'Iniciando nova temporada...');
    const d = await api(`/api/leagues/${G.code}/new-season`,'POST',{playerId:G.playerId});
    G.league=d.league; G.me=G.league.teams.find(t=>t.id===G.playerId);
    G.formation=G.me?.formation||'4-3-3'; G.strategy=G.me?.strategy||'Pressão alta';
    spin(false); goTab('home');
  } catch(e) { spin(false); alert(e.message); }
}

// ── CAMPEONATO ───────────────────────────────────────────────
function renderMatch() {
  const round = G.league.currentRound;
  const roundM = G.league.matches.filter(m=>m.round===round);
  const myM = roundM.find(m=>!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));
  const opp = myM ? G.league.teams.find(t=>t.id===(myM.homeId===G.playerId?myM.awayId:myM.homeId)) : null;

  htm('match-body',`
    <div class="page-title">Campeonato — Rodada ${round}</div>
    ${myM ? `
      <div class="matchup-card">
        <div class="mu-team">
          <div class="mu-badge">${G.me.badge||'⚽'}</div>
          <div class="mu-name">${G.me.name}</div>
          <div class="mu-ov">OV ${G.me.ov}</div>
          <div class="mu-sub">${G.formation} · ${G.strategy.split(' ')[0]}</div>
          <div class="mu-sub">${MORAL_LABEL(G.me.moral||50)}</div>
        </div>
        <div class="mu-sep">VS</div>
        <div class="mu-team right">
          <div class="mu-badge">${opp?.badge||'⚽'}</div>
          <div class="mu-name">${opp?.name||'?'}</div>
          <div class="mu-ov">OV ${opp?.ov||'?'}</div>
          <div class="mu-sub">${opp?.isHuman?'👤 Humano':'🤖 CPU'}</div>
          <div class="mu-sub">${MORAL_LABEL(opp?.moral||50)}</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:14px">${predictionText(G.me,opp)}</div>
      <button class="btn green full lg" id="play-btn" onclick="playMatch('${myM.homeId}','${myM.awayId}')">⚽ Jogar agora</button>
      <div id="match-result" style="margin-top:16px"></div>`
    :`<div class="card" style="text-align:center;padding:24px">
        <div style="font-size:14px;color:var(--t2);margin-bottom:14px">${G.league.status==='finished'?'Temporada encerrada!':'Rodada já jogada.'}</div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn green" onclick="simNPCRound().then(()=>goTab('division'))">⚡ Simular NPCs e avançar</button>
          <button class="btn" onclick="goTab('division')">Ver classificação</button>
        </div>
      </div>`}
    <div id="match-history" style="margin-top:20px"></div>
  `);
  renderMatchHistory();
}

function predictionText(me, opp) {
  if(!opp) return '—';
  const d = me.ov - opp.ov;
  if(d>10)  return `Você é amplamente favorito. Diferença de ${d} pontos de força.`;
  if(d>4)   return `Você tem vantagem, mas não é garantido.`;
  if(d>-4)  return `Jogo equilibrado. Tática e moral serão decisivos.`;
  if(d>-10) return `O adversário é levemente favorito. Cuidado!`;
  return `Jogo difícil. Adversário ${Math.abs(d)} pontos mais forte.`;
}

function renderMatchHistory() {
  const mine = (G.league.matches||[])
    .filter(m=>m.played&&(m.homeId===G.playerId||m.awayId===G.playerId))
    .slice(-3).reverse();
  if(!mine.length) return;
  htm('match-history',`
    <div class="section-title">Jogos recentes</div>
    <div class="card">
      ${mine.map(m=>{
        const isH=m.homeId===G.playerId, my=isH?m.sh:m.sa, th=isH?m.sa:m.sh;
        const won=my>th, drew=my===th;
        const c=won?'var(--green)':drew?'var(--yellow)':'var(--red)';
        const oppT=G.league.teams.find(t=>t.id===(isH?m.awayId:m.homeId));
        return `<div class="result-row clickable" onclick="showMatchLog('${m.homeId}','${m.awayId}',${m.round})">
          <span class="res-badge" style="background:${c}22;color:${c};border-color:${c}44">${won?'V':drew?'E':'D'}</span>
          <span class="res-teams">${isH?G.me.name:oppT?.name||'?'} <b>${m.sh}–${m.sa}</b> ${isH?oppT?.name||'?':G.me.name}</span>
          <span style="font-size:11px;color:var(--green)">lances ▶</span>
        </div>`;
      }).join('')}
    </div>`);
}

async function playMatch(homeId, awayId) {
  const btn=$('play-btn'); if(btn) btn.disabled=true;
  try {
    const d = await api(`/api/leagues/${G.code}/match`,'POST',{homeId,awayId});
    G.league=d.league; G.me=G.league.teams.find(t=>t.id===G.playerId);
    const r=d.result, isH=homeId===G.playerId;
    const my=isH?r.sh:r.sa, th=isH?r.sa:r.sh;
    const won=my>th, drew=my===th;
    const c=won?'var(--green)':drew?'var(--yellow)':'var(--red)';
    const oppT=G.league.teams.find(t=>t.id===(homeId===G.playerId?awayId:homeId));
    const coins=won?30:drew?15:10;
    htm('match-result',`
      <div class="result-banner" style="border-color:${c};background:${c}18">
        <div class="rb-score">
          <span>${G.me.name}</span>
          <span class="rb-num">${r.sh}</span>
          <span class="rb-sep">–</span>
          <span class="rb-num">${r.sa}</span>
          <span>${oppT?.name||'?'}</span>
        </div>
        <div class="rb-res" style="color:${c}">${won?'VITÓRIA! 🏆':drew?'EMPATE':'DERROTA'}</div>
        <div class="rb-sum">${r.summary}</div>
        ${r.mvp?`<div class="rb-mvp">🏅 MVP: ${r.mvp}</div>`:''}
        <div class="rb-coins">+${coins} 🪙 · Moral: ${MORAL_LABEL(G.me.moral||50)}</div>
      </div>
      <div class="section-title">Lances da partida</div>
      <div class="card match-log">
        ${(r.events||[]).map(ev=>`
          <div class="log-ev">
            <span class="log-min">${ev.time}'</span>
            <span class="log-icon">${EV_ICONS[ev.type]||'⚪'}</span>
            <div class="log-body">
              ${ev.player?`<span class="log-player" style="color:${ev.team==='home'?'var(--green)':'var(--red)'}">${ev.player}</span>`:''}
              <span class="log-desc">${ev.desc}</span>
            </div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <button class="btn green" onclick="goTab('division')">Ver classificação</button>
        <button class="btn" onclick="simNPCRound().then(()=>renderMatch())">⚡ Simular NPCs</button>
      </div>`);
    updateTopbar();
  } catch(e) {
    htm('match-result',`<div class="banner err on">${e.message}</div>`);
    if(btn) btn.disabled=false;
  }
}

function showMatchLog(homeId, awayId, round) {
  const m = G.league.matches.find(x=>x.round===round&&((x.homeId===homeId&&x.awayId===awayId)||(x.homeId===awayId&&x.awayId===homeId)));
  if(!m?.events) return;
  const h=G.league.teams.find(t=>t.id===m.homeId), a=G.league.teams.find(t=>t.id===m.awayId);
  $('modal-title').textContent=`${h?.name||'?'} ${m.sh}–${m.sa} ${a?.name||'?'}`;
  $('modal-body').innerHTML=`<div class="card match-log">
    ${m.events.map(ev=>`<div class="log-ev">
      <span class="log-min">${ev.time}'</span>
      <span class="log-icon">${EV_ICONS[ev.type]||'⚪'}</span>
      <div class="log-body">
        ${ev.player?`<span class="log-player" style="color:${ev.team==='home'?'var(--green)':'var(--red)'}">${ev.player}</span>`:''}
        <span class="log-desc">${ev.desc}</span>
      </div>
    </div>`).join('')}
    <div class="log-ev"><span class="log-min">90'</span><span class="log-icon">🏁</span><div class="log-body"><span class="log-desc">${m.summary}</span></div></div>
  </div>`;
  $('modal').classList.add('on');
}

function closeModal() { $('modal').classList.remove('on'); }

async function simNPCRound() {
  try {
    spin(true,'Simulando partidas dos NPCs...');
    const d = await api(`/api/leagues/${G.code}/simulate-round`,'POST',{playerId:G.playerId});
    G.league=d.league; G.me=G.league.teams.find(t=>t.id===G.playerId);
    spin(false);
  } catch(e) { spin(false); alert(e.message); }
}

// ── COPA DO BRASIL ───────────────────────────────────────────
async function renderCopa() {
  await refresh();
  const copa = G.league.copa;
  if(!copa) { htm('copa-body','<div class="empty">Copa do Brasil não disponível.</div>'); return; }
  const allT = [...G.league.teams,...(copa.teams||[])];
  const phaseM  = copa.bracket.filter(m=>m.phase===copa.phase);
  const myM     = phaseM.find(m=>!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));
  const npcPend = phaseM.some(m=>!m.played&&!G.league.humanPlayers.some(hp=>m.homeId===hp||m.awayId===hp));
  const myDone  = copa.bracket.filter(m=>m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));

  htm('copa-body',`
    <div class="page-title">🏆 Copa do Brasil 2026</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <span class="badge-div" style="color:var(--yellow)">${copa.status==='finished'?`Campeão: ${copa.winner||'—'}`:`${PHASE_NAME(copa.phase)} · Fase ${copa.phase}/${copa.maxPhase}`}</span>
      ${copa.status!=='finished'&&!myM&&npcPend?`<button class="btn sm" style="color:var(--yellow);border-color:rgba(255,215,64,.4)" onclick="simCopaPhase()">⚡ Simular NPCs</button>`:''}
      <button class="btn sm" onclick="renderCopa()">↺</button>
    </div>
    ${copa.status==='finished'?`
      <div class="copa-winner-card">
        <div style="font-size:48px;margin-bottom:8px">🏆</div>
        <div style="font-family:var(--fh);font-size:30px;font-weight:900;color:var(--yellow)">CAMPEÃO</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px">${copa.winner||'—'}</div>
      </div>`:''}
    ${myM?`
      <div class="section-title">Seu jogo — ${PHASE_NAME(copa.phase)}</div>
      ${(()=>{
        const opp=allT.find(t=>t.id===(myM.homeId===G.playerId?myM.awayId:myM.homeId));
        return `<div class="matchup-card" style="border-color:rgba(255,215,64,.3)">
          <div class="mu-team"><div class="mu-badge">${G.me.badge||'⚽'}</div><div class="mu-name">${G.me.name}</div><div class="mu-ov">OV ${G.me.ov}</div></div>
          <div class="mu-sep" style="color:var(--yellow)">VS</div>
          <div class="mu-team right"><div class="mu-badge">${opp?.badge||'⚽'}</div><div class="mu-name">${opp?.name||'?'}</div><div class="mu-ov">OV ${opp?.ov||'?'}</div></div>
        </div>`;
      })()}
      <button class="btn yellow full lg" id="copa-play-btn" style="margin-bottom:16px" onclick="playCopaMatch('${myM.id}')">🏆 Jogar Copa do Brasil</button>
      <div id="copa-result"></div>`:''}
    <div class="section-title">Chaveamento — ${PHASE_NAME(copa.phase)}</div>
    <div class="card">
      ${phaseM.map(m=>{
        const h=allT.find(t=>t.id===m.homeId), a=allT.find(t=>t.id===m.awayId);
        const isMe=m.homeId===G.playerId||m.awayId===G.playerId;
        return `<div class="match-row ${isMe?'me-match':''}">
          <span class="mrow-home" style="${m.winnerId===m.homeId?'color:var(--green);font-weight:700':'opacity:.65'}">${h?.badge||''} ${h?.name||'?'}</span>
          <span class="mrow-score">${m.played?`<b>${m.sh}–${m.sa}</b>`:'<span class="pending">–</span>'}</span>
          <span class="mrow-away" style="${m.winnerId===m.awayId?'color:var(--green);font-weight:700':'opacity:.65'}">${a?.badge||''} ${a?.name||'?'}</span>
        </div>`;
      }).join('')}
    </div>
    ${myDone.length?`
      <div class="section-title">Seus jogos na Copa</div>
      <div class="card">${myDone.map(m=>{
        const isH=m.homeId===G.playerId;
        const won=m.winnerId===G.playerId;
        const c=won?'var(--yellow)':'var(--red)';
        const oppT=allT.find(t=>t.id===(isH?m.awayId:m.homeId));
        return `<div class="result-row clickable" onclick="showCopaMatchLog('${m.id}')">
          <span class="res-badge" style="background:${c}22;color:${c};border-color:${c}44">${won?'✓':'✗'}</span>
          <span class="res-teams">${isH?G.me.name:oppT?.name||'?'} <b>${m.sh}–${m.sa}</b> ${isH?oppT?.name||'?':G.me.name}</span>
          <span class="res-sum">${PHASE_NAME(m.phase)} · ${m.summary||''}</span>
        </div>`;
      }).join('')}</div>`:''}
  `);
}

function showCopaMatchLog(matchId) {
  const m = G.league.copa?.bracket.find(x=>x.id===matchId);
  if(!m?.events) return;
  const allT=[...G.league.teams,...(G.league.copa.teams||[])];
  const h=allT.find(t=>t.id===m.homeId), a=allT.find(t=>t.id===m.awayId);
  $('modal-title').textContent=`🏆 ${h?.name||'?'} ${m.sh}–${m.sa} ${a?.name||'?'}`;
  $('modal-body').innerHTML=`<div class="card match-log">
    ${m.events.map(ev=>`<div class="log-ev">
      <span class="log-min">${ev.time}'</span>
      <span class="log-icon">${EV_ICONS[ev.type]||'⚪'}</span>
      <div class="log-body">
        ${ev.player?`<span class="log-player" style="color:${ev.team==='home'?'var(--yellow)':'var(--red)'}">${ev.player}</span>`:''}
        <span class="log-desc">${ev.desc}</span>
      </div>
    </div>`).join('')}
  </div>`;
  $('modal').classList.add('on');
}

async function playCopaMatch(matchId) {
  const btn=$('copa-play-btn'); if(btn) btn.disabled=true;
  try {
    const d = await api(`/api/leagues/${G.code}/copa/match`,'POST',{matchId});
    G.league=d.league; G.me=G.league.teams.find(t=>t.id===G.playerId);
    const r=d.result, copa=d.copa;
    const m=copa.bracket.find(x=>x.id===matchId);
    const humanWon=m?.winnerId===G.playerId;
    const c=humanWon?'var(--yellow)':'var(--red)';
    const allT=[...G.league.teams,...(copa.teams||[])];
    const opp=allT.find(t=>t.id!=G.playerId&&(m?.homeId===t.id||m?.awayId===t.id));
    htm('copa-result',`
      <div class="result-banner" style="border-color:${c};background:${c}18">
        <div class="rb-score">
          <span>${G.me.name}</span><span class="rb-num">${r.sh}</span>
          <span class="rb-sep">–</span><span class="rb-num">${r.sa}</span>
          <span>${opp?.name||'?'}</span>
        </div>
        <div class="rb-res" style="color:${c}">${humanWon?'CLASSIFICADO! 🏆':'ELIMINADO'}</div>
        <div class="rb-sum">${r.summary}</div>
        ${r.mvp?`<div class="rb-mvp">🏅 MVP: ${r.mvp}</div>`:''}
        <div class="rb-coins">+${humanWon?40:20} 🪙</div>
      </div>
      <div class="section-title">Lances</div>
      <div class="card match-log">
        ${(r.events||[]).map(ev=>`<div class="log-ev">
          <span class="log-min">${ev.time}'</span>
          <span class="log-icon">${EV_ICONS[ev.type]||'⚪'}</span>
          <div class="log-body">
            ${ev.player?`<span class="log-player" style="color:${ev.team==='home'?'var(--yellow)':'var(--red)'}">${ev.player}</span>`:''}
            <span class="log-desc">${ev.desc}</span>
          </div>
        </div>`).join('')}
      </div>`);
    setTimeout(()=>renderCopa(), 400);
  } catch(e) {
    htm('copa-result',`<div class="banner err on">${e.message}</div>`);
    if(btn) btn.disabled=false;
  }
}

async function simCopaPhase() {
  try {
    spin(true,'Simulando Copa...');
    const d = await api(`/api/leagues/${G.code}/copa/simulate-phase`,'POST',{});
    G.league=d.league; spin(false); renderCopa();
  } catch(e) { spin(false); alert(e.message); }
}

// ── CLASSIFICAÇÃO ────────────────────────────────────────────
async function renderDivision() {
  await refresh();
  const st  = getStandings();
  const div = G.divisions.find(d=>d.id===G.league.divisionId)||{};
  const n=st.length, pN=div.promoteTop||0, rN=div.relegateBottom||0;
  const round  = G.league.currentRound;
  const roundM = G.league.matches.filter(m=>m.round===round);
  const myPend = roundM.find(m=>!m.played&&(m.homeId===G.playerId||m.awayId===G.playerId));
  const npcPend= roundM.some(m=>!m.played&&!G.league.humanPlayers.some(hp=>m.homeId===hp||m.awayId===hp));

  htm('division-body',`
    <div class="page-title">${G.league.divisionName}</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--t3)">R${round}/${G.league.totalRounds} · T${G.league.season}</span>
      ${!myPend&&npcPend&&G.league.status==='active'?`<button class="btn green sm" onclick="simNPCRound().then(()=>renderDivision())">⚡ Simular NPCs</button>`:''}
      <button class="btn sm" onclick="renderDivision()">↺ Atualizar</button>
    </div>
    ${pN>0||rN>0?`<div class="zone-legend">
      ${pN>0?`<span class="zl promote">▲ Top ${pN} → ${DIV_NAME(div.up||'')}</span>`:''}
      ${rN>0?`<span class="zl relegate">▼ Bottom ${rN} → ${DIV_NAME(div.down||'')}</span>`:''}
    </div>`:''}
    <div class="card table-card">
      <table class="standings-table">
        <thead><tr>
          <th>#</th><th>Time</th><th>Pts</th>
          <th>J</th><th>V</th><th>E</th><th>D</th>
          <th>GP</th><th>GC</th><th>SG</th><th>OV</th>
        </tr></thead>
        <tbody>
          ${st.map((t,i)=>{
            const isMe=t.id===G.playerId;
            const isUp=pN>0&&i<pN, isDn=rN>0&&i>=n-rN;
            const sg=t.gp-t.gc;
            const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
            const zc=isMe?'mine':isUp?'promote-row':isDn?'relegate-row':'';
            return `<tr class="${zc}">
              <td class="pos-cell">${medal||i+1}</td>
              <td class="team-cell">
                <div class="team-inner">
                  <span>${t.badge}</span>
                  <span class="${isMe?'my-name':''}">${t.name}${t.isHuman?' 👤':''}</span>
                  ${t.state?`<span class="state-tag">${t.state}</span>`:''}
                </div>
              </td>
              <td class="pts-cell">${t.pts}</td>
              <td>${t.j}</td>
              <td class="v-cell">${t.v}</td>
              <td>${t.e}</td>
              <td class="d-cell">${t.d}</td>
              <td>${t.gp}</td><td>${t.gc}</td>
              <td class="${sg>=0?'v-cell':'d-cell'}">${sg>=0?'+':''}${sg}</td>
              <td class="ov-cell">${t.ov}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="section-title">Rodada ${round}</div>
    <div class="card">
      ${roundM.length===0?'<div class="empty">Sem partidas nesta rodada.</div>':roundM.map(m=>{
        const h=G.league.teams.find(t=>t.id===m.homeId);
        const a=G.league.teams.find(t=>t.id===m.awayId);
        const isMe=m.homeId===G.playerId||m.awayId===G.playerId;
        return `<div class="match-row ${isMe?'me-match':''}">
          <span class="mrow-home">${h?.badge||''} ${h?.name||'?'}</span>
          <span class="mrow-score">${m.played?`<b>${m.sh}–${m.sa}</b>`:'<span class="pending">–</span>'}</span>
          <span class="mrow-away">${a?.badge||''} ${a?.name||'?'}</span>
        </div>`;
      }).join('')}
    </div>
  `);
}

// ── ELENCO ───────────────────────────────────────────────────
function renderSquad() {
  if(!G.me?.players) return;
  const ov = Math.round(G.me.players.slice(0,11).reduce((s,p)=>s+p.ov,0)/11);
  htm('squad-body',`
    <div class="page-title">Elenco</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <span style="font-size:13px;color:var(--t2)">${G.me.players.length} jogadores · Força média: <b style="color:var(--green)">${ov}</b></span>
      <span class="coins-tag">🪙 ${G.me.coins||0} moedas</span>
    </div>
    <div id="squad-banner" class="banner" style="margin-bottom:12px"></div>
    <div class="player-grid">${G.me.players.map((p,i)=>playerCardHtml(p,i)).join('')}</div>
  `);
}

function playerCardHtml(p, i) {
  const c = POS_C[p.pos]||'#888';
  const ageC = p.age>=33?'var(--red)':p.age<=21?'var(--green)':'var(--t3)';
  return `<div class="pcard" onclick="openTrainModal(${i})">
    <div class="pcard-top">
      <span class="pos-tag" style="background:${c}22;color:${c};border-color:${c}44">${p.pos}</span>
      <span style="font-size:10px;color:${ageC};font-weight:600">${p.age||'?'}a</span>
    </div>
    <div class="pcard-name">${p.name}</div>
    <div class="pcard-ov">${p.ov}</div>
    ${['spd','str','tec','fin','pas','int'].map(a=>`
      <div class="pbar">
        <span class="pbar-l">${a}</span>
        <div class="pbar-t"><div class="pbar-f" style="width:${p[a]}%;background:${c}"></div></div>
        <span class="pbar-v">${p[a]}</span>
      </div>`).join('')}
    <div style="font-size:10px;color:var(--t3);margin-top:6px;text-align:center">toque para treinar</div>
  </div>`;
}

function openTrainModal(idx) {
  const p = G.me?.players?.[idx]; if(!p) return;
  const c = POS_C[p.pos]||'#888';
  const coins = G.me.coins||0;
  const aLabels = {spd:'Velocidade',str:'Força',tec:'Técnica',fin:'Finalização',pas:'Passe',int:'Inteligência'};
  $('modal-title').textContent = `Treinar — ${p.name}`;
  $('modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div class="ov-ring ${ovClass(p.ov)}">${p.ov}</div>
      <div>
        <b style="font-size:15px">${p.name}</b>
        <div style="font-size:12px;color:var(--t3)">${p.pos} · ${p.age||'?'} anos</div>
      </div>
      <div style="margin-left:auto" class="coins-tag">🪙 ${coins}</div>
    </div>
    <div style="font-size:12px;color:var(--t3);margin-bottom:14px">
      Custo: <b style="color:var(--yellow)">10 🪙</b> por atributo.<br>
      MVP ganha +1 automático após cada partida.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${Object.entries(aLabels).map(([a,lbl])=>{
        const can = coins>=10 && p[a]<99;
        return `<div class="card sm" style="cursor:${can?'pointer':'default'};opacity:${can?1:.4}" onclick="${can?`trainAttr(${idx},'${a}')`:''}" >
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:12px;color:var(--t2)">${lbl}</span>
            <span style="font-family:var(--fh);font-size:20px;font-weight:900;color:${c}">${p[a]}</span>
          </div>
          <div class="pbar-t"><div class="pbar-f" style="width:${p[a]}%;background:${c}"></div></div>
          <div style="font-size:10px;color:var(--t3);margin-top:4px;text-align:center">${p[a]>=99?'MAX':'+1 por 10🪙'}</div>
        </div>`;
      }).join('')}
    </div>`;
  $('modal').classList.add('on');
}

async function trainAttr(idx, attr) {
  try {
    spin(true,'Treinando...');
    const d = await api(`/api/leagues/${G.code}/train`,'POST',{playerId:G.playerId, playerIdx:idx, attr});
    G.me.players[idx] = {...G.me.players[idx], ...d.player};
    G.me.coins=d.coins; G.me.ov=d.teamOv;
    spin(false); closeModal(); renderSquad();
    banner('squad-banner',`${G.me.players[idx].name}: ${attr.toUpperCase()} agora é ${d.player[attr]}!`, true);
    setTimeout(()=>clearBanner('squad-banner'), 3000);
  } catch(e) { spin(false); alert(e.message); }
}

// ── TÁTICA ───────────────────────────────────────────────────
function renderTactics() {
  if(!G.me) return;
  const players = G.me.players||[];
  const ov = players.length ? Math.round(players.slice(0,11).reduce((s,p)=>s+p.ov,0)/Math.min(11,players.length)) : 0;

  htm('tactics-body',`
    <div class="page-title">Tática</div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
      <div>
        <div class="label">Formação</div>
        <div class="form-pills">
          ${Object.keys(FORMATIONS).map(f=>`<button class="fpill${G.formation===f?' on':''}" onclick="setForm('${f}')">${f}</button>`).join('')}
        </div>
        <div class="pitch-box"><svg id="pitch-svg" viewBox="0 0 200 280" style="width:200px;display:block"></svg></div>
      </div>
      <div style="flex:1;min-width:200px">
        <div class="label">Estratégia</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px">
          ${STRATS.map(s=>`<button class="strat-btn${G.strategy===s?' on':''}" onclick="setStrat('${s}')">
            <span style="font-weight:600;font-size:14px">${s}</span>
            <span style="font-size:11px;color:var(--t3);font-family:var(--fh)">${STRAT_MOD[s]||''}</span>
          </button>`).join('')}
        </div>
        <div class="card" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11px;color:var(--t3)">Força atual</div>
              <div style="font-family:var(--fh);font-size:48px;font-weight:900;color:var(--green);line-height:1">${ov}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--t3)">Moral</div>
              <div style="font-size:16px;font-weight:600">${MORAL_LABEL(G.me.moral||50)}</div>
              <div style="font-size:11px;color:var(--t3);margin-top:4px">🪙 ${G.me.coins||0} moedas</div>
            </div>
          </div>
        </div>
        <button class="btn green full" onclick="saveTactics()">Salvar tática</button>
        <div id="tac-banner" class="banner" style="margin-top:10px"></div>
      </div>
    </div>
  `);
  drawPitch();
}

function setForm(f) { G.formation=f; renderTactics(); }
function setStrat(s) { G.strategy=s; renderTactics(); }

async function saveTactics() {
  try {
    await api(`/api/leagues/${G.code}/player/${G.playerId}`,'PUT',{formation:G.formation, strategy:G.strategy});
    if(G.me) { G.me.formation=G.formation; G.me.strategy=G.strategy; }
    banner('tac-banner','Tática salva!',true);
    setTimeout(()=>clearBanner('tac-banner'), 2000);
  } catch(e) { banner('tac-banner',e.message); }
}

function drawPitch() {
  const svg=$('pitch-svg'); if(!svg||!G.me?.players) return;
  const W=200, H=280;
  const pos = FORMATIONS[G.formation]||FORMATIONS['4-3-3'];
  const pl  = G.me.players.slice(0,11);
  const px  = x => Math.round(x/100*W*.88+W*.06);
  const py  = y => Math.round(y/100*H*.88+H*.06);
  let h = `<rect width="${W}" height="${H}" fill="#0a2a0a"/>
    ${[0,1,2,3,4,5].map(i=>`<rect x="0" y="${i*H/6}" width="${W}" height="${H/12}" fill="#0d2e0d" opacity=".5"/>`).join('')}
    <rect x="${W*.06}" y="${H*.05}" width="${W*.88}" height="${H*.9}" fill="none" stroke="#1a4a1a" stroke-width="1.2"/>
    <line x1="${W*.06}" y1="${H/2}" x2="${W*.94}" y2="${H/2}" stroke="#1a4a1a" stroke-width="1"/>
    <circle cx="${W/2}" cy="${H/2}" r="${W*.1}" fill="none" stroke="#1a4a1a" stroke-width="1"/>
    <rect x="${W*.26}" y="${H*.05}" width="${W*.48}" height="${H*.13}" fill="none" stroke="#1a4a1a" stroke-width=".7"/>
    <rect x="${W*.26}" y="${H*.82}" width="${W*.48}" height="${H*.13}" fill="none" stroke="#1a4a1a" stroke-width=".7"/>`;
  pos.forEach(([ax,ay],i)=>{
    const p=pl[i]; if(!p) return;
    const c=POS_C[p.pos]||'#888', cx=px(ax), cy=py(ay), r=W*.044;
    h+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity=".9"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.round(r*.9)}" font-weight="700"
        font-family="Barlow Condensed,sans-serif" fill="#000">${p.num}</text>`;
  });
  svg.innerHTML = h;
}

// ── MERCADO ──────────────────────────────────────────────────
async function renderMarket() {
  htm('market-body',`<div class="page-title">Mercado</div><div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`);
  try {
    const d = await api('/api/market');
    const coins = G.me?.coins||0;
    htm('market-body',`
      <div class="page-title">Mercado de Transferências</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:13px;color:var(--t2)">${d.players.length} jogadores disponíveis</span>
        <span class="coins-tag">🪙 ${coins} moedas</span>
      </div>
      <div id="mkt-banner" class="banner" style="margin-bottom:12px"></div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">
        Compre vendendo um titular. O valor de venda é o OV do vendido × 2.
      </div>
      ${d.players.map(p=>{
        const c=POS_C[p.pos]||'#888', can=coins>=p.price;
        const ageC=p.age<=20?'var(--green)':p.age>=31?'var(--red)':'var(--t3)';
        return `<div class="mkt-card">
          <div class="ov-ring ${ovClass(p.ov)}" style="min-width:46px">${p.ov}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${p.name}</div>
            <div style="font-size:12px;color:var(--t3)">${p.pos} · <span style="color:${ageC}">${p.age||'?'} anos</span></div>
            <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">
              ${['spd','str','tec','fin','pas','int'].map(a=>`<span style="font-size:10px;color:${c}">${a} ${p[a]}</span>`).join('')}
            </div>
          </div>
          <div style="text-align:right;min-width:80px">
            <div class="coins-tag" style="justify-content:flex-end;margin-bottom:6px">🪙 ${p.price}</div>
            <button class="btn sm ${can?'green':''}" ${can?'':' disabled'} onclick="buyPlayer('${p.id}')">
              ${can?'Comprar':'Sem moedas'}
            </button>
          </div>
        </div>`;
      }).join('')}
    `);
  } catch(e) { htm('market-body',`<div class="banner err on">${e.message}</div>`); }
}

async function buyPlayer(id) {
  const d = await api('/api/market');
  const p = d.players.find(x=>x.id===id); if(!p) return;
  const lineup = G.me.players.slice(0,11);
  const choice = prompt(
    `Comprar ${p.name} (OV ${p.ov}, ${p.age}a) por 🪙${p.price}.\n\n` +
    `Você receberá OV×2 pelo vendido.\n\n` +
    `Digite o número (1-11) do jogador a vender:\n` +
    lineup.map((pl,i)=>`${i+1}. ${pl.name} (${pl.pos} OV${pl.ov} ${pl.age||'?'}a)`).join('\n')
  );
  const sellIdx = parseInt(choice)-1;
  if(isNaN(sellIdx)||sellIdx<0||sellIdx>=lineup.length) return;
  try {
    spin(true,'Realizando transferência...');
    const r = await api(`/api/leagues/${G.code}/buy`,'POST',{playerId:G.playerId, marketPlayerId:id, sellIdx});
    G.me=r.team; G.league.teams=G.league.teams.map(t=>t.id===G.me.id?G.me:t);
    spin(false);
    banner('mkt-banner',`${p.name} contratado! Vendido: ${lineup[sellIdx].name}`,true);
    setTimeout(()=>{clearBanner('mkt-banner'); renderMarket();}, 2000);
  } catch(e) { spin(false); banner('mkt-banner',e.message); }
}

// ── HISTÓRICO ────────────────────────────────────────────────
function renderHistory() {
  const hist = G.league.history||[];
  htm('history-body',`
    <div class="page-title">Histórico de Temporadas</div>
    ${!hist.length
      ? '<div class="card"><div class="empty">Nenhuma temporada encerrada ainda.</div></div>'
      : hist.slice().reverse().map(h=>{
          const me=h.standings.find(t=>t.isHuman);
          const pos=h.standings.findIndex(t=>t.isHuman)+1;
          const c=me?.zone==='promote'?'var(--green)':me?.zone==='relegate'?'var(--red)':'var(--yellow)';
          return `<div class="card" style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
              <div style="font-family:var(--fh);font-size:18px;font-weight:900">T${h.season} — ${h.divisionName}</div>
              <span style="font-size:14px;font-weight:700;color:${c}">${pos}º · ${me?.pts||0} pts · ${me?.v||0}V ${me?.e||0}E ${me?.d||0}D</span>
            </div>
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              <tr style="color:var(--t3)">
                <th style="text-align:left;padding:3px 0;font-weight:600">Time</th>
                <th style="text-align:center;font-weight:600">Pts</th>
                <th style="text-align:center;font-weight:600">V</th>
                <th style="text-align:center;font-weight:600">E</th>
                <th style="text-align:center;font-weight:600">D</th>
                <th style="text-align:center;font-weight:600">SG</th>
              </tr>
              ${h.standings.slice(0,5).map((t,i)=>`
                <tr style="${t.isHuman?'color:var(--green);font-weight:600':''}">
                  <td style="padding:3px 0">${i+1}. ${t.name}</td>
                  <td style="text-align:center">${t.pts}</td>
                  <td style="text-align:center">${t.v}</td>
                  <td style="text-align:center">${t.e}</td>
                  <td style="text-align:center">${t.d}</td>
                  <td style="text-align:center">${t.gp-t.gc>=0?'+':''}${t.gp-t.gc}</td>
                </tr>`).join('')}
            </table>
          </div>`;
        }).join('')}
  `);
}

// ── CHAT ─────────────────────────────────────────────────────
async function renderChat() {
  htm('chat-body',`
    <div class="page-title">Chat da Liga</div>
    <div class="card" style="margin-bottom:10px">
      <div class="chat-log" id="chat-log">
        <div class="empty">Sem mensagens ainda. Diga olá!</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <input class="inp" id="chat-inp" placeholder="Sua mensagem..." style="margin:0;flex:1"
        onkeydown="if(event.key==='Enter')sendChat()"/>
      <button class="btn green" onclick="sendChat()">Enviar</button>
    </div>
  `);
  await loadChat();
  if(G.chatTimer) clearInterval(G.chatTimer);
  G.chatTimer = setInterval(loadChat, 8000);
}

async function loadChat() {
  try {
    const d = await api(`/api/leagues/${G.code}/chat`);
    const log = $('chat-log'); if(!log) return;
    if(!d.chat?.length) { log.innerHTML='<div class="empty">Sem mensagens ainda.</div>'; return; }
    log.innerHTML = d.chat.map(m=>{
      const isMine = m.playerName===G.me?.playerName;
      return `<div class="chat-msg ${isMine?'mine':''}">
        <div class="chat-meta">${m.playerName} · ${m.teamName} · ${timeAgo(m.time)}</div>
        <div class="chat-bubble">${m.message}</div>
      </div>`;
    }).join('');
    log.scrollTop = log.scrollHeight;
  } catch {}
}

async function sendChat() {
  const inp=$('chat-inp'); if(!inp) return;
  const msg=inp.value.trim(); if(!msg) return;
  inp.value='';
  try { await api(`/api/leagues/${G.code}/chat`,'POST',{playerId:G.playerId, message:msg}); await loadChat(); }
  catch {}
}

// ── INIT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadDivs();
  if(await tryRestore()) { showApp(); goTab('home'); }
  else { $('lobby').style.display='flex'; $('app').style.display='none'; }
});
