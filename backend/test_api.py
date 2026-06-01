import urllib.request
import json

url = "http://localhost:8001/api/chat"
data = json.dumps({"question": "test", "cancer": "Breast Cancer"}).encode("utf-8")
headers = {"Content-Type": "application/json"}
req = urllib.request.Request(url, data=data, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode())
