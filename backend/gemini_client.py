"""
gemini_client.py — Shared Gemini caller for all FairScan agents.

Both legal_mapper_agent and report_writer_agent import from here.
Handles:
  - Retry logic (max 2 tries per model)
  - Auto-switch from gemini-1.5-pro to gemini-1.5-flash on repeated failure
  - Console logging of every raw response (great for debugging during demo)
"""

import time
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Try the powerful model first; fall back to the faster/cheaper one
MODEL_PRIMARY  = "gemini-1.5-pro"
MODEL_FALLBACK = "gemini-1.5-flash"

MAX_RETRIES = 2   # attempts per model before switching
RETRY_DELAY = 1   # seconds to wait between retries


def call_gemini(
    prompt: str,
    temperature: float = 0.1,
    agent_name: str = "Agent",       # just for readable log labels
) -> str:
    """
    Sends a prompt to Gemini and returns the raw response text.

    Strategy:
      1. Try gemini-1.5-pro up to MAX_RETRIES times.
      2. If all pro attempts fail, try gemini-1.5-flash up to MAX_RETRIES times.
      3. If everything fails, raise RuntimeError so the agent can use its fallback.

    Args:
        prompt      : The full prompt string to send.
        temperature : 0.1 for structured JSON output, 0.3 for creative prose.
        agent_name  : Label shown in console logs (e.g. "LegalMapper").

    Returns:
        Raw text string from Gemini.

    Raises:
        RuntimeError if all models and retries are exhausted.
    """
    models_to_try = [MODEL_PRIMARY, MODEL_FALLBACK]

    for model_name in models_to_try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[{agent_name}] Calling {model_name} (attempt {attempt}/{MAX_RETRIES})...")

                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=genai.GenerationConfig(temperature=temperature),
                )
                response = model.generate_content(prompt)
                raw_text = response.text.strip()

                # ── Log raw response so we can see exactly what Gemini returned ──
                print(f"[{agent_name}] ✓ Got response from {model_name}:")
                print("-" * 60)
                print(raw_text[:800])   # print first 800 chars — enough to spot issues
                if len(raw_text) > 800:
                    print(f"... [{len(raw_text) - 800} more characters]")
                print("-" * 60)

                return raw_text

            except Exception as e:
                print(f"[{agent_name}] ✗ {model_name} attempt {attempt} failed: {e}")
                if attempt < MAX_RETRIES:
                    print(f"[{agent_name}] Retrying in {RETRY_DELAY}s...")
                    time.sleep(RETRY_DELAY)

        # If we just finished all retries for the primary model, announce the switch
        if model_name == MODEL_PRIMARY:
            print(f"[{agent_name}] All {MODEL_PRIMARY} attempts failed — switching to {MODEL_FALLBACK}...")

    # If we get here, every model and every retry failed
    raise RuntimeError(
        f"[{agent_name}] Gemini completely unavailable — "
        f"tried {MODEL_PRIMARY} and {MODEL_FALLBACK}, {MAX_RETRIES} attempts each."
    )
