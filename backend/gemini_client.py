"""
gemini_client.py — Shared Gemini caller for all FairScan agents.

Both legal_mapper_agent and report_writer_agent import from here.
Handles:
  - Retry logic (max 2 tries per model)
  - Auto-switch across models on failure
  - Console logging of every raw response (great for debugging during demo)
"""

import asyncio
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Try models in order — 2.0-flash is fastest, then lite variant, then legacy
MODEL_PRIMARY   = "gemini-2.0-flash"
MODEL_SECONDARY = "gemini-2.0-flash-lite"
MODEL_TERTIARY  = "gemini-1.5-flash"

MAX_RETRIES = 2   # attempts per model before switching
RETRY_DELAY = 1   # seconds to wait between retries


async def call_gemini(
    prompt: str,
    temperature: float = 0.1,
    agent_name: str = "Agent",       # just for readable log labels
) -> str:
    """
    Sends a prompt to Gemini and returns the raw response text.

    Strategy:
      1. Try gemini-2.0-flash up to MAX_RETRIES times.
      2. If all flash attempts fail, try gemini-2.0-flash-lite up to MAX_RETRIES times.
      3. If that fails too, try gemini-1.5-flash-latest.
      4. If everything fails, raise RuntimeError so the agent can use its fallback.

    Args:
        prompt      : The full prompt string to send.
        temperature : 0.1 for structured JSON output, 0.3 for creative prose.
        agent_name  : Label shown in console logs (e.g. "LegalMapper").

    Returns:
        Raw text string from Gemini.

    Raises:
        RuntimeError if all models and retries are exhausted.
    """
    models_to_try = [MODEL_PRIMARY, MODEL_SECONDARY, MODEL_TERTIARY]

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

                # -- Log raw response so we can see exactly what Gemini returned --
                print(f"[{agent_name}] OK Got response from {model_name}:")
                print("-" * 60)
                print(raw_text[:800])   # print first 800 chars -- enough to spot issues
                if len(raw_text) > 800:
                    print(f"... [{len(raw_text) - 800} more characters]")
                print("-" * 60)

                return raw_text

            except Exception as e:
                print(f"[{agent_name}] ERR {model_name} attempt {attempt} failed: {e}")
                if attempt < MAX_RETRIES:
                    print(f"[{agent_name}] Retrying in {RETRY_DELAY}s...")
                    # BUG FIX: was time.sleep() — that blocks the entire FastAPI event loop.
                    # asyncio.sleep() yields control back while waiting, keeping the server responsive.
                    await asyncio.sleep(RETRY_DELAY)

        # Announce the switch to the next model
        print(f"[{agent_name}] All {model_name} attempts failed trying next model...")

    # If we get here, every model and every retry failed
    raise RuntimeError(
        f"[{agent_name}] Gemini completely unavailable "
        f"tried {MODEL_PRIMARY}, {MODEL_SECONDARY}, and {MODEL_TERTIARY}, "
        f"{MAX_RETRIES} attempts each."
    )
