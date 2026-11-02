#!/usr/bin/env python3
"""Utilitário de integração com o Gemini como LLM oficial do Health Hub.

Permite invocar modelos Gemini (ex.: gemini-2.5-flash, gemini-2.5-pro) tanto via
linha de comando quanto por import em scripts Python (conselho, brief, história, diário).

Uso:
    python3 gemini_llm.py "Texto do prompt..."
    cat prompt.txt | python3 gemini_llm.py --system "Você é o fisiologista..."
    python3 gemini_llm.py --model gemini-2.5-pro "Escreva a premissa..."
"""
import argparse
import os
import sys

def carregar_env():
    """Carrega variáveis do arquivo .env local se existirem."""
    aqui = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(aqui, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

def obter_cliente():
    carregar_env()
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    try:
        from google import genai
        if api_key:
            return genai.Client(api_key=api_key)
        # Tenta inicialização padrão
        return genai.Client()
    except Exception as e:
        return None

def gerar_texto(prompt, system_instruction=None, model="gemini-2.5-flash", temperature=0.7):
    """Gera texto a partir do modelo Gemini com tratamento de erro."""
    client = obter_cliente()
    if not client:
        return (
            "[ERRO: Cliente Gemini não configurado. Certifique-se de definir "
            "GEMINI_API_KEY no ambiente ou no arquivo .env]"
        )

    try:
        config = {"temperature": temperature}
        if system_instruction:
            config["system_instruction"] = system_instruction

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text or ""
    except Exception as e:
        return f"[ERRO ao chamar Gemini ({model}): {e}]"

def main():
    parser = argparse.ArgumentParser(description="Chama o Gemini LLM para o Health Hub.")
    parser.add_argument("prompt", nargs="?", default="", help="Prompt direto a ser enviado.")
    parser.add_argument("--system", "-s", default="", help="Instrução de sistema para o modelo.")
    parser.add_argument("--model", "-m", default="gemini-2.5-flash", help="Modelo (gemini-2.5-flash, gemini-2.5-pro).")
    parser.add_argument("--temp", "-t", type=float, default=0.7, help="Temperatura de geração.")

    args = parser.parse_args()

    texto_prompt = args.prompt.strip()
    if not texto_prompt and not sys.stdin.isatty():
        texto_prompt = sys.stdin.read().strip()

    if not texto_prompt:
        sys.exit("Uso: python3 gemini_llm.py [prompt] ou passe via pipe.")

    resultado = gerar_texto(
        prompt=texto_prompt,
        system_instruction=args.system if args.system else None,
        model=args.model,
        temperature=args.temp,
    )
    print(resultado)

if __name__ == "__main__":
    main()
