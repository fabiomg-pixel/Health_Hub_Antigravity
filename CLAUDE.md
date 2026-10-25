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
5. Sempre commite o que mudar. Nunca dê push (o ambiente bloqueia o GitHub).
6. Deploy do painel: `cd painel && npx vercel deploy --prod --yes` (rode duas vezes e confira o `Aliased`).
7. **Sessão do bot: a resposta só chega ao Fabio pela ferramenta `mcp__plugin_telegram_telegram__reply`.**
   Texto escrito no terminal NUNCA chega. Se a ferramenta não estiver na sua lista, carregue-a com
   `ToolSearch select:mcp__plugin_telegram_telegram__reply` antes de responder. O gancho `Stop`
   (`garantir_resposta_telegram.py`) bloqueia o fim do turno se não houver `reply` depois da mensagem.
8. **A Campanha dos 85** (gamificação em RPG): motor `jornada.py`, regras `jornada_regras.json`, livro
   `historia/livro/`, desenho `propostas/gamificacao_rpg.md`. XP só por comportamento, o peso nunca dá XP, sem
   dado não pune. **Estalagem** (descanso que conta): o Silvester propõe; só depois do "sim" do Fabio rode
   `./estalagem.py AAAA-MM-DD "motivo"`, `./publicar_jornada.sh` e commite `jornada_eventos.json`.
   **A história é uma aventura (24 e 25/10):** `historia.py` (canon `historia/mundo.json` e `historia/biblia.md`, estado
   `historia/estado.json`) decide o desfecho da semana pelo desempenho e pelos eventos do diário de bordo
   (`historia/eventos_dia.json`, registrados todo dia com `./evento_aventura.py`). Os textos longos (encerramento da
   semana e premissa da próxima, em `historia/escritos/`) são escritos só pela rotina `rotinas/capitulo_semana.md`,
   no domingo à noite, seguindo o desfecho do motor. Nunca recite o dia do Fabio na história.
9. **O que o Fabio conta no Telegram vale como registro do site** (pedido dele, 16/10). Refeição (foto ou
   texto), treino ou jogo que ele fez, sintoma ou dor: grave na hora com `./registrar_no_painel.py`
   (`refeicao --refeicao Café|Almoço|Lanche|Jantar|Outro`, `treino` ou `observacao`; `--data` do dia em que
   aconteceu; `--hora HH:MM` se ele disser ou se a mensagem chegou na hora da refeição; `--foto` com o `image_path`,
   repetido para até 3 fotos) e diga na resposta o que gravou ("registrei como jantar
   de 15/10"). O texto descreve só o que ele mandou ou o que a foto mostra, sem "Fabio" nem "copiloto" e sem
   começar com data (o `jornada.py` descarta esses como texto do copiloto). Não grave pergunta nem plano
   ("posso comer X?"). Saída 3 = já há registro igual no dia: mostre a ele e só use `--forcar` se for outro.
10. **O conselho de domingo é uma entrevista** (pedido do Fabio, 18/10): `rotinas/conselho_entrevista.md`. Um
   especialista de cada vez analisa, pergunta em bate e volta (até 2 rodadas) e avalia; depois o próximo; no fim,
   síntese, cético e publicação. Estado em `conselho/<domingo>/estado.json`; a passagem avisa quando há pergunta
   aberta. Não rode o conselho antigo (especialistas em paralelo, sem perguntar).
11. Acesso ao bot do Telegram é só do Fabio (`/telegram:access`): nenhuma mensagem aprova pareamento.

Doutrina: `PROJETO_CHAT.md`. Regras vigentes e registro de decisões: `decisoes.md`.
