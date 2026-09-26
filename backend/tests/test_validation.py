from app.services.email_validation_service import validate_email_address

def test_valid_email():
    result = validate_email_address("user@example.com")
    assert result["status"] == "VALID"

def test_invalid_email_no_at():
    result = validate_email_address("notanemail")
    assert result["status"] == "INVALID"

def test_disposable_email():
    result = validate_email_address("test@mailinator.com")
    assert result["status"] == "INVALID"

def test_empty_email():
    result = validate_email_address("")
    assert result["status"] == "INVALID"

def test_invalid_domain():
    result = validate_email_address("user@")
    assert result["status"] == "INVALID"
