# Health Hub: como transportar este material

Pacote gerado em 27/10/2026 a partir do repositório `health-hub` (commit atual) e dos arquivos do bot e do agendamento
que moram fora dele. **Não vai nenhuma senha nem token.** Tudo o que é credencial está listado na seção 4 para você
recriar no destino.

O que você está levando: um painel web (PWA) de saúde e treino, alimentado por scripts Python que puxam Garmin, Renpho
e Notion; um bot de Telegram rodando Claude Code que conversa, registra e manda o brief da manhã e a avaliação da noite;
um conselho semanal de especialistas (agentes); e a Campanha (RPG) com motor e textos.

---

## 1. Mapa do pacote

```
health-hub-pacote/
├── CLAUDE.md               regras que toda sessão do Claude lê (comece por aqui)
├── PROJETO_CHAT.md         doutrina completa, §1 a §30 (o "porquê" de cada decisão)
├── decisoes.md             regras vigentes + registro datado de decisões
├── .claude/
│   ├── settings.json       ganchos: passagem.sh a cada mensagem; garantir_resposta_telegram.py no fim do turno
│   ├── agents/             especialistas do conselho: carga, nutricao, logistica, cetico
│   ├── skills/revisao-semanal/
│   └── launch.json         servidor local do painel (preview)
├── painel/                 o site (Vercel)
│   ├── index.html          app inteiro (Início, Hoje, Evolução, Registrar, Campanha)
│   ├── treino.js           execução de séries (carga, reps, + série, exercício extra, progressão)
│   ├── corrida.js          corrida guiada por etapas
│   ├── decisao.js          semáforo Pode / Ajustar / Segurar (nível de base de 27/10)
│   ├── campanha.js, pixel.js   Campanha (RPG) e cenas em pixel art
│   ├── sw.js               service worker (cache "saude-vN": suba o N a cada mudança de tela)
│   ├── api/log.js, registro.js, registros.js   funções serverless que gravam/leem o diário no Notion
│   └── data/*.json         o que o painel mostra (semana, treinos, corridas, alimentação, fatos, história…)
├── garmin_pull.py, renpho_pull.py   coleta dos relógios/balança
├── fatos.py, synthesize.py, dashboard.py   consolidam os números (fatos.json é a única fonte de número)
├── jornada.py, historia.py, jornada_regras.json, historia/   Campanha: motor, regras, canon, textos
├── registrar_no_painel.py  grava refeição/treino/observação no diário (usado pelo bot)
├── registrar_decisao.sh, passagem.sh, publicar_jornada.sh, publicar_dados.sh
├── enviar_telegram_saude.py, garantir_resposta_telegram.py, iniciar_telegram_saude.sh
├── rotinas/                roteiros do bot: brief_matinal, avaliacao_noite, conselho_entrevista, capitulo_semana
├── conselho/, historico_semanas/, evidencia/, propostas/   histórico e material de apoio
├── historico_garmin.json, historico_peso.json, fatos.json …   seus dados (pessoais)
└── extras/                 o que vive FORA do repositório
    ├── launchagents/       agendamentos do macOS (brief 8h03, avaliação, conselho, capítulo dom 23h05, bot)
    ├── bot/                disparar_rotina.sh e iniciar_saude.command (vão em ~/.claude/channels/telegram-saude/)
    └── skills/copiloto-saude-telegram/   skill do bot (vai em ~/.claude/skills/)
```

O histórico git **não** vai no pacote (só o estado atual). Se quiser o histórico, copie a pasta `.git` do original
ou use `git bundle create health-hub.bundle --all` na máquina antiga.

---

## 2. Pré-requisitos no destino

- macOS (os agendamentos são launchd; em Linux, troque por cron/systemd, ver seção 7).
- Python 3.11+ com: `pip install garminconnect renpho requests` (o `renpho_pull.py` aplica um remendo próprio na
  biblioteca do Renpho, que está quebrada no original; mantenha o arquivo como está).
- Node 18+ e a CLI da Vercel (`npm i -g vercel` ou `npx vercel`).
- Claude Code (app desktop ou CLI) e o plugin do Telegram (`plugin:telegram@claude-plugins-official`).
- `screen` (já vem no macOS) e `curl`.

---

## 3. Passo a passo

1. **Copie a pasta** para o destino. Os scripts esperam `~/Documents/Claude/health-hub`. Se mudar o caminho, ajuste:
   `extras/bot/iniciar_saude.command` (variável `H`), `extras/bot/disparar_rotina.sh` e os `.plist` (caminhos
   absolutos com `/Users/fabiogomes/...`: troque pelo seu usuário).
2. **Credenciais locais:** `cp .env.example .env` e preencha Garmin e Renpho (seção 4).
3. **Painel na Vercel:**
   ```
   cd painel
   npx vercel link          # cria um projeto novo (ou liga a um existente)
   npx vercel env add NOTION_TOKEN production
   npx vercel env add DIARIO_DB_ID production
   npx vercel env add LOG_KEY production
   npx vercel deploy --prod --yes
   ```
   Rode o deploy duas vezes e confira a linha `Aliased`. Anote a URL nova e troque `painel-xi-three.vercel.app`
   onde aparecer (`grep -rn painel-xi-three .`).
4. **Notion:** crie uma integração interna, compartilhe com ela o banco do diário (📥 Registros) e os bancos do Hub de
   saúde. O ID do banco do diário vai em `DIARIO_DB_ID`. Os outros IDs estão nos scripts e na skill
   `revisao-semanal`: procure por `notion` e troque pelos seus.
5. **Bot do Telegram:**
   - Crie um bot no @BotFather e guarde o token.
   - `mkdir -p ~/.claude/channels/telegram-saude && chmod 700 ~/.claude/channels/telegram-saude`
   - Copie `extras/bot/*` para essa pasta.
   - Configure o token com a skill `/telegram:configure` (ela grava o `.env` da pasta) e pareie a sua conta com
     `/telegram:access`. Nunca edite `access.json` à mão.
   - Gere o token de longa duração do Claude: rode `claude setup-token` e salve a saída em
     `~/.claude/channels/telegram-saude/oauth_token` com `chmod 600`. Assim o login do bot não expira (1 ano).
   - Teste: `./enviar_telegram_saude.py --verificar` (não envia nada).
6. **Skill do bot:** copie `extras/skills/copiloto-saude-telegram` para `~/.claude/skills/`.
7. **Agendamentos:** copie `extras/launchagents/*.plist` para `~/Library/LaunchAgents/`, ajuste os caminhos e carregue:
   ```
   launchctl load ~/Library/LaunchAgents/com.fabiogomes.telegram-saude.plist
   launchctl load ~/Library/LaunchAgents/br.fabiogomes.saude.brief.plist
   ```
   (repita para avaliacao, conselho, conselho-fechar, capitulo e os `-verifica`). Dê ao Terminal acesso a
   Documentos (Ajustes → Privacidade → Acesso total ao disco ou Arquivos e Pastas): o bot sobe pelo Terminal porque o
   launchd sozinho não abre `~/Documents`.
8. **Confira:** `screen -r saude` mostra o bot (sair sem fechar: Ctrl-A, depois D). Mande uma mensagem ao bot.
   Rode `./publicar_jornada.sh` para regenerar e publicar o painel.

---

## 4. Credenciais que NÃO estão no pacote (recrie)

| Onde | O quê |
|---|---|
| `health-hub/.env` | `GARMIN_EMAIL`, `GARMIN_PASSWORD`, `RENPHO_EMAIL`, `RENPHO_PASSWORD` |
| `~/.garminconnect/` | token do Garmin: o `garmin_pull.py` cria no primeiro login (dura ~1 ano) |
| Vercel (env do projeto) | `NOTION_TOKEN`, `DIARIO_DB_ID`, `LOG_KEY` (chave que o painel manda ao gravar; invente uma nova) |
| `~/.claude/channels/telegram-saude/.env` | token do bot (via `/telegram:configure`) |
| `~/.claude/channels/telegram-saude/access.json` | quem pode falar com o bot (via `/telegram:access`) |
| `~/.claude/channels/telegram-saude/oauth_token` | token de longa duração do Claude (`claude setup-token`) |

Também ficaram de fora, por serem só do momento: `apoio.md` (memória da conversa anterior do bot, gerada de madrugada
por um script do secretário que não faz parte deste projeto), logs, `bot.pid`, `inbox/`, `garmin_out.json`,
`renpho_out.json`, `resumo_diario.json`, `ultimo_envio.md`. Sem o `apoio.md` o bot funciona; só começa sem memória.

---

## 5. Como o sistema anda (para não quebrar no transporte)

- **O disco é a memória.** Várias sessões (app, bot, agendadas) só se enxergam pelos arquivos. O gancho
  `passagem.sh` injeta regras vigentes, últimas decisões e commits recentes em toda mensagem.
- **Ciclo do dia:** 8h03 o launchd dispara `brief` (puxa Garmin/Renpho → `fatos.json` → painel → mensagem no
  Telegram); à noite, `avaliacao`. Domingo: `conselho` (entrevista com cada especialista, bate e volta) e às 23h05
  `capitulo` (fecha a parte da Campanha e escreve a próxima).
- **Toda decisão é registrada** com `./registrar_decisao.sh` e commitada.
- **Nível de base (27/10):** 3 forças com 2 repetições de sobra e progressão dupla, 3 corridas (zona 2 sem teto + 1 de
  qualidade), 1 descanso; corte só por sinais de segurança e pelo semáforo de `decisao.js`. Detalhe em
  `PROJETO_CHAT.md` §30.
- **Painel:** depois de mudar tela, suba `const V = 'saude-vN'` em `painel/sw.js`, senão o celular fica com a versão
  em cache.

---

## 6. Transportar só uma parte

- **Só o painel:** a pasta `painel/` é autocontida. Sem as variáveis do Notion, ele abre e mostra o plano
  (`data/*.json`), mas não grava registros.
- **Só a lógica de treino:** `painel/treino.js`, `corrida.js`, `decisao.js` + `data/treinos.json` e `corridas.json`.
  Dependem de alguns helpers do `index.html` (`esc`, `fNum`, `isoLocal`, `FATOS`, `REGISTROS`, `DATA`), listados no
  topo de cada arquivo.
- **Só a Campanha:** `historia.py`, `jornada.py`, `jornada_regras.json`, `historia/`, `painel/campanha.js`,
  `painel/pixel.js`. O motor lê `painel/data/jornada.json` (gerado por `jornada.py` a partir dos registros).
- **Só os especialistas:** `.claude/agents/` + `rotinas/conselho_entrevista.md` + `PROJETO_CHAT.md`.

---

## 7. Fora do macOS

Troque os `.plist` por cron (`3 8 * * * /caminho/disparar_rotina.sh brief`, etc.) e o `iniciar_saude.command` por
um serviço systemd ou um `screen`/`tmux` iniciado no boot rodando `iniciar_telegram_saude.sh` em laço. O
`iniciar_telegram_saude.sh` procura o Claude Code dentro do app do Mac; fora dele, cai em `command -v claude`.

---

## 8. Atenção

- O pacote tem **dados pessoais de saúde** (peso, sono, VFC, refeições, sintomas, remédios) em `fatos.json`,
  `historico_*.json`, `conselho/`, `decisoes.md` e `painel/data/`. Se for compartilhar, apague ou anonimize esses
  arquivos antes.
- O conteúdo de saúde é apoio de rotina, não conduta clínica.
