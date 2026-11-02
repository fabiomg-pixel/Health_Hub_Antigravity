# health-hub: diretrizes para o Gemini (Antigravity & Automação)

Este repositório é o ecossistema do copiloto pessoal de saúde, treino, nutrição e RPG do Fabio.
O LLM oficial deste projeto é o **Gemini** (Google GenAI / Antigravity).

## Configuração do LLM
- Modelos recomendados:
  - `gemini-2.5-pro`: para o Cético (`cetico`), síntese semanal do conselho e geração dos capítulos longos da Campanha.
  - `gemini-2.5-flash`: para o fisiologista de carga (`carga`), nutricionista (`nutricao`), logístico (`logistica`), brief matinal e avaliação da noite.
- Execução direta via terminal / scripts:
  - Use `python3 gemini_llm.py "prompt"` ou importe as funções em `gemini_llm.py`.
- Subagentes em `.agents/agents/`:
  - `carga.md`, `nutricao.md`, `logistica.md`, `cetico.md` configurados para modelos Gemini.

## Regras Fundamentais
1. **O disco e o GitHub são a memória:** Todas as sessões se comunicam através dos arquivos do repositório (`fatos.json`, `decisoes.md`, `painel/data/semana.json`, etc.) e pelo GitHub (`fabiomg-pixel/health-hub`).
2. **Passagem:** Antes de qualquer recomendação, leia `./passagem.sh`.
3. **Decisão ouvida é decisão registrada:** Use `./registrar_decisao.sh` e atualize `decisoes.md`.
4. **Sem informação, sem decisão:** Números apenas de `fatos.json`.
5. **Git Push:** Sempre commite e envie para `origin main` para atualizar o site online na Vercel (`https://painel-xi-three.vercel.app`), que está conectado ao repositório GitHub.
6. **Campanha dos 85 — Os Faróis de Nácar:** História autônoma, rica e complexa em *Thalassa-Aethel*, com Fabio como Navegador das Brumas, acompanhado por Sora, Valen, Miriam e Mestre Orfeu. As métricas reais alimentam o motor (`jornada.py` e `historia.py`).
