# Conselho de domingo em forma de entrevista (rotina do bot)

**Quem roda:** a sessão do BOT (@Silvester_TheTrainer_bot). O launchd digita este roteiro no domingo às 10h03
(`disparar_rotina.sh conselho`) e às 21h03 (`disparar_rotina.sh conselho_fechar`). O gatilho não veio do Fabio.
Desenho pedido por ele em 18/10/2026 (PROJETO_CHAT §28): **um especialista de cada vez analisa, pergunta em
bate e volta, prepara a avaliação; depois vem o próximo.** No fim, a síntese vira a semana.
**Modo Nuvem (01/11):** o Mac abre (passos 0 e 1) e fecha (passo 5); as respostas do Fabio chegam à nuvem, que faz os
passos 2 a 4 (`rotinas/telegram_nuvem.md`). No Mac, antes de ler o estado: `git pull --rebase --autostash origin main`;
depois de cada passo: commit e `git push origin HEAD:main` (o `enviar_telegram_saude.py` também sincroniza sozinho).

## Onde fica o estado (o disco vale, não a memória)

Pasta `conselho/AAAA-MM-DD/` (data do domingo):
- `estado.json`: `{"semana", "domingo", "inicio", "ordem": ["carga","logistica","nutricao"], "atual",
  "fase": "analise|aguardando|avaliacao|sintese|publicado", "rodada", "agentes": {esp: agentId},
  "concluidos": [], "sem_resposta": []}`. Atualize a cada passo e commite.
- `<especialista>.md`: `## Análise`, `## Rodada N` (perguntas enviadas e a resposta dele, palavra por palavra),
  `## Avaliação` (bloco técnico + relatório "Como está / Para onde vai / O que eu não sei").
- `registros_semana.txt`: o texto completo dos registros de segunda a domingo.

A passagem mostra a entrevista em andamento. **Enquanto `fase` for `aguardando`, a próxima mensagem do Fabio
é, quase sempre, a resposta.** Se ele falar de outra coisa (registro de refeição, pergunta), atenda isso e
lembre, numa linha, que a pergunta do conselho segue aberta.

## Passos

### 0. Abrir (gatilho das 10h03)
Se `conselho/<domingo>/estado.json` já existe, não recomece: continue de onde está.
1. Rode `./publicar_dados.sh` (dados frescos) e grave `registros_semana.txt` a partir de
   `./painel_get.sh "/api/registros?paginas=3"` (segunda a domingo da semana que fecha).
2. Se houver calendário disponível na sessão, anote a agenda da semana seguinte em `agenda.md`; se não houver,
   a logística pergunta.
3. Crie `estado.json` com `atual: "carga"`, `fase: "analise"`, `rodada: 0`.
4. Mande UMA mensagem de abertura com `./enviar_telegram_saude.py conselho`: "Conselho da semana: três
   conversas curtas, uma de cada vez (fisiologista, logístico, nutricionista). Responda quando puder; o que
   ficar sem resposta até as 21h eu decido pelo lado mais seguro." E siga para o passo 1 com a carga.

### 1. Análise e perguntas (um especialista)
Chame o subagente do especialista atual (`subagent_type` = `carga`, `logistica` ou `nutricao`) com:
"MODO ENTREVISTA, fase análise (siga a seção 'Modo entrevista' de .claude/agents/<esp>.md). Semana planejada: <datas>. Leia fatos.json, conselho/<domingo>/ (inclusive as
avaliações dos especialistas anteriores) e as fontes do seu papel." Guarde o `agentId` em `estado.json`
para continuar a mesma conversa depois (SendMessage). Grave a análise em `<esp>.md`.

Envie ao Fabio (`./enviar_telegram_saude.py conselho`), no formato:
```
Conselho 1/3 · a fisiologista
<2 a 3 linhas do que ela vê, com os números do fatos.json>
1. <pergunta>  (responda: sim/não | um número | A, B ou C)
2. ...
Pode responder tudo numa mensagem: "1 sim, 2 seis".
```
No máximo 3 perguntas. `fase: "aguardando"`, `rodada: 1`.

### 2. Bate e volta (quando ele responder)
1. Copie a resposta, palavra por palavra, em `<esp>.md` (`## Rodada N`). Registre no painel o que for registro
   (CLAUDE.md §9) e com `./registrar_decisao.sh bot ...` o que for decisão dele.
2. Continue o MESMO subagente (SendMessage para o `agentId`; se a sessão reiniciou e o id se perdeu, chame um
   novo e passe o `<esp>.md` inteiro): "Respostas do Fabio: <texto>. Se ainda falta algo que MUDA a sua
   decisão, devolva até 2 perguntas de seguimento. Senão, escreva a avaliação."
3. Pergunta de seguimento: envie como no passo 1 (`Conselho 1/3 · a fisiologista, de volta`), `rodada + 1`.
   **No máximo 2 rodadas por especialista.** Na segunda, a avaliação é obrigatória.

### 3. Avaliação e próximo
Grave a avaliação em `<esp>.md`, `concluidos += [esp]`. Envie ao Fabio só o relatório humano, curto:
"Avaliação da fisiologista: <como está, 2 linhas> · <para onde vai, 2 linhas>". Na mesma mensagem, ou logo
depois, abra o próximo especialista (passo 1). Ele lê as avaliações anteriores: a logística sabe o teto da
carga; a nutrição sabe o teto e a agenda.

### 4. Síntese, cético e publicação (depois do terceiro)
`fase: "sintese"`. Siga `.claude/skills/revisao-semanal/SKILL.md` do **passo 4 ao 6**, usando as três
**Obrigatório (falha de 26/10):** todo dia de força do plano tem de ganhar uma sessão com exercícios, séries e
carga em `painel/data/treinos.json` (data AAAA-MM-DD, formato das sessões existentes, cargas tiradas dos últimos
registros com `#sets`), e todo dia de corrida uma sessão em `painel/data/corridas.json`. Sem isso o botão "Iniciar o
treino" abre vazio ("Nenhum dia da semana publicada tem exercícios com séries"). O cético confere.
**Obrigatório (Fabio, 31/10):** toda sessão de força leva também `casa`: a versão em casa com TRX e peso do corpo (sem pesos: ele não tem em casa, 31/10), com o
mesmo objetivo e número de séries parecido (modelo: `2026-11-01` em `treinos.json`; opções de TRX na `biblioteca`).
A rodada bônus (`bonus` em `treinos.json`) já vale para todos os dias de força e de corrida; não precisa de plano
próprio. O cético confere as duas coisas.

avaliações como a saída dos especialistas (não chame de novo). Os quatro relatórios (carga, logística,
nutrição, cético) vão para `relatorios` do `semana.json`. O cético (`subagent_type` `cetico`) é bloqueante.
ANTES de substituir o `semana.json`, arquive a semana que acaba: `cp painel/data/semana.json historico_semanas/AAAA-MM-DD.json` (segunda da semana velha); o `jornada.py` lê esses arquivos, senão a semana velha perde as missões do plano e o XP cai. Depois: `./publicar_jornada.sh` (as missões do capítulo novo leem o `semana.json`), commit, `fase: "publicado"`.

Mensagem final (`./enviar_telegram_saude.py conselho`, até 10 linhas): uma linha por resposta dele no formato
"você disse X → ficou Y"; o que foi decidido pelo lado seguro por falta de resposta; o foco da semana; o link
`https://painel-xi-three.vercel.app/#inicio`. Não repita o cardápio.

### 5. Fechar (gatilho das 21h03, ou brief de segunda se a entrevista começou tarde)
Se `fase` já é `publicado`, não faça nada. Se a entrevista começou há menos de 6 h, não feche: o brief de
segunda fecha. Senão, para o especialista atual e os que faltam: chame o subagente pedindo a avaliação **com a
semana padrão** (nível de base, nunca o pior caso: Fabio, 27/10) em cada pergunta sem resposta (diga qual foi assumido) e registre em `sem_resposta`. Siga para o
passo 4. Sem cobrança: "Fechei a semana com o padrão combinado onde não deu para conversar; se mudar algo, me diga
e eu ajusto."

## Regras
- Especialista pergunta só o que **muda a decisão dele** e que nenhum dado responde. Nada de perguntar o que o
  relógio, a balança ou os registros já dizem.
- Perguntas fechadas (sim/não, número, A/B/C). Ele pode completar com texto livre; o texto livre vale mais.
- Clínico (remédio, dor articular, febre) não vira conduta: o especialista registra e encaminha (PROJETO_CHAT §10).
- §18: sem informação, sem decisão. A semana padrão declarada não é dado inventado. O corte vem só dos sinais de
  segurança e do semáforo (decisoes.md, nível de base).
- "Pula" ou "depois": o especialista fecha com a semana padrão daquela pergunta e segue. "Decide você": o
  especialista decide pela própria recomendação (ele delegou) e diz qual foi.
