import urllib.request
import json
import time

url = 'https://hireflow-ai-powered-export.onrender.com/api/build-info'

for attempt in range(1, 45):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Verifier'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"Attempt {attempt}: version={data.get('version')}, records={data.get('master_records_count')}, halloween={data.get('halloween_attachments')}")
            if data.get('version') == '1.4.2':
                print("SUCCESS: Version 1.4.2 is LIVE on Render!")
                print(f"Verified Records Count: {data.get('master_records_count')}")
                print(f"Verified Address: {data.get('origin_address')}")
                print(f"Verified Reply-To / Company Email: {data.get('reply_to_email')}")
                print(f"Halloween Attachments Active: {data.get('halloween_attachments')}")
                break
    except Exception as e:
        print(f"Attempt {attempt}: error={e}")
    time.sleep(10)
