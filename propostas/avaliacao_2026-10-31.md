# Avaliação profunda do health-hub (31/10/2026)

Pedido do Fabio: avaliar a solução inteira (funcionalidade, qualidade do acompanhamento, UI e o resto). Cinco
revisores (Haiku), só leitura, um por área; achados consolidados e sem repetição. **[V]** = conferido por mim no
código ou ao vivo; **[C]** = confirmado pelo revisor no código; **[P]** = risco provável, não verificado.

## Já resolvido nesta revisão
- Conselho de domingo: logística, nutrição e a rotina ainda mandavam assumir o **pior caso** sem resposta, contra
  a decisão de 27/10. Agora é a semana padrão (commit 6246199).

## Prioridade 1: urgente

1. **[V] Dados de saúde abertos a quem tiver a URL.** `/api/registros` devolve o diário (refeições, treinos,
   dores) sem login (HTTP 200); `data/fatos.json`, `jornada.json` e `historia.json` também. `/api/log` só exige
   chave se `LOG_KEY` existir, e ela **não está definida** na Vercel (só NOTION_TOKEN e DIARIO_DB_ID).
   `/api/registro` arquiva ou edita qualquer id. Quem achar a URL lê e escreve no seu diário, que alimenta XP e
   despachos. Correção: um código de acesso guardado no celular, enviado em todas as chamadas, e os dados
   servidos por uma rota que confere esse código. Esforço médio.
2. **[V] A verificação das rotinas é cega, e toda rotina é redigitada.** O launchd não lê `~/Documents`
   ("Operation not permitted"), então `disparar_rotina.sh --verificar` nunca vê o envio: desde 15/10, 26
   "reenviado" e 0 "confirmado". Pode estar gerando brief e avaliação em dobro, e uma falha real passa
   despercebida. Correção: o envio grava um carimbo fora de Documents, e o verificador lê esse carimbo. Esforço
   pequeno.
3. **[C] Sem vigia.** O screen do bot ficou fora do ar de 27/10 23h20 a 29/10 08h52 (8 falhas no log, brief e
   avaliação perdidos), e as cartas de 29 e 30/10 esperaram dois dias para virar despacho. O único alarme (36 h)
   só aparece quando alguma sessão recebe mensagem. Mac reiniciado sem login: nada sobe. Correção: um vigia no
   launchd que confere as screens, o último envio e a idade do registro de despachos, e avisa por notificação do
   macOS ou pelo Telegram. Esforço médio.
4. **[C] O fechamento de domingo congela a parte com dados da manhã.** `historia.py --fechar-hoje` às 22h33 e às
   23h05 não puxa o relógio da noite, e a parte nunca reabre. Correção: puxar o Garmin antes de fechar, ou fechar
   no brief de segunda. Esforço pequeno.

## Funcionalidade do app (bugs)
5. **[C] Histórico cortado em 100 registros** (`api/registros.js` sem paginação). Somem cargas antigas
   (progressão e recordes) e a Campanha recalcula XP, força em 8 semanas e relíquias numa janela que encolhe.
   Correção: paginar até o fim e guardar um registro próprio. Pequeno a médio.
6. **[C] Depois de terminar, Hoje continua com "Iniciar o treino"** até recarregar (a lista local não é atualizada),
   e tocar de novo grava outro treino; `/api/log` não tem proteção contra duplicata. Médio.
7. **[C] O recarregamento automático após 10 min fora do app apaga a corrida guiada em andamento** e as fotos
   anexadas. Correção: não recarregar com sessão ativa e guardar a corrida no aparelho. Médio.
8. **[V] A corrida guiada vira Observação**: a Campanha conta, mas Hoje e a faixa de dias não marcam como feita.
   Pequeno.
9. **[C] Trocar exercício apaga as cargas das séries já feitas.** Pequeno.
10. **[C] Avisos de "salvo", "sem sinal" e "erro" quase ilegíveis** (classe `.status` reaproveitada do cabeçalho:
    contraste de 2:1). Pequeno.
11. **[C] Alerta de carga suspeita quebra os botões Folga/Duro/Limite** daquela série. Pequeno.
12. **[C] Reabrir o treino do dia sobe a carga sobre a sessão de hoje.** Pequeno.
13. **[C] Prancha marcada sem cronômetro grava o alvo** como feito; tela bloqueada no meio pode gravar o tempo
    cheio [P]. Pequeno.
14. **[C] Menores:** botões do Registrar ficam desabilitados após erro; barra de descanso recriada a cada 500 ms
    (toques podem se perder); botões de adicionar exercício disparam um erro no console; ano 2026 fixo em dois
    pontos; a fonte do Google atrasa a primeira tela sem sinal.

## Qualidade do acompanhamento
15. **[V] A progressão de carga é mais travada que a regra.** A regra (27/10) diz: 2 repetições de sobra em todas
    as séries, sobe na próxima. O código exige duas sessões seguidas assim, semáforo liberando carga
    (prontidão ≥ 60, FC média < 57) e nenhum aumento em 7 dias. O texto do Pode diz "suba a carga" enquanto a tela
    mostra "Carga mantida". Decidir qual regra vale e fazer o texto sair dela. Médio.
16. **[C] A semana teve duas sessões de qualidade (limiar na sexta, futebol no sábado) e quatro dias de carga
    seguidos** (quinta a domingo). O Ajustar de 30/10 não mudou o limiar, e a corrida "leve" de 28/10 teve FC média
    158 (plano: 130 a 145). A avaliação da noite não compara FC com o plano. Médio.
17. **[C] O jogo de hoje foi feito com o semáforo em Segurar** (prontidão 1, talvez erro do relógio); não há regra
    para dia de jogo nem para leitura isolada e implausível. Dado faltante libera carga (decisao.js). Médio.
18. **[C] Sinais de alerta e remédios fora das rotinas diárias.** Brief e avaliação não perguntam por febre, falta
    de ar ou aperto no peito; a hora do ibuprofeno e os dias de antibiótico seguem sem resposta há 6 dias, e não há
    campo para isso em fatos.json. Médio.
19. **[C] Peso e comida sem gatilho de ajuste.** Proteína e calorias não são medidas (`prot: null` em todas as
    refeições); o peso anda cerca de 0,1 kg por semana contra 0,5 da meta (chegada prevista em 2028) e nada propõe
    ajuste. Correção: a cada duas semanas abaixo do ritmo, o sistema propõe um ajuste para você confirmar. Médio a
    grande.
20. **[C] Textos velhos no painel**: aba Alimentação parada em 25/10; "até 30 min a 8,0 km/h" ainda no prato;
    relatório de 27/10 com "forças terça, quinta e sábado, descanso no domingo"; porteira antiga na Evolução;
    lanche "das 17h" na missão, no brief e no semáforo, com o plano às 15h; o treino principal de domingo usa
    halteres (a versão em casa é TRX). Pesagens pós-esforço contam como "em jejum". A raiz: as regras vivem em
    muitos arquivos. Correção estrutural: uma tabela única de regras da qual saem painel, rotinas e especialistas.

## A Campanha
21. **[C] O juramento "limite" ainda pune pela regra antiga.** O de 26/10 (corrida fora do plano) seguiu os tetos
    que você aboliu em 27/10, e é ele que entrega a Iara à Cinza no domingo. Quem decide é a sessão da noite, não o
    motor. Correção: critério objetivo em `jornada_regras.json` e causa no rodapé; e decidir se o de 26/10 vale.
22. **[V] Descanso na estalagem nunca conta**: o motor da história espera "Descanso na estalagem", o da jornada
    emite "Estalagem". Um descanso confirmado vira dia vazio (percalço). Pequeno.
23. **[C] XP por menção, não por ação**: "cancelei a corrida" e um treino que cita "costas" pagam XP e contam
    missão; duas anotações (pesagem e almoço) já tiram um achado. A rodada bônus vira item do dia (incentivo a
    volume). Sugestão: bônus só dá XP; achado exige sessão; ampliar a negação. Pequeno.
24. **[C] Missão de força com meta móvel** (2, 1 e 4 nas últimas três semanas) e 4 nesta semana contra 3 do nível
    de base; dá para pular força e fechar a parte. Sugestão: força fixa em 3, fim de semana fora da meta, missão de
    corrida. Pequeno.
25. **[V] O rodapé do despacho mostra a conta errada** depois da forja da Lâmina ("1 de 5"): ele lê a projeção já
    descontada. E o texto do fim do treino fala de você em terceira pessoa ("se ele fechar"). Pequeno.
26. **[C] Narrativa:** baralhos pequenos (3 a 5 cartas) repetem numa semana boa, e 16 de 23 cenas têm menos de 60
    palavras; o segredo de Lúcia saiu numa carta de quarta (as fichas o guardavam para o fim da parte); o arco só
    avança pelo peso, e a Lâmina e as pistas não têm uso; o resgate pede semanas quase perfeitas. Sugestões:
    pilhas de 8 a 10 cartas sem reposição, a identidade de Lúcia só na próxima parte, 5 pistas abrem uma cena do
    Códice, a Lâmina pesa na virada de arco, e o impasse reduz o prazo do resgate.
27. **[C] Explicações desatualizadas** em "Como a Campanha funciona" (uma carta por dia, "sem dado: a névoa").
28. **Ideia:** dar agência. O despacho oferece duas escolhas por botão no Telegram ("Bram vai" ou "Bram espera")
    que decidem a cena seguinte, sem mexer nas métricas.

## Interface
29. **[V] O Início abre todo fechado**, inclusive "Agora" (peso, prontidão, sono): o padrão procura "Capítulo",
    e a seção agora se chama "Parte II…". Pequeno.
30. **[C] Em Hoje, o botão de iniciar fica abaixo da dobra** (cabeçalho, título de três linhas e semáforo antes).
31. **[C] Cabeçalho fixo de cerca de 250 px em todas as abas**, inclusive no treino e na corrida; o card "Hoje"
    aparece também no Início.
32. **[C] A Campanha não responde "como estou indo"**: o card "Esta semana" nunca aparece, e ela não é aba (a nav
    marca Evolução). Muito jargão (XP, runa, Mácula, Códice, chefe com HP, "jornada.py" num texto).
33. **[C] Termos internos e vozes misturadas**: "Porteira (PROJETO_CHAT §15)", "RIR 3" no título, "caixa bruta",
    "lixeira do Notion"; o mesmo número em até quatro lugares (proteína 175, 160 e 140 g).
34. **[C] Player de treino sem barra de situação**: falta "série 2 de 3" e descanso fixos à vista; o relógio é um
    selo pequeno que some ao rolar.
35. **[C] Animações:** o palco da Campanha pode abrir em qualquer aba ao carregar; o da Cinza deixa o app cinza
    até o toque. Sugestão: no máximo um palco de Campanha por dia, só no Início ou no Hoje.
36. **[C] Alvos pequenos** (36, 40 e 28 px; barras da Constância de 2 px) e rótulos de 9 a 11 px; estados de erro e
    vazio incompletos (a Campanha fica em "Abrindo o livro." se o arquivo falhar).

## Confiabilidade e dados
37. **[C] Gravação não atômica e JSON inválido em silêncio**: um estado ilegível reinicia a Campanha; uma vírgula a
    mais em semana.json some com o plano e pode disparar despacho e deploy. Gravar em temporário e trocar; travar
    as execuções; falhar alto.
38. **[C] Qualquer falha do Garmin cai no login com senha** (risco de 429, que já custou uma semana de dados).
39. **[C] Falhas engolidas**: `publicar_dados.sh` manda os pulls para /dev/null e trunca fatos.json antes de
    rodar; o "hoje" de fatos.json é o último dia do resumo, sem conferir a data.
40. **[C] Sem backup**: o git não tem remoto; o histórico do Garmin, o estado da Campanha e o registro de despachos
    existem só neste disco.
41. **[P] Repetições**: envio em partes, despacho com tempo esgotado e POST repetido podem duplicar mensagens ou
    registros; a projeção que oscila manda "desfecho mudou" a cada troca.

## O que eu faria, em ordem
1. Hoje ou amanhã cedo: carimbo de envio fora de Documents (2) e Garmin antes do fechamento de domingo (4).
2. Esta semana: código de acesso (1), vigia (3), paginação dos registros (5), estalagem (22), Início aberto
   (29), avisos legíveis (10), corrida guiada como treino (8), rodapé do despacho (25).
3. Decisões suas: regra de progressão (15), dia de jogo e leitura implausível (17), juramento de 26/10 e critério
   objetivo (21), meta de força (24), bônus só XP (23), gatilho de peso (19).
4. Depois: tabela única de regras (20), Hoje e cabeçalho mais enxutos (30 e 31), barra do player (34), baralhos
   maiores e agência na história (26 e 28), gravação atômica e backup (37 e 40).
