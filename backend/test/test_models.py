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
