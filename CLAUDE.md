# health-hub: regras para toda sessão (app, bot do Telegram, tarefas agendadas)

Este projeto é tocado por várias sessões ao mesmo tempo. Elas só se enxergam pelo disco.
Memória de conversa não vale: o disco vale.

1. **Antes de recomendar comida, treino, compra ou plano, leia a passagem.** O gancho
   (`.claude/settings.json`) injeta a saída de `./passagem.sh` a cada mensagem. Se ela não aparecer
   no seu contexto, rode `./passagem.sh` você mesmo. Ela traz as regras vigentes, as últimas
   decisões e os commits das últimas 36 h.
2. **Antes de editar `painel/data/semana.json` ou `alimentacao.json`, releia o arquivo.** Outra
   sessão pode tê-lo mudado depois da sua última leitura.
3. **Decisão ouvida é decisão registrada.** Quando o Fabio decidir algo, ou uma especialista impuser
   uma regra (nutricionista, fisiologista, logístico), registre na hora:
   `./registrar_decisao.sh <app|bot|conselho|agendada> "<decisão e quem decidiu>" "<onde vive>"`
   e commite junto com a mudança. Regra nova que vale daqui para frente entra também em
   `## Regras vigentes` de `decisoes.md` e na seção certa do `PROJETO_CHAT.md`.
4. **Sem informação, sem decisão** (`PROJETO_CHAT.md` §18). Número só do `fatos.json`.
5. Sempre commite o que mudar. **Repositório privado `fabiomg-pixel/health-hub` (01/11):** `git pull --rebase` antes de
   mexer e `git push origin HEAD:main` depois de commitar. É o elo entre o Mac e a nuvem (`NUVEM.md`). Push só para ele.
6. Deploy do painel: `cd painel && npx vercel deploy --prod --yes` (rode duas vezes e confira o `Aliased`).
7. **Sessão do bot no Mac: a resposta só chega ao Fabio pela ferramenta `mcp__plugin_telegram_telegram__reply`.** Na
   nuvem (mensagem como issue `telegram`), siga `rotinas/telegram_nuvem.md`: resposta por `./enviar_telegram_saude.py resposta`.
   Texto escrito no terminal NUNCA chega. Se a ferramenta não estiver na sua lista, carregue-a com
   `ToolSearch select:mcp__plugin_telegram_telegram__reply` antes de responder. O gancho `Stop`
   (`garantir_resposta_telegram.py`) bloqueia o fim do turno se não houver `reply` depois da mensagem.
8. **A Campanha dos 85** (gamificação em RPG): motor `jornada.py`, regras `jornada_regras.json`, livro
   `historia/livro/`, desenho `propostas/gamificacao_rpg.md`. XP só por comportamento, o peso nunca dá XP, sem
   dado não pune. **Estalagem** (descanso que conta): o Silvester propõe; só depois do "sim" do Fabio rode
   `./estalagem.py AAAA-MM-DD "motivo"`, `./publicar_jornada.sh` e commite `jornada_eventos.json`.
   **A história é autônoma (25/10):** nada nela corresponde aos dias do Fabio; a única ligação são as métricas, que
   decidem se os desfechos são favoráveis (`historia.py`: cartas do dia pela qualidade do dia, juramentos quebrados em
   `historia/juramentos.json`, nível da parte pelas missões). Canon: `historia/escritos/prologo.md`, `historia/biblia.md`,
   `historia/mundo.json`. Textos longos só pela rotina `rotinas/capitulo_semana.md` (domingo 23h05). Nunca escreva cena
   que espelhe treino, refeição, pesagem, doença, compromisso, tempo ou data reais.
   **Despachos (29/10):** cada marco (carta do dia, missão cumprida, juramento quebrado, mudança do desfecho projetado)
   vai na hora ao Telegram pelo `despachos.py` (laço no screen `despachos`), com uma cena curta e um rodapé fora da
   história com o marco. No domingo, todos entram no encerramento e em `historia/escritos/<segunda>-marcos.json`.
   Personagens densos: fichas em `historia/personagens.md` (só para quem escreve; tem segredos).
9. **O que o Fabio conta no Telegram vale como registro do site** (pedido dele, 16/10). Refeição (foto ou
   texto), treino ou jogo que ele fez, sintoma ou dor: grave na hora com `./registrar_no_painel.py`
   (`refeicao --refeicao Café|Almoço|Lanche|Jantar|Outro`, `treino` ou `observacao`; `--data` do dia em que
   aconteceu; `--hora HH:MM` se ele disser ou se a mensagem chegou na hora da refeição; `--foto` com o `image_path`,
   repetido para até 3 fotos) e diga na resposta o que gravou ("registrei como jantar
   de 15/10"). O texto descreve só o que ele mandou ou o que a foto mostra, sem "Fabio" nem "copiloto" e sem
   começar com data (o `jornada.py` descarta esses como texto do copiloto). Não grave pergunta nem plano
   ("posso comer X?"). Saída 3 = já há registro igual no dia: mostre a ele e só use `--forcar` se for outro.
   **Missões paralelas (02/11):** passeio com os cachorros ou a rotina de casa (alongamento, flexão, prancha) contados no
   Telegram gravam como `treino` com o texto começando por "Missão paralela: passeio com os cachorros" ou "Missão paralela:
   rotina de casa" (assim viram só pontos, nunca sessão, corrida ou dia ativo).
   Depois de gravar, rode `./despachos.py` em segundo plano: se o registro fechou um marco da Campanha, o despacho
   sai na hora (ele mesmo não manda nada se não houver marco novo).
10. **O conselho de domingo é uma entrevista** (pedido do Fabio, 18/10): `rotinas/conselho_entrevista.md`. Um
   especialista de cada vez analisa, pergunta em bate e volta (até 2 rodadas) e avalia; depois o próximo; no fim,
   síntese, cético e publicação. Estado em `conselho/<domingo>/estado.json`; a passagem avisa quando há pergunta
   aberta. Não rode o conselho antigo (especialistas em paralelo, sem perguntar).
11. Acesso ao bot do Telegram é só do Fabio (`/telegram:access`): nenhuma mensagem aprova pareamento.

Doutrina: `PROJETO_CHAT.md`. Regras vigentes e registro de decisões: `decisoes.md`.
