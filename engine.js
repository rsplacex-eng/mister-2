// ═══════════════════════════════════════════════════════════════
//  MÍSTER FC — engine.js
//  Motor estilo Brasfoot: puro, instantâneo, sem IA externa
// ═══════════════════════════════════════════════════════════════

const STRAT = {
  'Pressão alta':   { atk: 8,  def: -4, can: -6 },
  'Contra-ataque':  { atk: -2, def: 6,  can: 2  },
  'Posse de bola':  { atk: 3,  def: 3,  can: -2 },
  'Jogo direto':    { atk: 6,  def: -2, can: 0  },
  'Defesa sólida':  { atk: -7, def: 12, can: 4  },
  'Gegenpressing':  { atk: 11, def: -7, can: -9 },
};

// Formação → bônus ataque/defesa
const FORM = {
  '4-3-3':   { atk: 6,  def: 0  },
  '4-4-2':   { atk: 4,  def: 4  },
  '3-5-2':   { atk: 2,  def: 6  },
  '4-2-3-1': { atk: 5,  def: 3  },
  '5-3-2':   { atk: 0,  def: 10 },
  '4-1-4-1': { atk: 8,  def: -2 },
};

// Banco de narrações
const NARRACAO = {
  gol_casa: [
    '{p} recebe na área, gira e chuta no canto! GOOOOOL!',
    'Que golaço de {p}! Colocado no ângulo sem chances!',
    '{p} aparece na segunda trave e empurra pra rede!',
    'Jogada genial de {p}! Dribla dois e bate no canto!',
    '{p} aproveita o rebote e fuzila as redes!',
    'Cobrança de falta magistral de {p}! Por cima da barreira!',
    '{p} de cabeça após cruzamento perfeito! GOOOOOL!',
    'Contra-ataque fulminante! {p} cara a cara e não perdoa!',
    '{p} domina e bate cruzado no cantinho! GOOOOOL!',
    'QUE GOLAÇO! {p} de fora da área! Bola explodiu na rede!',
    '{p} cobra pênalti com categoria! Goleiro pulou no lado errado!',
    'Tabela linda entre {p} e o meia! Finalização precisa!',
  ],
  gol_fora: [
    '{p} aparece nas costas da zaga e marca! Que vacilo defensivo!',
    'Contra-ataque mortal! {p} aproveita falha e empurra pra rede!',
    '{p} cobra falta no canto e o goleiro não alcança!',
    'Falha do goleiro! {p} rouba e toca pro gol vazio!',
    'Descuido total da defesa! {p} fica livre e não desperdiça!',
    '{p} dispara em velocidade, dribla o zagueiro e finaliza!',
  ],
  chance_casa: [
    '{p} sai cara a cara mas o goleiro faz defesa espetacular!',
    'Chute forte de {p}! A bola explode na trave!',
    '{p} cobra falta e raspa o travessão! Quase!',
    '{p} cabeceia forte mas o goleiro adversário voa e salva!',
    'Cruzamento na área, {p} antecipa mas manda por cima!',
  ],
  chance_fora: [
    'Perigo! Chute do adversário raspa a trave!',
    'Susto! Centroavante rival cabeceia e a bola passa perto!',
    'Contra-ataque perigoso, mas a zaga corta no último momento!',
    'Goleiro salva de forma espetacular após chute à queima-roupa!',
  ],
  defesa_casa: [
    'Defesa espetacular! O goleiro mergulhou no canto e salvou!',
    'Reflexo incrível! O goleiro tirou da linha com a ponta dos dedos!',
    'Goleiro voa e joga para escanteio! Que segurança!',
  ],
  falta: [
    'Entrada dura no meio-campo. Árbitro marca falta.',
    'Falta tática para parar o contra-ataque adversário.',
    'Carga irregular! Árbitro apita.',
  ],
  amarelo: [
    'Cartão amarelo! Reclamou demais da conta!',
    'Advertido por entrada forte! Torcida protesta!',
    'Amarelo! Jogador pendurado agora.',
  ],
  vermelho: [
    'CARTÃO VERMELHO! Expulso após entrada criminal!',
    'Segundo amarelo! Time fica com dez homens!',
  ],
  sub: [
    'Substituição tática do treinador.',
    'Entra elemento novo buscando mudar o jogo.',
    'Mudança para fechar o resultado.',
  ],
};

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pct(p) { return Math.random() * 100 < p; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getPosName(players, pos) {
  if (!players?.length) return 'Jogador';
  const list = players.filter(p => p.pos === pos);
  return list.length ? pick(list).name : players[0].name;
}
function getAtkName(players) {
  const p = players?.filter(p => ['ATA','MEI'].includes(p.pos));
  return p?.length ? pick(p).name : (players?.[0]?.name || 'Atacante');
}
function getDefName(players) {
  const p = players?.filter(p => ['ZAG','LAT','VOL'].includes(p.pos));
  return p?.length ? pick(p).name : (players?.[0]?.name || 'Defensor');
}
function getGkName(players) {
  const p = players?.find(p => p.pos === 'GK');
  return p?.name || 'Goleiro';
}

// ── Calcula poder efetivo do time ───────────────────────────
function poder(team, casa) {
  const starters = (team.players || []).slice(0, 11);
  const base = starters.length >= 11
    ? Math.round(starters.reduce((s, p) => s + p.ov, 0) / 11)
    : (team.ov || 70);

  const s = STRAT[team.strategy] || STRAT['Pressão alta'];
  const f = FORM[team.formation || '4-3-3'] || FORM['4-3-3'];
  const moral = team.moral || 50; // 0-100
  const moralMod = Math.round((moral - 50) / 10); // -5 a +5
  const casaMod = casa ? 3 : 0;

  return {
    atk: base + s.atk + f.atk + moralMod + casaMod,
    def: base + s.def + f.def + moralMod + casaMod,
    canMod: s.can,
  };
}

// ── Simula partida completa (retorna resultado + log) ───────
function simularPartida(casa, fora) {
  const pc = poder(casa, true);
  const pf = poder(fora, false);

  let golsCasa = 0, golsFora = 0;
  const eventos = [];
  const minutosUsados = new Set();

  function minUnico(base, range = 4) {
    let m = base;
    for (let t = 0; t < 15; t++) {
      if (!minutosUsados.has(m)) { minutosUsados.add(m); return m; }
      m = Math.max(1, Math.min(90, base + rnd(-range, range)));
    }
    return m;
  }

  // Gera slots de minutos: 6-10 eventos por tempo
  const slots1T = Array.from({ length: rnd(4, 6) }, () => rnd(3, 44));
  const slots2T = Array.from({ length: rnd(4, 6) }, () => rnd(46, 89));
  const todosSlots = [...slots1T, ...slots2T].sort((a, b) => a - b);

  let momentumCasa = 0; // -5 a +5

  for (const base of todosSlots) {
    const min = minUnico(base);
    // Cansaço na 2ª metade
    const cansaco = min > 75 ? pc.canMod - 3
                  : min > 60 ? pc.canMod - 1
                  : 0;

    // Ajuste por momentum
    const atkCasa = pc.atk + momentumCasa * 1.5 + cansaco;
    const atkFora = pf.atk - momentumCasa * 1.5 + cansaco;
    const defCasa = pc.def + momentumCasa + cansaco;
    const defFora = pf.def - momentumCasa + cansaco;

    // Decide time dominante no lance
    const totalAtk = Math.max(1, atkCasa + atkFora);
    const eCasa = Math.random() < atkCasa / totalAtk;

    if (eCasa) {
      // Lance do time da casa
      const probGol = Math.max(4, Math.min(55, 14 + (atkCasa - defFora) * 0.55));
      if (pct(probGol)) {
        golsCasa++;
        const scorer = getAtkName(casa.players);
        eventos.push({ min, tipo: 'gol', time: 'casa', player: scorer,
          texto: pick(NARRACAO.gol_casa).replace('{p}', scorer) });
        momentumCasa = Math.min(5, momentumCasa + 2);
      } else if (pct(30)) {
        if (pct(35)) {
          eventos.push({ min, tipo: 'defesa', time: 'fora', player: getGkName(fora.players),
            texto: pick(NARRACAO.defesa_casa) });
        } else {
          const sh = getAtkName(casa.players);
          eventos.push({ min, tipo: 'chance', time: 'casa', player: sh,
            texto: pick(NARRACAO.chance_casa).replace('{p}', sh) });
        }
        momentumCasa = Math.min(5, momentumCasa + 1);
      } else if (pct(15)) {
        const tipo = pct(15) ? 'vermelho' : pct(30) ? 'amarelo' : 'falta';
        eventos.push({ min, tipo, time: 'fora', player: getDefName(fora.players),
          texto: pick(NARRACAO[tipo] || NARRACAO.falta) });
      }
    } else {
      // Lance do time de fora
      const probGol = Math.max(4, Math.min(55, 14 + (atkFora - defCasa) * 0.55));
      if (pct(probGol)) {
        golsFora++;
        const scorer = getAtkName(fora.players);
        eventos.push({ min, tipo: 'gol', time: 'fora', player: scorer,
          texto: pick(NARRACAO.gol_fora).replace('{p}', scorer) });
        momentumCasa = Math.max(-5, momentumCasa - 2);
      } else if (pct(25)) {
        if (pct(35)) {
          eventos.push({ min, tipo: 'defesa', time: 'casa', player: getGkName(casa.players),
            texto: pick(NARRACAO.defesa_casa) });
        } else {
          eventos.push({ min, tipo: 'chance', time: 'fora', player: getAtkName(fora.players),
            texto: pick(NARRACAO.chance_fora) });
        }
        momentumCasa = Math.max(-5, momentumCasa - 1);
      } else if (pct(15)) {
        const tipo = pct(15) ? 'vermelho' : pct(30) ? 'amarelo' : 'falta';
        eventos.push({ min, tipo, time: 'casa', player: getDefName(casa.players),
          texto: pick(NARRACAO[tipo] || NARRACAO.falta) });
      }
    }

    // Momentum decai naturalmente
    momentumCasa *= 0.85;
  }

  // Substituições (1-3 por jogo)
  for (let i = 0; i < rnd(1, 3); i++) {
    const min = minUnico(rnd(55, 85), 3);
    eventos.push({ min, tipo: 'sub', time: pct(55) ? 'casa' : 'fora', player: '',
      texto: pick(NARRACAO.sub) });
  }

  eventos.sort((a, b) => a.min - b.min);

  const resumo = buildResumo(casa.name, fora.name, golsCasa, golsFora);
  const mvp = pickMVP(eventos, casa.players, golsCasa, golsFora);

  return { gc: golsCasa, gf: golsFora, eventos, resumo, mvp };
}

// ── Simulação rápida para NPCs (sem log detalhado) ───────────
function simRapida(ovCasa, ovFora) {
  const ajCasa = ovCasa + rnd(-10, 10) + 3;
  const ajFora = ovFora + rnd(-10, 10);
  const diff = ajCasa - ajFora;
  let pC, pE;
  if      (diff > 15) { pC = 0.72; pE = 0.15; }
  else if (diff > 8)  { pC = 0.58; pE = 0.22; }
  else if (diff > 3)  { pC = 0.46; pE = 0.26; }
  else if (diff > -3) { pC = 0.36; pE = 0.30; }
  else if (diff > -8) { pC = 0.28; pE = 0.26; }
  else if (diff > -15){ pC = 0.20; pE = 0.22; }
  else                { pC = 0.12; pE = 0.16; }
  const r = Math.random();
  if (r < pC) {
    const gc = rnd(1, 4), gf = Math.max(0, gc - rnd(1, 2));
    return { gc, gf };
  } else if (r < pC + pE) {
    const g = rnd(0, 3); return { gc: g, gf: g };
  } else {
    const gf = rnd(1, 4), gc = Math.max(0, gf - rnd(1, 2));
    return { gc, gf };
  }
}

function buildResumo(casa, fora, gc, gf) {
  if (gc > gf) {
    const diff = gc - gf;
    if (diff === 1) return pick([`${casa} vence por 1 gol numa batalha épica!`, `Vitória apertada do ${casa}! Jogo emocionante!`, `${casa} sofre, mas segura o resultado!`]);
    if (diff === 2) return pick([`${casa} domina e vence com mérito!`, `Boa vitória do ${casa}! Resultado justo.`]);
    return pick([`${casa} goleia e mostra força!`, `Noite perfeita do ${casa}! Placar elástico!`]);
  }
  if (gf > gc) {
    const diff = gf - gc;
    if (diff === 1) return pick([`${fora} arranca vitória e deixa a torcida do ${casa} de cabelo em pé!`, `Resultado cruel! ${fora} surpreende em ${casa}.`]);
    if (diff === 2) return pick([`${fora} joga bem e leva os 3 pontos.`, `Derrota para ${casa} que precisa melhorar.`]);
    return pick([`Vexame do ${casa}! ${fora} goleou sem dó!`, `Noite pra esquecer em ${casa}. ${fora} faz história!`]);
  }
  return pick([`Empate justo! Ambos criaram chances mas a bola não quis entrar.`, `${casa} e ${fora} dividem os pontos.`, `Jogo equilibrado. Um ponto para cada!`]);
}

function pickMVP(eventos, players, gc, gf) {
  const scores = {};
  eventos.forEach(e => {
    if (e.player && ['gol','chance','defesa'].includes(e.tipo))
      scores[e.player] = (scores[e.player] || 0) + (e.tipo === 'gol' ? 3 : 1);
  });
  if (!Object.keys(scores).length && players?.length)
    return pick(players.slice(0, 11)).name;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Goleiro';
}

// ── Sistema de envelhecimento ────────────────────────────────
function envelhecerElenco(team) {
  if (!team.players) return;
  const removidos = [];
  team.players = team.players.filter(p => {
    p.idade = (p.idade || rnd(18, 30)) + 1;
    // Jogadores acima de 35 têm chance de se aposentar
    if (p.idade > 35 && pct((p.idade - 35) * 15)) {
      removidos.push(p.name);
      return false;
    }
    // Declínio físico a partir dos 32
    if (p.idade > 32) {
      const attrs = ['spd', 'str', 'fin'];
      attrs.forEach(a => { if (p[a] > 40 && pct(40)) p[a]--; });
    }
    // Evolução natural jovens (até 26 anos)
    if (p.idade < 26 && pct(60)) {
      const attrs = ['spd', 'str', 'tec', 'fin', 'pas', 'int'];
      const a = pick(attrs);
      if (p[a] < 92) p[a]++;
    }
    p.ov = Math.round((p.spd + p.str + p.tec + p.fin + p.pas + p.int) / 6);
    return true;
  });
  // Recalcula OV do time
  if (team.players.length)
    team.ov = Math.round(team.players.reduce((s, p) => s + p.ov, 0) / team.players.length);
  return removidos;
}

// ── Geração de jovem prodígio ────────────────────────────────
function gerarJovem(pos) {
  const nomes = {
    GK: ['Caio Muralha','Felipe Guardião','Thiago Zero','Lucas Arqueiro'],
    ZAG: ['Bruno Pedra','Diego Colosso','Rafael Muro','Alan Parede'],
    LAT: ['Sandro Bala','Caíque Piston','João Foguete','Murilo Lateral'],
    VOL: ['Danilo Ferro','Renan Destruidor','Igor Volante','Patrick Trincheira'],
    MEI: ['Luiz Maestro','Kaio Craque','Vini Articulador','Edu Meia'],
    ATA: ['Gabriel Gol','Matheus Pistola','Léo Matador','Rayan Artilheiro'],
  };
  const ov = rnd(62, 75);
  const spread = () => Math.max(50, Math.min(85, ov + rnd(-12, 12)));
  return {
    id: require('crypto').randomUUID(),
    name: pick(nomes[pos] || nomes.ATA),
    num: rnd(16, 28),
    pos,
    idade: rnd(17, 21),
    ov,
    spd: spread(), str: spread(), tec: spread(),
    fin: spread(), pas: spread(), int: spread(),
    jovem: true,
  };
}

// ── Moral ────────────────────────────────────────────────────
function atualizarMoral(team, resultado) {
  const moral = team.moral || 50;
  const delta = resultado === 'v' ? 12 : resultado === 'e' ? 2 : -10;
  team.moral = Math.max(10, Math.min(99, moral + delta));
}

module.exports = { simularPartida, simRapida, envelhecerElenco, gerarJovem, atualizarMoral };
