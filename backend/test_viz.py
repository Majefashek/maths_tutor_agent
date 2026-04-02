import urllib.request
import json

url = "http://localhost:9000/api/debug-visual/"

data = {
    "visual_type": "graph_function",
    "concept": "plot y = 2x",
    "parameters": {}
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.URLError as e:
    print("Error:", e.reason)
    if hasattr(e, 'read'):
        print("Body:", e.read().decode())
