---
name: revisao-semanal
description: Ritual semanal (conselho de domingo) do copiloto de saúde do Fabio (projeto health-hub) — sincroniza Garmin/Renpho/Strava/Notion, processa a fila de 📥 Registros (bruto), e produz a revisão da semana em três vozes (fisiologista, personal, nutricionista), fechando com o plano da semana seguinte + deploy do painel. USE sempre que o Fabio pedir para "analisar a semana", "fazer a sincronia", "gerar a semana", "revisão semanal", "ritual de sábado", ou pedir recomendação para o fim de semana / próxima semana de treino e dieta — mesmo sem essas palavras exatas, ex. "como foi minha semana", "o que eu faço esse fim de semana", "monta o cardápio", "vamos organizar as próximas semanas". NÃO use para perguntas rápidas no meio da semana tipo "como estou indo hoje" — aí é só um status curto.
---

# Ritual de revisão semanal — health-hub

Repo: `/Users/fabiogomes/Documents/Claude/health-hub/`. **Leia `PROJETO_CHAT.md` antes de começar** —
ele carrega as regras permanentes (meta de proteína, protocolo AINE, load balance/ACWR, autonomia
🟢🟡🔴, modo viagem, contrato do `semana.json`). Este arquivo é o procedimento; aquele é a doutrina.

---

## Passo 1 — Sincronizar dados

```bash
cd /Users/fabiogomes/Documents/Claude/health-hub
python3 garmin_pull.py --days 14 > garmin_out.json
python3 renpho_pull.py --days 14 > renpho_out.json
python3 synthesize.py > /dev/null
python3 fatos.py > fatos.json
```

**`fatos.json` é a camada 0 — a única fonte de número do ritual.** Ninguém (nem você, nem os
especialistas) calcula média, tendência ou contagem por fora. Ele já separa as pesagens
pós-jogo das neutras, conta os padrões alimentares dos registros e lista as `lacunas`.

- **Garmin** retoma a sessão do token em `~/.garminconnect` — não precisa de `.env` no dia a dia.
  Se vier com `dias_vazios > 0`, o relógio não sincronizou; **não é rate limit**.
- **Renpho** precisa de `RENPHO_EMAIL`/`RENPHO_PASSWORD` no `.env` em TODA execução. Se o JSON vier
  com `erro`, reporte que o peso está fora e siga — não trave o ritual.
- **Strava** vem pelo MCP (`list_activities`, `get_activity_performance`, `get_activity_streams`).
  Para corridas em blocos, puxe os streams: é onde estão cadência, FC por bloco e velocidade real.

**Ignore as atividades do Strava com título "Fitbod - ..." e os detalhes de força vindos delas:** o Fitbod foi descartado em 11/10/2026 (era só validação). A força vem do painel (`#sets`).

Colete também **load balance + ACWR** via `get_training_status` (ver PROJETO_CHAT §6).

## Passo 2 — Processar a fila do Notion

Busque em 📥 Registros (`collection://7504a4fe-ff17-4cfc-9ff2-2dc47a85a65e`) os registros da semana.

Para cada um:
1. Leia `Texto` **e abra a `Foto`** quando houver — baixe a URL do blob e leia a imagem.
   **Rótulo de embalagem é dado de ouro:** kcal, proteína e sódio exatos.
2. Enriqueça o campo `Texto` com o que você extraiu (números do rótulo, estimativa, o que o dado
   significa) e marque `Processado: __YES__`.
3. **Duplicatas e datas erradas:** o erro mais comum é o Fabio registrar de manhã o que comeu na
   véspera, e o app preencher com hoje. Use `/api/registro` (PATCH corrige, DELETE arquiva) — ou
   avise para ele corrigir na aba ✏️ Corrigir do painel.

**Treino registrado no painel:** registros Tipo Treino com `#sets {json}` no fim do Texto trazem carga e
repetições por série (PROJETO_CHAT §21). Leia-os aqui, resuma por exercício (melhor série e volume) e use como
base da progressão. Para os dias de força da semana nova, escreva a sessão com `kg` em `painel/data/treinos.json`
(a data sobrepõe o semana.json), usando a última carga registrada e a regra de esforço do plano.

## Passo 3 — O conselho (especialistas em paralelo)

Dispare os três na MESMA mensagem, para rodarem em paralelo. Cada um lê só a sua fatia do
`fatos.json` e devolve no máximo 200–250 palavras:

- **`carga`** → teto da semana (quantas sessões de força, quantas de corrida, cabe intensa?),
  dias intocáveis, gatilho de corte, lacunas. **Tem veto sobre volume.**
- **`nutricao`** → até 4 regras da semana, a compra que as sustenta, padrão dos registros,
  lacunas, **mais a análise semanal por grupos de alimentos** (prática fixa desde 11/10/2026, a
  pedido do Fabio: composição e grupos, sem estimativa precisa). O `fatos.json` só traz
  ocorrências (fritura, doce, etc.), então **passe ao especialista o texto completo dos
  registros da semana**, já enriquecido no Passo 2 (rótulos lidos, fotos descritas). Envie a
  análise ao Fabio no fechamento (Telegram), em linguagem simples, junto com o relatório.
  **Grave também `painel/data/alimentacao.json`** (a aba Alimentação do Início lê esse arquivo):
  contagens por grupo, metas propostas, fontes de proteína, carboidrato, gorduras, fibra e a tabela de
  refeições. Conte à mão e confira que as pilhas somam o total de refeições registradas. Metas são
  propostas do copiloto até o Fabio confirmar.
  **Tem veto sobre prescrição acima da adesão histórica.**
- **`logistica`** → janela viável por dia (horário e local), dias em risco, plano B concreto.
  **Tem veto sobre horário e local.**

Você é a camada de síntese, e ela **não pode ser paralela**: a dieta de quinta depende do jogo,
a força de sábado depende do campeonato. Concilie os três num plano só. Veto de especialista não
se negocia — se dois vetos se chocam, escolha o mais restritivo e diga isso no relatório.

Os especialistas **nunca falam com o Fabio diretamente**, mas cada um entrega um **relatório humano**
(como está / para onde vai / o que não sei). Copie os quatro (carga, nutrição, logística e cético) para o
campo `relatorios` do `semana.json`: `[{id, especialista, assina, como_esta, para_onde, nao_sei[]}]`. O painel
mostra isso na tela Início. Não reescreva o que eles disseram; só corte para caber, e confira os números
contra o `fatos.json`.

## Passo 4 — O balanço (essencial)

Duas perguntas que o ritual existe para responder:

1. **Houve déficit de exercício?** Contabilize o que deixou de ser feito e decida se cabe **cardio
   compensatório** no fim de semana.
2. **Como calibrar a folga?** O objetivo é não perder a evolução da semana. O padrão recorrente do
   Fabio é escorregar de UMA refeição livre para três (sexta à noite, sábado, domingo) — e é a
   terceira que apaga a semana. Diga isso com o número na mão, não como sermão.

⚠️ **Antes de prescrever qualquer intensidade, cheque o ACWR.** >1,5 pede consolidação; <0,8 é
descarga excessiva e o risco vira o salto na volta. Ver PROJETO_CHAT §6.

## Passo 5 — Gerar a semana

Edite `painel/data/semana.json` respeitando o contrato (PROJETO_CHAT §9). Cheque antes:

- Há **viagem/congresso** na semana? → **modo viagem** (PROJETO_CHAT §8): heurística no lugar de
  cardápio, meta no piso, só corrida.
- **Quinta é futebol fixo.** Não coloque intensidade na quarta — já produziu o pior jogo da série.
- **Fim de semana pede impacto** (futebol, trilha, ou corrida longa/teste).
- **Logística:** corrida na rua do trabalho é o treino de menor atrito; academia custa 40–50 min de
  trânsito e precisa de teto de 30 min de sala. Não coloque academia em mais de 2 dias.
- **Proteína:** planeje o papel em 175–180 g para aterrissar em 155–160 reais.
- **Jantas rendem 2**, com a porção extra indo pro freezer ANTES de servir.

Feche com a **lista de compras** por categoria e o **relatório** — as linhas que o Fabio lê no topo
do painel. Escreva o relatório para ser lido por ele, não por você: número na frente, conclusão
depois, sem hedge.

## Passo 5a — Sessões de corrida guiada

Peça ao `carga` as sessões de corrida da semana em etapas (porteira, teto de FC, tiros só se a fase 2 estiver aberta) e grave em `painel/data/corridas.json` (formato no PROJETO_CHAT, seção Corrida guiada). O painel usa isso no botão Iniciar de `#corrida`.

## Passo 5b — O cético (bloqueante, antes de publicar)

Com o `semana.json` pronto e ANTES do deploy, dispare o subagente **`cetico`**. Ele confere
calendário (dia da semana × data), regra violada do PROJETO_CHAT, afirmação causal sem número,
artefato de pesagem, jargão que autoriza o padrão errado, tamanho da prescrição e lacuna não
declarada.

- Achado **GRAVE** → corrija e rode o cético de novo.
- Achado MÉDIO/LEVE → corrija ou registre no relatório por que não vale corrigir.
- **Nunca publique sem rodar.** As três semanas de erro que originaram esta camada (terça
  rotulada como segunda, peso lido como resposta à dieta, "carga de carboidrato" virando
  feijoada) seriam todas pegas por esta checklist.

## Passo 5c — Escrever o contrato de ida

Grave `perguntas_semana.json` no repo:

```json
{"semana": "28/09 a 04/10", "limites": {"teto_forca": 4, "teto_corrida": 2, "intensa": false,
 "dias_intocaveis": ["seg"], "gatilho_corte": "3 dias seguidos de banda vermelha → cai a corrida de quarta"},
 "perguntas": [{"id": "q1", "texto": "O stiff e o unilateral melhoram a arrancada?",
   "como_responder": "relato do jogo de quinta + strides de domingo", "resposta": null}]}
```

De 2 a 3 perguntas, nunca mais. **Sem pergunta explícita, o fechamento de domingo vira
narrativa em vez de aprendizado.** O personal (briefs diários) lê este arquivo e é ele quem
coleta as respostas em `diario_execucao.json`.

## Passo 6 — Publicar e registrar

```bash
cd painel && npx vercel deploy --prod --yes && cd ..
git add -A && git commit -m "..."
```

- Confira em `https://painel-xi-three.vercel.app/data/semana.json` que a semana subiu.
- Grave uma **Observação** no Notion com as decisões e os achados da semana — é o que sobrevive
  quando a conversa acabar. Inclua os números, não só as conclusões.
- **Commit sempre** ao terminar (push não — o ambiente bloqueia o GitHub).

---

## Quando NÃO rodar o ritual completo

- "Como estou indo hoje?" → status curto: prontidão, ajuste do dia, e só.
- "Como foi o treino de ontem?" → análise daquela sessão, sem tocar no `semana.json`.
- Meio de semana, com o plano vigente ainda válido → não regere a semana.

## Erros que já custaram caro (não repetir)

- **Não confie na sua leitura de um dado que o Fabio conhece melhor.** Já classifiquei jogos de
  futebol por horário e concluí errado; ele corrigiu (só o de 23/07 era campo de 11). **Pergunte.**
- **Peso sob AINE ou pós-treino não entra na série.** Ver PROJETO_CHAT §5.
- **Zonas do Strava estão desatualizadas** e o subestimam em ~2 zonas — não prescreva ritmo por elas.
- **Uma meta que nunca é batida deixa de ser meta.** Se o alvo está sistematicamente fora de alcance,
  o problema é o alvo. Foi assim com os 190 g de proteína.
- **Não invente número que não existe.** Se o Renpho falhou ou o relógio não foi ao jogo, diga que o
  dado não existe — não estime e apresente como medida.
