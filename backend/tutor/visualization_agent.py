"""
Visualization Agent — generates structured JSON for math visuals
by calling the standard Gemini API (non-live).
"""

import json
import logging

from google import genai
from google.genai import types
from django.conf import settings

from .prompts import VISUALIZATION_AGENT_PROMPT

logger = logging.getLogger(__name__)

MODEL = "gemini-2.5-flash"


async def generate_visualization(tool_call_args: dict) -> dict:
    """
    Given the tool call arguments from the Tutor Agent, call the
    standard Gemini API to produce structured visual JSON.

    Args:
        tool_call_args: dict with keys like visual_type, concept, parameters

    Returns:
        Parsed dict ready to be sent to the frontend as a VISUAL_READY event.
    """
    visual_type = tool_call_args.get("visual_type", "graph_function")
    concept = tool_call_args.get("concept", "")
    params = tool_call_args.get("parameters", {})

    # Handle case where params might be None
    if params is None:
        params = {}

    user_prompt = (
        f"Generate a '{visual_type}' visualization for the concept: {concept}.\n"
        f"Additional parameters: {json.dumps(params)}\n\n"
        f"Return ONLY the JSON object matching the '{visual_type}' schema."
    )

    import time
    start_time = time.time()

    logger.info("Visualization request: type=%s concept=%s params=%s", visual_type, concept, params)
    logger.debug("Visualization prompt: %s", user_prompt)

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=VISUALIZATION_AGENT_PROMPT,
                temperature=0.2,  # Low temp for structured output
                response_mime_type="application/json",
            ),
        )

        duration = time.time() - start_time
        raw_text = response.text.strip()
        
        logger.debug("Raw model response: %s", raw_text)
        logger.info(
            "Visualization generated in %.2fs: type=%s concept=%s",
            duration,
            visual_type,
            concept,
        )

        # Parse the JSON from the response
        visual_data = json.loads(raw_text)

        # Ensure visual_type is set
        if "visual_type" not in visual_data:
            visual_data["visual_type"] = visual_type

        return visual_data

    except json.JSONDecodeError as e:
        logger.exception("Failed to parse visualization JSON from Gemini: %s", e)
        return {
            "visual_type": visual_type,
            "title": concept,
            "error": f"Failed to parse visualization JSON: {e}",
        }
    except Exception as e:
        logger.exception("Visualization agent error: %s", e)
        return {
            "visual_type": visual_type,
            "title": concept,
            "error": f"Visualization generation failed: {e}",
        }
