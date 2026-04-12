import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path to allow importing backend package
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(PROJECT_ROOT)

from backend import models
from backend.auth import get_current_user
from backend.database import Base, get_db
from backend.main import app

# --- Setup Test Database ---
# Use an SQLite database for testing to ensure isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    # Mock ARRAY type for SQLite
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

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except Exception:
            pass


@pytest.fixture(scope="function")
def setup_data(db_session):
    gm = models.User(id=mock_gm_id, username="GM", email="gm@test.com")
    player = models.User(id=mock_user_id, username="Player", email="player@test.com")

    db_session.merge(gm)
    db_session.merge(player)
    db_session.commit()

    campaign = models.Campaign(
        name="Test Campaign",
        gm_id=mock_gm_id,
        invite_code="TEST12",
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)

    gm_member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=mock_gm_id,
        role="GM",
    )
    db_session.add(gm_member)

    player_member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=mock_user_id,
        role="PLAYER",
    )
    db_session.add(player_member)
    db_session.commit()

    yield {"campaign_id": campaign.id, "gm_id": mock_gm_id, "player_id": mock_user_id}

    db_session.query(models.CampaignMember).delete()
    db_session.query(models.Campaign).delete()
    db_session.commit()


def test_attendance_flow(db_session, setup_data):
    app.dependency_overrides[get_current_user] = override_get_current_user

    campaign_id = setup_data["campaign_id"]
    player_id = setup_data["player_id"]

    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"

    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter_by(user_id=player_id).first()
    assert member.attendance_status == models.AttendanceStatus.PENDING
    verify_session.close()

    app.dependency_overrides[get_current_user] = override_get_current_gm
    response = client.post(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance/resolve",
        json={"status": "CONFIRMED"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CONFIRMED"

    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter_by(user_id=player_id).first()
    assert member.attendance_status == models.AttendanceStatus.CONFIRMED
    verify_session.close()

    app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": False},
    )
    assert response.status_code == 400


def test_attendance_permissions(db_session, setup_data):
    campaign_id = setup_data["campaign_id"]
    player_id = setup_data["player_id"]

    def override_random_user():
        return models.User(id="random_guy", username="Random", email="random@test.com")

    app.dependency_overrides[get_current_user] = override_random_user
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True},
    )
    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = override_get_current_gm
    response = client.patch(
        f"/campaigns/{campaign_id}/members/{player_id}/attendance",
        json={"is_attending": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CONFIRMED"

    verify_session = TestingSessionLocal()
    member = verify_session.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == player_id,
    ).first()
    assert member.attendance_status == models.AttendanceStatus.CONFIRMED
    verify_session.close()
