# O capítulo da semana e a próxima aventura (rotina do bot, domingo à noite)

**Quem roda:** a sessão do BOT. O launchd digita este roteiro no domingo às 23h05
(`disparar_rotina.sh capitulo`), depois da avaliação da noite. O gatilho não veio do Fabio. Desenho pedido por
ele em 25/10/2026 (PROJETO_CHAT §29c): **quando a semana é organizada surge uma aventura nova, com densidade de
lore, personagens e narrativa; ao longo dos dias acumulam-se conquistas, percalços e derrotas, mencionados por
baixo; só no fim da semana vem o capítulo, em que esses eventos se integram numa história cujo desfecho é produto
da eficiência e do cumprimento das regras.** Ele lê 15 a 30 minutos sem problema: não economize.

## Antes de escrever, leia tudo

- `historia/biblia.md`: o Livro do Mundo. É canon: lugares, personagens (desejos, feridas, segredos), forças.
- `historia/fios.json`: os fios em aberto. O que aconteceu nas semanas passadas tem de importar mais à frente.
- `historia/escritos/`: os capítulos e premissas anteriores (estilo, nomes, o que já foi dito). Releia pelo menos
  o último encerramento e a premissa desta semana.
- `historia/eventos_dia.json`: o diário de bordo desta semana (o que aconteceu por baixo, dia a dia).
- `painel/data/historia.json`, depois de rodar o motor (passo 1): `capitulos` (o último com `concluido: true` é o
  desfecho oficial desta semana: `tier`, `efeitos`, `cena`), `reliquias`, `maldicoes`, `materiais`, `companhia`.
- `painel/data/semana.json` da semana que começa (o plano do conselho): as missões e os limites da próxima semana.
- O tempo da próxima semana (Open-Meteo, -22,86/-43,23) e a lua (cheia/nova). Feriados e datas da semana.

## Passos

1. **Fechar.** `python3 jornada.py && python3 historia.py --fechar-hoje`. O motor decide o desfecho (pelas missões
   e pelos eventos do diário) e grava relíquias, maldições, talismãs, ferimentos e crise. **Você não decide nada
   disso: você conta.**
2. **Escrever o encerramento** em `historia/escritos/<segunda desta semana>-encerramento.md`:
   ```
   ---
   capitulo: N
   titulo: <nome do capítulo>
   subtitulo: <frase curta>
   semana: AAAA-MM-DD
   simulacao: nao
   desfecho_padrao: <tier oficial>
   ---
   ```
   - **1.800 a 3.000 palavras**, em seções `## I. ...`, `## II. ...`, terceira pessoa, com diálogo.
   - Integre os eventos do diário como cenas da história, na ordem da semana, **sem recitar o dia do Fabio**: nada
     de minutos, quilos, cargas, quilômetros, nomes de exercícios ou refeições literais. O fato vira acontecimento
     do mundo (a lasca de ferro-estrela, a medida de Ysa, a escama do pescador, a trinca no martelo).
   - A última seção é a **Hora do Balanço**: o desfecho oficial (`tier`) e **todas** as consequências que o motor
     aplicou (`efeitos`), explicadas dentro da história. Revés e crise são acontecimentos do mundo, nunca bronca;
     diga o caminho de volta (resgate, relíquia, a semana dentro da lei).
   - Se já existir um arquivo de **simulação** desta semana (`simulacao: sim`), aproveite o corpo, troque a nota,
     marque `simulacao: nao` e escolha o final que bate com o tier oficial (se houver bloco
     `<!-- alternativa: <tier> -->`, use-o como final; senão, reescreva a última seção).
3. **Atualizar os fios** (`historia/fios.json`): o que avançou, o que nasceu, o que se fechou. Plante pelo menos uma
   semente que só vai florescer em semanas futuras.
4. **Escrever a próxima aventura** em `historia/escritos/<próxima segunda>-premissa.md` (mesmo cabeçalho, sem
   `desfecho_padrao`): **1.500 a 2.500 palavras**. Um episódio novo, com lugar, gente e conflito próprios, dentro
   do arco (a etapa atual em `historia.json`). Precisa ter: a situação e quem pede o quê; o céu da semana (tempo
   real e lua); a companhia nesta semana (o estado de cada um: ferido, amaldiçoado, o que deseja); o que espreita
   (as forças); **o que a semana pede** (as missões do plano, como tarefas do mundo: o fogo de Dorn = sessões de
   força, os dias de estrada = dias ativos, as medidas de Ysa = pesagens, as provisões do livro = almoços e lanches
   anotados); **os juramentos** (a lei da lanterna = os portões da fisiologista; a mesa das Sereias = fritura no
   máximo 2; as bênçãos possíveis); e **como a semana pode terminar** (triunfo, avanço, sustenta, revés, crise),
   com o preço de cada caminho. Se já existir uma simulação da premissa, revise com o plano do conselho e marque
   `simulacao: nao`.
5. **Publicar.** `./publicar_jornada.sh`, commit de `historia/` e `painel/data/historia.json`.
6. **Avisar** (`./enviar_telegram_saude.py capitulo`), em até 8 linhas: o título do capítulo e o desfecho em uma
   frase; as consequências que mais pesam; o título da próxima aventura e uma frase de gancho; o link
   `https://painel-xi-three.vercel.app/#campanha`. Não cole o texto longo no Telegram.

## Ao longo da semana (avaliação da noite)

Todo dia, a avaliação da noite registra **de 1 a 4 acontecimentos** do dia com `./evento_aventura.py`, a partir do
que aconteceu de verdade. Tabela de tradução (use esta, para o mundo ser coerente):

| No dia real | Tipo | Efeito |
|---|---|---|
| Sessão de força do plano feita | conquista (Dorn, a forja) | `ferro=1` |
| Pesagem em jejum | conquista (Ysa fixa a posição) | `rumo=1` |
| Corrida ou dia ativo dentro do plano | conquista (Brisa explora) | `pena=1` |
| Peixe numa refeição (a primeira da semana) | presente (os pescadores) | relíquia, se o canon tiver uma pendente |
| Leguminosa, fruta, semana sem fritura | bênção | relíquia do canon, quando couber |
| Manhã vermelha, doença, noite curta | percalço ou névoa | `abrigo=sim` |
| Manhã verde depois de vermelhas | aurora | nenhum |
| Treino fora do plano, acima do teto, ou em manhã vermelha (a lei da lanterna quebrada) | juramento_quebrado | `juramento=limite`, `consequencia=trinca` na 1ª da semana; `consequencia=febre_do_orgulho` na 2ª ou se a febre já estiver ativa |
| Fritura além do limite de 2 na semana | juramento_quebrado | `juramento=sereias`, `consequencia=sal` |
| Médico, remédio, entrevista, visita, decisão sensata | encontro ou bênção | `npc`, `divida`, `fio`, ou nenhum |

Texto do acontecimento: 1 a 2 frases, no mundo, sem números do corpo nem nomes de exercício. Na mensagem da
noite, mencione por baixo, numa linha, o acontecimento do dia ("No diário de bordo: Dorn achou uma lasca de
ferro-estrela."). O preço e o prêmio só chegam no domingo.
