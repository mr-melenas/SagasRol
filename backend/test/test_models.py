from backend import models
from sqlalchemy.orm import Session
import pytest

def test_create_campaign_model(db_session: Session):
    # 1. Create dependencies (User GM and Universe)
    gm = models.User(id="user_test_123", username="gm_user", email="gm@test.com")
    universe = models.Universe(name="Test Universe", gm_id="user_test_123", isPublic=True)
    
    db_session.add(gm)
    db_session.add(universe)
    db_session.commit()
    
    # 2. Create Campaign
    # Note: We use the python attribute names (snake_case)
    campaign = models.Campaign(
        name="Test Campaign",
        description="A test campaign",
        invite_code="ABC1234",
        gm_id="user_test_123",
        universe_id=universe.id
    )
    
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    
    # 3. Verify
    assert campaign.id is not None
    assert campaign.name == "Test Campaign"
    assert campaign.invite_code == "ABC1234"
    assert campaign.gm_id == "user_test_123"
    
    # Check if the column names in the DB are actually what we expect (camelCase)
    # This verifies that Column("inviteCode", ...) is working
    # We inspect the table structure in the metadata
    table = models.Campaign.__table__
    assert "inviteCode" in table.columns
    # gm_id and universe_id should be snake_case in the DB as per Prisma schema and error logs
    assert "gm_id" in table.columns
    assert "universe_id" in table.columns
    assert "createdAt" in table.columns
    assert "updatedAt" in table.columns
    
    # Check if we can query it back
    retrieved = db_session.query(models.Campaign).filter(models.Campaign.invite_code == "ABC1234").first()
    assert retrieved is not None
    assert retrieved.id == campaign.id

def test_campaign_member_model(db_session: Session):
    """
    Prueba Unitaria: Modelo CampaignMember
    Objetivo: Verificar que la relación N:M entre Usuario y Campaña se crea correctamente
    con los campos adicionales (rol, joined_at).
    """
    # 1. Setup
    user = models.User(id="user_player", username="player1")
    gm = models.User(id="user_gm", username="gm1")
    db_session.add_all([user, gm])
    db_session.commit()
    
    universe = models.Universe(name="U1", gm_id="user_gm")
    db_session.add(universe)
    db_session.commit()
    
    campaign = models.Campaign(name="C1", gm_id="user_gm", universe_id=universe.id, invite_code="CODE1")
    db_session.add(campaign)
    db_session.commit()

    # 2. Create Member
    member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=user.id,
        role="PLAYER"
    )
    db_session.add(member)
    db_session.commit()

    # 3. Verify
    assert member.id is not None
    assert member.role == "PLAYER"
    assert member.joined_at is not None
    
    # Verify Relationships
    assert member.user == user
    assert member.campaign == campaign
    assert user.campaign_memberships[0] == member
    assert campaign.members[0] == member

def test_campaign_content_models(db_session: Session):
    """
    Prueba Unitaria: Modelos de Contenido (Notes y Handouts)
    Objetivo: Verificar la creación y relaciones de notas y handouts.
    """
    # 1. Setup
    gm = models.User(id="gm_1", username="GM")
    db_session.add(gm)
    db_session.commit()
    
    universe = models.Universe(name="U1", gm_id="gm_1")
    db_session.add(universe)
    db_session.commit()
    
    campaign = models.Campaign(name="C1", gm_id="gm_1", universe_id=universe.id, invite_code="CODE2")
    db_session.add(campaign)
    db_session.commit()

    # 2. Create Note
    note = models.CampaignNote(
        campaign_id=campaign.id,
        author_id=gm.id,
        content="Secret Note",
        is_private=True
    )
    db_session.add(note)

    # 3. Create Handout
    handout = models.Handout(
        campaign_id=campaign.id,
        name="Map",
        content="Map URL",
        is_visible=False
    )
    db_session.add(handout)
    db_session.commit()

    # 4. Verify
    assert note.campaign == campaign
    assert note.author == gm
    assert handout.campaign == campaign
    assert len(campaign.notes) == 1
    assert len(campaign.handouts) == 1
