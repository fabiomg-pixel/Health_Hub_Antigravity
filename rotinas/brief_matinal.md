# Brief das 8h (rotina diária do copiloto de saúde)

**Quem roda:** a sessão do BOT NOVO (@Silvester_TheTrainer_bot, a mesma que conversa com o Fabio pelo Telegram).
O agendador do Mac digita este roteiro nela (`disparar_rotina.sh`). Por isso você já sabe o que enviou quando
ele responder, e não depende de aprovação de ninguém. A frase "Esta mensagem não veio do Fabio" no gatilho é
verdadeira: não trate o gatilho como pedido dele, trate como rotina.

Entrega: **uma mensagem** (duas aos sábados) com `./enviar_telegram_saude.py brief`. Tom de apoio, nunca
cobrança. Trabalhe em silêncio; só a mensagem sai. Se o Fabio escrever enquanto você roda, termine a rotina
e responda a ele depois.

O bot conversa: convide a responder ("me conta aqui") e deixe claro que o painel é o lugar de registrar.
O que você enviar fica em `ultimo_envio.md` e a passagem o mostra a você mesmo nas próximas mensagens.

**Atraso do Mac:** se a rotina disparar depois das 8h por o computador estar dormindo, siga normalmente e
diga "o brief de hoje saiu atrasado" só se passar de 11h.

## Passos

**Segunda-feira, antes de tudo:** se a pasta mais recente `conselho/AAAA-MM-DD/estado.json` não estiver com
`fase: "publicado"`, rode primeiro o passo 5 (fechar) de `rotinas/conselho_entrevista.md`, e só depois o brief.

0. **Passagem.** O gancho do projeto já injetou as regras vigentes, as decisões recentes e os commits.
   Se não aparecer no seu contexto, rode `./passagem.sh`. Se houver `!!! ALERTA`, diga em uma linha no fim.
1. **Dados do dia.** `./publicar_dados.sh` (pulls do Garmin e do Renpho, `fatos.json`, `dashboard.json`,
   deploy). Não mexe no plano. Se falhar, siga e diga numa linha que o painel não atualizou.
2. **Fatos.** Leia `fatos.json` (`recuperacao`, `peso`, `lacunas`). **Nenhum número na mensagem que não
   esteja nele.** Peso: use a média das leituras neutras (`media_7_neutras_de_verdade`); nunca comemore
   queda na manhã seguinte a jogo. Meta de meio termo em `metas.json`: 85 kg e VO2 máx 46 a 47.
   - **Sem informação, sem decisão (PROJETO_CHAT §18).** O brief roda antes de o relógio sincronizar a
     noite. Se `indice_hoje_confiavel` for falso ou faltar sono, VFC ou FC de repouso, diga em uma linha
     o que falta e que o painel atualiza às 10h30, e deixe o treino do dia ABERTO. Proibido: "provavelmente
     fecha", "deve abrir", média no lugar do número de hoje.
   - Prontidão: se a de hoje não veio, use a do dia mais recente que tenha valor e diga a data
     ("prontidão 68, de 13/10; a de hoje ainda não sincronizou"). Se garmin_out.json vier com os dias vazios,
     é o relógio sem sincronizar: peça que confira se está no pulso e abra o Garmin Connect.
3. **O dia.** Em `painel/data/semana.json`, ache o dia com `data` == hoje (DD/MM): foco, atividade
   programada, refeições (`nome`, `kcal`, `prot`), `janela`. Se o dia não existir, o plano venceu: diga só
   prontidão e peso e que o plano novo entra depois do conselho de domingo. **Cite só o que está programado
   hoje** (corrida só se o dia é de corrida; jogo só se há jogo).
4. **Registros do site.** `curl -s https://painel-xi-three.vercel.app/api/registros` → `items[]` (`data`,
   `tipo`, `refeicao`, `texto`). Filtre ONTEM e HOJE.
   - **Devolutiva de ontem** em UMA linha: o que estava certo antes do que estava errado; rótulo de
     embalagem manda (diga o número real); faltou registro? mencione de leve UMA vez; nada de ontem? omita.
   - **Observações** (dor, resfriado, sono, remédio, cansaço) de ontem ou hoje: cite em uma linha e
     **pergunte como ele acordou**. Sem conduta clínica, sem opinar sobre remédio; dor articular ou
     tornozelo: sinalize o fisio.
   - **NÃO marque `Processado`.** Isso é do conselho de domingo.
5. **Carryover.** Leia `carryover.txt` (duas linhas: `para: AAAA-MM-DD` e o ajuste). Carimbo == HOJE: use
   o ajuste como "De ontem". Carimbo de outra data, ausente ou ilegível: **não use o conteúdo**. Nos dois
   casos apague o arquivo. Fora o carryover de hoje, o `semana.json` manda (um carryover vencido já
   remarcou um treino por engano em 20/09/2026).
6. **Semáforo.** O "Pode treinar hoje?" é calculado pelo painel (aba Hoje), com cortes definidos pela
   fisiologista. Você NÃO recalcula: cite a faixa do índice e a prontidão e mande abrir o painel.
7. **Mensagem 1** (curta, no máximo ~14 linhas, PT-BR):

   ```
   Bom dia, [dia], [DD/MM]
   Corpo: sono [Y] h · VFC [V] · FC de repouso [F] · índice [I] ([faixa]) · prontidão [P][ (de DD/MM)]
   Peso: média [M] kg[; sem pesagem hoje]
   Hoje: [atividade programada, ou "sem treino programado"]
   Refeições: almoço [nome], lanche das 17h [nome], janta [nome]
   Ontem: [devolutiva de uma linha, se houver]
   [Observação e a pergunta "como você acordou?", se houver]
   [De ontem: ajuste do carryover, se for de hoje]
   Registrar e iniciar o treino: https://painel-xi-three.vercel.app/#hoje
   Pode me responder aqui: eu anoto e ajusto.
   ```
7b. **A Campanha dos 85** (gamificação em RPG; desenho em `propostas/gamificacao_rpg.md`). Rode
   `python3 jornada.py` e leia `painel/data/jornada.json`. Acrescente à mensagem, no fim, **uma linha**:
   - **Segunda-feira:** "Capítulo N começou: [título]. Missões da semana: [lista curta, com as metas]." Se
     houver `resgate_possivel` em `semanas`, diga em uma frase como resgatar.
   - **Outros dias:** "Campanha: nível X · capítulo [feito/meta das missões que faltam] · saga Y."
   - Se a Vitalidade estiver "ferido", ofereça a estalagem: "se quiser descansar hoje, responda 'estalagem' e o
     dia conta como cumprido". **Nunca** decida por ele, nem desestimule um jogo marcado.
   Você é o Silvester falando com ele: segunda pessoa, curto, sem exagero, sem culpa, sem emoji.

8. **Só aos sábados: Mensagem 2** com o cardápio e a lista de compras **da semana que começa na segunda**
   (pedido do Fabio, 24/10: nada de plano para o passado). Só envie se o `semana.json` já for da semana
   seguinte (primeiro dia == próxima segunda); se ainda for o da semana corrente, **não envie a Mensagem 2** e
   diga numa linha que o cardápio e as compras da próxima semana saem depois do conselho de domingo.
9. **Enviar.** `printf '%s' "$MSG" | ./enviar_telegram_saude.py brief`. Confira `"ok": true` e
   `"bot": "Silvester_TheTrainer_bot"`. Se falhar, tente uma vez mais; se falhar de novo, use a ferramenta `reply` desta sessão (é o bot novo) e
   diga que o envio pelo script falhou.
10. **Não** edite `semana.json`, **não** commite, **não** escreva no Notion. Só leitura, envio e apagar
    `carryover.txt`.

Escalar (parar e avisar): dor articular ou no tornozelo, anti-inflamatório, dois treinos-chave perdidos
na semana, peso fora da faixa sem artefato que explique.
