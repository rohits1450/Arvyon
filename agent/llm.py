"""
LLM provider routing for the Decide node.

The agent is provider-agnostic. It picks a backend from the environment:

  ARVYON_LLM_PROVIDER = anthropic | openai | auto (default: auto)

- anthropic  -> Claude via the Anthropic SDK (needs ANTHROPIC_API_KEY).
- openai     -> any OpenAI-COMPATIBLE endpoint via the OpenAI SDK. This covers
                OpenAI, OpenRouter, Groq, Together, and local servers like
                Ollama / LM Studio. Configure with:
                  ARVYON_LLM_BASE_URL  (e.g. http://localhost:11434/v1 for Ollama,
                                        https://openrouter.ai/api/v1, etc.)
                  ARVYON_LLM_API_KEY   (or OPENAI_API_KEY; use any value for Ollama)
                  ARVYON_LLM_MODEL     (e.g. gpt-4o-mini, llama3.1, ...)
- auto       -> Anthropic if ANTHROPIC_API_KEY is set, else an OpenAI-compatible
                endpoint if configured, else None (caller uses the mock).

llm_decide() returns a validated decision dict, or None if no provider is
configured / the call fails (so the caller can fall back gracefully).
"""
import json
import os
import urllib.request
from typing import Dict, List, Optional

OLLAMA_HOST = os.environ.get("ARVYON_OLLAMA_HOST", "http://localhost:11434")

# Shared decision contract.
ACTION_TYPES = ["TRADE", "VOTE", "DATA_ACCESS"]

DECISION_SCHEMA = {
    "type": "object",
    "properties": {
        "should_act": {"type": "boolean"},
        "action_type": {"type": "string", "enum": ACTION_TYPES},
        "proposed_value": {"type": "integer"},
        "rationale": {"type": "string"},
    },
    "required": ["should_act", "action_type", "proposed_value", "rationale"],
    "additionalProperties": False,
}


def _build_prompt(observed_data: Dict) -> str:
    return f"""You are an autonomous AI agent acting on a blockchain under strict policy constraints.

Current state:
- Policy bounds: [{observed_data.get('policy_min')}, {observed_data.get('policy_max')}]
- Current balance: {observed_data.get('current_balance')}
- Market price: {observed_data.get('market_price')}
- Volatility: {observed_data.get('market_volatility')}

Decide whether to execute a TRADE and, if so, the value to propose.
The proposed_value MUST be an integer within the policy bounds
[{observed_data.get('policy_min')}, {observed_data.get('policy_max')}].

Respond with ONLY a JSON object matching this shape (no prose, no code fences):
{{"should_act": bool, "action_type": "TRADE"|"VOTE"|"DATA_ACCESS", "proposed_value": int, "rationale": str}}"""


def _validate(decision: Dict, observed_data: Dict) -> Dict:
    """Clamp the proposed value into policy bounds and sanity-check fields."""
    p_min = observed_data.get("policy_min", 0)
    p_max = observed_data.get("policy_max", 0)
    try:
        value = int(decision.get("proposed_value", p_min))
    except (TypeError, ValueError):
        value = p_min
    decision["proposed_value"] = min(max(value, p_min), p_max)
    if decision.get("action_type") not in ACTION_TYPES:
        decision["action_type"] = "TRADE"
    decision["should_act"] = bool(decision.get("should_act", True))
    decision.setdefault("rationale", "")
    return decision


def _select_provider() -> Optional[str]:
    provider = os.environ.get("ARVYON_LLM_PROVIDER", "auto").lower()
    if provider == "anthropic":
        return "anthropic" if os.environ.get("ANTHROPIC_API_KEY") else None
    if provider in ("openai", "ollama"):
        # "ollama" is a friendly alias for the OpenAI-compatible path.
        return "openai" if (_openai_configured() or _ollama_models()) else None
    # auto: Anthropic key > explicit OpenAI config > a running local Ollama.
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if _openai_configured() or _ollama_models():
        return "openai"
    return None


def _openai_configured() -> bool:
    return bool(
        os.environ.get("ARVYON_LLM_BASE_URL")
        or os.environ.get("ARVYON_LLM_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
    )


def _ollama_models() -> List[str]:
    """Return locally-available Ollama models (empty list if not running)."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_HOST}/api/tags", timeout=1.5) as r:
            data = json.loads(r.read().decode())
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def _decide_anthropic(observed_data: Dict) -> Dict:
    from anthropic import Anthropic

    client = Anthropic()
    model = os.environ.get("ARVYON_LLM_MODEL", "claude-opus-4-8")
    print(f"   [LLM:anthropic] model={model}")
    response = client.messages.create(
        model=model,
        max_tokens=1024,
        output_config={"format": {"type": "json_schema", "schema": DECISION_SCHEMA}},
        messages=[{"role": "user", "content": _build_prompt(observed_data)}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def _decide_openai(observed_data: Dict) -> Dict:
    from openai import OpenAI

    base_url = os.environ.get("ARVYON_LLM_BASE_URL")  # None -> api.openai.com
    model = os.environ.get("ARVYON_LLM_MODEL")

    # Zero-config Ollama: if nothing explicit is set but a local Ollama is
    # running, point at it and auto-pick whichever model is installed.
    if not base_url and not os.environ.get("OPENAI_API_KEY"):
        ollama = _ollama_models()
        if ollama:
            base_url = f"{OLLAMA_HOST}/v1"
            if not model:
                model = ollama[0]

    api_key = (
        os.environ.get("ARVYON_LLM_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or "ollama"  # local servers (Ollama/LM Studio) accept any value
    )
    model = model or "gpt-4o-mini"
    print(f"   [LLM:openai] base_url={base_url or 'api.openai.com'} model={model}")
    client = OpenAI(base_url=base_url, api_key=api_key)

    kwargs = dict(
        model=model,
        messages=[{"role": "user", "content": _build_prompt(observed_data)}],
    )
    # Ask for JSON; not every compatible server supports response_format, so
    # fall back to plain completion + parse if it's rejected.
    try:
        resp = client.chat.completions.create(
            response_format={"type": "json_object"}, **kwargs
        )
    except Exception:
        resp = client.chat.completions.create(**kwargs)
    content = resp.choices[0].message.content or "{}"
    # Tolerate code fences some local models emit.
    content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
    return json.loads(content)


def llm_decide(observed_data: Dict) -> Optional[Dict]:
    """Return a validated decision from the configured LLM, or None."""
    provider = _select_provider()
    if provider is None:
        return None
    try:
        decision = (
            _decide_anthropic(observed_data)
            if provider == "anthropic"
            else _decide_openai(observed_data)
        )
        decision = _validate(decision, observed_data)
        decision["engine"] = f"llm:{provider}"
        return decision
    except Exception as e:
        print(f"   [LLM:{provider}] call failed: {e} - falling back to mock")
        return None
