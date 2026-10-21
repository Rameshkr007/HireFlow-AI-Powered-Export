import urllib.request
import json
import time

url = 'https://hireflow-ai-powered-export.onrender.com/api/build-info'

for attempt in range(1, 45):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Verifier'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"Attempt {attempt}: version={data.get('version')}, records={data.get('master_records_count')}")
            if data.get('version') == '1.2.3':
                print("SUCCESS: Version 1.2.3 is LIVE on Render!")
                print(f"Verified Records Count: {data.get('master_records_count')}")
                break
    except Exception as e:
        print(f"Attempt {attempt}: error={e}")
    time.sleep(10)
