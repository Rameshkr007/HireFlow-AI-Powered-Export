def test_create_campaign(client, auth_headers):
    resp = client.post("/api/campaigns", json={
        "name": "Test Campaign", "product": "Singing Bowls",
        "sending_limit": 10, "delay_seconds": 5, "is_demo": True
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Campaign"
    assert resp.json()["status"] == "DRAFT"

def test_start_campaign(client, auth_headers):
    r = client.post("/api/campaigns", json={
        "name": "Start Test", "product": "Test",
        "sending_limit": 5, "delay_seconds": 1, "is_demo": True
    }, headers=auth_headers)
    cid = r.json()["id"]
    resp = client.post(f"/api/campaigns/{cid}/start", headers=auth_headers)
    assert resp.status_code == 200

def test_get_campaigns(client, auth_headers):
    resp = client.get("/api/campaigns", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
