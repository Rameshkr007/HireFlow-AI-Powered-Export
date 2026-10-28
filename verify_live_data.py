import urllib.request
import json
import time

base = 'https://hireflow-ai-powered-export.onrender.com'

def fetch_with_retry(req, retries=5, delay=3):
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if i == retries - 1:
                raise e
            print(f"Request attempt {i+1} failed: {e}. Retrying in {delay}s...")
            time.sleep(delay)

login_data = json.dumps({'email': 'rameshkrthakur1816@gmail.com', 'password': 'admin'}).encode('utf-8')
req_login = urllib.request.Request(f'{base}/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
token_res = fetch_with_retry(req_login)
token = token_res['access_token']

headers = {'Authorization': f'Bearer {token}'}

print("=== 1. Checking Campaign 6 Details ===")
req_c6 = urllib.request.Request(f'{base}/api/campaigns/6', headers=headers)
c6 = fetch_with_retry(req_c6)
print(f"Campaign 6 Name: {c6.get('name')}")
print(f"Status: {c6.get('status')}, Sent: {c6.get('sent_count')}, Total: {c6.get('total_leads')}")

print("\n=== 2. Checking Campaign 6 Logs ===")
req_c6_logs = urllib.request.Request(f'{base}/api/campaigns/6/logs', headers=headers)
c6_logs = fetch_with_retry(req_c6_logs)
print(f"Total Campaign 6 Logs: {len(c6_logs)}")
for l in c6_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2b. Checking Campaign 7 Details & Logs ===")
req_c7 = urllib.request.Request(f'{base}/api/campaigns/7', headers=headers)
c7 = fetch_with_retry(req_c7)
print(f"Campaign 7 Name: {c7.get('name')}")
print(f"Status: {c7.get('status')}, Sent: {c7.get('sent_count')}, Total: {c7.get('total_leads')}")

req_c7_logs = urllib.request.Request(f'{base}/api/campaigns/7/logs', headers=headers)
c7_logs = fetch_with_retry(req_c7_logs)
print(f"Total Campaign 7 Logs: {len(c7_logs)}")
for l in c7_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2c. Checking Campaign 8 Details & Logs ===")
req_c8 = urllib.request.Request(f'{base}/api/campaigns/8', headers=headers)
c8 = fetch_with_retry(req_c8)
print(f"Campaign 8 Name: {c8.get('name')}")
print(f"Status: {c8.get('status')}, Sent: {c8.get('sent_count')}, Total: {c8.get('total_leads')}")

req_c8_logs = urllib.request.Request(f'{base}/api/campaigns/8/logs', headers=headers)
c8_logs = fetch_with_retry(req_c8_logs)
print(f"Total Campaign 8 Logs: {len(c8_logs)}")
for l in c8_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2d. Checking Campaign 9 Details & Logs ===")
req_c9 = urllib.request.Request(f'{base}/api/campaigns/9', headers=headers)
c9 = fetch_with_retry(req_c9)
print(f"Campaign 9 Name: {c9.get('name')}")
print(f"Status: {c9.get('status')}, Sent: {c9.get('sent_count')}, Total: {c9.get('total_leads')}")

req_c9_logs = urllib.request.Request(f'{base}/api/campaigns/9/logs', headers=headers)
c9_logs = fetch_with_retry(req_c9_logs)
print(f"Total Campaign 9 Logs: {len(c9_logs)}")
for l in c9_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2e. Checking Campaign 10 Details & Logs ===")
req_c10 = urllib.request.Request(f'{base}/api/campaigns/10', headers=headers)
c10 = fetch_with_retry(req_c10)
print(f"Campaign 10 Name: {c10.get('name')}")
print(f"Status: {c10.get('status')}, Sent: {c10.get('sent_count')}, Total: {c10.get('total_leads')}")

req_c10_logs = urllib.request.Request(f'{base}/api/campaigns/10/logs', headers=headers)
c10_logs = fetch_with_retry(req_c10_logs)
print(f"Total Campaign 10 Logs: {len(c10_logs)}")
for l in c10_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2f. Checking Campaign 11 Details & Logs (Step-2 Follow-Up) ===")
req_c11 = urllib.request.Request(f'{base}/api/campaigns/11', headers=headers)
c11 = fetch_with_retry(req_c11)
print(f"Campaign 11 Name: {c11.get('name')}")
print(f"Status: {c11.get('status')}, Sent: {c11.get('sent_count')}, Total: {c11.get('total_leads')}")

req_c11_logs = urllib.request.Request(f'{base}/api/campaigns/11/logs', headers=headers)
c11_logs = fetch_with_retry(req_c11_logs)
print(f"Total Campaign 11 Logs: {len(c11_logs)}")
for l in c11_logs[:5]:
    print(f"  Log ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 2g. Testing Decision Maker Enrichment ===")
req_enrich = urllib.request.Request(f'{base}/api/buyers/bulk-enrich-decision-makers', data=b'{}', headers={**headers, 'Content-Type': 'application/json'})
enrich_res = fetch_with_retry(req_enrich)
print(f"Enrichment Result: {enrich_res}")

print("\n=== 2h. Testing Simulated Positive Buyer Reply ===")
req_rep = urllib.request.Request(f'{base}/api/email-activity/simulate-reply', data=b'{}', headers={**headers, 'Content-Type': 'application/json'})
rep_res = fetch_with_retry(req_rep)
print(f"Simulated Reply Result: {rep_res.get('message')}")

print("\n=== 3. Checking Master Email Activity ===")
req_act = urllib.request.Request(f'{base}/api/email-activity?limit=1000', headers=headers)
act_logs = fetch_with_retry(req_act)
print(f"Total Email Activity Records returned: {len(act_logs)}")
print(f"Top 5 most recent emails in Activity:")
for l in act_logs[:5]:
    print(f"  ID {l.get('id')}: {l.get('buyer_name')} ({l.get('company_name')}) <{l.get('email_address')}> | Campaign: {l.get('campaign_name')} | Status={l.get('status')} | Sent At={l.get('sent_at')}")

print("\n=== 3b. Checking Day-wise Activity ===")
req_dw = urllib.request.Request(f'{base}/api/email-activity/day-wise', headers=headers)
dw_data = fetch_with_retry(req_dw)
print("Day-wise Summary:")
for day in dw_data.get('days', []):
    print(f"  Date {day.get('date')}: Total={day.get('total')}, Sent={day.get('sent')}, Failed={day.get('failed')}")

print("\n=== 4. Checking DB Diagnostics ===")
req_diag = urllib.request.Request(f'{base}/api/db-diagnostics')
diag = fetch_with_retry(req_diag)
print(json.dumps(diag, indent=2))

print("\n=== 5. Checking Exporter Profile ===")
req_prof = urllib.request.Request(f'{base}/api/profile', headers=headers)
prof = fetch_with_retry(req_prof)
print(f"Company: {prof.get('company_name')}")
print(f"Country: {prof.get('country')}")
print(f"Address: {prof.get('address')}")
