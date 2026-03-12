"""
Gemini Multimodal Live API client.
Manages the server-to-server WebSocket connection to Gemini.
"""

import asyncio
import base64
import json
import logging

from google import genai
from google.genai import types
from django.conf import settings

from .prompts import TUTOR_SYSTEM_PROMPT, TUTOR_TOOLS

logger = logging.getLogger(__name__)

# Gemini Live API model
MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"#"gemini-2.5-flash-native-audio-preview-12-2025"


class GeminiLiveClient:
    """
    Wraps the Gemini Multimodal Live API session.
    Streams audio bidirectionally and emits parsed events via callbacks.
    """

    def __init__(self, on_audio, on_text, on_tool_call, on_turn_complete):
        """
        Args:
            on_audio:  async callback(bytes) — raw PCM audio chunk from Gemini
            on_text:   async callback(str)   — text/transcript from Gemini
            on_tool_call: async callback(dict) — tool/function call from Gemini
            on_turn_complete: async callback() — Gemini finished a turn
        """
        self.on_audio = on_audio
        self.on_text = on_text
        self.on_tool_call = on_tool_call
        self.on_turn_complete = on_turn_complete

        self._client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options={'api_version': 'v1alpha'}
        )
        self._session = None
        self._session_context = None
        self._session_handle = None
        self._receive_task = None
        self._reconnecting = False
        self._send_lock = asyncio.Lock()

    async def connect(self):
        """Open a live session with Gemini."""
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore",
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=TUTOR_SYSTEM_PROMPT)]
            ),
            tools=TUTOR_TOOLS,
            session_resumption=types.SessionResumptionConfig(
                handle=self._session_handle
            ),
            context_window_compression=types.ContextWindowCompressionConfig(
                sliding_window=types.SlidingWindow(),
            ),
        )

        logger.info(f"Connecting to Gemini. Model: {MODEL}, API Version: v1alpha")
        logger.debug(f"Config: {config}")
        
        # Check API key length as a sanity check
        key_len = len(settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else 0
        logger.info(f"API Key loaded, length: {key_len}")

        try:
            self._session_context = self._client.aio.live.connect(
                model=MODEL, config=config
            )
            self._session = await self._session_context.__aenter__()
            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info("Gemini Live session connected successfully")
        except Exception as e:
            logger.error(f"Gemini connection failed: {e}")
            raise

    async def send_audio(self, audio_bytes: bytes):
        """Send raw PCM audio chunk to Gemini."""
        if self._session:
            async with self._send_lock:
                try:
                    await self._session.send_realtime_input(
                        audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                    )
                except Exception as e:
                    logger.warning(f"Failed to send audio to Gemini: {type(e).__name__}: {e}")
        else:
            logger.warning("send_audio called but session is None")

    async def send_text(self, text: str):
        """Send a text message to Gemini."""
        if self._session:
            async with self._send_lock:
                try:
                    await self._session.send_realtime_input(text=text)
                except Exception as e:
                    logger.warning(f"Failed to send text to Gemini: {type(e).__name__}: {e}")

    async def send_tool_response(self, function_responses: list):
        """Send tool/function call results back to Gemini."""
        if self._session:
            async with self._send_lock:
                await self._session.send_tool_response(
                    function_responses=function_responses
                )

    async def _receive_loop(self):
        """Continuously read responses from Gemini and dispatch callbacks.

        session.receive() yields messages for ONE model turn, then the
        generator ends.  We wrap it in ``while True`` so we keep
        listening across multiple turns.
        """
        msg_count = 0
        try:
            while True:
                async for response in self._session.receive():
                    msg_count += 1
                    logger.debug(f"Received Gemini response: {response}")
                    try:
                        # Check for top-level error
                        error = getattr(response, "error", None)
                        if error:
                            logger.error(f"Gemini returned an error: {error}")

                        server_content = getattr(response, "server_content", None)
                        tool_call = getattr(response, "tool_call", None)
                        session_resumption_update = getattr(response, "session_resumption_update", None)
                        go_away = getattr(response, "go_away", None)

                        if session_resumption_update:
                            if session_resumption_update.resumable and session_resumption_update.new_handle:
                                logger.info(f"Received new session resumption handle: {session_resumption_update.new_handle}")
                                self._session_handle = session_resumption_update.new_handle

                        if go_away:
                            logger.warning(f"Server sent GoAway. Time left: {go_away.time_left}")
                            if go_away.time_left < 10: # seconds
                                asyncio.create_task(self.reconnect())

                        if tool_call:
                            # Gemini wants to call a function
                            for fc in tool_call.function_calls:
                                await self.on_tool_call(
                                    {
                                        "id": fc.id,
                                        "name": fc.name,
                                        "args": dict(fc.args) if fc.args else {},
                                    }
                                )
                        
                        if server_content:
                            turn_complete = getattr(server_content, "turn_complete", False)
                            model_turn = getattr(server_content, "model_turn", None)
                            interrupted = getattr(server_content, "interrupted", False)

                            if turn_complete:
                                logger.debug("Gemini turn_complete received")
                            if interrupted:
                                logger.info("Gemini turn was interrupted")

                            # Process audio/text BEFORE signalling turn_complete
                            # so the client receives all data before the "done" flag.
                            if model_turn:
                                parts = getattr(model_turn, "parts", None)
                                if parts:
                                    for part in parts:
                                        inline_data = getattr(part, "inline_data", None)
                                        if inline_data and getattr(inline_data, "data", None):
                                            await self.on_audio(inline_data.data)
                                        if getattr(part, "text", None):
                                            await self.on_text(part.text)

                            if turn_complete:
                                await self.on_turn_complete()

                    except Exception as e:
                        logger.exception(
                            f"Error processing a Gemini response: {e}"
                        )

                # Turn's receive generator ended; loop back to listen for the next turn
                logger.info("Turn completed (%d messages so far), listening for next turn...", msg_count)

        except asyncio.CancelledError:
            logger.info("Gemini receive loop cancelled")
        except Exception as e:
            if not self._reconnecting:
                logger.error(f"Error in Gemini receive loop: {e}")
                # Try to reconnect on unexpected error
                asyncio.create_task(self.reconnect())
            else:
                logger.info("Gemini receive loop ended during reconnection")

    async def reconnect(self):
        """Reconnect to Gemini using existing handle if available."""
        if self._reconnecting:
            return
        
        self._reconnecting = True
        logger.info("Reconnecting to Gemini...")
        
        try:
            # Stop current receive task
            if self._receive_task:
                self._receive_task.cancel()
                try:
                    await self._receive_task
                except asyncio.CancelledError:
                    pass

            # Close existing session
            if self._session:
                try:
                    await self._session_context.__aexit__(None, None, None)
                except:
                    pass
                self._session = None
            
            # Connect again (will use self._session_handle)
            await self.connect()
            logger.info("Successfully reconnected to Gemini")
        except Exception as e:
            logger.error(f"Failed to reconnect to Gemini: {e}")
        finally:
            self._reconnecting = False

    async def disconnect(self):
        """Close the Gemini session."""
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        if self._session:
            await self._session_context.__aexit__(None, None, None)
            self._session = None
        logger.info("Gemini Live session disconnected")
