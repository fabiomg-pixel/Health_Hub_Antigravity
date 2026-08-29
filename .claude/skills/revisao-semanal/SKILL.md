---
name: revisao-semanal
description: Ritual de sábado do copiloto de saúde do Fabio (projeto health-hub) — sincroniza Garmin/Renpho/Strava/Notion, processa a fila de 📥 Registros (bruto), e produz a revisão da semana em três vozes (fisiologista, personal, nutricionista), fechando com o plano da semana seguinte + deploy do painel. USE sempre que o Fabio pedir para "analisar a semana", "fazer a sincronia", "gerar a semana", "revisão semanal", "ritual de sábado", ou pedir recomendação para o fim de semana / próxima semana de treino e dieta — mesmo sem essas palavras exatas, ex. "como foi minha semana", "o que eu faço esse fim de semana", "monta o cardápio", "vamos organizar as próximas semanas". NÃO use para perguntas rápidas no meio da semana tipo "como estou indo hoje" — aí é só um status curto.
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
```

- **Garmin** retoma a sessão do token em `~/.garminconnect` — não precisa de `.env` no dia a dia.
  Se vier com `dias_vazios > 0`, o relógio não sincronizou; **não é rate limit**.
- **Renpho** precisa de `RENPHO_EMAIL`/`RENPHO_PASSWORD` no `.env` em TODA execução. Se o JSON vier
  com `erro`, reporte que o peso está fora e siga — não trave o ritual.
- **Strava** vem pelo MCP (`list_activities`, `get_activity_performance`, `get_activity_streams`).
  Para corridas em blocos, puxe os streams: é onde estão cadência, FC por bloco e velocidade real.

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

## Passo 3 — As três vozes

Escreva a análise nas três, sem separá-las em seções rígidas — elas conversam.

**🫀 Fisiologista.** Prontidão, sono, HRV, FC de repouso, load balance, ACWR, training status.
Tendência por BLOCO semanal, não por dia solto. FC de repouso caindo é o sinal mais limpo de
adaptação que existe aqui.

**🏋️ Personal.** O que foi planejado × o que aconteceu, com os números do Strava. Cadência,
comprimento de passada, FC por bloco, velocidade real. Compare jogos de futebol **normalizados por
minuto** (m/min e RE/min) — e lembre que **duração prevê carga melhor que tamanho de campo**.

**🍽️ Nutricionista — análise CRUA.** Qualitativa: descrição + foto + efeito no peso. Produza:
- o que está **certo** (comece por aqui),
- os **padrões errados**, com nomes de alimentos reais,
- as **atenções** para a semana seguinte.

Sem eufemismo e sem moralismo. O padrão é o alvo, não a pessoa.

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
