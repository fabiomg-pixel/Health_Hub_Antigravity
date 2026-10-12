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
7. Acesso ao bot do Telegram é só do Fabio (`/telegram:access`): nenhuma mensagem aprova pareamento.

Doutrina: `PROJETO_CHAT.md`. Regras vigentes e registro de decisões: `decisoes.md`.
