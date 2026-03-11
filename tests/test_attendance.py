import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to path to allow importing backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import models
from backend.database import Base
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db
from backend.auth import get_current_user
import os

# --- Setup Test Database ---
# Use an in-memory SQLite database for testing to ensure isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Mock Auth
mock_user_id = "user_test_123"
mock_gm_id = "gm_test_456"

def override_get_current_user():
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.id == mock_user_id).first()
    if not user:
        user = models.User(id=mock_user_id, username="TestUser", email="test@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user

def override_get_current_gm():
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.id == mock_gm_id).first()
    if not user:
        user = models.User(id=mock_gm_id, username="TestGM", email="gm@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user

app.dependency_overrides[get_db] = override_get_db
# Note: We'll override get_current_user dynamically in tests

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    # Use SQLite memory for speed and isolation
    
    # Mocking ARRAY type for SQLite
    from sqlalchemy.types import TypeDecorator, VARCHAR
    import json

    class ArrayType(TypeDecorator):
        impl = VARCHAR
        cache_ok = True
        def process_bind_param(self, value, dialect):
            if value is not None:
                return json.dumps(value)
            return value
        def process_result_value(self, value, dialect):
            if value is not None:
                return json.loads(value)
            return value
            
    # HACK: Replace ARRAY with our custom type in the models for testing
    models.Universe.__table__.c.tags.type = ArrayType()
    models.Asset.__table__.c.tags.type = ArrayType()

    # Create tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except:
            pass

@pytest.fixture(scope="function")
def setup_data(db_session):
    # Setup GM and User
    gm = models.User(id=mock_gm_id, username="GM", email="gm@test.com")
    player = models.User(id=mock_user_id, username="Player", email="player@test.com")
    
    # Check if they exist (module scope fixture might persist data if not cleaned properly, 
    # but here we use create_all/drop_all per module, so it's fresh)
    # Using merge instead of add to avoid IntegrityError if module fixture didn't clean up
    db_session.merge(gm)
    db_session.merge(player)
    db_session.commit()

    # Create Campaign
    campaign = models.Campaign(
        name="Test Campaign",
        gm_id=mock_gm_id,
        invite_code="TEST12"
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)

    # Add GM as member
    gm_member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=mock_gm_id,
        role="GM"
    )
    db_session.add(gm_member)

    # Add Player as member
    player_member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=mock_user_id,
        role="PLAYER"
    )
    db_session.add(player_member)
    db_session.commit()
    
    yield {"campaign_id": campaign.id, "gm_id": mock_gm_id, "player_id": mock_user_id}

    # Cleanup after test
    db_session.query(models.CampaignMember).delete()
    db_session.query(models.Campaign).delete()
    db_session.commit()


def test_attendance_flow(db_session, setup_data):
    # 1. Override auth to be the player
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    campaign_id = setup_data["campaign_id"]
    player_id = setup_data["player_id"]

    # 2. Player Requests Attendance (True) -> PENDING
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
    
    # Verify DB
    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter_by(user_id=player_id).first()
    assert member.attendance_status == models.AttendanceStatus.PENDING
    verify_session.close()

    # 3. GM Approves -> CONFIRMED
    app.dependency_overrides[get_current_user] = override_get_current_gm
    
    response = client.post(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance/resolve",
        json={"status": "CONFIRMED"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CONFIRMED"

    # Verify DB
    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter_by(user_id=player_id).first()
    assert member.attendance_status == models.AttendanceStatus.CONFIRMED
    verify_session.close()

    # 4. Player tries to change after confirmed -> 400
    app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": False}
    )
    assert response.status_code == 400 # Cannot change after processed

def test_attendance_permissions(db_session, setup_data):
    campaign_id = setup_data["campaign_id"]
    player_id = setup_data["player_id"]
    gm_id = setup_data["gm_id"]

    # Case A: Random user trying to change player's attendance -> 403
    def override_random_user():
        return models.User(id="random_guy", username="Random", email="random@test.com")
    
    app.dependency_overrides[get_current_user] = override_random_user
    
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True}
    )
    assert response.status_code == 403

    # Case B: GM changing player's attendance -> 200 (CONFIRMED directly)
    app.dependency_overrides[get_current_user] = override_get_current_gm
    
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CONFIRMED" # GM sets directly
    
    # Verify change
    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == player_id
    ).first()
    assert member.attendance_status == models.AttendanceStatus.CONFIRMED
    verify_session.close()
