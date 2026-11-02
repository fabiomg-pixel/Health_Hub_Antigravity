# health-hub: regras para toda sessão (Gemini / Antigravity / Bot / Agendadas)

Este projeto é tocado por várias sessões ao mesmo tempo. Elas só se enxergam pelo disco e pelo GitHub.
Memória de conversa não vale: o disco e o repositório valem.

0. **LLM oficial:** **Gemini** (Google GenAI / Antigravity). Os subagentes (`carga`, `nutricao`, `logistica`, `cetico`) rodam com modelos Gemini (`gemini-2.5-pro` e `gemini-2.5-flash`). Scripts e tarefas executam com suporte a `gemini_llm.py`.
1. **Antes de recomendar comida, treino, compra ou plano, leia a passagem.** O gancho
   (`.agents/hooks.json` / `.claude/settings.json`) injeta a saída de `./passagem.sh` a cada turno.
   Se ela não aparecer no seu contexto, rode `./passagem.sh` você mesmo. Ela traz as regras vigentes,
   as últimas decisões e os commits das últimas 36 h.
2. **Antes de editar `painel/data/semana.json` ou `alimentacao.json`, releia o arquivo.** Outra
   sessão pode tê-lo mudado depois da sua última leitura.
3. **Decisão ouvida é decisão registrada.** Quando o Fabio decidir algo, ou uma especialista impuser
   uma regra (nutricionista, fisiologista, logístico), registre na hora:
   `./registrar_decisao.sh <app|bot|conselho|agendada> "<decisão e quem decidiu>" "<onde vive>"`
   e commite junto com a mudança. Regra nova que vale daqui para frente entra também em
   `## Regras vigentes` de `decisoes.md` e na seção certa do `PROJETO_CHAT.md`.
4. **Sem informação, sem decisão** (`PROJETO_CHAT.md` §18). Número só do `fatos.json`.
5. **Git e GitHub:** Sempre commite o que mudar e envie para `origin main` (`fabiomg-pixel/health-hub`). O site da Vercel está conectado ao GitHub e faz deploy automático ao receber commits na branch `main`.
6. Deploy do painel: `cd painel && npx vercel deploy --prod --yes` (automático pelo GitHub ou manual).
7. **Envio pelo Telegram:** para enviar avisos, briefs, avaliações ou perguntas do conselho ao Fabio pelo bot
   `@Silvester_TheTrainer_bot`, use `printf '%s' "$MSG" | ./enviar_telegram_saude.py <brief|avaliacao|conselho|capitulo|aviso>`.
8. **A Campanha dos 85 — Os Faróis de Nácar** (gamificação em RPG): motor `jornada.py`, regras `jornada_regras.json`, livro
   `historia/livro/`, canon em `historia/mundo.json` e `historia/biblia.md`. XP só por comportamento, o peso nunca dá XP, sem
   dado não pune. **Estalagem** (descanso que conta): o copiloto propõe; só depois do "sim" do Fabio rode
   `./estalagem.py AAAA-MM-DD "motivo"`, `./publicar_jornada.sh` e commite `jornada_eventos.json`.
   **A história é autônoma:** nada nela corresponde diretamente aos dias do Fabio; a única ligação são as métricas, que
   decidem se os desfechos são favoráveis (`historia.py`: cartas do dia pela qualidade do dia, juramentos quebrados em
   `historia/juramentos.json`, nível da parte pelas missões). Canon: `historia/escritos/prologo.md`, `historia/biblia.md`,
   `historia/mundo.json`. Textos longos só pela rotina `rotinas/capitulo_semana.md` (domingo 23h05). Nunca escreva cena
   que espelhe de forma literal treino, refeição, pesagem, doença, compromisso, tempo ou data reais.
9. **O que o Fabio conta vale como registro do site** (pedido dele, 16/10). Refeição (foto ou
   texto), treino ou jogo que ele fez, sintoma ou dor: grave na hora com `./registrar_no_painel.py`
   (`refeicao --refeicao Café|Almoço|Lanche|Jantar|Outro`, `treino` ou `observacao`; `--data` do dia em que
   aconteceu; `--hora HH:MM` se ele disser ou se a mensagem chegou na hora da refeição; `--foto` com o caminho da imagem,
   repetido para até 3 fotos) e diga na resposta o que gravou.
10. **O conselho de domingo é uma entrevista:** `rotinas/conselho_entrevista.md`. Um
    especialista de cada vez analisa, pergunta em bate e volta (até 2 rodadas) e avalia; depois o próximo; no fim,
    síntese, cético e publicação. Estado em `conselho/<domingo>/estado.json`; a passagem avisa quando há pergunta
    aberta.
11. Acesso ao bot do Telegram é só do Fabio (`~/.claude/channels/telegram-saude/access.json`).

Doutrina: `PROJETO_CHAT.md`. Regras vigentes e registro de decisões: `decisoes.md`.
