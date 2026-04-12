import json
import os
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import TypeDecorator, VARCHAR

# Add project root to path to allow importing backend package
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(PROJECT_ROOT)

from backend import models
from backend.auth import get_current_user
from backend.database import Base, get_db
from backend.main import app


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


models.Universe.__table__.c.tags.type = ArrayType()
models.Asset.__table__.c.tags.type = ArrayType()

SQLALCHEMY_DATABASE_URL = "sqlite:///./debug_test.db"
if os.path.exists("./debug_test.db"):
    os.remove("./debug_test.db")

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_test():
    print("Setting up data...")
    db = TestingSessionLocal()

    gm_id = "gm_debug"
    player_id = "player_debug"

    gm = models.User(id=gm_id, username="GM", email="gm@test.com")
    player = models.User(id=player_id, username="Player", email="player@test.com")
    db.merge(gm)
    db.merge(player)
    db.commit()

    campaign = models.Campaign(name="Debug Camp", gm_id=gm_id, invite_code="DBG123")
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    member = models.CampaignMember(campaign_id=campaign.id, user_id=player_id, role="PLAYER")
    db.add(member)
    db.commit()

    db.close()

    app.dependency_overrides[get_current_user] = lambda: models.User(id=player_id)

    print("\nSending PATCH is_attending=True...")
    resp = client.patch(
        f"/campaigns/{campaign.id}/members/{player_id}/attendance",
        json={"is_attending": True},
    )
    print(f"Response: {resp.status_code} {resp.json()}")

    print("\nSending PATCH is_attending=False...")
    resp = client.patch(
        f"/campaigns/{campaign.id}/members/{player_id}/attendance",
        json={"is_attending": False},
    )
    print(f"Response: {resp.status_code} {resp.json()}")


if __name__ == "__main__":
    try:
        run_test()
    except Exception as exc:
        print(f"CRASH: {exc}")
        import traceback

        traceback.print_exc()
