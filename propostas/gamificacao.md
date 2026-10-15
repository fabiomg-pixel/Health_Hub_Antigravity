# Gamificação do painel de saúde: análise e proposta (v2, 15/10/2026)

Pedido do Fabio em 15/10: "pensar numa gamificação como essa", a partir de um protótipo feito no Gemini
(`Fabio's Quest: Rumo aos 80kg`: XP, níveis, ofensiva diária, barra de "chefe" do peso, missões marcadas à
mão, água, condição de lesão). Esta versão refaz a primeira resposta com três bases que faltavam: os dados
reais dele, a literatura e o encaixe no sistema que já existe. Evidências detalhadas em
`evidencia/gamificacao.md`.

---

## 0. Resumo

1. **Vale fazer, mas não do jeito do protótipo.** A evidência mostra efeito pequeno a moderado e que diminui
   com o tempo; ela não sustenta pontos e níveis por si só. O que tem apoio independente é: metas semanais
   alcançáveis, automonitoramento, feedback informativo, recomeço em marcos de calendário e sequências que
   podem ser **consertadas**.
2. **Os dados dele pedem cadência semanal, não diária.** Das 25 sequências de dias ativos desde julho, 14
   duraram **um dia só**; a maior durou 8. Uma ofensiva diária quebraria quase toda semana.
3. **O risco real são os colapsos, não os dias perdidos.** Julho e agosto tiveram 5 semanas seguidas
   "completas"; depois vieram **9 semanas sem nenhuma** (17/08 a 12/10). O desenho precisa de recomeço,
   de metas que se ajustam à fase e de uma semana de recuperação que não quebra nada.
4. **Peso não é placar.** A média neutra está subindo (+0,21 kg/semana em 28 dias): uma barra de "chefe"
   ficaria parada ou andaria para trás por semanas. Pontua-se o que ele controla (mover-se, registrar,
   pesar), e o peso fica como mapa, medido pela média de 28 dias.
5. **Tudo deduzido dos dados**, sem caixinha para marcar, e calculado num arquivo auditável, como o `fatos.json`.
6. **Proposta: "Rota"**, no tema do Mar: a semana é uma travessia, as metas são boias, a semana completa é um
   porto, e a sequência de portos é a maré. Ela é tratada como experimento de 8 semanas, com critério de saída
   definido antes de começar.

---

## 1. O que os dados dele mostram

Fontes: `historico_garmin.json` (97 dias), `historico_peso.json` (73 pesagens), `dashboard.json`,
API de registros do painel (100 registros, 02/09 a 14/10). "Dia ativo" segue a definição do painel:
**300 kcal ativas ou mais** no Garmin.

### 1.1 Movimento: os meses mudam de regime

| Mês | Dias com dado | Dias ativos | Passos (mediana) | Sono (mediana) |
|---|---|---|---|---|
| Julho | 21 | 14 (67%) | 10.642 | 6,74 h |
| Agosto | 31 | 18 (58%) | 12.240 | 6,82 h |
| Setembro | 30 | **9 (30%)** | 9.955 | 6,62 h |
| Outubro (até 15) | 15 | 8 (53%) | 10.946 | 6,30 h |

- **Sequências diárias são curtas.** Comprimentos desde julho: 3, 2, 1, 4, 1, 1, 2, 2, 3, **8**, 3, 1, 1, 1,
  1, 2, 1, 1, 1, 1, 1, 1, 4, 2, 1. A mediana é **1 dia**.
- **As semanas boas vêm em blocos.** Teste retroativo da meta "4 dias ativos e 4 pesagens na semana":

| Semana | Ativos | Pesagens | Completa? |
|---|---|---|---|
| 13/07 a 10/08 | 4, 5, 5, 5, 6 | 5, 5, 4, 6, 6 | **5 seguidas** |
| 17/08 | 4 | 2 | não |
| 24/08 | 1 | 4 | não |
| 31/08 | 2 | 5 | não |
| 07/09 | 2 | 3 | não |
| 14/09 | 1 | 3 | não |
| 21/09 | 3 | 7 | não |
| 28/09 | 2 | 5 | não |
| 05/10 | **5** | 2 | não |
| 12/10 (parcial) | 2 | 3 | não |

Duas leituras:
- Com a regra "tudo ou nada", ele veria **nove semanas de fracasso seguidas**, inclusive a de 05/10, que teve
  5 dias ativos, a melhor desde agosto. Isso é exatamente o que a literatura de sequências quebradas e de
  metas não atingidas aponta como causa de abandono (seção 2).
- **A pesagem resistiu mais que o movimento.** Nas 8 semanas completas após 17/08, a pesagem bateu 4 ou mais
  em 4 delas; o movimento, em 2. Um hábito que se mantém mesmo na crise é uma boa âncora para a constância.

### 1.2 Registro de comida: o que é registrado e o que some

- 100 registros em 43 dias; **33 dias** com algum registro.
- Por ocasião: almoço 27, jantar 23, **lanche 7, café 4**, outro 6. Também 18 treinos e 15 observações.
- 30 com foto; **21 sem texto**.

Implicação: premiar "5 refeições registradas por dia" puniria quase todo dia. O lanche das 17h, que é regra
central do plano, quase não aparece no registro: ou não acontece, ou acontece e não é anotado. Hoje **não
sei** qual dos dois, e o desenho não deve presumir.

### 1.3 Peso

- Média das leituras neutras: **95,19 kg**; partida 95,14; alvo de meio termo 85.
- Ritmo de 28 dias: **+0,21 kg por semana** (subindo).
- Pesagens: ~20 por mês de julho a setembro (≈5 por semana); outubro caiu para 7 em 15 dias.

---

## 2. O que a literatura diz, e o que isso muda no desenho

(Detalhes, números e links em `evidencia/gamificacao.md`. Fontes de saúde via PubMed; as de economia
comportamental e psicologia via Consensus.)

| Achado | Fonte | Consequência para nós |
|---|---|---|
| Gamificação aumenta atividade física com efeito pequeno a moderado (g = 0,42), menor contra controle ativo (g = 0,23) e menor ainda após o fim (g = 0,15). | Mazeas et al. 2022, meta-análise de 16 ECRs | Expectativa realista: ajuda, mas não é motor. Medir e decidir em 8 semanas. |
| Em adultos com sobrepeso, os três braços de gamificação com incentivo social aumentaram passos; a competição foi a melhor e a única que se manteve no seguimento. | Patel et al. 2019 (STEP UP), n = 602 | O componente **social** importa. Aqui, o bot é o parceiro; a esposa pode ser, se ela quiser. |
| Gamificação com apoio social **sem** dinheiro não mudou passos; com perda financeira, aumentou e não se manteve. | Agarwal et al. 2021, n = 180 | Pontos sozinhos não bastam. Não apostar o desenho em XP. |
| Intervenções de economia comportamental: efeito pequeno na intervenção, não significativo no seguimento. | Reisgies et al. 2023, meta-análise | Mesma mensagem: efeitos modestos e frágeis. |
| Sequências registradas e intactas aumentam o comportamento seguinte; sequências **quebradas** reduzem, ainda mais quando a quebra é atribuída a si mesmo, e o efeito some quando a sequência pode ser **consertada**. | Silverman & Barasch 2022 | Nada de ofensiva diária. Sequência semanal, com conserto e com pausa por causa externa. |
| Marcos de calendário (início de semana, mês, feriado) aumentam comportamento aspiracional. | Dai, Milkman & Riis 2014 | Toda segunda é um recomeço explícito. Depois de um colapso, uma "nova travessia". |
| Hábito leva em média ~2 meses para se automatizar (18 a 254 dias); **perder uma oportunidade não atrapalha** materialmente. | Lally et al. 2010; Keller et al. 2021 | Horizonte de 8 a 10 semanas. Dia perdido não é falha. Ancorar em pistas fixas (o lanche das 17h). |
| Recompensas esperadas e contingentes à tarefa reduzem a motivação intrínseca; feedback positivo aumenta. | Deci, Koestner & Ryan 1999 | Pontos como **informação** ("você fez"), não como pagamento. Não pontuar o futebol, que ele faz por gosto. |
| Incentivo e motivação intrínseca não são inimigos; incentivo prevê melhor a quantidade, a motivação intrínseca prevê a qualidade. | Cerasoli et al. 2014 | Metas de **frequência** (quantidade) combinam com pontos; a qualidade fica com o especialista. |
| Motivação autônoma e sensação de competência predizem adesão ao exercício no longo prazo. | Teixeira et al. 2012 | Ele **escolhe** as metas da semana. O feedback mostra progresso de competência. |
| Falhar em metas de programa reduz o engajamento seguinte; atingir aumenta. | Wang et al. 2016, 95 mil clientes | Metas **alcançáveis**, que acompanham a fase. |
| Pesar-se 5 dias ou mais por semana associou-se a menos ganho de peso (observacional); pesagem diária com aconselhamento reduziu peso num ECR. | Oswald et al. 2023; Liampeng et al. 2023 | Premiar o **ato de pesar**, nunca o número. |

**Limite desta evidência:** quase toda é de passos ou de atividade em populações, por semanas ou poucos meses.
Para uma pessoa só, o que vale é o experimento dele (seção 8).

---

## 3. O protótipo, elemento por elemento

| Elemento | Veredito | Por quê |
|---|---|---|
| XP e níveis | **Adiar** (versão 2, opcional) | Pontos sozinhos não mudaram comportamento (Agarwal 2021). Primeiro metas e feedback. |
| Ofensiva diária | **Trocar** por sequência semanal com conserto | 14 de 25 sequências dele duraram 1 dia; sequência quebrada derruba o engajamento. |
| Barra de chefe pelo peso, +200 XP por queda | **Trocar** por mapa da média de 28 dias, sem pontos | O peso sobe agora; pesagem após jogo é artefato (~0,26 kg); premiaria desidratação. |
| Missões marcadas à mão | **Trocar** por missões deduzidas dos registros | Menos atrito, sem marcar sem ter feito; segue o "treino feito deduzido". |
| Perder XP ao desmarcar | **Descartar** | Punição; contra "nunca cobrança". |
| Água 4,5 L "de choque" e jejum até 21h | **Descartar** | Conduta clínica e regra de outra dieta. Se houver meta de água, a nutricionista decide. |
| Condição ativa (lesão) mudando o treino | **Aproveitar e ampliar** | Doença, índice vermelho ou viagem trocam as missões por "dia ancorado", que conta. |
| Aviso imediato ao concluir | **Aproveitar** | Feedback positivo aumenta interesse (Deci 1999). |
| Relatório para o treinador | **Já existe** | O bot fecha o dia às 22h33. |
| Estado no `localStorage` | **Descartar** | Some ao trocar de aparelho e não fala com o resto. |

---

## 4. Princípios de desenho

1. **Comportamento, não resultado.** Pontua-se o que ele controla: mover-se, cumprir a sessão do plano, registrar
   o almoço e o lanche, pesar-se. O peso é mapa.
2. **A semana é a unidade.** Placar zera toda segunda (recomeço). Cada meta conta sozinha: semana com 3 de 5
   metas é uma semana boa, não uma semana perdida.
3. **Sequência que se conserta.** A sequência é de semanas. Uma semana abaixo do porto pode ser consertada
   com um "bloco de retorno" na seguinte, e a semana de recuperação declarada não quebra nada.
4. **Metas que acompanham a fase.** A meta de dias ativos parte da média das últimas 4 semanas mais 1, com teto
   em 5 e piso em 3; e cai direto para 3 depois de 2 semanas sem porto (a média sozinha desce devagar demais:
   ver o teste retroativo em 5.2). Quando ele volta, ela sobe sozinha.
5. **Deduzido, auditável, sem palpite (§18).** Nada é marcado à mão. Sem dado não há ponto, e a falta de dado
   nunca é punida: "não sei" aparece como "não sei".
6. **Feedback informativo.** Palavras e marcas ("porto alcançado"), não prêmios. O futebol aparece como dia
   ativo, sem bônus.
7. **Autonomia.** No domingo, ele escolhe as metas da semana entre opções que os especialistas propõem.
8. **Recuperação conta.** Com semáforo em "segurar", resfriado registrado ou viagem, o dia vira "ancorado":
   as missões viram descanso e registro, e o dia conta para a sequência.
9. **Experimento com saída.** Oito semanas, métricas definidas agora; se não ajudar, desliga.

---

## 5. Proposta: Rota

Linguagem do tema Mar já usada no painel (boia, maré, onda). Sem personagem, sem emoji.

| Termo | O que é |
|---|---|
| **Travessia** | A semana, de segunda a domingo. |
| **Boias** | As metas da semana (3 a 5), escolhidas por ele no domingo. |
| **Porto** | Semana em que todas as boias foram alcançadas, ou todas menos uma ("porto com uma boia de folga"). |
| **Maré** | Quantas semanas seguidas terminaram em porto. |
| **Dia ancorado** | Dia de recuperação declarado (doença, índice vermelho, viagem): conta como cumprido. |
| **Nova travessia** | Recomeço explícito depois de 2 semanas sem porto: as metas descem um degrau e a maré recomeça sem "perder" a anterior, que fica no diário de bordo. |

### 5.1 As boias da semana (versão 1: só o que é medido com confiança)

| Boia | Como é medida | Meta inicial sugerida | Base nos dados |
|---|---|---|---|
| Dias ativos | Garmin, 300 kcal ativas ou mais, **ou** treino registrado (o jogo sem relógio conta pelo registro) | média das últimas 4 semanas + 1, entre 3 e 5. Hoje daria **3** | Setembro teve ~2 por semana; julho e agosto, 4 a 6 |
| Sessões de força do plano | Registro de treino no dia programado ou em troca combinada | 2 de 2 (o plano da semana) | Lower A feito em 13/10 |
| Pesagens em jejum | Renpho, manhã | **4** | ≈5 por semana até setembro; caiu em outubro |
| Almoço do plano registrado | Registro "Almoço" em dia útil | **4 de 5** | 27 almoços em 43 dias: é o registro mais estável |
| Lanche das 17h registrado | Registro "Lanche" | **4 de 7** | Só 7 em 43 dias: meta de **descoberta**, para saber se o lanche acontece |

**Fora da versão 1, de propósito:** vegetal visível, fritura e peixe. São metas da nutricionista, mas hoje
não há como medi-las de forma confiável a partir de texto livre e foto. Entram na versão 2 quando a avaliação
da noite passar a **classificar** cada refeição registrada (vegetal sim ou não, fritura sim ou não) num
arquivo próprio. Enquanto isso, continuam como barras na aba Alimentação, como já estão.

### 5.2 A sequência (maré) e o conserto

- **Porto** = todas as boias, ou todas menos uma.
- **Conserto:** uma semana sem porto não quebra a maré se, na semana seguinte, houver um "bloco de retorno"
  (3 dias ativos em até 4 dias corridos) **e** a semana seguinte terminar em porto. Vale uma vez a cada 4
  semanas. Isso aplica diretamente o achado de que sequências consertáveis não derrubam o engajamento.
- **Semana de recuperação:** 3 ou mais dias ancorados na semana tornam a semana neutra: a maré pausa, sem
  quebrar. Quem declara: o bot propõe a partir de observação ou do semáforo, e ele confirma com um "sim".
- **Teste retroativo** (rodado em 15/10, só com as duas boias que têm histórico desde julho: dias ativos com
  meta adaptativa e pesagens ≥ 4; as outras três não têm dado antes de setembro):

  | Semana | Ativos | Meta adaptativa | Pesagens | As duas? |
  |---|---|---|---|---|
  | 13/07 a 10/08 | 4, 5, 5, 5, 6 | 4, 5, 5, 5, 5 | 5, 5, 4, 6, 6 | sim, 5 seguidas |
  | 17/08 | 4 | **5** | 2 | não |
  | 24/08 | 1 | **5** | 4 | não |
  | 31/08 | 2 | **5** | 5 | não |
  | 07/09 | 2 | 4 | 3 | não |
  | 14/09 | 1 | 3 | 3 | não |
  | 21/09 | 3 | 3 | 7 | **sim** |
  | 28/09 | 2 | 3 | 5 | não |
  | 05/10 | 5 | 3 | 2 | ativos sim, pesagem não |

  **O que o teste mudou:** a média de 4 semanas desce devagar demais. Depois do colapso, a meta ficou em 5 por
  três semanas e só chegou a 3 em 14/09. Por isso a "nova travessia" (meta cai para 3 depois de **2** semanas
  sem porto) é obrigatória, não um enfeite. Com ela, a meta seria 3 já a partir de 31/08. Mesmo com metas
  adaptativas, setembro segue difícil, mas ganha dois acertos (21/09 nas duas boias; 05/10 nos dias ativos)
  em vez de zero.

### 5.3 Onde aparece no painel

| Tela | O que mostra | Por quê ali |
|---|---|---|
| **Hoje** | "Missões de hoje", dentro de "Para fazer hoje": só o programado, marcadas sozinhas quando o registro chega ("3 de 4"). Em dia ancorado, a lista vira descanso e registro. | A regra é que só a aba Hoje tem coisas do dia. |
| **Início** | Bloco "A travessia da semana": as boias com progresso ("2 de 4 pesagens") e a maré. Nada do dia. | O Início é da semana e do corpo. |
| **Evolução** | "Rota": o caminho de 95 a 85 kg com portos a cada 2,5 kg, pela **média de 28 dias**; o VO₂ máx numa segunda linha; o diário de bordo com as semanas. | É a tela do longo prazo. |
| **Banner** | Nada novo. | Já está cheio; o que importa já aparece ali. |

### 5.4 O bot

- **Segunda, no brief:** "Travessia nova. Boias desta semana: …" (recomeço explícito).
- **Toda noite, na avaliação:** uma linha: "Hoje: 3 de 4 missões. Semana: 2 de 4 boias."
- **Domingo:** fecha a semana (porto ou não, sem cobrança) e oferece as metas da próxima para ele escolher.
  Isso entra no conselho de domingo, junto com `perguntas_semana.json`.

### 5.5 Pontos, níveis e social

- **Versão 1 sem pontos visíveis.** A evidência para XP isolado é fraca, e o risco de transformar o exercício em
  tarefa paga é real.
- **Versão 2 (depois de 4 semanas, se ele quiser):** "milhas" acumuladas por boia e por porto, com níveis
  náuticos, só como informação.
- **Social, opcional:** um resumo semanal colaborativo para a esposa (os dois já comem as mesmas marmitas). É
  colaboração, não competição. Só com o sim dela.

---

## 6. Definições operacionais e fontes de dado

| Medida | Fonte | Regra |
|---|---|---|
| Dia ativo | `historico_garmin.json` (`kcal_ativas`) e API de registros (tipo Treino) | ≥ 300 kcal ativas, ou registro de treino na data |
| Sessão de força feita | Registros (tipo Treino) × `semana.json` | Registro na data de um dia de força, ou troca registrada pelo bot |
| Pesagem | `historico_peso.json` | Uma por dia no máximo |
| Almoço do plano | Registros (Refeição/Almoço) | Uma por dia útil no máximo |
| Lanche das 17h | Registros (Refeição/Lanche) | Uma por dia no máximo |
| Dia ancorado | Semáforo "segurar", ou observação de doença ou viagem confirmada | Proposto pelo bot e confirmado pelo Fabio; fica em `decisoes.md` |
| Sem dado | Relógio sem sincronizar, dia sem registro | **Não pontua e não pune**: aparece "não sei" |

Contra trapaça sem querer: cada boia conta **uma vez por dia**. Registro vazio (sem texto e sem foto) não conta.

---

## 7. Arquitetura

- **`jornada.py`** (camada 0, como o `fatos.py`): lê registros, Garmin, peso, `semana.json` e
  `jornada_regras.json`; grava `painel/data/jornada.json` com as boias, as missões do dia, a maré, o diário de
  bordo e a meta adaptativa. É determinístico e recalculável do zero: dá para rodar sobre o passado (o teste
  retroativo acima é a primeira versão dele).
- **`jornada_regras.json`**: as metas e os limiares. Os especialistas propõem mudanças, o Fabio aprova no
  domingo, e cada mudança vai para o livro de decisões.
- **Quando roda:** no `publicar_dados.sh` (10h30 e no brief) e na avaliação da noite.
- **Revisão:** o cético revisa a primeira versão das regras antes de ir ao ar.

---

## 8. Como saber se funcionou (experimento de 8 semanas)

Definido **antes** de começar:

| Medida | Linha de base | Ajudou se, nas 8 semanas |
|---|---|---|
| Dias ativos por semana (principal) | média das 4 semanas antes do início (hoje ≈ 3) | média ≥ 4 **e** nenhuma sequência de 3 semanas abaixo de 3 |
| Pesagens por semana | ≈ 5 até setembro; caiu em outubro | média ≥ 4 |
| Dias com algum registro | 33 de 43 | ≥ 85% |
| Lanche das 17h registrado | 7 em 43 dias | sabe-se se ele acontece |
| Avaliação dele, toda semana, de 1 a 5: "a Rota ajudou ou atrapalhou?" | — | média ≥ 3,5 |

**Critério de saída:** se a avaliação dele ficar abaixo de 3 por 2 semanas seguidas, ou se ele disser que
virou cobrança, a Rota é desligada, sem discussão. O peso **não** é critério de 8 semanas: é ruidoso demais
nesse prazo.

---

## 9. Riscos e salvaguardas

| Risco | Salvaguarda |
|---|---|
| Virar cobrança ou culpa | Sem perda de pontos; placar zera na segunda; maré consertável; critério de saída. |
| Obsessão com a balança | Pontua o ato, não o número; a meta é 4, não 7; dá para desligar só essa boia. |
| Registrar só para pontuar | Uma vez por dia por boia; registro vazio não conta; a qualidade não é pontuada na versão 1. |
| Treinar doente para não quebrar a maré | Dia ancorado conta; o semáforo "segurar" troca as missões; o bot pergunta como ele acordou. |
| Desmotivar o futebol | Futebol só conta como dia ativo; nenhum bônus. |
| Metas inalcançáveis na crise | Meta adaptativa (média de 4 semanas + 1); nova travessia depois de 2 semanas sem porto. |
| Dado faltando (relógio, campeonato) | Jogo conta pelo registro; sem dado aparece "não sei". |

---

## 10. Fases

| Fase | Conteúdo | Pré-requisito |
|---|---|---|
| 0 | Esta proposta e as decisões dele | — |
| 1 | `jornada.py`, `jornada.json`, missões de hoje na aba Hoje, bloco da travessia no Início, linha no bot | decisões da seção 11; revisão do cético |
| 2 | Rota na Evolução; classificação das refeições pela avaliação da noite; boias da nutricionista | 2 semanas da fase 1 rodando |
| 3 | Milhas e níveis; social opcional | 4 semanas e avaliação dele ≥ 3,5 |

---

## 11. Decisões do Fabio

1. **Tema:** navegação (Rota), como proposto, ou o RPG do protótipo?
2. **Boias da primeira semana:** as cinco da seção 5.1, ou menos (por exemplo, só dias ativos, pesagem e almoço)?
3. **Dia ancorado:** o bot propõe e você confirma, como proposto, ou você declara sozinho?
4. **Social:** incluir a sua esposa no resumo semanal mais adiante, ou nunca?
5. **Começo:** na segunda 19/10, junto com a semana nova do conselho de domingo?
