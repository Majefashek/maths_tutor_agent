"""
WebSocket consumer for the Tutor session.
Bridges the React client ↔ Gemini Live API, with tool call interception.
"""

import asyncio
import base64
import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from google.genai import types

from .gemini_client import GeminiLiveClient
from .visualization_agent import generate_visualization

logger = logging.getLogger(__name__)


class TutorConsumer(AsyncWebsocketConsumer):
    """
    Handles a single tutoring session WebSocket.

    Inbound (client → server):
        {"event": "audio", "data": "<base64 PCM 16kHz>"}
        {"event": "text",  "data": "typed question"}
        {"event": "start_session"}
        {"event": "end_session"}

    Outbound (server → client):
        {"event": "audio",          "data": "<base64 PCM 24kHz>"}
        {"event": "transcript",     "data": "text from Gemini", "role": "tutor"}
        {"event": "turn_complete"}
        {"event": "VISUAL_READY",   "visual_type": "...", "data": {...}}
        {"event": "error",          "data": "message"}
        {"event": "session_started"}
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.gemini: GeminiLiveClient | None = None
        self._viz_tasks: set[asyncio.Task] = set()
        self._tool_call_pending = False

    # ── Connection lifecycle ──────────────────────────────────────────

    async def connect(self):
        await self.accept()
        logger.info("Client WebSocket connected")

    async def disconnect(self, close_code):
        logger.info("Client WebSocket disconnected (code=%s)", close_code)
        await self._cleanup()

    async def _cleanup(self):
        """Tear down Gemini session and pending viz tasks."""
        if self.gemini:
            await self.gemini.disconnect()
            self.gemini = None
        for task in self._viz_tasks:
            task.cancel()
        self._viz_tasks.clear()

    # ── Inbound message routing ───────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        """Route incoming WebSocket messages."""
        if text_data:
            try:
                msg = json.loads(text_data)
            except json.JSONDecodeError:
                await self._send_error("Invalid JSON")
                return

            event = msg.get("event")

            if event == "start_session":
                await self._start_session()

            elif event == "end_session":
                await self._cleanup()

            elif event == "audio":
                raw = msg.get("data", "")
                if raw and self.gemini:
                    if self._tool_call_pending:
                        # Drop audio while Gemini is awaiting a tool response if it causes 1008
                        # logger.debug("Dropping audio during tool call pending")
                        pass
                    else:
                        audio_bytes = base64.b64decode(raw)
                        await self.gemini.send_audio(audio_bytes)
                elif not self.gemini:
                    logger.warning("Audio received but no Gemini session active")

            elif event == "text":
                text = msg.get("data", "")
                if text and self.gemini:
                    if self._tool_call_pending:
                        # Also gate text during tool call
                        pass
                    else:
                        await self.gemini.send_text(text)
                elif not self.gemini:
                    logger.warning("Text received but no Gemini session active")

            else:
                await self._send_error(f"Unknown event: {event}")

    # ── Session management ────────────────────────────────────────────

    async def _start_session(self):
        """Initialize a new Gemini Live session."""
        await self._cleanup()

        self.gemini = GeminiLiveClient(
            on_audio=self._handle_gemini_audio,
            on_text=self._handle_gemini_text,
            on_tool_call=self._handle_tool_call,
            on_turn_complete=self._handle_turn_complete,
            on_input_transcription=self._handle_input_transcription,
            on_output_transcription=self._handle_output_transcription,
        )
        try:
            await self.gemini.connect()
            await self.send(
                text_data=json.dumps({"event": "session_started"})
            )
            logger.info("Tutor session started")
        except Exception:
            logger.exception("Failed to start Gemini session")
            await self._send_error("Failed to connect to AI tutor")

    # ── Gemini → Client callbacks ─────────────────────────────────────

    async def _handle_gemini_audio(self, audio_bytes: bytes):
        """Forward PCM audio from Gemini to the client."""
        await self.send(
            text_data=json.dumps(
                {
                    "event": "audio",
                    "data": base64.b64encode(audio_bytes).decode("ascii"),
                }
            )
        )

    async def _handle_gemini_text(self, text: str):
        """Forward transcript text from Gemini to the client."""
        await self.send(
            text_data=json.dumps(
                {"event": "transcript", "data": text, "role": "tutor"}
            )
        )

    async def _handle_turn_complete(self):
        """Notify client that the tutor finished speaking."""
        await self.send(
            text_data=json.dumps({"event": "turn_complete"})
        )

    async def _handle_input_transcription(self, text: str):
        """Forward user's speech transcription to the client."""
        await self.send(
            text_data=json.dumps(
                {"event": "transcript", "data": text, "role": "student"}
            )
        )

    async def _handle_output_transcription(self, text: str):
        """Forward AI's spoken words transcription to the client."""
        await self.send(
            text_data=json.dumps(
                {"event": "transcript", "data": text, "role": "tutor"}
            )
        )

    async def _handle_tool_call(self, tool_call: dict):
        """
        Intercept Gemini tool calls.
        1) Notify frontend that a visual is generating.
        2) Spawn a background task to generate the visualization.
        3) We respond to Gemini ONLY when the visualization is ready, so it pauses its speech.
        """
        call_id = tool_call.get("id", "")
        func_name = tool_call.get("name", "")
        args = tool_call.get("args", {})

        logger.info(f"Intercepted Gemini Tool Call: {func_name} (ID: {call_id}) with args: {args}")

        if func_name == "generate_math_visual":
            self._tool_call_pending = True
            # Step 1: Notify frontend that a visual is being generated
            await self.send(
                text_data=json.dumps(
                    {
                        "event": "VISUAL_GENERATING",
                        "visual_type": args.get("visual_type", ""),
                        "concept": args.get("concept", ""),
                    }
                )
            )

            # Step 2: Spawn async visualization task and wait for it to respond to Gemini
            task = asyncio.create_task(self._generate_and_send_visual(args, call_id, func_name))
            self._viz_tasks.add(task)
            task.add_done_callback(self._viz_tasks.discard)
        else:
            logger.warning("Unknown tool call: %s", func_name)
            # Mandatory: always respond to Gemini or the session hangs
            if self.gemini:
                await self.gemini.send_tool_response(
                    [
                        types.FunctionResponse(
                            id=call_id,
                            name=func_name,
                            response={"error": f"Tool '{func_name}' not implemented."},
                        )
                    ]
                )

    async def _generate_and_send_visual(self, args: dict, call_id: str, func_name: str):
        """Background task: generate visual JSON, push to client, and THEN reply to Gemini."""
        try:
            visual_data = await generate_visualization(args)
            await self.send(
                text_data=json.dumps(
                    {
                        "event": "VISUAL_READY",
                        "visual_type": visual_data.get("visual_type", "unknown"),
                        "data": visual_data,
                    }
                )
            )
            logger.info("Visual sent to client: %s", visual_data.get("visual_type"))
            
            # Step 3: Respond to Gemini with the tool result so it resumes speaking
            if self.gemini and self.gemini._session:
                logger.info(f"Sending tool response back to Gemini for {func_name} (ID: {call_id})...")
                await self.gemini.send_tool_response(
                    [
                        types.FunctionResponse(
                            id=call_id,
                            name=func_name,
                            response={
                                "result": (
                                    "The visualization has been successfully generated and is now displayed on the user's screen. "
                                    "You may now continue your explanation, referencing the visualization."
                                )
                            },
                        )
                    ]
                )
                logger.info(f"Successfully sent tool response for {call_id}")
            
        except Exception:
            logger.exception("Failed to generate/send visualization")
            await self._send_error("Visualization generation failed")
            
            # Reply to Gemini with failure so it doesn't get stuck waiting forever
            if self.gemini and self.gemini._session:
                await self.gemini.send_tool_response(
                    [
                        types.FunctionResponse(
                            id=call_id,
                            name=func_name,
                            response={
                                "error": "Failed to generate visualization. Apologize to the user and continue."
                            },
                        )
                    ]
                )
            
        finally:
            # Always clear the pending flag so audio submission resumes
            self._tool_call_pending = False

    # ── Helpers ────────────────────────────────────────────────────────

    async def _send_error(self, message: str):
        await self.send(
            text_data=json.dumps({"event": "error", "data": message})
        )
