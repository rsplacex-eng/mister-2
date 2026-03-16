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
function readDB()   { if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE,JSON.stringify({leagues:{}})); return JSON.parse(fs.readFileSync(DB_FILE,'utf-8')); }
function writeDB(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2)); }
function genCode()  { return 'MSTR-'+Math.random().toString(36).slice(2,6).toUpperCase(); }

// ══════════════════════════════════════════════════════════════
//  DIVISÕES — Times reais 2026 (fontes: CBF, Wikipedia, ESPN)
// ══════════════════════════════════════════════════════════════
const DIVISIONS = {

  // ── Série A 2026 ──────────────────────────────────────────
  // 16 permaneceram + 4 subiram (Coritiba campeão da B,
  // Athletico-PR vice, Chapecoense, Remo)
  // Rebaixados 2025: Sport, Juventude, Ceará, Fortaleza
  'serie-a': {
    name:'Série A', label:'Brasileirão Série A 2026',
    promoteTop:0, relegateBottom:4, up:null, down:'serie-b',
    teams:[
      // Permaneceram da A 2025
      {name:'Flamengo',      badge:'🔴⚫',ov:91,state:'RJ'},
      {name:'Palmeiras',     badge:'🟢',  ov:90,state:'SP'},
      {name:'Atlético-MG',   badge:'⚫⚪',ov:87,state:'MG'},
      {name:'Cruzeiro',      badge:'🔵',  ov:85,state:'MG'},
      {name:'Corinthians',   badge:'⚫⚪',ov:84,state:'SP'},
      {name:'Grêmio',        badge:'🔵⚫',ov:83,state:'RS'},
      {name:'São Paulo',     badge:'🔴⚫',ov:82,state:'SP'},
      {name:'Internacional', badge:'🔴',  ov:82,state:'RS'},
      {name:'Botafogo',      badge:'⚫⚪',ov:81,state:'RJ'},
      {name:'Fluminense',    badge:'🔴🟢',ov:80,state:'RJ'},
      {name:'Santos',        badge:'⚪⚫',ov:79,state:'SP'},
      {name:'Vasco',         badge:'⚫⚪',ov:77,state:'RJ'},
      {name:'Bahia',         badge:'🔵🔴',ov:76,state:'BA'},
      {name:'RB Bragantino', badge:'🔴⚪',ov:75,state:'SP'},
      {name:'Mirassol',      badge:'🟡🔵',ov:74,state:'SP'},
      {name:'Vitória',       badge:'🔴⚫',ov:72,state:'BA'},
      // Promovidos da B 2025
      {name:'Coritiba',      badge:'🟢⚪',ov:74,state:'PR'},  // Campeão B
      {name:'Athletico-PR',  badge:'🔴⚫',ov:73,state:'PR'},  // Vice B
      {name:'Chapecoense',   badge:'🟢',  ov:70,state:'SC'},
      {name:'Remo',          badge:'🔵',  ov:68,state:'PA'},
    ]},

  // ── Série B 2026 ──────────────────────────────────────────
  // 12 permaneceram + 4 desceram da A + 4 subiram da C
  // Desceram da A: Sport, Juventude, Ceará, Fortaleza
  // Subiram da C: Ponte Preta (campeã), Londrina, Náutico, São Bernardo
  'serie-b': {
    name:'Série B', label:'Brasileirão Série B 2026',
    promoteTop:4, relegateBottom:4, up:'serie-a', down:'serie-c',
    teams:[
      // Desceram da Série A 2025
      {name:'Fortaleza',     badge:'🔴🔵',ov:74,state:'CE'},
      {name:'Ceará',         badge:'⚫⚪',ov:72,state:'CE'},
      {name:'Juventude',     badge:'🟢⚪',ov:70,state:'RS'},
      {name:'Sport',         badge:'🔴⚫',ov:69,state:'PE'},
      // Permaneceram na B
      {name:'Criciúma',      badge:'🟡⚫',ov:68,state:'SC'},
      {name:'Goiás',         badge:'🟢⚪',ov:67,state:'GO'},
      {name:'Novorizontino', badge:'🟡⚫',ov:66,state:'SP'},
      {name:'CRB',           badge:'🔴⚫',ov:65,state:'AL'},
      {name:'Avaí',          badge:'🔵⚪',ov:64,state:'SC'},
      {name:'Cuiabá',        badge:'🟡⚫',ov:63,state:'MT'},
      {name:'Atlético-GO',   badge:'🔴⚫',ov:62,state:'GO'},
      {name:'Operário-PR',   badge:'⚫⚪',ov:61,state:'PR'},
      {name:'Vila Nova',     badge:'🔴⚫',ov:60,state:'GO'},
      {name:'América-MG',    badge:'🟢',  ov:60,state:'MG'},
      {name:'Athletic Club', badge:'🔴⚫',ov:59,state:'MG'},
      {name:'Botafogo-SP',   badge:'⚫⚪',ov:58,state:'SP'},
      // Subiram da Série C 2025
      {name:'Ponte Preta',   badge:'⚫⚪',ov:67,state:'SP'},  // Campeã C
      {name:'Londrina',      badge:'🔴⚪',ov:64,state:'PR'},  // Vice C
      {name:'Náutico',       badge:'🔴⚪',ov:62,state:'PE'},
      {name:'São Bernardo',  badge:'🔴⚪',ov:60,state:'SP'},
    ]},

  // ── Série C 2026 ──────────────────────────────────────────
  // 8 não passaram de fase nem rebaixados + 4 nos quadrangulares
  // + 4 desceram da B + 4 subiram da D
  // Desceram da B 2025: Paysandu, Amazonas, Ferroviária, Volta Redonda
  // Subiram da D 2025: Inter de Limeira, Barra, Maranhão, Santa Cruz
  'serie-c': {
    name:'Série C', label:'Brasileirão Série C 2026',
    promoteTop:4, relegateBottom:4, up:'serie-b', down:'serie-d',
    teams:[
      // Desceram da Série B 2025
      {name:'Paysandu',      badge:'🔵⚪',ov:58,state:'PA'},
      {name:'Amazonas',      badge:'⚫🔴',ov:56,state:'AM'},
      {name:'Ferroviária',   badge:'🔴⚫',ov:55,state:'SP'},
      {name:'Volta Redonda', badge:'🔴⚫',ov:54,state:'RJ'},
      // Permaneceram — chegaram à 2ª fase mas não subiram
      {name:'Guarani',       badge:'🟢⚪',ov:58,state:'SP'},
      {name:'Floresta',      badge:'🟢⚪',ov:52,state:'CE'},
      {name:'Brusque',       badge:'🔵⚪',ov:51,state:'SC'},
      {name:'Caxias',        badge:'🔴⚫',ov:50,state:'RS'},
      // Permaneceram — não chegaram à 2ª fase
      {name:'Confiança',     badge:'🔵🔴',ov:49,state:'SE'},
      {name:'Ypiranga',      badge:'🔴🟡',ov:49,state:'RS'},
      {name:'Maringá',       badge:'🔵⚪',ov:48,state:'PR'},
      {name:'Ituano',        badge:'🔴⚪',ov:48,state:'SP'},
      {name:'Botafogo-PB',   badge:'⚫⚪',ov:47,state:'PB'},
      {name:'Figueirense',   badge:'⚫⚪',ov:47,state:'SC'},
      {name:'Anápolis',      badge:'🔴⚫',ov:46,state:'GO'},
      {name:'Itabaiana',     badge:'🔵⚪',ov:45,state:'SE'},
      // Subiram da Série D 2025
      {name:'Inter de Limeira',badge:'🟡⚫',ov:55,state:'SP'},
      {name:'Barra',         badge:'🔵⚪',ov:52,state:'SC'},
      {name:'Maranhão',      badge:'🔵🔴',ov:51,state:'MA'},
      {name:'Santa Cruz',    badge:'🔴⚫',ov:53,state:'PE'},
    ]},

  // ── Série D 2026 ──────────────────────────────────────────
  // 96 times reais — representados por 20 dos mais conhecidos
  // Fonte: CBF oficial, 16 grupos de 6 times
  'serie-d': {
    name:'Série D', label:'Brasileirão Série D 2026',
    promoteTop:6, relegateBottom:0, up:'serie-c', down:null,
    teams:[
      // Nordeste
      {name:'ABC-RN',          badge:'🔴⚫',ov:48,state:'RN'},
      {name:'Treze-PB',        badge:'🔴⚫',ov:46,state:'PB'},
      {name:'Ferroviário-CE',  badge:'🔴⚫',ov:47,state:'CE'},
      {name:'Retrô-PE',        badge:'🟢⚫',ov:46,state:'PE'},
      {name:'CSA-AL',          badge:'🔵⚪',ov:45,state:'AL'},
      {name:'Juazeirense-BA',  badge:'🔴🔵',ov:44,state:'BA'},
      // Centro-Oeste
      {name:'Gama-DF',         badge:'🔵',  ov:45,state:'DF'},
      {name:'Brasiliense-DF',  badge:'🟢',  ov:44,state:'DF'},
      {name:'Luverdense-MT',   badge:'🟢⚫',ov:43,state:'MT'},
      {name:'Aparecidense-GO', badge:'🔴⚪',ov:43,state:'GO'},
      // Sudeste/SP
      {name:'Tombense-MG',     badge:'🔴⚫',ov:48,state:'MG'},
      {name:'Portuguesa-SP',   badge:'🔴⚪',ov:47,state:'SP'},
      {name:'Água Santa-SP',   badge:'🟡⚫',ov:46,state:'SP'},
      {name:'XV de Piracicaba',badge:'⚫⚪',ov:46,state:'SP'},
      // Rio / Minas
      {name:'Madureira-RJ',    badge:'🔴⚫',ov:44,state:'RJ'},
      {name:'Athletic-MG',     badge:'🔴⚫',ov:45,state:'MG'},
      // Sul
      {name:'Joinville-SC',    badge:'🔵⚪',ov:46,state:'SC'},
      {name:'Cianorte-PR',     badge:'🔴',  ov:44,state:'PR'},
      {name:'Brasil-RS',       badge:'🟡⚫',ov:43,state:'RS'},
      {name:'Ser Caxias-RS',   badge:'🔴⚫',ov:42,state:'RS'},
    ]},
};

// ══════════════════════════════════════════════════════════════
//  COPA DO BRASIL 2026
// ══════════════════════════════════════════════════════════════
function buildCopaBrasil(league) {
  const allTeams = league.teams.map(t => ({id:t.id, name:t.name, badge:t.badge||'⚽', ov:t.ov, isHuman:!!t.isHuman}));
  const guests = buildCupGuests(league.divisionId, allTeams[0]?.ov||65);
  const cupTeams = [...allTeams.slice(0,8), ...guests.slice(0,8)];
  const bracket = buildBracket(cupTeams);
  return { phase:1, maxPhase:5, status:'active', bracket, teams:cupTeams, winner:null };
}

function buildCupGuests(divId, baseOv) {
  const pools = {
    'serie-a': [
      {name:'Flamengo',badge:'🔴⚫',ov:91},{name:'Palmeiras',badge:'🟢',ov:90},
      {name:'Atlético-MG',badge:'⚫⚪',ov:87},{name:'Corinthians',badge:'⚫⚪',ov:84},
      {name:'Cruzeiro',badge:'🔵',ov:85},{name:'Santos',badge:'⚪⚫',ov:79},
      {name:'Grêmio',badge:'🔵⚫',ov:83},{name:'Botafogo',badge:'⚫⚪',ov:81},
    ],
    'serie-b': [
      {name:'Fortaleza',badge:'🔴🔵',ov:74},{name:'Ceará',badge:'⚫⚪',ov:72},
      {name:'Criciúma',badge:'🟡⚫',ov:68},{name:'Goiás',badge:'🟢⚪',ov:67},
      {name:'Ponte Preta',badge:'⚫⚪',ov:67},{name:'CRB',badge:'🔴⚫',ov:65},
      {name:'América-MG',badge:'🟢',ov:60},{name:'Vila Nova',badge:'🔴⚫',ov:60},
    ],
    'serie-c': [
      {name:'Paysandu',badge:'🔵⚪',ov:58},{name:'Guarani',badge:'🟢⚪',ov:58},
      {name:'Náutico',badge:'🔴⚪',ov:62},{name:'Botafogo-PB',badge:'⚫⚪',ov:47},
      {name:'Santa Cruz',badge:'🔴⚫',ov:53},{name:'Volta Redonda',badge:'🔴⚫',ov:54},
      {name:'Caxias',badge:'🔴⚫',ov:50},{name:'Brusque',badge:'🔵⚪',ov:51},
    ],
    'serie-d': [
      {name:'Tombense-MG',badge:'🔴⚫',ov:48},{name:'Portuguesa-SP',badge:'🔴⚪',ov:47},
      {name:'ABC-RN',badge:'🔴⚫',ov:48},{name:'Joinville-SC',badge:'🔵⚪',ov:46},
      {name:'Retrô-PE',badge:'🟢⚫',ov:46},{name:'CSA-AL',badge:'🔵⚪',ov:45},
      {name:'Ferroviário-CE',badge:'🔴⚫',ov:47},{name:'Gama-DF',badge:'🔵',ov:45},
    ],
  };
  return (pools[divId]||pools['serie-b']).map(t=>({...t,id:uuidv4(),isHuman:false}));
}

function buildBracket(teams) {
  const shuffled=[...teams].sort(()=>Math.random()-.5); const matches=[];
  for(let i=0;i<shuffled.length;i+=2) matches.push({id:uuidv4(),phase:1,homeId:shuffled[i].id,awayId:shuffled[i+1]?.id||shuffled[0].id,sh:null,sa:null,played:false,winnerId:null});
  return matches;
}

function advanceBracket(copa) {
  const pm=copa.bracket.filter(m=>m.phase===copa.phase);
  if(!pm.every(m=>m.played)) return false;
  if(copa.phase>=copa.maxPhase){copa.status='finished';const f=pm[0];copa.winner=copa.teams.find(t=>t.id===f.winnerId)?.name||'Campeão';return true;}
  const winners=pm.map(m=>m.winnerId).filter(Boolean);
  copa.phase++;
  for(let i=0;i<winners.length;i+=2) copa.bracket.push({id:uuidv4(),phase:copa.phase,homeId:winners[i],awayId:winners[i+1]||winners[0],sh:null,sa:null,played:false,winnerId:null});
  return true;
}

// ══════════════════════════════════════════════════════════════
//  FIXTURES & STANDINGS
// ══════════════════════════════════════════════════════════════
function generateFixtures(teams) {
  const ids=teams.map(t=>t.id); const n=ids.length;
  const all=[];
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(i!==j) all.push({homeId:ids[i],awayId:ids[j],round:0,played:false,sh:null,sa:null,summary:''});
  const perRound=Math.floor(n/2); let ri=1;
  const pool=[...all].sort(()=>Math.random()-.5); const result=[];
  while(pool.length>0){
    const used=new Set(); const batch=[];
    for(let i=pool.length-1;i>=0;i--){
      const m=pool[i];
      if(!used.has(m.homeId)&&!used.has(m.awayId)){m.round=ri;batch.push(m);used.add(m.homeId);used.add(m.awayId);pool.splice(i,1);if(batch.length>=perRound)break;}
    }
    if(batch.length){result.push(...batch);ri++;}
    else if(pool.length){pool[0].round=ri;result.push(pool.shift());ri++;}
  }
  return result;
}

function calcStandings(teams,matches){
  const s={};
  teams.forEach(t=>{s[t.id]={id:t.id,name:t.name,badge:t.badge||'⚽',ov:t.ov,isHuman:!!t.isHuman,moral:t.moral||50,pts:0,j:0,v:0,e:0,d:0,gp:0,gc:0};});
  matches.filter(m=>m.played).forEach(m=>{
    const h=s[m.homeId],a=s[m.awayId];if(!h||!a)return;
    h.j++;a.j++;h.gp+=m.sh;h.gc+=m.sa;a.gp+=m.sa;a.gc+=m.sh;
    if(m.sh>m.sa){h.v++;h.pts+=3;a.d++;}else if(m.sh===m.sa){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
  });
  return Object.values(s).sort((a,b)=>b.pts-a.pts||(b.gp-b.gc)-(a.gp-a.gc)||b.gp-a.gp);
}

function applyZones(st,divId){
  const d=DIVISIONS[divId];if(!d)return st;
  return st.map((t,i)=>({...t,zone:d.promoteTop>0&&i<d.promoteTop?'promote':d.relegateBottom>0&&i>=st.length-d.relegateBottom?'relegate':'stay'}));
}

function evolveMVP(team,mvpName){
  if(!team.players||!mvpName)return;
  const p=team.players.find(pl=>mvpName.split(' ').some(w=>pl.name.includes(w)));
  if(!p)return;
  const a=['spd','str','tec','fin','pas','int'][Math.floor(Math.random()*6)];
  if(p[a]<99)p[a]++;
  p.ov=Math.round((p.spd+p.str+p.tec+p.fin+p.pas+p.int)/6);
  team.ov=Math.round(team.players.slice(0,11).reduce((s,pl)=>s+pl.ov,0)/11);
}

function advanceRound(league){
  const round=league.currentRound;
  const allDone=league.matches.filter(m=>m.round===round).every(m=>m.played);
  if(!allDone)return;
  if(round<league.totalRounds){league.currentRound=round+1;return;}
  league.status='finished';
  const st=applyZones(calcStandings(league.teams,league.matches),league.divisionId);
  league.finalStandings=st;
  if(!league.history)league.history=[];
  league.history.push({season:league.season,divisionId:league.divisionId,divisionName:league.divisionName,standings:st.map(t=>({name:t.name,isHuman:t.isHuman,pts:t.pts,v:t.v,e:t.e,d:t.d,gp:t.gp,gc:t.gc,zone:t.zone}))});
}

// ══════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════
app.get('/api/divisions',(req,res)=>{
  res.json({divisions:Object.entries(DIVISIONS).map(([id,d])=>({id,name:d.name,label:d.label,promoteTop:d.promoteTop,relegateBottom:d.relegateBottom,teamCount:d.teams.length}))});
});

app.post('/api/leagues',(req,res)=>{
  const {leagueName,playerName,teamName,formation,divisionId}=req.body;
  if(!playerName||!teamName)return res.status(400).json({error:'Dados inválidos'});
  const divId=divisionId||'serie-b';
  const divData=DIVISIONS[divId];if(!divData)return res.status(400).json({error:'Divisão inválida'});
  const db=readDB();const code=genCode();const playerId=uuidv4();
  const aiTeams=divData.teams.map(t=>({...t,id:uuidv4(),isHuman:false,strategy:'Pressão alta',moral:50}));
  const squad=defaultSquad(teamName,divId);
  const humanTeam={id:playerId,name:teamName,badge:'⚽',isHuman:true,playerName,formation:formation||'4-3-3',strategy:'Pressão alta',coins:200,moral:50,players:squad,ov:Math.round(squad.slice(0,11).reduce((s,p)=>s+p.ov,0)/11)};
  const teams=[...aiTeams.slice(0,-1),humanTeam];
  const matches=generateFixtures(teams);
  const totalRounds=Math.max(...matches.map(m=>m.round));
  const copa=buildCopaBrasil({divisionId:divId,teams});
  db.leagues[code]={code,name:leagueName||`Liga de ${playerName}`,created:Date.now(),divisionId:divId,divisionName:divData.name,season:1,currentRound:1,totalRounds,status:'active',teams,matches,humanPlayers:[playerId],chat:[],history:[],copa};
  writeDB(db);
  res.json({code,playerId,league:db.leagues[code]});
});

app.post('/api/leagues/:code/join',(req,res)=>{
  const {playerName,teamName,formation}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  if(league.humanPlayers.length>=6)return res.status(400).json({error:'Liga cheia'});
  const slot=league.teams.find(t=>!t.isHuman);if(!slot)return res.status(400).json({error:'Sem vagas'});
  const playerId=uuidv4();const oldId=slot.id;
  const squad=defaultSquad(teamName||slot.name,league.divisionId);
  Object.assign(slot,{id:playerId,name:teamName||slot.name,badge:'⚽',isHuman:true,playerName,formation:formation||'4-3-3',strategy:'Pressão alta',coins:200,moral:50,players:squad,ov:Math.round(squad.slice(0,11).reduce((s,p)=>s+p.ov,0)/11)});
  league.matches.forEach(m=>{if(m.homeId===oldId)m.homeId=playerId;if(m.awayId===oldId)m.awayId=playerId;});
  if(league.copa){league.copa.bracket.forEach(m=>{if(m.homeId===oldId)m.homeId=playerId;if(m.awayId===oldId)m.awayId=playerId;});league.copa.teams=league.copa.teams.map(t=>t.id===oldId?{...t,id:playerId,isHuman:true}:t);}
  league.humanPlayers.push(playerId);
  writeDB(db);res.json({playerId,league});
});

app.get('/api/leagues/:code',(req,res)=>{
  const db=readDB();const l=db.leagues[req.params.code];
  if(!l)return res.status(404).json({error:'Liga não encontrada'});
  res.json({league:l});
});

app.post('/api/leagues/:code/simulate-round',(req,res)=>{
  const {playerId}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const round=league.currentRound;
  const pending=league.matches.filter(m=>m.round===round&&!m.played);
  const humanPending=pending.find(m=>league.humanPlayers.some(hp=>m.homeId===hp||m.awayId===hp));
  if(humanPending)return res.status(400).json({error:'Jogue sua partida antes de simular os NPCs!'});
  pending.forEach(m=>{
    const h=league.teams.find(t=>t.id===m.homeId),a=league.teams.find(t=>t.id===m.awayId);if(!h||!a)return;
    const r=quickSim(h.ov,a.ov,h.moral||50,a.moral||50);
    m.sh=r.sh;m.sa=r.sa;m.played=true;m.summary=`${h.name} ${r.sh}×${r.sa} ${a.name}`;
    updateMoral(h,r.sh>r.sa,r.sh===r.sa);updateMoral(a,r.sa>r.sh,r.sh===r.sa);
  });
  advanceRound(league);
  writeDB(db);res.json({league});
});

app.post('/api/leagues/:code/match',(req,res)=>{
  const {homeId,awayId}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const match=league.matches.find(m=>((m.homeId===homeId&&m.awayId===awayId)||(m.homeId===awayId&&m.awayId===homeId))&&m.round===league.currentRound&&!m.played);
  if(!match)return res.status(400).json({error:'Partida não encontrada ou já disputada'});
  const hTm=league.teams.find(t=>t.id===match.homeId),aTm=league.teams.find(t=>t.id===match.awayId);
  if(!hTm||!aTm)return res.status(404).json({error:'Time não encontrado'});
  const result=simulateMatch(hTm,aTm);
  match.sh=result.sh;match.sa=result.sa;match.events=result.events;match.summary=result.summary;match.mvp=result.mvp;match.played=true;
  const won=result.sh>result.sa,drew=result.sh===result.sa;
  updateMoral(hTm,won,drew);updateMoral(aTm,!won&&!drew,drew);
  if(league.humanPlayers.includes(homeId)){hTm.coins=(hTm.coins||200)+(won?30:drew?15:10);evolveMVP(hTm,result.mvp);}
  if(league.humanPlayers.includes(awayId)){aTm.coins=(aTm.coins||200)+(result.sa>result.sh?30:drew?15:10);}
  advanceRound(league);
  writeDB(db);res.json({result,league});
});

// Copa do Brasil
app.get('/api/leagues/:code/copa',(req,res)=>{
  const db=readDB();const l=db.leagues[req.params.code];
  if(!l)return res.status(404).json({error:'Liga não encontrada'});
  res.json({copa:l.copa||null});
});

app.post('/api/leagues/:code/copa/match',(req,res)=>{
  const {matchId}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league||!league.copa)return res.status(404).json({error:'Copa não encontrada'});
  const copa=league.copa;
  const match=copa.bracket.find(m=>m.id===matchId&&!m.played&&m.phase===copa.phase);
  if(!match)return res.status(400).json({error:'Partida não encontrada ou já disputada'});
  const allTeams=[...league.teams,...(copa.teams||[])];
  const hTm=allTeams.find(t=>t.id===match.homeId),aTm=allTeams.find(t=>t.id===match.awayId);
  if(!hTm||!aTm)return res.status(404).json({error:'Time não encontrado'});
  const result=simulateMatch(hTm,aTm);
  match.sh=result.sh;match.sa=result.sa;match.events=result.events;match.summary=result.summary;match.mvp=result.mvp;match.played=true;
  match.winnerId=result.sh>result.sa?match.homeId:result.sa>result.sh?match.awayId:(hTm.ov>=aTm.ov?match.homeId:match.awayId);
  const humanTeam=league.teams.find(t=>league.humanPlayers.includes(t.id));
  const humanWon=match.winnerId===humanTeam?.id;
  if(humanTeam){humanTeam.coins=(humanTeam.coins||200)+(humanWon?40:20);evolveMVP(humanTeam,result.mvp);}
  const phaseDone=copa.bracket.filter(m=>m.phase===copa.phase).every(m=>m.played);
  if(phaseDone)advanceBracket(copa);
  writeDB(db);res.json({result,copa,league});
});

app.post('/api/leagues/:code/copa/simulate-phase',(req,res)=>{
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league||!league.copa)return res.status(404).json({error:'Copa não encontrada'});
  const copa=league.copa;
  const pending=copa.bracket.filter(m=>m.phase===copa.phase&&!m.played);
  const humanPending=pending.find(m=>league.humanPlayers.some(hp=>m.homeId===hp||m.awayId===hp));
  if(humanPending)return res.status(400).json({error:'Jogue sua partida da Copa antes de simular!'});
  const allTeams=[...league.teams,...(copa.teams||[])];
  pending.forEach(m=>{
    const h=allTeams.find(t=>t.id===m.homeId),a=allTeams.find(t=>t.id===m.awayId);if(!h||!a)return;
    const r=quickSim(h.ov,a.ov);m.sh=r.sh;m.sa=r.sa;m.played=true;m.summary=`${h.name} ${r.sh}×${r.sa} ${a.name}`;
    m.winnerId=r.sh>r.sa?m.homeId:r.sa>r.sh?m.awayId:(h.ov>=a.ov?m.homeId:m.awayId);
  });
  advanceBracket(copa);
  writeDB(db);res.json({copa,league});
});

app.put('/api/leagues/:code/player/:playerId',(req,res)=>{
  const {strategy,formation}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const team=league.teams.find(t=>t.id===req.params.playerId);if(!team)return res.status(404).json({error:'Time não encontrado'});
  if(strategy)team.strategy=strategy;if(formation)team.formation=formation;
  writeDB(db);res.json({team});
});

app.post('/api/leagues/:code/train',(req,res)=>{
  const {playerId,playerIdx,attr}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const team=league.teams.find(t=>t.id===playerId);
  if(!team?.players?.[playerIdx])return res.status(404).json({error:'Jogador não encontrado'});
  if((team.coins||0)<10)return res.status(400).json({error:'Moedas insuficientes'});
  const p=team.players[playerIdx];if(p[attr]>=99)return res.status(400).json({error:'Atributo no máximo'});
  p[attr]=Math.min(99,p[attr]+1);p.ov=Math.round((p.spd+p.str+p.tec+p.fin+p.pas+p.int)/6);
  team.ov=Math.round(team.players.slice(0,11).reduce((s,pl)=>s+pl.ov,0)/11);team.coins-=10;
  writeDB(db);res.json({player:p,coins:team.coins,teamOv:team.ov});
});

app.get('/api/market',(req,res)=>res.json({players:marketPlayers()}));
app.post('/api/leagues/:code/buy',(req,res)=>{
  const {playerId,marketPlayerId,sellIdx}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const team=league.teams.find(t=>t.id===playerId);if(!team)return res.status(404).json({error:'Time não encontrado'});
  const mkt=marketPlayers();const toBuy=mkt.find(p=>p.id===marketPlayerId);
  if(!toBuy)return res.status(404).json({error:'Jogador não encontrado'});
  if((team.coins||0)<toBuy.price)return res.status(400).json({error:'Moedas insuficientes'});
  const sv=sellIdx!=null&&team.players[sellIdx]?Math.floor(team.players[sellIdx].ov*2):0;
  if(sellIdx!=null&&team.players[sellIdx])team.players[sellIdx]={...toBuy,id:uuidv4(),age:toBuy.age||26};
  else{if(team.players.length>=23)return res.status(400).json({error:'Elenco cheio'});team.players.push({...toBuy,id:uuidv4(),age:toBuy.age||26});}
  team.coins=(team.coins||0)-toBuy.price+sv;
  team.ov=Math.round(team.players.slice(0,11).reduce((s,p)=>s+p.ov,0)/11);
  writeDB(db);res.json({team});
});

app.post('/api/leagues/:code/new-season',(req,res)=>{
  const {playerId}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league||league.status!=='finished')return res.status(400).json({error:'Temporada não encerrada'});
  const divId=league.divisionId;const divData=DIVISIONS[divId];if(!divData)return res.status(400).json({error:'Divisão inválida'});
  const humanTeam=league.teams.find(t=>t.id===playerId);if(!humanTeam)return res.status(404).json({error:'Time não encontrado'});
  agePlayers(humanTeam);humanTeam.moral=50;
  const aiTeams=divData.teams.map(t=>({...t,id:uuidv4(),isHuman:false,strategy:'Pressão alta',moral:50}));
  const teams=[...aiTeams.slice(0,-1),humanTeam];
  const matches=generateFixtures(teams);
  const totalRounds=Math.max(...matches.map(m=>m.round));
  const copa=buildCopaBrasil({divisionId:divId,teams});
  league.season+=1;league.status='active';league.currentRound=1;league.totalRounds=totalRounds;league.teams=teams;league.matches=matches;league.finalStandings=null;league.copa=copa;
  writeDB(db);res.json({league});
});

app.post('/api/leagues/:code/chat',(req,res)=>{
  const {playerId,message}=req.body;
  const db=readDB();const league=db.leagues[req.params.code];
  if(!league)return res.status(404).json({error:'Liga não encontrada'});
  const team=league.teams.find(t=>t.id===playerId);if(!team)return res.status(404).json({error:'Time não encontrado'});
  if(!league.chat)league.chat=[];
  league.chat.push({playerName:team.playerName,teamName:team.name,message,time:Date.now()});
  if(league.chat.length>80)league.chat=league.chat.slice(-80);
  writeDB(db);res.json({chat:league.chat});
});
app.get('/api/leagues/:code/chat',(req,res)=>{
  const db=readDB();const l=db.leagues[req.params.code];
  if(!l)return res.status(404).json({error:'Liga não encontrada'});
  res.json({chat:l.chat||[]});
});

// ══════════════════════════════════════════════════════════════
//  DEFAULT SQUAD — força proporcional à divisão
// ══════════════════════════════════════════════════════════════
function defaultSquad(teamName, divId='serie-b'){
  // OVs base por divisão
  const baseOV = {
    'serie-a': {gk:78,zag:80,lat:76,vol:80,mei:83,ata:85},
    'serie-b': {gk:70,zag:72,lat:68,vol:72,mei:76,ata:78},
    'serie-c': {gk:62,zag:64,lat:61,vol:63,mei:67,ata:70},
    'serie-d': {gk:55,zag:58,lat:55,vol:57,mei:60,ata:63},
  }[divId] || {gk:70,zag:72,lat:68,vol:72,mei:76,ata:78};

  const spread=4; // variação ±4
  const n=arr=>arr[Math.floor(Math.random()*arr.length)];
  const v=(base)=>Math.max(40,Math.min(95,base+Math.floor(Math.random()*spread*2)-spread));

  const gks=['Rafael','Diego','Victor','Weverton','Mauro','Leandro'];
  const zags=['Thiago','Léo','Gustavo','Anderson','Eduardo','Ruan','Henrique'];
  const lats=['Caio','Renan','Guilherme','João','Matheus','Danilo'];
  const vols=['Douglas','Allan','Ederson','Maycon','Fabinho','Patrick'];
  const meis=['Everton','Lucas','Marquinhos','Bruno','Oscar','Vitinho'];
  const atas=['Pedro','Hulk','Vitor','Rodrygo','Richarlison','Lucão','Felipe'];

  const mk=(nm,nu,po,age,base,spd,str,tec,fin,pas,int_)=>{
    const s=v(spd),st=v(str),te=v(tec),fi=v(fin),pa=v(pas),in_=v(int_);
    const ov=Math.round((s+st+te+fi+pa+in_)/6);
    return {id:uuidv4(),name:nm,num:nu,pos:po,age,ov,spd:s,str:st,tec:te,fin:fi,pas:pa,int:in_};
  };

  const b=baseOV;
  return [
    mk(n(gks), 1,'GK', 28,b.gk, b.gk-10,b.gk-5, b.gk,   b.gk-30,b.gk-10,b.gk+5),
    mk(n(zags),4,'ZAG',27,b.zag,b.zag-5, b.zag+8,b.zag-8,b.zag-30,b.zag-15,b.zag+5),
    mk(n(zags),5,'ZAG',26,b.zag,b.zag-7, b.zag+6,b.zag-10,b.zag-32,b.zag-18,b.zag+3),
    mk(n(lats),6,'LAT',25,b.lat,b.lat+8, b.lat,  b.lat,  b.lat-20,b.lat+2, b.lat-2),
    mk(n(lats),3,'LAT',24,b.lat,b.lat+6, b.lat-2,b.lat-2,b.lat-22,b.lat,   b.lat-4),
    mk(n(vols),8,'VOL',26,b.vol,b.vol-2, b.vol+5,b.vol,  b.vol-18,b.vol+5, b.vol+8),
    mk(n(meis),10,'MEI',25,b.mei,b.mei-5,b.mei-8,b.mei+8,b.mei-8, b.mei+8, b.mei+5),
    mk(n(meis),7,'MEI', 23,b.mei,b.mei-3,b.mei-10,b.mei+5,b.mei-12,b.mei+5,b.mei+2),
    mk(n(atas),9,'ATA', 26,b.ata,b.ata+2,b.ata,  b.ata,  b.ata+8, b.ata-5, b.ata-2),
    mk(n(atas),11,'ATA',22,b.ata,b.ata+8,b.ata-12,b.ata+8,b.ata+5,b.ata-5, b.ata-5),
    mk(n(atas),17,'ATA',24,b.ata,b.ata+5,b.ata-10,b.ata+5,b.ata+2,b.ata-8, b.ata-8),
    // Reservas
    mk(n(gks), 22,'GK', 22,b.gk-6, b.gk-16,b.gk-10,b.gk-6, b.gk-35,b.gk-15,b.gk),
    mk(n(zags),15,'ZAG',21,b.zag-8,b.zag-12,b.zag,  b.zag-15,b.zag-35,b.zag-22,b.zag-2),
    mk(n(lats),2,'LAT', 20,b.lat-5,b.lat+2, b.lat-5,b.lat-5, b.lat-25,b.lat-5, b.lat-8),
    mk(n(meis),14,'MEI',21,b.mei-8,b.mei-8, b.mei-12,b.mei,  b.mei-18,b.mei,  b.mei-3),
    mk(n(atas),18,'ATA',19,b.ata-12,b.ata+2,b.ata-18,b.ata-6,b.ata-8, b.ata-18,b.ata-12),
  ];
}

function marketPlayers(){return [
  {id:'mkt-1', name:'Neymarinho',      num:11,pos:'ATA',age:28,ov:92,spd:90,str:60,tec:95,fin:85,pas:80,int:82,price:500},
  {id:'mkt-2', name:'Gabizão',         num:9, pos:'ATA',age:27,ov:90,spd:76,str:82,tec:82,fin:93,pas:68,int:84,price:450},
  {id:'mkt-3', name:'Craque Véio',     num:10,pos:'MEI',age:30,ov:88,spd:72,str:62,tec:92,fin:75,pas:90,int:88,price:400},
  {id:'mkt-4', name:'Zé Muralha',      num:1, pos:'GK', age:29,ov:87,spd:58,str:75,tec:88,fin:35,pas:72,int:92,price:350},
  {id:'mkt-5', name:'Samba Lateral',   num:6, pos:'LAT',age:24,ov:85,spd:92,str:72,tec:80,fin:65,pas:82,int:78,price:320},
  {id:'mkt-6', name:'Muro de Pedra',   num:5, pos:'ZAG',age:31,ov:84,spd:65,str:92,tec:72,fin:45,pas:65,int:88,price:300},
  {id:'mkt-7', name:'Velocidade Pura', num:7, pos:'ATA',age:21,ov:83,spd:96,str:62,tec:82,fin:80,pas:70,int:76,price:280},
  {id:'mkt-8', name:'Maestro',         num:8, pos:'VOL',age:26,ov:82,spd:74,str:80,tec:82,fin:62,pas:86,int:88,price:260},
  {id:'mkt-9', name:'Canhotinha',      num:11,pos:'ATA',age:20,ov:80,spd:88,str:58,tec:85,fin:78,pas:75,int:74,price:220},
  {id:'mkt-10',name:'Goleiro Elástico',num:22,pos:'GK', age:23,ov:78,spd:52,str:70,tec:80,fin:28,pas:68,int:86,price:180},
  {id:'mkt-11',name:'Guerreiro',       num:4, pos:'ZAG',age:28,ov:76,spd:68,str:88,tec:65,fin:40,pas:60,int:80,price:150},
  {id:'mkt-12',name:'Passe Cirúrgico', num:8, pos:'MEI',age:22,ov:75,spd:70,str:60,tec:80,fin:68,pas:92,int:78,price:130},
  {id:'mkt-13',name:'Promessa',        num:99,pos:'ATA',age:17,ov:62,spd:82,str:55,tec:72,fin:65,pas:58,int:60,price:60},
  {id:'mkt-14',name:'Jovem Lateral',   num:99,pos:'LAT',age:18,ov:60,spd:84,str:60,tec:66,fin:48,pas:66,int:58,price:50},
];}

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{
  console.log(`\n🏟️  Míster FC em http://localhost:${PORT}`);
  console.log(`📋 Séries A, B, C, D — Times reais Brasileirão 2026`);
  console.log(`🏆 Copa do Brasil 2026 incluída`);
  console.log(`⚡ Motor puro JS — sem IA externa\n`);
});
