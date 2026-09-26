def test_create_buyer(client, auth_headers):
    resp = client.post("/api/buyers", json={
        "buyer_name": "John", "company_name": "Test Co",
        "email": "john@test.com", "country": "USA"
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "john@test.com"

def test_create_duplicate_buyer(client, auth_headers):
    data = {"buyer_name": "John", "email": "dup@test.com", "company_name": "Co"}
    client.post("/api/buyers", json=data, headers=auth_headers)
    resp = client.post("/api/buyers", json=data, headers=auth_headers)
    assert resp.status_code == 409

def test_get_buyers(client, auth_headers):
    resp = client.get("/api/buyers", headers=auth_headers)
    assert resp.status_code == 200
    assert "buyers" in resp.json()

def test_delete_buyer(client, auth_headers):
    r = client.post("/api/buyers", json={"email": "del@test.com", "company_name": "Del"}, headers=auth_headers)
    bid = r.json()["id"]
    resp = client.delete(f"/api/buyers/{bid}", headers=auth_headers)
    assert resp.status_code == 200

def test_buyer_not_found(client, auth_headers):
    resp = client.get("/api/buyers/99999", headers=auth_headers)
    assert resp.status_code == 404
