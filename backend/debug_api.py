import urllib.request
import urllib.error

try:
    urllib.request.urlopen('http://localhost:8001/api/drugs?cancer=Breast%20Cancer&top_n=16')
    print("drugs ok")
except urllib.error.HTTPError as e:
    print(f"drugs error: {e.read().decode()}")

try:
    urllib.request.urlopen('http://localhost:8001/api/drug-landscape?cancer=Breast%20Cancer&top_n=24')
    print("landscape ok")
except urllib.error.HTTPError as e:
    print(f"landscape error: {e.read().decode()}")
