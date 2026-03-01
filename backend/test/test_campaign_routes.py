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

def test_read_campaigns_playing(client: TestClient, db_session):
    """Test seeing campaigns where user is a player"""
    # 1. Setup
    gm = models.User(id="gm_1", username="GM")
    player = models.User(id="player_1", username="Player")
    db_session.add_all([gm, player])
    db_session.commit()
    
    universe = models.Universe(name="U1", gm_id="gm_1")
    db_session.add(universe)
    db_session.commit()
    
    campaign = models.Campaign(name="Player Campaign", invite_code="PLAY1", gm_id="gm_1", universe_id=universe.id)
    db_session.add(campaign)
    db_session.commit()
    
    # Add player as member
    member = models.CampaignMember(campaign_id=campaign.id, user_id="player_1", role="PLAYER")
    db_session.add(member)
    db_session.commit()
    
    # 2. Mock Auth as Player
    app.dependency_overrides[get_current_user] = lambda: player
    
    # 3. Test
    response = client.get("/campaigns/")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["mastering"]) == 0
    assert len(data["playing"]) == 1
    assert data["playing"][0]["name"] == "Player Campaign"
    
    del app.dependency_overrides[get_current_user]
