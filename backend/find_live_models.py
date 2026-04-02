import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def find_models(version):
    print(f"--- API Version: {version} ---")
    client = genai.Client(
        api_key=os.getenv('GEMINI_API_KEY'),
        http_options={'api_version': version}
    )
    with open('model_methods.txt', 'a') as f:
        for m in client.models.list():
            methods = getattr(m, 'supported_generation_methods', [])
            f.write(f"{version} | {m.name}: {methods}\n")

if __name__ == "__main__":
    if os.path.exists('model_methods.txt'):
        os.remove('model_methods.txt')
    find_models('v1beta')
    find_models('v1alpha')
