# Health Hub no modo Nuvem

Pedido do Fabio (01/11/2026): o bot do Telegram precisa responder com o Mac fechado, como o bot do laboratório, e
ao subir tem de carregar tudo o que o sistema já sabe. Este arquivo é o roteiro. Estado: **preparado, não executado**.

## 1. O que o modo Nuvem exige

- Um repositório **privado** no GitHub (conta `fabiomg-pixel`). Este projeto não tem remoto ainda: por isso o app
  diz que a nuvem "não está disponível" para ele.
- Cada sessão na nuvem parte do que está no GitHub. O que ela escrever **só existe se for enviado de volta**.
  Hoje o app, o bot e as rotinas se enxergam pelos mesmos arquivos do Mac; na nuvem esse "disco comum" é o GitHub.
- Segredos não vão no repositório: ficam como variáveis do ambiente da nuvem.

## 2. O que viaja e o que não viaja

**Vai no repositório (178 commits, ~11 MB):** todo o código, `painel/data/`, `historia/`, `conselho/`, `decisoes.md`,
`PROJETO_CHAT.md`, `.claude/` (regras, agentes, skills, ganchos). A varredura do histórico inteiro de 01/11 não achou
nenhum token, senha ou chave (Telegram, Notion, Anthropic, Vercel, Garmin, Renpho, `LOG_KEY`).

**Não vai (o `.gitignore` já cobre) e vira variável de ambiente:**

| Variável | Para que serve |
|---|---|
| `TELEGRAM_BOT_TOKEN` | o bot @Silvester_TheTrainer_bot (`enviar_telegram_saude.py` já lê daqui) |
| `TELEGRAM_CHAT_ID` | o seu chat, único autorizado (`enviar_telegram_saude.py` já lê daqui) |
| `GARMIN_EMAIL`, `GARMIN_PASSWORD` | `garmin_pull.py` (já lê do ambiente) |
| `RENPHO_EMAIL`, `RENPHO_PASSWORD` | `renpho_pull.py` (já lê do ambiente) |
| `VERCEL_TOKEN` | publicar o painel (`npx vercel deploy --prod --yes`) |

Os valores nunca entram no repositório, em log ou em mensagem. `NOTION_TOKEN`, `DIARIO_DB_ID` e `LOG_KEY` já estão
guardados na própria Vercel; a nuvem não precisa deles.

**Fica de fora e é regenerado:** `garmin_out.json`, `renpho_out.json`, `ultimo_envio.md`, `carryover.txt` (o
`carryover.txt` é um bilhete de uma noite para a manhã; se a nuvem rodar as duas rotinas, ele se recria).

**Hoje mora fora do repositório e precisa de decisão:**
- `~/.claude/channels/telegram-saude/apoio.md`: resumo da conversa anterior, gerado de madrugada pelo script do
  secretário (outro projeto). Sem ele o bot funciona, só começa sem memória da conversa. O disco (`passagem.sh`,
  `decisoes.md`) segue sendo a memória principal.
- A skill `copiloto-saude-telegram` (cópia em `extras/skills/`) e os 17 arquivos de memória do projeto.
- O token do Garmin (`garmin_tokens.json`): ele dura cerca de um ano; sem ele cada execução pede login completo.

## 3. As duas metades do bot

1. **A sessão que escuta o Telegram**, igual à do laboratório: abre o repositório, lê `CLAUDE.md`, os ganchos
   (`passagem.sh` a cada mensagem, `garantir_resposta_telegram.py` no fim do turno) já vêm do repositório.
2. **As rotinas** (brief 8h03, avaliação 22h33, conselho de domingo, capítulo de domingo 23h05, despachos a cada
   15 min). Hoje o `launchd` digita o roteiro dentro do `screen`. Na nuvem cada uma vira uma rotina agendada na
   nuvem que executa o roteiro em `rotinas/*.md` e envia pelo `enviar_telegram_saude.py` (API direta, não depende de
   sessão aberta).

## 4. Regra de sincronia (o que muda no dia a dia)

- A nuvem grava no repositório (diário, fatos, história, despachos, decisões) e **envia ao final de cada rotina**.
- No Mac, **`git pull` antes de mexer** em qualquer coisa; **`git push` depois**. Sem isso, Mac e nuvem divergem.
- Arquivos que mudam sozinhos (conflito mais provável): `diario_execucao.json`, `fatos.json`, `historia/estado.json`,
  `historia/despachos.json`, `painel/data/*.json`, `decisoes.md`. Quando houver conflito nesses, vale o mais novo da
  nuvem, e as decisões novas do Mac são reaplicadas por cima.
- Isto **substitui** a regra "nunca dar push" do `CLAUDE.md`: push só para o repositório privado do health-hub.

## 5. O corte (Telegram só aceita um leitor por token)

Dois bots ao mesmo tempo brigam pelo mesmo token (erro 409). Ordem:
1. Cópia final do estado: `git add -A && git commit`, `git push`.
2. No Mac, desligar: o screen `saude`, o screen `despachos`, o vigia, o `com.fabiogomes.telegram-saude` e os 8
   `br.fabiogomes.saude.*` do `launchd`.
3. Ligar a sessão e as rotinas na nuvem. Mandar uma mensagem de teste.
4. Manter o Mac só para o que depende dele (ver abaixo).

## 6. O que continua no Mac por enquanto

- **A coleta do Garmin e do Renpho.** Serviços como o Garmin costumam bloquear logins vindos de servidores, e o
  `atualizar_dados.sh` já roda na tarefa das 10h30 do app. A nuvem lê o `fatos.json` que o Mac publica. Se um dia o
  login da nuvem funcionar, essa parte também migra.
- **O painel** continua na Vercel; a nuvem publica com `VERCEL_TOKEN`.

## 7. Já pronto no repositório (01/11)

- `passagem.sh` funciona em Linux e macOS (`mtime` troca `stat -f` por `stat -c`, com a reserva do Mac).
- `publicar_jornada.sh`, `atualizar_dados.sh` e `publicar_dados.sh` rodam em `bash` (a nuvem pode não ter `zsh`).
- `rotinas/avaliacao_noite.md` não usa mais `date -v` (que só existe no macOS).
- `enviar_telegram_saude.py` lê `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` do ambiente; sem eles, cai nos arquivos.

**Não testado em Linux de verdade.** A `stat -c` e o `bash` são o padrão do Linux, mas ainda não rodamos lá.

## 8. Perguntas em aberto (dependem do ambiente da nuvem)

1. Como o bot do laboratório foi montado: script de configuração, nomes das variáveis, e se a sessão fica de pé
   sozinha (é o modelo a copiar).
2. A nuvem consegue enviar direto para a `main`, ou só para um ramo (aí cada rotina precisa abrir e fundir um ramo)?
3. Qual a frequência mínima de uma rotina agendada na nuvem? Os despachos hoje rodam a cada 15 min.
4. O ambiente da nuvem alcança `api.telegram.org`, `registry.npmjs.org` (Vercel) e `connect.garmin.com`?

## 9. Como ficou montado (01/11, noite)

- **Conversa:** Telegram → `painel/api/telegram.js` (Vercel; confere segredo e chat, mostra "digitando…") → issue nova
  no repositório → rotina da nuvem `Saúde: bot do Telegram (nuvem)` (`trig_01NcD5cNY8sQQ6aH9oaHsDrp`, sessão
  persistente, gatilho GitHub `issues.opened`) → segue `rotinas/telegram_nuvem.md` → responde pela API do Telegram e
  envia o que mudou ao GitHub. Página da rotina: https://claude.ai/code/routines/trig_01NcD5cNY8sQQ6aH9oaHsDrp
- **Rotinas do dia (fase 1):** continuam no Mac. Depois do corte, a sessão do Mac sobe **sem** o canal do Telegram
  (arquivo `SEM_CANAL` na pasta do bot) e só executa brief, avaliação, conselho e capítulo, que enviam pela API. Com o
  Mac desligado, elas não rodam (como hoje); a conversa roda. Fase 2: levá-las para rotinas agendadas na nuvem.
- **Resposta:** a nuvem comenta na issue (`[[telegram]]` na primeira linha); o GitHub avisa `painel/api/github.js`
  (assinatura HMAC), que manda ao Telegram. Fotos entram pelo Vercel Blob (`fotos_url`). **A nuvem não guarda segredo.**
- **Fuso:** `.claude/settings.json` fixa `TZ=America/Sao_Paulo` (a nuvem roda em UTC).
- **Testado (01/11):** issue de teste acordou a rotina, que copiou o repositório, leu a issue e rodou a passagem em ~26 s.
- **Passos do Fabio:** (1) token fino do GitHub só do `health-hub`, Issues leitura e escrita; (2)
  `nuvem/configurar_vercel.sh` (grava os segredos na Vercel, publica e cria o aviso do GitHub); (3) teste ponta a ponta;
  (4) `nuvem/corte.sh`. Para voltar: `nuvem/voltar_ao_mac.sh`.
