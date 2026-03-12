import asyncio
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

from tutor.prompts import TUTOR_SYSTEM_PROMPT, TUTOR_TOOLS
from django.conf import settings
import django

# Setup django for settings access
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

async def check_session_methods():
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'), http_options={'api_version': 'v1alpha'})
    model = "gemini-2.5-flash-native-audio-preview-12-2025"
    
    print(f"Testing connection to {model} using v1alpha...")
    
    configs = [
        ("Base AUDIO", types.LiveConnectConfig(
            response_modalities=["AUDIO"]
        )),
        ("AUDIO + Kore", types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                )
            )
        )),
        ("AUDIO + Instruction", types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text=TUTOR_SYSTEM_PROMPT)])
        )),
        ("AUDIO + Tools", types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            tools=TUTOR_TOOLS
        )),
        ("FULL CONFIG (Standard)", types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                )
            ),
            system_instruction=types.Content(parts=[types.Part(text=TUTOR_SYSTEM_PROMPT)]),
            tools=TUTOR_TOOLS
        )),
    ]

    for name, config in configs:
        print(f"\n>> Testing: {name}")
        try:
            async with client.aio.live.connect(model=model, config=config) as session:
                print(f"   SUCCESS!")
        except Exception as e:
            print(f"   FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(check_session_methods())
