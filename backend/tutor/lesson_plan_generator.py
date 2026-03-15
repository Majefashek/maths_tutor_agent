"""
LessonPlanGenerator
────────────────────
Generates a structured lesson plan for a given maths topic and student profile,
then assembles the final Maths Tutor system prompt by injecting the plan into
the base Tutor prompt.

Uses the standard Gemini API (non-live) — the same approach as
visualization_agent.py — to generate the lesson plan JSON.

Usage:
    generator = LessonPlanGenerator()
    tutor_prompt, lesson_plan = await generator.build_tutor_prompt(
        topic="Quadratic Equations",
        student_age=15,
        grade_level="Year 10"
    )
    # Pass tutor_prompt as the system prompt when starting the Gemini Live session
"""

import hashlib
import json
import logging
import os
import time
from typing import Any

from google import genai
from google.genai import types
from django.conf import settings

from .prompts import TUTOR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Model used for lesson plan generation (standard Gemini API, not Live)
MODEL = "gemini-2.5-flash"


# ─── Lesson Plan Generator System Prompt ──────────────────────────────────────
LESSON_PLAN_GENERATOR_SYSTEM_PROMPT = """
You are a Mathematics Curriculum Designer for students aged 12–18.

Given a TOPIC and a STUDENT PROFILE (age and grade), you generate a complete,
structured lesson plan for a one-on-one AI Maths Tutor session.

## OUTPUT FORMAT
You must return ONLY a valid JSON object. No markdown fences, no explanation.
The JSON must follow this exact schema:

{
  "topic": "string",
  "student_age": number,
  "grade_level": "string",
  "duration_minutes": number,
  "learning_objectives": ["string", ...],
  "prerequisite_knowledge": ["string", ...],
  "key_formulae": [
    {
      "name": "string",
      "expression": "string",
      "annotation": "string"
    }
  ],
  "phases": [
    {
      "phase_number": number,
      "phase_name": "string",
      "duration_minutes": number,
      "objective": "string",
      "teaching_steps": [
        {
          "step": number,
          "action": "TEACH | SHOW | PROBLEM | CHECK",
          "tutor_says": "string",
          "visual_tool": "generate_math_visual | generate_problem_visual | none",
          "visual_type": "bar_chart | pie_chart | equation_steps | graph_function | geometry_shape | number_line | scatter_plot | histogram | bell_curve | line_chart | none",
          "visual_concept": "string",
          "visual_parameters_hint": "string"
        }
      ]
    }
  ],
  "common_mistakes": ["string", ...],
  "extension_challenges": ["string", ...]
}

## RULES
- phases must include: Hook/Warm-up, Teaching (one quick phase),
  Practice Problem (just one), and Wrap-Up
- Every formula mentioned in tutor_says MUST have a visual step with visual_type "equation_steps"
- TEACH steps use visual_tool "generate_math_visual"
- PROBLEM steps use visual_tool "generate_problem_visual"
- CHECK steps have visual_tool "none"
- Calibrate complexity to the student's age and grade level
- duration_minutes should be EXACTLY 5 minutes total. This is a rapid bite-sized micro-lesson.
"""


# ─── Injection Template ────────────────────────────────────────────────────────
LESSON_INJECTION_TEMPLATE = """

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LESSON PLAN — ACTIVE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have been assigned a specific lesson to teach in this session.
Follow this lesson plan. Do not deviate from the phases and steps unless
the student is genuinely stuck and needs a different approach.

TOPIC: {topic}
STUDENT AGE: {student_age}
GRADE LEVEL: {grade_level}
ESTIMATED DURATION: {duration_minutes} minutes

─── LEARNING OBJECTIVES ────────────────────────────────────
{learning_objectives_block}

─── PREREQUISITE KNOWLEDGE ─────────────────────────────────
{prerequisite_block}

─── KEY FORMULAE TO VISUALISE ──────────────────────────────
{key_formulae_block}

─── LESSON PHASES ──────────────────────────────────────────
{phases_block}

─── COMMON MISTAKES TO WATCH FOR ───────────────────────────
{common_mistakes_block}

─── EXTENSION CHALLENGES (for fast learners) ───────────────
{extension_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMINDER: Apply the SHOW-EVERYTHING RULE throughout.
Every formula, equation, graph, or shape you mention → call the visual tool.
Use generate_math_visual for teaching. Use generate_problem_visual for problems.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""


class LessonPlanGenerator:
    """
    Generates a structured lesson plan and assembles the final Tutor system prompt.

    Uses the standard Gemini API (same as visualization_agent.py) to generate
    the lesson plan, then injects it into TUTOR_SYSTEM_PROMPT.
    """

    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # ── STEP 1: Generate the lesson plan JSON ──────────────────────────────────
    async def generate_lesson_plan(
        self,
        topic: str,
        student_age: int,
        grade_level: str,
    ) -> dict[str, Any]:
        """
        Calls Gemini Flash to generate a structured lesson plan JSON.
        Returns the parsed plan as a Python dict.
        """
        user_message = (
            f"Generate a complete maths lesson plan for the following:\n\n"
            f"TOPIC: {topic}\n"
            f"STUDENT AGE: {student_age} years old\n"
            f"GRADE LEVEL: {grade_level}\n\n"
            f"Return ONLY the JSON object. No explanation, no markdown fences."
        )

        start_time = time.time()

        response = await self._client.aio.models.generate_content(
            model=MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=LESSON_PLAN_GENERATOR_SYSTEM_PROMPT,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        duration = time.time() - start_time
        raw = response.text.strip()

        # Strip accidental markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        lesson_plan = json.loads(raw)

        logger.info(
            "[LessonPlanGenerator] Plan generated in %.2fs: %d phases, %d min estimated",
            duration,
            len(lesson_plan.get("phases", [])),
            lesson_plan.get("duration_minutes", 0),
        )

        return lesson_plan

    # ── STEP 2: Format the lesson plan into human-readable text ───────────────
    def _format_lesson_plan(self, plan: dict[str, Any]) -> str:
        """
        Converts the parsed lesson plan dict into a readable text block
        for injection into the Tutor system prompt.
        """
        # Learning objectives
        learning_objectives_block = "\n".join(
            f"  {i+1}. {obj}"
            for i, obj in enumerate(plan.get("learning_objectives", []))
        )

        # Prerequisites
        prerequisite_block = "\n".join(
            f"  • {p}" for p in plan.get("prerequisite_knowledge", [])
        )

        # Key formulae
        formulae_lines = []
        for f in plan.get("key_formulae", []):
            formulae_lines.append(
                f"  [{f['name']}]  {f['expression']}\n"
                f"    → {f['annotation']}"
            )
        key_formulae_block = "\n\n".join(formulae_lines)

        # Phases
        phases_lines = []
        for phase in plan.get("phases", []):
            phases_lines.append(
                f"PHASE {phase['phase_number']}: {phase['phase_name']} "
                f"({phase['duration_minutes']} min)\n"
                f"Objective: {phase['objective']}"
            )
            for step in phase.get("teaching_steps", []):
                action_tag = f"[{step['action']}]"
                visual_tag = ""
                if step["visual_tool"] != "none":
                    visual_tag = (
                        f"\n      → CALL {step['visual_tool']}("
                        f"visual_type='{step['visual_type']}', "
                        f"concept='{step['visual_concept']}')"
                    )
                    if step.get("visual_parameters_hint"):
                        visual_tag += (
                            f"\n        hint: {step['visual_parameters_hint']}"
                        )
                phases_lines.append(
                    f"  Step {step['step']} {action_tag}\n"
                    f"    Tutor: \"{step['tutor_says']}\""
                    f"{visual_tag}"
                )
            phases_lines.append("")  # blank line between phases

        phases_block = "\n".join(phases_lines)

        # Common mistakes
        common_mistakes_block = "\n".join(
            f"  ⚠ {m}" for m in plan.get("common_mistakes", [])
        )

        # Extension challenges
        extension_block = "\n".join(
            f"  ★ {c}" for c in plan.get("extension_challenges", [])
        )

        return LESSON_INJECTION_TEMPLATE.format(
            topic=plan["topic"],
            student_age=plan["student_age"],
            grade_level=plan["grade_level"],
            duration_minutes=plan["duration_minutes"],
            learning_objectives_block=learning_objectives_block,
            prerequisite_block=prerequisite_block,
            key_formulae_block=key_formulae_block,
            phases_block=phases_block,
            common_mistakes_block=common_mistakes_block,
            extension_block=extension_block,
        )

    # ── Caching helpers ────────────────────────────────────────────────────────
    def _cache_key(self, topic: str, student_age: int, grade_level: str) -> str:
        raw = f"{topic.lower().strip()}|{student_age}|{grade_level.lower().strip()}"
        return hashlib.md5(raw.encode()).hexdigest()

    # ── STEP 3: Assemble the final Tutor system prompt ─────────────────────────
    async def build_tutor_prompt(
        self,
        topic: str,
        student_age: int,
        grade_level: str,
        cache_dir: str = ".lesson_cache",
    ) -> tuple[str, dict[str, Any]]:
        """
        Full pipeline:
          1. Check cache (or generate the lesson plan JSON via Gemini)
          2. Format it into readable text
          3. Append it to the Tutor base system prompt

        Returns:
            tutor_prompt  (str)  — the complete system prompt to pass to the
                                   Gemini Live API session
            lesson_plan   (dict) — the raw lesson plan (for logging/storage)
        """
        logger.info(
            "[LessonPlanGenerator] Generating lesson plan for: %s | Age %d | %s",
            topic, student_age, grade_level,
        )

        # ── Check cache ───────────────────────────────────────────────
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = os.path.join(
            cache_dir, self._cache_key(topic, student_age, grade_level) + ".json"
        )

        if os.path.exists(cache_file):
            logger.info("[LessonPlanGenerator] Cache hit — loading existing plan")
            with open(cache_file) as f:
                lesson_plan = json.load(f)
        else:
            lesson_plan = await self.generate_lesson_plan(
                topic, student_age, grade_level
            )
            with open(cache_file, "w") as f:
                json.dump(lesson_plan, f, indent=2)
            logger.info("[LessonPlanGenerator] Plan cached to %s", cache_file)

        # ── Format & inject ───────────────────────────────────────────
        injection_block = self._format_lesson_plan(lesson_plan)
        tutor_prompt = TUTOR_SYSTEM_PROMPT + injection_block

        logger.info(
            "[LessonPlanGenerator] Tutor prompt assembled. "
            "Total length: %d chars, Phases: %d",
            len(tutor_prompt),
            len(lesson_plan.get("phases", [])),
        )

        return tutor_prompt, lesson_plan
