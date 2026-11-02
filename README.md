# Health Hub Antigravity 🌊✨

Sistema de gamificação de saúde, consistência física e tomada de decisão autônoma integrado ao **Google Gemini** e enriquecido por uma narrativa original e profunda: **Os Faróis de Nácar**.

🔗 **Acesse o Painel Online:** [https://fabiomg-pixel.github.io/Health_Hub_Antigravity/](https://fabiomg-pixel.github.io/Health_Hub_Antigravity/)

---

## 🌟 Pilares do Projeto

### 1. Narrativa Autônoma: *Os Faróis de Nácar*
Uma história original onde as métricas de saúde reais se transformam na expedição do veleiro *Baluarte do Vento* pelo arquipélago nebuloso de *Thalassa-Aethel*:
- **Fábio:** Navegador das Brumas, responsável pelo leme e bússola através da consistência física e vigília.
- **Sora:** Patrulheira dos Ventos e batedora das correntes térmicas.
- **Valen:** Mestre Artífice, forjador de âncoras rúnicas e protetor da integridade do navio.
- **Miriam:** Paleocartógrafa das marés e guardiã das memórias esquecidas nas ruínas submersas.
- **Mestre Orfeu:** Veterano timoneiro e contrapeso estoico contra o desespero.
- **Baluarte & Estrela:** Mastins sentinelas das amuradas que sentem as correntes antes de qualquer bússola.

### 2. Inteligência Artificial: Google Gemini
O sistema é governado pela família de modelos Gemini via SDK oficial:
- **Cético (`gemini-2.5-pro`):** Juiz implacável de consistência, sem complacência com desculpas e focado em evidências reais.
- **Carga (`gemini-2.5-flash`):** Especialista em biomecânica, sobrecarga progressiva, treinos de força e corrida.
- **Nutrição (`gemini-2.5-flash`):** Gestão calórica, proteína, hidratação e adesão à dieta.
- **Logística (`gemini-2.5-flash`):** Planejamento temporal, rotinas, clima e preparação de refeições.

### 3. Mecânica de Gamificação e RPG
- **XP e Níveis:** Pontuação derivada de treinos, descanso, alimentação e passos diários.
- **Bosses e Fases:** Cada marco de composição corporal e condicionamento enfrenta um Guardião das Brumas.
- **Juramentos e Cartas Diárias:** Decisões diárias que concedem bônus ou penalidades de dano contra os chefes.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Python 3.10+
- Chave de API do Gemini (`GEMINI_API_KEY` ou `GOOGLE_API_KEY`)

```bash
# Definir a chave da API
export GEMINI_API_KEY="sua_chave_aqui"

# Testar o motor Gemini
python3 gemini_llm.py "Faça um resumo do estado da expedição"

# Gerar dados atualizados do painel
python3 jornada.py
python3 historia.py

# Servir localmente
cd painel && python3 -m http.server 8000
```
