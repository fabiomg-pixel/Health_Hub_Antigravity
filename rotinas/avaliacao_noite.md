# Avaliação de fim de dia (rotina diária do copiloto de saúde)

**Quem roda:** a sessão do BOT NOVO (@Silvester_TheTrainer_bot, a mesma que conversa com o Fabio). O agendador
do Mac digita este roteiro nela (`disparar_rotina.sh`); a frase "Esta mensagem não veio do Fabio" no gatilho é
verdadeira. Entrega: **uma mensagem curta** com `./enviar_telegram_saude.py avaliacao`, mais uma linha em
`diario_execucao.json` e o `carryover.txt` de amanhã. Tom de apoio. Adesão parcial é progresso, não falha.
O plano é hipótese; mude pouca coisa.

**Qual dia avaliar (importante):** esta rotina é das 22h33. Se o Mac dormia e ela disparou de madrugada ou de
manhã, **antes das 12h, avalie ONTEM** (`date -v-1d +%F`), não hoje, e grave o carryover com carimbo de HOJE
(`para: ` a data de hoje). Depois das 12h, avalie HOJE e carimbe AMANHÃ.

## Passos

0. **Passagem.** O gancho já injetou regras vigentes e decisões; se não, `./passagem.sh`. Respeite as
   regras vigentes (vegetal visível, metas da nutricionista, fritura) ao avaliar. Se houver `!!! ALERTA`,
   diga em uma linha.
1. Datas: defina o DIA AVALIADO pela regra acima e use-o em todos os passos (`date -v-1d +%d/%m` ou `date +%d/%m`).
2. **O que ele registrou hoje.** `./painel_get.sh "/api/registros?paginas=2"` → `items[]`.
   Filtre `data` == hoje. Inclua os de tipo Treino (o painel grava série a série) e Observação.
3. **O plano de hoje** em `painel/data/semana.json` (dia por `data` DD/MM): atividade programada e as
   refeições. A meta de proteína vem de `dieta` do próprio arquivo (alvo e piso); não decore.
4. **Avalie, sem cobrar.**
   - Refeições: quais ocasiões do plano apareceram no registro. Proteína: some só o que tem número (rótulo
     ou plano); registro esparso NÃO é ausência de refeição; não estime o que não tem dado.
   - Treino: o plano de hoje tinha atividade? Há registro de Treino? Corrida só conta se estava no plano.
   - Observações (dor, resfriado, sono, remédio): considere; dor articular ou no tornozelo, sinalize o fisio.
     Nunca prescreva conduta clínica nem opine sobre remédio.
   - Regras vigentes: fritura (conte as refeições fritas registradas e o que sobra do teto da semana),
     vegetal visível, peixe, fruta. Diga o que falta para fechar a semana, sem cobrança.
5. **UM ajuste para amanhã**, em uma linha, dentro do cardápio fixo (ênfase, porção, ordem do treino).
   Grave em `carryover.txt` (sobrescreva), EXATAMENTE duas linhas: `para: AAAA-MM-DD` (amanhã:
   `date -v+1d +%F`) e o ajuste. Sem o carimbo o brief da manhã descarta o arquivo, de propósito.
6. **Diário de volta ao conselho.** Rode `python3 fatos.py > fatos.json`, leia `perguntas_semana.json` se
   existir e acrescente uma linha ao array de `diario_execucao.json` (crie `{"dias": []}` se faltar), sem
   apagar o que existe: `{"data","planejado","feito","adaptacao","respostas":{"q1":...},"nao_sei":[...]}`.
   O "por quê" e o "não sei" valem mais que o que deu certo. Inventar aqui contamina a análise da semana.
7. **Mensagem** (até ~8 linhas, PT-BR):

   ```
   Fechamento do dia, [DD/MM]
   Registrado: [resumo, ou "nada hoje"]
   Treino: [feito | não estava no plano | pulado]  ·  Proteína: [só se houver número]
   Regras da semana: [fritura X de 2 · vegetal Y de 4 · ... só o que mudou]
   Amanhã: [o ajuste de uma linha]
   [Uma linha: o que funcionou, OU o alerta de uma observação relevante]
   Pode me responder aqui: eu anoto e ajusto.
   ```
7b. **A Campanha dos 85 (a aventura).** Rode `python3 jornada.py` e depois `python3 historia.py` (no **domingo** NÃO feche a semana aqui: o fechamento é da rotina das 23h05, que antes puxa os dados do dia com
   `./atualizar_dados.sh`; fechar às 22h33 congelava a parte com os números da manhã). **A história não
   é retrospectiva do dia** (Fabio, 24/10): o dia nunca vira cena. O desempenho da SEMANA decide o que acontece com a
   companhia (motor `historia.py`, canon em `historia/mundo.json`); você só anuncia.
   - **Diário de bordo (todo dia):** é automático (o motor tira uma carta pela qualidade do dia). Você só registra,
     se houver, o juramento quebrado do dia: `./juramento_quebrado.py AAAA-MM-DD limite` (Fabio, 31/10: critério
     objetivo e só pelo relato dele: **treinou apesar de febre, falta de ar, aperto ou tosse no peito, ou seguiu com dor
     articular acima de 3/10**. Não existem mais portões, tetos nem "manhã vermelha" como juramento; treinar fora do
     plano, jogar ou fazer a rodada bônus **não** quebram nada) ou `mesa` (fritura além do teto da semana: leia o teto em
     `painel/data/semana.json`, regras da semana; não decore o número). Na dúvida, não registre.
     Depois `./despachos.py` (recalcula a história e manda ao Telegram o despacho da maldição e qualquer
     marco ainda não enviado). As cartas do dia já chegaram a ele como despachos ao longo do dia (`historia/despachos.json`):
     na mensagem, diga numa linha quantos despachos saíram hoje, sem repetir as cenas. **A história nunca espelha o dia dele.**
   - **Segunda a sábado:** na mensagem, troque a linha "Regras da semana" por UMA linha: o XP do dia
     (`xp_por_dia` do dia avaliado) e quantas missões da semana estão cumpridas (`painel/data/historia.json`,
     `semana.ok` de `semana.total`). Nada de cena, nada de recitar o que ele fez.
   - **Domingo à noite:** a parte longa e a próxima são escritas pela rotina `rotinas/capitulo_semana.md` (23h05).
     Aqui, registre o juramento de domingo (se houver) e mande a mensagem normal, sem desfecho. Não improvise o
     fechamento: se a rotina das 23h05 falhar, o brief de segunda a roda.
   - **Proibido:** escrever ou editar arquivos em `historia/livro/` (o motor os regenera), inventar desfecho, ligar a
     história a qualquer fato do dia dele, ou prometer o que o motor não decidiu.
   - Depois: `./publicar_jornada.sh` e commite `historia/` (inclui `historia/despachos.json`) e `painel/data/historia.json`. Na mensagem de domingo,
     ofereça as missões da semana seguinte (as do motor) e pergunte se ele quer trocar alguma.

8. **Enviar.** `printf '%s' "$MSG" | ./enviar_telegram_saude.py avaliacao`. Confira `"ok": true` e
   `"bot": "Silvester_TheTrainer_bot"`. Se falhar, tente uma vez mais; se falhar de novo, use a ferramenta `reply` desta sessão (é o bot novo).
9. **Autonomia.** Pode, sozinho: trocar dias entre si, cortar volume, mover treino para casa ou esteira,
   substituir sessão por chuva, calor, reunião ou índice vermelho. Precisa do conselho: mudar meta da
   semana, mexer em macro, mudar o molde fixo. **Parar e escalar:** dor articular, anti-inflamatório, dois
   treinos-chave perdidos na semana, peso fora da faixa sem artefato (pesagem na manhã seguinte a jogo vem
   ~0,26 kg abaixo do real).
10. **Não** edite `semana.json`, **não** marque `Processado`, **não** escreva no Notion. Se alterar
    `diario_execucao.json` ou `carryover.txt`, isso é esperado; commite só o `diario_execucao.json`.
