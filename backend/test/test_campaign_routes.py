from fastapi.testclient import TestClient
from backend import models, schemas
from backend.auth import get_current_user
from backend.main import app

def test_read_campaigns(client: TestClient, db_session):
    # 1. Setup Data
    user_id = "user_test_123"
    gm = models.User(id=user_id, username="gm_user", email="gm@test.com")
    db_session.add(gm)
    
    universe = models.Universe(name="Test Universe", gm_id=user_id, isPublic=True)
    db_session.add(universe)
    db_session.commit()
    
    # Use explicit column mapping names if defined in model
    campaign = models.Campaign(
        name="Test Campaign",
        description="A test campaign",
        invite_code="XYZ789",
        gm_id=user_id,
        universe_id=universe.id
    )
    db_session.add(campaign)
    db_session.commit()
    
    # 2. Mock Authentication
    def mock_get_current_user():
        return gm
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    # 3. Test Endpoint
    response = client.get("/campaigns/")
    
    # 4. Verify
    assert response.status_code == 200
    data = response.json()
    
    assert "mastering" in data
    assert "playing" in data
    assert len(data["mastering"]) == 1
    assert data["mastering"][0]["name"] == "Test Campaign"
    assert data["mastering"][0]["inviteCode"] == "XYZ789"  # Check JSON response uses alias
    
    # Clean up override
    del app.dependency_overrides[get_current_user]
