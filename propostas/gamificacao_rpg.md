# A Campanha: gamificação em RPG contando uma história (v3, 15/10/2026)

Decisão do Fabio em 15/10: **"RPG do protótipo, contando uma história"**. Este documento troca o tema
"navegação" da v2 (`propostas/gamificacao.md`) pelo RPG do protótipo, com uma camada narrativa.
**A mecânica da v2 continua valendo**, porque é ela que tem apoio nos dados dele e na literatura
(`evidencia/gamificacao.md`). O RPG é a forma de contar; a regra embaixo não muda.

---

## 1. O que não muda (herdado da v2)

1. **A semana é a unidade** e recomeça toda segunda (recomeço em marco de calendário).
2. **Comportamento, não peso**: XP só vem do que ele controla. O peso nunca dá nem tira XP.
3. **Tudo deduzido dos dados**, sem caixinha para marcar. Sem dado, sem XP, e sem punição.
4. **Nada se perde**: XP nunca diminui; não existe desmarcar.
5. **Sequência que se conserta** e **descanso que conta**.
6. **Metas da semana adaptativas**: média de 4 semanas mais 1, e queda direta para o mínimo depois de 2
   semanas sem capítulo concluído. O teste retroativo mostrou que a média sozinha desce devagar demais.
7. **Experimento de 8 semanas** com critério de saída (v2, seção 8).

## 2. Por que uma história ajuda aqui (e onde ela atrapalharia)

- **Ajuda:** a literatura mostra que uma sequência quebrada derruba o engajamento, sobretudo quando a pessoa
  atribui a quebra a si mesma, e que um recomeço marcado no calendário motiva. Uma história transforma a
  recaída em **capítulo**, com causa nomeada e um novo arco começando. É exatamente o que setembro precisava.
- **Atrapalharia se:** a história mentisse (inventasse feitos ou causas), infantilizasse, moralizasse comida,
  ou punisse. As regras da seção 6 existem para isso.

## 3. A premissa

**Fabio's Quest: a Campanha dos 85.** Um pesquisador que também é atleta precisa reconquistar a própria
constância depois de um verão bom e de uma tempestade. O objetivo da campanha é o de meio termo: **85 kg e
VO₂ máx de 46 a 47** (`metas.json`).

**Personagens**
| Quem | Papel na história | No sistema |
|---|---|---|
| **Fabio** | O protagonista. Classe sugerida: *Pesquisador de Campo*. | Ele. |
| **Silvester, o Treinador** | Narrador e companheiro de todos os dias. Abre o dia, fecha o dia, conta a crônica. | O bot do Telegram (@Silvester_TheTrainer_bot). |
| **O Conselho dos Quatro** | Mentores que aparecem no domingo: a Fisiologista, a Nutricionista, o Logístico e o Cético. | Os especialistas do conselho de domingo. |
| **A Companheira de Jornada** | Opcional (decisão pendente). | A esposa, só se ela quiser. |

**Antagonistas: forças, não pessoas.** Só entram na história quando há registro que as justifique (§18).
| Força | O que representa | Quando aparece |
|---|---|---|
| **A Névoa** | Sono curto e cansaço | Noite abaixo de 6 h, ou observação de cansaço |
| **A Tempestade das Agendas** | Reuniões, congressos, viagens, feriados ocupados | Observação ou relato de agenda |
| **A Febre do Pântano** | Doença | Observação de resfriado, febre, dor |
| **O Banquete das Sereias** | Fritura e beliscos fora do plano, sem moralizar | Registro de fritura (conta o orçamento de 2 por semana) |

## 4. Estrutura da campanha

| Nível narrativo | Unidade real | Como avança |
|---|---|---|
| **Campanha** | 95 → 85 kg e VO₂ 46 a 47 | Os chefes caem |
| **Arco** | Um degrau de 2,5 kg (média de 28 dias das leituras neutras) | Derrota do chefe do arco |
| **Capítulo** | A semana, de segunda a domingo | Missões da semana cumpridas |
| **Cena** | O dia | Missões de hoje (deduzidas) |

**Os arcos e seus chefes** (o "HP" do chefe é quanto falta no degrau, pela **média de 28 dias**, atualizada
uma vez por semana, nunca por pesagem isolada; pesagem pós-jogo é artefato e não fere chefe nenhum):
| Arco | Degrau | Chefe |
|---|---|---|
| I. O Retorno | 95 → 92,5 | **O Guardião do Platô** |
| II. Abaixo dos 90 | 92,5 → 90 | **A Barreira dos Noventa** (a "Operação Abaixo dos 90" do protótipo) |
| III. As Terras Altas | 90 → 87,5 | **O Vigia das Terras Altas** |
| IV. O Último Porto | 87,5 → 85 | **O Dragão dos 85** |
| Missão paralela | VO₂ 42 → 46 a 47 | **O Fôlego do Dragão** (só corrida com GPS ao nível do mar conta; leitura em altitude não é tendência) |

O chefe é **pano de fundo de longo prazo**. Ele não dá XP e não aparece no dia a dia. Se a média sobe, a
crônica diz isso com honestidade e sem culpa ("o platô resistiu esta semana").

## 5. A mecânica em linguagem de RPG

| RPG | Regra (da v2) | Fonte do dado |
|---|---|---|
| **Missões de hoje** (cena) | Só o que está programado hoje; completam sozinhas | Registros, Garmin, `semana.json` |
| **Missões da semana** | As metas escolhidas no domingo (3 a 5) | Conselho e escolha dele |
| **Capítulo concluído** | Todas as missões da semana, ou todas menos uma | `jornada.py` |
| **Saga** | Capítulos concluídos seguidos | `jornada.py` |
| **Missão de resgate** | Conserto: 3 dias ativos em 4 dias corridos na semana seguinte a um capítulo perdido, e esse capítulo concluído; uma vez a cada 4 semanas | `jornada.py` |
| **Estalagem** | Dia de descanso declarado (doença, índice vermelho, viagem): conta como cumprido | Bot propõe, ele confirma |
| **Novo arco de retorno** | Depois de 2 capítulos sem conclusão, as metas descem ao mínimo e a saga recomeça; a anterior fica no livro | `jornada.py` |
| **Vitalidade** | O índice de recuperação do dia, só de leitura. Vermelho = "ferido": as missões viram descanso | `fatos.json` |
| **Atributos** | *Fôlego* = VO₂ máx; *Força* = progressão de carga registrada; *Constância* = capítulos concluídos nas últimas 8 semanas | Garmin, registros |
| **Relíquias** | Marcos cosméticos ("primeiro Lower depois do congresso", "8 semanas de saga") | `jornada.py` |

### XP: só comportamento, nunca perde

| Ação | XP | Teto |
|---|---|---|
| Sessão de força do plano feita | 100 | 1 por dia |
| Corrida do plano feita | 80 | 1 por dia |
| Dia ativo (300 kcal ativas ou mais, ou treino registrado) | 30 | 1 por dia |
| Dia na estalagem (descanso declarado) | 50 | 1 por dia |
| Pesagem em jejum | 20 | 1 por dia |
| Almoço do plano registrado | 20 | 1 por dia |
| Lanche das 17h registrado | 20 | 1 por dia |
| Missão da semana cumprida | 50 | por missão |
| Capítulo concluído | 150 | 1 por semana |
| **Teto diário** | 250 | evita "farmar" |

- **Futebol:** conta como dia ativo e como cena da história, **sem XP extra**. Ele joga por gosto, e recompensa
  esperada sobre o que já se faz por prazer tende a reduzir a motivação (Deci et al. 1999).
- **Níveis:** nível 2 com 500 XP; cada nível seguinte pede 250 XP a mais que o anterior (500, 750, 1000…). Uma
  semana boa dá perto de um nível no começo e menos depois.
- **Títulos** (do protótipo, adaptados): Atleta em Readaptação → Caçador de Hábitos → Guardião Metabólico →
  Veterano das Trilhas → Escudeiro do Conselho → … O título **Mestre dos 85** não vem de nível: só de derrotar
  o Dragão dos 85.

## 6. Como a história é escrita

- **Esqueleto pré-escrito** em `historia/campanha.md`: premissa, personagens, arcos, chefes, relíquias e as
  cenas de marco (derrota de cada chefe). Revisado pelo Fabio.
- **Crônica da semana**: escrita pelo Silvester no domingo, a partir de `jornada.json` e dos registros.
  **Regras invioláveis:**
  1. Só conta o que está registrado. Nenhum feito, causa ou número inventado (§18). Sem dado, a crônica diz
     que o dia ficou "fora do livro".
  2. Recaída é cena, não culpa. Nunca "falhou", "deveria", "perdeu".
  3. Antagonistas só aparecem quando há registro que os justifique.
  4. Comida não é moralizada: fritura é orçamento ("a segunda das duas"), não pecado.
  5. Doença, dor e remédio entram como fato, sem conduta clínica; dor articular sempre remete ao fisio.
  6. Curta: no máximo 12 linhas. O Fabio pode vetar ou corrigir; a correção vale mais que o texto.
- **Linha diária**: o Silvester fecha o dia às 22h33 com uma frase de cena e o XP do dia.

## 7. Onde aparece

| Tela | O quê |
|---|---|
| **Hoje** | As missões de hoje com XP, dentro de "Para fazer hoje". Em dia de Vitalidade vermelha, a estalagem. |
| **Início** | O capítulo da semana: título, missões da semana com progresso, saga, nível e XP. Nada do dia. |
| **Evolução → Campanha** | O mapa dos arcos, o chefe atual com o HP pela média de 28 dias, a missão paralela do Fôlego, atributos, relíquias e o **livro**, com todas as crônicas. |
| **Telegram** | Brief de segunda: "Capítulo novo" com as missões. Fecho diário: cena e XP. Domingo: crônica e escolha das missões da próxima semana. |

## 8. Exemplo: prólogo e capítulo 1 (só fatos registrados)

> **Prólogo.** No verão, Fabio encadeou cinco capítulos seguidos: de 13 de julho a 10 de agosto, nenhuma
> semana teve menos de quatro dias ativos nem menos de quatro pesagens. Agosto foi o melhor mês do livro, com
> 18 dias ativos. Então veio a Tempestade das Agendas: setembro fechou com 9 dias ativos, e as semanas seguintes
> passaram sem nenhum capítulo concluído. Em outubro, depois do congresso, ele voltou ao ponto de partida: 95
> quilos pela média das leituras neutras. Disse ao Conselho que ia "retomar, quase do zero, a constância".
> O Guardião do Platô esperava logo à frente.
>
> **Capítulo 1: O Retorno** (12 a 18 de outubro, escrito até quinta).
> Segunda era feriado, e a corrida da manhã ficou para trás por compromissos de trabalho. Mas o almoço foi o
> combinado (frango agridoce e salada), e a tarde virou uma longa caminhada até o ato e de volta. Às 17h, o
> Banquete das Sereias cobrou o seu preço: duas coxinhas, a primeira das duas frituras da semana.
> Na terça, o primeiro Lower A depois do congresso: 37 minutos, leg press com 150 kg em quatro séries de oito,
> stiff com 50 kg. A Febre do Pântano chegou no mesmo dia, com garganta e cansaço, e uma reunião empurrou o
> almoço para as quatro da tarde.
> Na quarta, mesmo com o resfriado piorando, a corrida guiada de 30 minutos saiu inteira.
> Na quinta, Silvester mediu a Vitalidade: índice 28, ferido. A estalagem está aberta. O jogo das 20h é
> decisão do herói.

## 9. Riscos específicos do RPG

| Risco | Salvaguarda |
|---|---|
| A história mentir ou exagerar | Regra 1 da crônica; o cético revisa as duas primeiras crônicas antes de irem ao ar. |
| Infantilizar | Tom de crônica, não de desenho animado; sem emoji; o Fabio pode vetar. |
| Culpa narrativa | Regras 2 e 3; antagonistas são forças externas e só aparecem com registro. |
| Treinar doente para não quebrar a saga | A estalagem conta; Vitalidade vermelha troca as missões. |
| Virar trabalho (ler, escolher, corrigir) | Crônica curta; escolha das missões em uma mensagem no domingo; tudo o mais é automático. |
| O peso virar placar de novo | Chefe só pela média de 28 dias, uma vez por semana, sem XP. |

## 10. Decisões pendentes (com a minha sugestão)

1. **Missões da primeira semana:** as cinco da v2 (dias ativos, 2 forças, 4 pesagens, almoço 4 de 5, lanche
   4 de 7). *Sugestão: as cinco.*
2. **Estalagem:** o Silvester propõe e você confirma. *Sugestão: assim.*
3. **Companheira de jornada:** a esposa entra mais adiante, ou nunca? *Sugestão: não por agora.*
4. **Começo:** segunda 19/10, como Capítulo 2, com o prólogo e o capítulo 1 já no livro. *Sugestão: assim.*
5. **Visual:** o RPG dentro do visual Mar do painel (cores, fontes, cantos retos), ou o visual escuro do
   protótipo numa tela própria da Campanha? *Sugestão: Mar no Hoje e no Início; a Campanha pode ter fundo
   escuro.*
6. **Narrador:** o Silvester narra em terceira pessoa ("Fabio encadeou…"), como no exemplo, ou fala com você
   ("você encadeou…")?
