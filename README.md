# ⚽ Míster FC

Jogo de gerenciamento de futebol multiplayer com simulação de partidas por Inteligência Artificial.

## O que tem no jogo

- **Elenco completo** com 16 jogadores, atributos detalhados (velocidade, força, técnica, etc.)
- **Tática** — 6 formações disponíveis (4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 5-3-2, 4-1-4-1) + 6 estratégias
- **Simulação de partida** com narração ao vivo gerada por IA (Claude)
- **Campo visual animado** com posições dos jogadores e bola em tempo real
- **Multiplayer** — crie uma liga e jogue com até 10 amigos com código de convite
- **Classificação em tempo real** com pontos, saldo de gols, histórico
- **Sistema de treinos** — gaste moedas para evoluir atributos dos jogadores
- **Mercado de transferências** — compre jogadores do mercado com moedas ganhas

---

## Como rodar localmente

### 1. Instalar dependências

```bash
cd mister-fc
npm install
```

### 2. Configurar a API Key da Anthropic

Copie o arquivo de exemplo e adicione sua chave:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e substitua `sk-ant-...` pela sua chave real.

> 🔑 Obtenha sua chave em: https://console.anthropic.com/

### 3. Iniciar o servidor

```bash
npm start
```

Acesse: **http://localhost:3000**

---

## Como fazer deploy gratuito

### Opção A — Railway (recomendado, mais fácil)

1. Acesse https://railway.app e crie uma conta gratuita
2. Clique em **New Project → Deploy from GitHub**
3. Faça upload do projeto (ou conecte ao GitHub)
4. Vá em **Variables** e adicione: `ANTHROPIC_API_KEY` = sua chave
5. O Railway vai rodar `npm start` automaticamente
6. Copie o link gerado e compartilhe com os amigos!

### Opção B — Render

1. Acesse https://render.com e crie uma conta gratuita
2. Clique em **New → Web Service**
3. Conecte seu repositório
4. Em **Environment Variables**, adicione `ANTHROPIC_API_KEY`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Clique em **Create Web Service**

### Opção C — Heroku

```bash
# Instalar Heroku CLI
heroku create mister-fc-seutime
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
git push heroku main
heroku open
```

### Opção D — VPS / Servidor próprio

```bash
# No servidor, instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar/copiar o projeto
cd /var/www/mister-fc
npm install

# Rodar com PM2 (mantém o servidor ativo)
npm install -g pm2
pm2 start server.js --name mister-fc
pm2 save
pm2 startup
```

---

## Estrutura dos arquivos

```
mister-fc/
├── server.js          ← Backend Node.js + Express (API + IA)
├── package.json       ← Dependências do projeto
├── .env.example       ← Modelo de variáveis de ambiente
├── .env               ← Suas variáveis (NÃO envie para o GitHub!)
├── db.json            ← Banco de dados (criado automaticamente)
└── public/
    ├── index.html     ← Interface do jogo
    ├── style.css      ← Estilos
    └── app.js         ← Lógica do jogo (frontend)
```

---

## Como jogar com amigos

1. Faça o deploy em um dos serviços acima e copie a URL (ex: `https://mister-fc.railway.app`)
2. Abra o jogo, digite seu nome, escolha seu time e crie uma liga
3. Copie o **código da liga** (ex: `MSTR-AB3X`) que aparece na tela
4. Mande o código e a URL para seus amigos
5. Cada amigo entra na URL, digita o nome deles, escolha um time e digita o código
6. Vão em **Partida** e escolhem contra quem jogar!

---

## Moedas

| Ação | Moedas |
|------|--------|
| Vitória | +30 🪙 |
| Empate | +15 🪙 |
| Derrota | +10 🪙 |
| Treinar atributo | -10 🪙 |
| Comprar jogador | -preço do jogador 🪙 |

---

## Tecnologias

- **Backend**: Node.js + Express
- **Frontend**: HTML + CSS + Vanilla JS
- **IA**: Claude (Anthropic) para narração e simulação
- **Banco de dados**: JSON simples (arquivo `db.json`)

---

## Próximas funcionalidades (roadmap)

- [ ] Campeonato com rodadas automáticas geradas por IA
- [ ] Sistema de divisões (subir/cair de divisão)
- [ ] Histórico de temporadas
- [ ] Chat entre os técnicos da liga
- [ ] Banco de talentos / jogadores jovens
- [ ] Conquistas e troféus

---

Desenvolvido com ❤️ e ⚽
