from fastapi.testclient import TestClient
from backend import models
from backend.auth import get_current_user
from backend.main import app
import pytest

# Mock Data
GM_ID = "gm_edge_user"
PLAYER_ID = "player_edge_user"
HACKER_ID = "hacker_user"

@pytest.fixture
def edge_fixtures(db_session):
    # Users
    gm = models.User(id=GM_ID, username="gm_edge")
    player = models.User(id=PLAYER_ID, username="player_edge")
    hacker = models.User(id=HACKER_ID, username="hacker")
    db_session.add_all([gm, player, hacker])
    db_session.commit()
    
    # Universe
    univ = models.Universe(name="Edge Univ", gm_id=GM_ID)
    db_session.add(univ)
    db_session.commit()
    
    # Campaign
    camp = models.Campaign(name="Edge Camp", invite_code="EDGE99", gm_id=GM_ID, universe_id=univ.id)
    db_session.add(camp)
    db_session.commit()
    
    # Members
    db_session.add(models.CampaignMember(campaign_id=camp.id, user_id=GM_ID, role="GM"))
    db_session.add(models.CampaignMember(campaign_id=camp.id, user_id=PLAYER_ID, role="PLAYER"))
    db_session.commit()
    
    return {"gm": gm, "player": player, "hacker": hacker, "campaign": camp}

def test_join_invalid_code(client: TestClient, db_session, edge_fixtures):
    """Test joining with non-existent code"""
    hacker = edge_fixtures["hacker"]
    app.dependency_overrides[get_current_user] = lambda: hacker
    
    response = client.post("/campaigns/join", json={"inviteCode": "WRONG123"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Invalid invite code"
    
    del app.dependency_overrides[get_current_user]

def test_unauthorized_lobby_access(client: TestClient, db_session, edge_fixtures):
    """Test non-member trying to access lobby"""
    hacker = edge_fixtures["hacker"]
    camp = edge_fixtures["campaign"]
    app.dependency_overrides[get_current_user] = lambda: hacker
    
    response = client.get(f"/campaigns/{camp.id}/lobby")
    assert response.status_code == 403
    assert "not a member" in response.json()["detail"]
    
    del app.dependency_overrides[get_current_user]

def test_handout_update_permissions(client: TestClient, db_session, edge_fixtures):
    """Test that only GM can update handouts"""
    gm = edge_fixtures["gm"]
    player = edge_fixtures["player"]
    camp = edge_fixtures["campaign"]
    
    # Create Handout
    handout = models.Handout(campaign_id=camp.id, name="Rules", content="Read me", is_visible=True)
    db_session.add(handout)
    db_session.commit()
    
    # Player tries to update
    app.dependency_overrides[get_current_user] = lambda: player
    response = client.patch(f"/campaigns/{camp.id}/handouts/{handout.id}", json={"content": "HACKED"})
    assert response.status_code == 403
    assert "Only GM" in response.json()["detail"]
    
    # GM updates
    app.dependency_overrides[get_current_user] = lambda: gm
    response = client.patch(f"/campaigns/{camp.id}/handouts/{handout.id}", json={"content": "Updated Content"})
    assert response.status_code == 200
    assert response.json()["content"] == "Updated Content"
    
    del app.dependency_overrides[get_current_user]

def test_note_creation_membership(client: TestClient, db_session, edge_fixtures):
    """Test that non-members cannot create notes"""
    hacker = edge_fixtures["hacker"]
    camp = edge_fixtures["campaign"]
    
    app.dependency_overrides[get_current_user] = lambda: hacker
    response = client.post(f"/campaigns/{camp.id}/notes", json={"content": "Spam"})
    assert response.status_code == 403
    
    del app.dependency_overrides[get_current_user]
