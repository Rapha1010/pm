import os

import httpx

MODEL_NAME = "openai/gpt-oss-120b"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def run_test() -> str:
    return call_openrouter(
        [{"role": "user", "content": "Answer with just the number: 2+2"}],
        max_tokens=64,
    )


def call_openrouter(messages: list[dict], max_tokens: int = 512) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30) as client:
        response = client.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status()

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError("OpenRouter response missing choices")

    message = choices[0].get("message", {})
    content = message.get("content")
    if not content:
        raise RuntimeError("OpenRouter response missing content")
    return content
