// ═══════════════════════════════════════════════════════════════
//  MÍSTER FC — engine.js
//  Motor estilo Brasfoot: puro, instantâneo, sem IA externa
// ═══════════════════════════════════════════════════════════════

const STRAT = {
  'Pressão alta':   { atk:  8, def: -4, can: -6 },
  'Contra-ataque':  { atk: -2, def:  6, can:  2 },
  'Posse de bola':  { atk:  3, def:  3, can: -2 },
  'Jogo direto':    { atk:  6, def: -2, can:  0 },
  'Defesa sólida':  { atk: -7, def: 12, can:  4 },
  'Gegenpressing':  { atk: 11, def: -7, can: -9 },
};

const FORM_MOD = {
  '4-3-3':   { atk: 6, def: 0  },
  '4-4-2':   { atk: 4, def: 4  },
  '3-5-2':   { atk: 2, def: 6  },
  '4-2-3-1': { atk: 5, def: 3  },
  '5-3-2':   { atk: 0, def: 10 },
  '4-1-4-1': { atk: 8, def: -2 },
};

const NARR = {
  gol_h: [
    '{p} recebe na área, gira e chuta no canto! GOOOOOL!',
    'Que golaço de {p}! No ângulo sem chances pro goleiro!',
    '{p} aparece na segunda trave e empurra pra rede! GOL!',
    'Jogada genial de {p}! Dribla dois e finaliza! GOOOOL!',
    '{p} de cabeça após cruzamento perfeito! GOOOOOL!',
    'Falta magistral de {p}! Por cima da barreira! GOL!',
    'Contra-ataque fulminante! {p} cara a cara e não perdoa!',
    'QUE GOLAÇO! {p} de fora da área! Bomba na rede!',
    '{p} domina, gira e bate cruzado! GOOOOOL!',
    '{p} aproveita rebote e fuzila as redes! A torcida vai à loucura!',
  ],
  gol_a: [
    '{p} aparece nas costas da zaga e marca! Vacilo defensivo!',
    'Contra-ataque letal! {p} aproveita e empurra pra rede!',
    '{p} cobra falta no canto. Goleiro não alcança!',
    'Falha da defesa! {p} rouba e toca pro gol vazio!',
    '{p} dispara em velocidade, dribla e finaliza! Gol do adversário!',
  ],
  chance_h: [
    '{p} sai cara a cara mas o goleiro faz defesa incrível!',
    'Chute de {p} explode na trave! Quase!',
    '{p} cobra falta e raspa o travessão! Ufa!',
    '{p} cabeceia forte mas o goleiro voa e salva!',
  ],
  chance_a: [
    'Susto! Adversário chuta e passa perto da trave!',
    'Perigo! Centroavante rival cabeceia e a bola vai perto!',
    'O goleiro salva espetacularmente após chute rival!',
  ],
  defesa: [
    'Defesa espetacular! Goleiro mergulhou e salvou no canto!',
    'Reflexo incrível! Tirou da linha com a ponta dos dedos!',
    'Goleiro voa e joga para escanteio! Que segurança!',
  ],
  falta: [
    'Entrada dura. Árbitro marca falta.',
    'Falta tática para parar o contra-ataque.',
    'Carga irregular! Árbitro apita.',
  ],
  cartao_amarelo: [
    'Cartão amarelo! Reclamou demais!',
    'Advertido por entrada forte!',
    'Amarelo! Jogador pendurado.',
  ],
  substituicao: [
    'Substituição tática do treinador.',
    'Entra novo elemento buscando mudar o jogo.',
    'Mudança para fechar o resultado.',
  ],
  escanteio: [
    'Escanteio! Bola na área mas a defesa afasta.',
    'Cobrança de escanteio! Confusão na área.',
  ],
};

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pct(p)    { return Math.random() * 100 < p; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getAtk(players)  { const p = (players||[]).filter(x => ['ATA','MEI'].includes(x.pos)); return p.length ? pick(p).name : 'Atacante'; }
function getDef(players)  { const p = (players||[]).filter(x => ['ZAG','LAT','VOL'].includes(x.pos)); return p.length ? pick(p).name : 'Defensor'; }
function getGK(players)   { const p = (players||[]).find(x => x.pos === 'GK'); return p?.name || 'Goleiro'; }

// ── Poder efetivo do time ────────────────────────────────────
function calcPower(team, isHome) {
  const starters = (team.players || []).slice(0, 11);
  const base = starters.length >= 11
    ? Math.round(starters.reduce((s, p) => s + p.ov, 0) / 11)
    : (team.ov || 70);
  const s  = STRAT[team.strategy]    || STRAT['Pressão alta'];
  const f  = FORM_MOD[team.formation] || FORM_MOD['4-3-3'];
  const moralMod = Math.round(((team.moral || 50) - 50) / 10);
  const homeMod  = isHome ? 3 : 0;
  return {
    atk: base + s.atk + f.atk + moralMod + homeMod,
    def: base + s.def + f.def + moralMod + homeMod,
    can: s.can,
  };
}

// ── Simulação completa (com log de lances) ───────────────────
// Retorna: { sh, sa, events, summary, mvp }
function simulateMatch(homeTeam, awayTeam) {
  const hp = calcPower(homeTeam, true);
  const ap = calcPower(awayTeam, false);
  const homePl = homeTeam.players || [];
  const awayPl = awayTeam.players || [];

  let sh = 0, sa = 0;
  const events = [];
  const usedMin = new Set();

  function uniqMin(base, range) {
    range = range || 4;
    for (let i = 0; i < 15; i++) {
      const m = clamp(base + rnd(-range, range), 1, 90);
      if (!usedMin.has(m)) { usedMin.add(m); return m; }
    }
    return base;
  }

  const slots = [
    ...Array.from({ length: rnd(4, 6) }, () => rnd(3,  44)),
    ...Array.from({ length: rnd(4, 6) }, () => rnd(46, 89)),
  ].sort((a, b) => a - b);

  let momentum = 0;

  for (const base of slots) {
    const min = uniqMin(base);
    const fatigue = min > 75 ? hp.can - 3 : min > 60 ? hp.can - 1 : 0;
    const hAtk = hp.atk + momentum * 1.5 + fatigue;
    const aAtk = ap.atk - momentum * 1.5 + fatigue;
    const hDef = hp.def + momentum + fatigue;
    const aDef = ap.def - momentum + fatigue;
    const total = Math.max(1, hAtk + aAtk);
    const isHome = Math.random() < hAtk / total;

    if (isHome) {
      const gp = clamp(14 + (hAtk - aDef) * 0.55, 4, 55);
      if (pct(gp)) {
        sh++;
        const scorer = getAtk(homePl);
        events.push({ time:min, type:'gol', team:'home', player:scorer, desc: pick(NARR.gol_h).replace('{p}', scorer) });
        momentum = clamp(momentum + 2, -5, 5);
      } else if (pct(28)) {
        if (pct(38)) {
          events.push({ time:min, type:'defesa', team:'home', player:getGK(awayPl), desc: pick(NARR.defesa) });
        } else {
          const pl = getAtk(homePl);
          events.push({ time:min, type:'chance', team:'home', player:pl, desc: pick(NARR.chance_h).replace('{p}', pl) });
        }
        momentum = clamp(momentum + 1, -5, 5);
      } else if (pct(14)) {
        const type = pct(20) ? 'cartao_amarelo' : pct(15) ? 'escanteio' : 'falta';
        events.push({ time:min, type, team:'away', player:getDef(awayPl), desc: pick(NARR[type] || NARR.falta) });
      }
    } else {
      const gp = clamp(14 + (aAtk - hDef) * 0.55, 4, 55);
      if (pct(gp)) {
        sa++;
        const scorer = getAtk(awayPl);
        events.push({ time:min, type:'gol', team:'away', player:scorer, desc: pick(NARR.gol_a).replace('{p}', scorer) });
        momentum = clamp(momentum - 2, -5, 5);
      } else if (pct(24)) {
        if (pct(35)) {
          events.push({ time:min, type:'defesa', team:'away', player:getGK(homePl), desc: pick(NARR.defesa) });
        } else {
          events.push({ time:min, type:'chance', team:'away', player:getAtk(awayPl), desc: pick(NARR.chance_a) });
        }
        momentum = clamp(momentum - 1, -5, 5);
      } else if (pct(14)) {
        const type = pct(20) ? 'cartao_amarelo' : 'falta';
        events.push({ time:min, type, team:'home', player:getDef(homePl), desc: pick(NARR[type] || NARR.falta) });
      }
    }
    momentum *= 0.85;
  }

  // Substituições
  for (let i = 0; i < rnd(1, 2); i++) {
    events.push({ time:uniqMin(rnd(55,83),3), type:'substituicao', team:pct(55)?'home':'away', player:'', desc: pick(NARR.substituicao) });
  }

  events.sort((a, b) => a.time - b.time);

  const summary = buildSummary(homeTeam.name, awayTeam.name, sh, sa);
  const mvp     = pickMVP(events, homePl);

  return { sh, sa, events, summary, mvp };
}

// ── Simulação rápida para NPCs ───────────────────────────────
// Retorna: { sh, sa }
function quickSim(homeOv, awayOv, homeMoral, awayMoral) {
  homeMoral = homeMoral || 50;
  awayMoral = awayMoral || 50;
  const hAdj = homeOv + rnd(-10, 10) + 3 + Math.round((homeMoral - 50) / 10);
  const aAdj = awayOv + rnd(-10, 10)     + Math.round((awayMoral - 50) / 10);
  const diff = hAdj - aAdj;
  let ph, pe;
  if      (diff > 15) { ph = 0.72; pe = 0.15; }
  else if (diff > 8)  { ph = 0.58; pe = 0.22; }
  else if (diff > 3)  { ph = 0.46; pe = 0.26; }
  else if (diff > -3) { ph = 0.36; pe = 0.30; }
  else if (diff > -8) { ph = 0.28; pe = 0.26; }
  else if (diff > -15){ ph = 0.20; pe = 0.22; }
  else                { ph = 0.12; pe = 0.16; }
  const r = Math.random();
  if (r < ph) {
    const sh = rnd(1, 4), sa = Math.max(0, sh - rnd(1, 2));
    return { sh, sa };
  } else if (r < ph + pe) {
    const g = rnd(0, 3); return { sh: g, sa: g };
  } else {
    const sa = rnd(1, 4), sh = Math.max(0, sa - rnd(1, 2));
    return { sh, sa };
  }
}

// ── Moral ────────────────────────────────────────────────────
// Chamada: updateMoral(team, won, drew)
function updateMoral(team, won, drew) {
  const moral = team.moral || 50;
  const delta = won ? 10 : drew ? 2 : -8;
  team.moral = clamp(moral + delta, 10, 99);
}

// ── Envelhecimento ───────────────────────────────────────────
function agePlayers(team) {
  if (!team.players) return;
  team.players = team.players.filter(p => {
    p.age = (p.age || 24) + 1;
    if (p.age > 37) return false; // aposentado
    // Declínio a partir dos 32
    if (p.age > 32) {
      if (p.spd > 40 && pct(45)) p.spd--;
      if (p.age > 34 && p.str > 40 && pct(35)) p.str--;
    }
    // Evolução natural até 26
    if (p.age < 26 && pct(55)) {
      const attrs = ['spd','str','tec','fin','pas','int'];
      const a = pick(attrs);
      if (p[a] < 93) p[a]++;
    }
    p.ov = Math.round((p.spd + p.str + p.tec + p.fin + p.pas + p.int) / 6);
    return true;
  });
  if (team.players.length) {
    team.ov = Math.round(team.players.slice(0, 11).reduce((s, p) => s + p.ov, 0) / Math.min(11, team.players.length));
  }
}

// ── Helpers ──────────────────────────────────────────────────
function buildSummary(home, away, sh, sa) {
  if (sh === sa) {
    return pick([
      `Empate justo! Ambos criaram boas chances.`,
      `${home} e ${away} dividem os pontos.`,
      `Jogo equilibrado, um ponto para cada.`,
    ]);
  }
  const [win, los, ws, ls] = sh > sa ? [home, away, sh, sa] : [away, home, sa, sh];
  const mg = ws - ls;
  if (mg >= 3) return pick([`${win} goleia e mostra força! ${ws}x${ls}`, `Noite impecável do ${win}! ${ws}x${ls}`]);
  if (mg === 2) return pick([`${win} vence com autoridade! ${ws}x${ls}`, `Boa vitória do ${win}. ${ws}x${ls}`]);
  return pick([`${win} vence no sufoco! ${ws}x${ls}`, `${win} segura a pressão e leva os 3 pontos!`]);
}

function pickMVP(events, players) {
  const sc = {};
  events.forEach(e => {
    if (e.player && ['gol','chance','defesa'].includes(e.type))
      sc[e.player] = (sc[e.player] || 0) + (e.type === 'gol' ? 3 : 1);
  });
  if (!Object.keys(sc).length && players?.length)
    return pick(players.slice(0, 11)).name;
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Capitão';
}

module.exports = { simulateMatch, quickSim, updateMoral, agePlayers };
