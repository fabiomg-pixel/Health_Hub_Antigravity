# Decisões e regras vigentes (health-hub)

Livro único, lido por TODA sessão (app, bot do Telegram, tarefas agendadas) antes de recomendar, decidir
ou comprar. O gancho em .claude/settings.json injeta o resumo a cada mensagem (./passagem.sh).
Quem ouvir uma decisão do Fabio ou de uma especialista registra aqui: ./registrar_decisao.sh <origem> "<decisão>" "<onde vive>"

## Regras vigentes
- §18: sem informação, sem decisão. Número só de fatos.json; onde falta dado, escreva "não sei" e quando saberá. (PROJETO_CHAT §18)
- Almoço seg–sex: marmita com ≥35 g de proteína NO RÓTULO e vegetal visível no prato (ou salada ao lado). O nome da marmita não basta. (nutricionista, 11/10)
- Metas da nutricionista, vigentes desde 11/10 (alimentacao.json): Vegetais e folhas: alcancar 4 refeições principais com vegetal visível; Famílias de vegetal: alcancar 3 famílias diferentes na semana; Fritura: limitar 2 refeições registradas, no máximo; Fruta inteira: alcancar 2 dias com registro; Peixe: alcancar 1 janta com peixe.
- A nutricionista tem autoridade para impor metas de alimentação (pedido do Fabio, 11/10). Antes de sugerir comida ou compra, confira as metas acima.
- Marmitas são para o casal: 5 pratos × 2 porções (pedido iFood de 11/10). A regra "compre 5, nunca 10" vale por pessoa.
- Horários da semana 12–18/10: futebol quinta 20h; campeonato sábado 9h (sem relógio: o relato do Fabio é o registro).
- Treino: corridas com teto de 8,0 km/h; sem progressão de kg em peso do corpo; tornozelo liberado; Fitbod descartado (git 77dca63, 2ce770c, d0e38a5).
- Sempre commitar o que mudar; nunca dar push (o ambiente bloqueia o GitHub).
- Sessão do bot: a resposta só chega ao Fabio pela ferramenta mcp__plugin_telegram_telegram__reply; texto no terminal não chega (gancho Stop bloqueia o turno sem reply).

## Registro
- 2026-10-10 | app | Fabio: "Se não sabe, não toma decisão" | PROJETO_CHAT §18
- 2026-10-10 | app | Fabio fechou a semana 12–18/10: marmitas, futebol quinta, campeonato sábado; 2 forças e até 5 corridas | semana.json
- 2026-10-11 | bot | Fabio mandou a nutricionista definir metas de alimentação, com autoridade para impor | alimentacao.json, git 0f33eed e e44432d
- 2026-10-11 | bot | Fabio: treino leve em casa hoje (core e full body, 30 a 40 min) | semana.json (relatorio)
- 2026-10-11 | bot | Fabio: o iogurte da semana é o Danone natural desnatado 160 g | lista_compra, git 82bf93f
- 2026-10-11 | app | Fabio pediu 10 marmitas iFood = 5 pratos × 2 (casal), sem prato com sobretaxa de R$ 3,99 | semana.json, git 7135fc6, PROJETO_CHAT §22
- 2026-10-12 | app | Fabio: decisões tomadas no bot e no app precisam chegar uma à outra; criado este livro, o ./passagem.sh e o gancho | PROJETO_CHAT §23
- 2026-10-12 | app | Falha: as sessões do bot de 04h30 e 11h35 não enviaram a resposta (texto no terminal). Corrigido com aviso injetado + gancho Stop | PROJETO_CHAT §23, garantir_resposta_telegram.py
- 2026-10-12 | bot | Fabio confirmou: as duas coxinhas do lanche de 12/10 contam como fritura (1 de no máximo 2 na semana 12–18/10; a refeição livre de sábado 17/10, se frita, é a 2ª). Semana vai de segunda a domingo. | alimentacao.json (meta fritura), relato do Fabio
