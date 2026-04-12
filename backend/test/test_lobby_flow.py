from fastapi.testclient import TestClient
from backend import models, schemas
from backend.auth import get_current_user
from backend.main import app
import pytest

# Mock Data
GM_USER_ID = "user_gm_123"
PLAYER_USER_ID = "user_player_456"

@pytest.fixture
def gm_user(db_session):
    user = models.User(id=GM_USER_ID, username="gm_user", email="gm@test.com")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def player_user(db_session):
    user = models.User(id=PLAYER_USER_ID, username="player_user", email="player@test.com")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def universe(db_session, gm_user):
    univ = models.Universe(name="Test Universe", gm_id=GM_USER_ID, isPublic=True)
    db_session.add(univ)
    db_session.commit()
    return univ

def test_create_campaign_auto_join_gm(client: TestClient, db_session, gm_user, universe):
    """
    Prueba de Integración: Crear Campaña
    Objetivo: Verificar que al crear una campaña, el GM se añade automáticamente como miembro.
    """
    # Mock Auth as GM
    app.dependency_overrides[get_current_user] = lambda: gm_user

    payload = {
        "name": "New Campaign",
        "description": "Auto Join Test",
        "universe_id": universe.id
    }
    
    response = client.post("/campaigns/", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    campaign_id = data["id"]
    
    # Verify GM is a member
    member = db_session.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == GM_USER_ID
    ).first()
    
    assert member is not None
    assert member.role == "GM"
    
    # Clean up
    del app.dependency_overrides[get_current_user]

def test_join_campaign_flow(client: TestClient, db_session, gm_user, player_user, universe):
    """
    Prueba de Integración: Unirse a Campaña
    Objetivo: Verificar el flujo de unirse con código de invitación.
    """
    # 1. Create Campaign (as GM)
    campaign = models.Campaign(
        name="Join Test",
        invite_code="JOIN123",
        gm_id=GM_USER_ID,
        universe_id=universe.id
    )
    db_session.add(campaign)
    db_session.commit()

    # 2. Join as Player
    app.dependency_overrides[get_current_user] = lambda: player_user
    
    payload = {"inviteCode": "JOIN123"}
    response = client.post("/campaigns/join", json=payload)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Joined campaign successfully"
    
    # Verify Player is a member
    member = db_session.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign.id,
        models.CampaignMember.user_id == PLAYER_USER_ID
    ).first()
    
    assert member is not None
    assert member.role == "PLAYER"

    # 3. Try to join again (Should return success message but not duplicate)
    response = client.post("/campaigns/join", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "Already joined"

    # Clean up
    del app.dependency_overrides[get_current_user]

def test_get_lobby_data_permissions(client: TestClient, db_session, gm_user, player_user, universe):
    """
    Prueba de Integración: Datos del Lobby y Permisos
    Objetivo: Verificar que el GM ve todo y el Player ve solo lo permitido.
    """
    # Setup Data
    campaign = models.Campaign(name="Lobby Test", invite_code="LOBBY1", gm_id=GM_USER_ID, universe_id=universe.id)
    db_session.add(campaign)
    db_session.commit()
    
    # Add GM as member
    db_session.add(models.CampaignMember(campaign_id=campaign.id, user_id=GM_USER_ID, role="GM"))
    # Add Player as member
    db_session.add(models.CampaignMember(campaign_id=campaign.id, user_id=PLAYER_USER_ID, role="PLAYER"))
    
    # Add Content
    # Private Note (GM only)
    db_session.add(models.CampaignNote(campaign_id=campaign.id, author_id=GM_USER_ID, content="GM Secret", is_private=True))
    # Public Note
    db_session.add(models.CampaignNote(campaign_id=campaign.id, author_id=GM_USER_ID, content="Public Info", is_private=False))
    # Player Private Note
    db_session.add(models.CampaignNote(campaign_id=campaign.id, author_id=PLAYER_USER_ID, content="My Diary", is_private=True))
    
    # Hidden Handout
    db_session.add(models.Handout(campaign_id=campaign.id, name="Secret Map", content="...", is_visible=False))
    # Visible Handout
    db_session.add(models.Handout(campaign_id=campaign.id, name="World Map", content="...", is_visible=True))
    
    db_session.commit()

    # --- Test as GM ---
    app.dependency_overrides[get_current_user] = lambda: gm_user
    response = client.get(f"/campaigns/{campaign.id}/lobby")
    assert response.status_code == 200
    data = response.json()
    
    assert data["is_gm"] is True
    assert data["campaign"]["invite_code"] == "LOBBY1" # GM sees invite code
    assert len(data["notes"]) == 3 # GM sees all notes
    assert len(data["handouts"]) == 2 # GM sees all handouts
    
    # --- Test as Player ---
    app.dependency_overrides[get_current_user] = lambda: player_user
    response = client.get(f"/campaigns/{campaign.id}/lobby")
    assert response.status_code == 200
    data = response.json()
    
    assert data["is_gm"] is False
    assert data["campaign"]["invite_code"] is None # Player doesn't see invite code
    
    # Player sees: Public Info + My Diary. NOT GM Secret.
    note_contents = [n["content"] for n in data["notes"]]
    assert "Public Info" in note_contents
    assert "My Diary" in note_contents
    assert "GM Secret" not in note_contents
    
    # Player sees: World Map. NOT Secret Map.
    handout_names = [h["name"] for h in data["handouts"]]
    assert "World Map" in handout_names
    assert "Secret Map" not in handout_names

    del app.dependency_overrides[get_current_user]

def test_content_creation_endpoints(client: TestClient, db_session, gm_user, player_user, universe):
    """
    Prueba de Integración: Creación de Contenido
    Objetivo: Verificar endpoints de creación de notas y handouts.
    """
    campaign = models.Campaign(name="Content Test", invite_code="CONT1", gm_id=GM_USER_ID, universe_id=universe.id)
    db_session.add(campaign)
    db_session.commit()
    
    # Members
    db_session.add(models.CampaignMember(campaign_id=campaign.id, user_id=GM_USER_ID, role="GM"))
    db_session.add(models.CampaignMember(campaign_id=campaign.id, user_id=PLAYER_USER_ID, role="PLAYER"))
    db_session.commit()

    # 1. Player creates a Note
    app.dependency_overrides[get_current_user] = lambda: player_user
    note_payload = {"content": "Player Note", "is_private": True}
    response = client.post(f"/campaigns/{campaign.id}/notes", json=note_payload)
    assert response.status_code == 200
    assert response.json()["content"] == "Player Note"
    assert response.json()["author_id"] == PLAYER_USER_ID

    # 2. Player tries to create Handout (Should Fail)
    handout_payload = {"name": "Hack", "content": "Hack", "is_visible": True}
    response = client.post(f"/campaigns/{campaign.id}/handouts", json=handout_payload)
    assert response.status_code == 403 # Only GM

    # 3. GM creates Handout
    app.dependency_overrides[get_current_user] = lambda: gm_user
    response = client.post(f"/campaigns/{campaign.id}/handouts", json=handout_payload)
    assert response.status_code == 200
    assert response.json()["name"] == "Hack"

    del app.dependency_overrides[get_current_user]
