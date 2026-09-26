def test_register(client):
    resp = client.post("/api/auth/register", json={"email": "new@test.com", "password": "pass123"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "new@test.com"

def test_register_duplicate(client, test_user):
    resp = client.post("/api/auth/register", json={"email": "test@test.com", "password": "pass123"})
    assert resp.status_code == 400

def test_login(client, test_user):
    resp = client.post("/api/auth/login", json={"email": "test@test.com", "password": "testpass"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_invalid(client, test_user):
    resp = client.post("/api/auth/login", json={"email": "test@test.com", "password": "wrongpass"})
    assert resp.status_code == 401

def test_me(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@test.com"
