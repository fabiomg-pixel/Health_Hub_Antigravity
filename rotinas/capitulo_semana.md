# Fechar a parte da semana e abrir a próxima (rotina do bot, domingo às 23h05)

**Quem roda:** a sessão do BOT. O launchd digita este roteiro no domingo às 23h05 (`disparar_rotina.sh capitulo`).
O gatilho não veio do Fabio.

## A regra que não se quebra (Fabio, 25/10/2026)

**A história é autônoma.** Nada nela corresponde aos dias do Fabio: nenhuma cena espelha um treino, uma refeição,
uma pesagem, uma doença, um compromisso, um remédio, o tempo lá fora, um feriado ou qualquer fato da vida dele.
Paralelos com a vida real empobrecem a história. **A única ligação é mecânica:** as métricas decidem se os
desfechos são favoráveis ou não, e isso o motor (`historia.py`) já calculou. Você escreve a história que o
desfecho pede, com densidade de lore, personagens e narrativa. Ele lê de 15 a 30 minutos sem problema.

Cada semana real é uma **parte** da campanha. A parte não corresponde a uma semana dentro da história: pode durar
dias ou meses no mundo, o que a trama pedir.

## Leia antes de escrever

- `historia/escritos/prologo.md` e `historia/biblia.md` (o Livro do Mundo): canon.
- `historia/fios.json`: os fios em aberto. O que aconteceu antes tem de importar mais à frente.
- O encerramento e a premissa anteriores (`historia/escritos/`), para manter voz, nomes e fatos.
- `historia/partes/<segunda desta semana>.json`: o baralho desta parte.
- **`historia/personagens.md`**: as fichas da companhia (ferida, desejo, medo, voz, manias, segredos, para onde cada um
  pode ir). Pedido do Fabio (29/10): os personagens têm de ser densos e ele tem de se importar com eles; é isso que o
  motiva. Siga as regras de escrita do topo do arquivo.
- **`historia/despachos.json`**: os despachos que o Fabio recebeu no Telegram durante a semana (os de `id` desta
  semana com `enviado` preenchido, e também os da linha de base). Cada um é uma cena que ele já leu.

## Passos

1. **Fechar.** Primeiro os dados do dia: `./atualizar_dados.sh 3` (puxa Garmin e Renpho; se avisar falha de uma fonte, siga
   com o que há e diga isso na mensagem; o fechamento é definitivo, então não adie por isso). Depois
   `python3 jornada.py && python3 historia.py --fechar-hoje && python3 jornada.py`. Depois leia
   `painel/data/historia.json`: em `capitulos`, o último item é a parte que fechou (`tier`, `efeitos`, `cena`); em
   `historia/estado.json`, `semanas.<segunda>.cartas` diz quantas bênçãos, achados, percalços e maldições a parte teve.
   Para a ordem das cartas, rode `python3 -c` sobre `historia.py` ou leia o diário que o painel mostrou durante a semana.
   **Você não decide o desfecho: você conta.** `tier`: triunfo, avanco, sustenta (impasse), reves, crise.
2. **Escrever o encerramento** em `historia/escritos/<segunda desta semana>-encerramento.md`:
   ```
   ---
   capitulo: N
   titulo: <título da parte>
   subtitulo: Parte <romano>
   semana: AAAA-MM-DD
   simulacao: nao
   desfecho_padrao: <tier oficial>
   ---
   ```
   - **2.000 a 3.500 palavras**, em seções `## I. ...`, terceira pessoa, com diálogo, cenas e interioridade.
   - As **cartas** que saíram nesta parte (na ordem) são acontecimentos da trama e têm de aparecer integradas na
     história. **Todo despacho que ele recebeu tem de estar lá**, reconhecível (a mesma cena, o mesmo gesto, a mesma
     fala), e o encerramento mostra o que aquela cena pequena significou depois: o que ela causou, quem mudou por causa
     dela. Ele precisa ver o marco dele ganhar sentido na história.
   - **Cada membro da companhia tem pelo menos uma cena própria** com interioridade e uma escolha que custa alguma
     coisa (fichas em `historia/personagens.md`). No máximo um segredo grande revelado por parte, e só se já tiver sido
     semeado duas vezes. As **consequências** (`efeitos`: runa partida, mácula, ferida, captura, relíquia, estilhas, avanço ou
     recuo de etapa) têm de acontecer na história, explicadas por ela mesma.
   - A última seção é o desfecho da parte, coerente com o `tier`: triunfo = grande vitória; avanço = o objetivo da
     parte é alcançado; impasse = a companhia segura o que tem mas não alcança o objetivo; revés = derrota com ferida;
     crise = derrota grave (captura, recuo). Sem culpa nem lição moral.
   - Se já houver uma **simulação** desta semana (`simulacao: sim`): mantenha o corpo, escolha o final pelo tier oficial
     (o bloco `<!-- alternativa: <tier> -->`, se houver; senão reescreva a última seção), troque a nota e marque
     `simulacao: nao`.
2b. **Os marcos da parte** em `historia/escritos/<segunda desta semana>-marcos.json` (o painel mostra embaixo do
   capítulo, em "Os marcos desta parte"): `{"marcos": [{"id", "dia" (ex.: "quinta, 29/10"), "tipo", "carta" (o texto
   curto da carta), "marco" (o rodapé que ele recebeu, copiado do `marco` do despacho), "secao" (ex.: "III. A porta de
   ferro"), "como" (1 a 2 frases: onde a cena entrou e o que ela causou na história)}]}`, um item por despacho, na
   ordem. Inclua também as cartas sem despacho (quieto) se entraram na história.
3. **Atualizar os fios** (`historia/fios.json`), as seções "Agora" e "Mudou" de `historia/personagens.md` e, se nasceu
   lore novo, o `historia/biblia.md` (só o que é público; segredo fica nas fichas). Plante pelo menos uma
   semente que só floresce semanas adiante.
4. **Escrever a próxima parte**:
   - **Premissa** em `historia/escritos/<próxima segunda>-premissa.md` (cabeçalho igual, sem `desfecho_padrao`), **1.500
     a 2.500 palavras**: um episódio novo dentro do arco (a etapa atual em `historia.json`), que continua o desfecho que
     acabou de acontecer. Lugar, gente, conflito, o que cada membro da companhia quer e teme agora (inclua ferimentos e
     maldições ativas), o que espreita, e **como a parte pode terminar** (triunfo, avanço, impasse, revés, crise), com o
     que está em jogo em cada caso. **Proibido** mapear missões ou regras para tarefas do mundo ("o fogo da forja =
     sessões de força"): o leitor vê as métricas no painel, fora da história.
   - **Baralho** em `historia/partes/<próxima segunda>.json`, no formato de `historia/partes/2026-10-26.json`:
     `parte`, `titulo`, `clima` (céu da parte, inventado: `seca`, `chuvosa`, `tempestade` ou `quente`), `antagonista`
     (`cinza`, `corvino` ou `esquecidos`), `recompensa_limpa` (id de relíquia de `mundo.json`) e as pilhas: pelo menos
     5 `bencao` (efeito `{"estilha": 1}`), 4 `achado` (`{"pista": 1}`), 3 `quieto` (`{}`), 3 `percalco`
     (`{"desgaste": 1}`) e 3 `maldicao` (sem efeito; texto agourento que não diga qual é o preço). Cartas curtas
     (1 a 2 frases), só história, ligadas à trama desta parte, na ordem em que fariam sentido.
     **Cada carta leva também um `despacho`** (é o que chega ao Telegram na hora do marco): 60 a 110 palavras, uma
     cena pequena com foco em UM personagem (gesto, fala, decisão, o que ele sente e não diz), que faça o Fabio querer
     saber o que vem depois. Varie o foco entre os cinco ao longo da pilha. Percalço e maldição doem num personagem
     de que ele gosta, sem dizer o preço mecânico.
     Mais duas peças: a pilha `missao` (5 ou 6 cartas com `texto` e `despacho`, uma por missão cumprida, na ordem: são
     pequenas vitórias de relação entre eles, não de combate) e `rumo`, um objeto com uma linha de presságio para cada
     desfecho (`crise`, `reves`, `sustenta`, `avanco`, `triunfo`), mandada quando a projeção muda. Modelo:
     `historia/partes/2026-10-26.json`.
5. **Publicar.** `./publicar_jornada.sh`, commit de `historia/` e `painel/data/historia.json`.
6. **Avisar** (`./enviar_telegram_saude.py capitulo`), em até 8 linhas (diga também que o capítulo mostra onde cada
   marco da semana entrou na história): o título da parte que fechou e o desfecho numa
   frase da história; as consequências que pesam; o título da próxima parte e uma frase de gancho; o link
   `https://painel-xi-three.vercel.app/#campanha`.

## Durante a semana (despachos e avaliação da noite)

O diário de bordo é automático: o motor tira as cartas pela qualidade do dia (desde 29/10, cumulativas: achado aos 2
itens, bênção aos 4; percalço no dia fechado sem nada). O `despachos.py`, num laço de 15 min (screen `despachos`),
manda cada carta nova, cada missão cumprida, cada juramento quebrado e cada mudança do desfecho projetado ao Telegram
na hora, com a cena (`despacho`) e um rodapé fora da história dizendo qual foi o marco. A avaliação da noite só:
- registra, quando houver, o **juramento quebrado** do dia: `./juramento_quebrado.py AAAA-MM-DD limite` (portão ou
  teto da fisiologista desrespeitado) ou `mesa` (fritura além de 2 na semana). Só a data e o tipo; a história nunca
  diz o que foi feito;
- roda `./despachos.py` (ele recalcula e manda o despacho da maldição, se houver) e, na mensagem, diz numa linha
  quantos despachos da Campanha saíram hoje, sem repetir as cenas.
