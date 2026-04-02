import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

from google.genai import types

async def test_connect():
    client = genai.Client(
        api_key=os.getenv('GEMINI_API_KEY'),
        http_options={'api_version': 'v1beta'}
    )
    try:
        async with client.aio.live.connect(model='gemini-2.5-flash-native-audio-latest', config=None) as session:
            print("Successfully connected!")
            async for response in session.receive():
                print(f"Received: {response}")
                break
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(test_connect())
