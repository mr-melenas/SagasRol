
import unittest
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import JSON
from sqlalchemy.sql.sqltypes import ARRAY
from fastapi.testclient import TestClient

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import Base, get_db
from backend.main import app
from backend import models
from backend.auth import get_current_user

# Use SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class TestCampaignPhase3(unittest.TestCase):
    def setUp(self):
        # Patch ARRAY type for SQLite
        for table in Base.metadata.tables.values():
            for column in table.columns:
                if isinstance(column.type, ARRAY):
                    column.type = JSON()
                    
        Base.metadata.create_all(bind=engine)
        self.db_session = TestingSessionLocal()
        
        # Override get_db
        def override_get_db():
            try:
                yield self.db_session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        
        # Setup Data
        self.setup_data()

    def tearDown(self):
        self.db_session.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()

    def setup_data(self):
        # Create Users
        self.gm_user = models.User(id="user_gm_phase3", username="gm_phase3", email="gm3@test.com")
        self.player_user = models.User(id="user_player_phase3", username="player_phase3", email="player3@test.com")
        self.player_2_user = models.User(id="user_player2_phase3", username="player2_phase3", email="player2_3@test.com")
        
        self.db_session.add(self.gm_user)
        self.db_session.add(self.player_user)
        self.db_session.add(self.player_2_user)
        self.db_session.commit()
        
        # Create Universe
        self.universe = models.Universe(name="Phase 3 Universe", gm_id=self.gm_user.id, isPublic=True)
        self.db_session.add(self.universe)
        self.db_session.commit()
        
        # Create Campaign
        self.campaign = models.Campaign(name="Phase 3 Campaign", invite_code="PHASE3", gm_id=self.gm_user.id, universe_id=self.universe.id)
        self.db_session.add(self.campaign)
        self.db_session.commit()
        
        # Add GM Member
        self.db_session.add(models.CampaignMember(campaign_id=self.campaign.id, user_id=self.gm_user.id, role="GM"))
        
        # Add Player Members
        self.db_session.add(models.CampaignMember(campaign_id=self.campaign.id, user_id=self.player_user.id, role="PLAYER"))
        self.db_session.add(models.CampaignMember(campaign_id=self.campaign.id, user_id=self.player_2_user.id, role="PLAYER"))
        self.db_session.commit()

    def test_journal_permissions_strict(self):
        """
        Test Phase 3 Permissions:
        1) GM cannot see Player notes.
        2) GM can see their own notes (Master Notes).
        3) Players cannot see other players' private notes.
        """
        
        # 1. Player 1 Creates a Note
        app.dependency_overrides[get_current_user] = lambda: self.player_user
        note_content = "<p>My Secret Diary</p>"
        payload = {"content": note_content, "is_private": True}
        
        response = self.client.post(f"/campaigns/{self.campaign.id}/notes", json=payload)
        self.assertEqual(response.status_code, 200)
        player_note_id = response.json()["id"]

        # 2. GM Creates a Master Note
        app.dependency_overrides[get_current_user] = lambda: self.gm_user
        gm_note_content = "<p>The plot twist is...</p>"
        payload_gm = {"content": gm_note_content, "is_private": True}
        
        response = self.client.post(f"/campaigns/{self.campaign.id}/notes", json=payload_gm)
        self.assertEqual(response.status_code, 200)
        gm_note_id = response.json()["id"]

        # 3. Verify GM View (Should see GM Note, Should NOT see Player Note)
        response = self.client.get(f"/campaigns/{self.campaign.id}/lobby")
        self.assertEqual(response.status_code, 200)
        notes = response.json()["notes"]
        
        gm_note_found = any(n["id"] == gm_note_id for n in notes)
        player_note_found = any(n["id"] == player_note_id for n in notes)
        
        self.assertTrue(gm_note_found, "GM should see their own notes (Master Notes)")
        self.assertFalse(player_note_found, "GM should NOT see player diaries")

        # 4. Verify Player View (Should see Player Note, Should NOT see GM Note)
        app.dependency_overrides[get_current_user] = lambda: self.player_user
        response = self.client.get(f"/campaigns/{self.campaign.id}/lobby")
        self.assertEqual(response.status_code, 200)
        notes = response.json()["notes"]
        
        gm_note_found = any(n["id"] == gm_note_id for n in notes)
        player_note_found = any(n["id"] == player_note_id for n in notes)
        
        self.assertTrue(player_note_found, "Player should see their own notes")
        self.assertFalse(gm_note_found, "Player should NOT see Master Notes")

    def test_library_handouts_rich_text(self):
        """Test creating handouts (text), visibility toggling, and permissions."""
        
        # 1. GM Creates Rich Text Handout
        app.dependency_overrides[get_current_user] = lambda: self.gm_user
        handout_content = "<h2>The Ancient Prophecy</h2><p>Only the chosen one...</p>"
        payload = {
            "name": "Prophecy",
            "content": handout_content,
            "is_visible": False  # Hidden initially
        }
        
        response = self.client.post(f"/campaigns/{self.campaign.id}/handouts/text", json=payload)
        self.assertEqual(response.status_code, 200)
        handout_id = response.json()["id"]
        self.assertEqual(response.json()["content"], handout_content)
        self.assertFalse(response.json()["is_visible"])

        # 2. Player checks Lobby (Should NOT see the handout)
        app.dependency_overrides[get_current_user] = lambda: self.player_user
        response = self.client.get(f"/campaigns/{self.campaign.id}/lobby")
        self.assertEqual(response.status_code, 200)
        handouts = response.json()["handouts"]
        self.assertFalse(any(h["id"] == handout_id for h in handouts), "Player should not see hidden handout")

        # 3. GM Toggles Visibility
        app.dependency_overrides[get_current_user] = lambda: self.gm_user
        response = self.client.patch(f"/campaigns/{self.campaign.id}/handouts/{handout_id}/visibility")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_visible"])

        # 4. Player checks Lobby again (Should SEE the handout)
        app.dependency_overrides[get_current_user] = lambda: self.player_user
        response = self.client.get(f"/campaigns/{self.campaign.id}/lobby")
        self.assertEqual(response.status_code, 200)
        handouts = response.json()["handouts"]
        self.assertTrue(any(h["id"] == handout_id for h in handouts), "Player should see visible handout")
        
        # Verify content
        target_handout = next(h for h in handouts if h["id"] == handout_id)
        self.assertEqual(target_handout["content"], handout_content)

        # 5. Player tries to delete Handout (Should Fail)
        response = self.client.delete(f"/campaigns/{self.campaign.id}/handouts/{handout_id}")
        self.assertEqual(response.status_code, 403)

        # 6. GM Deletes Handout
        app.dependency_overrides[get_current_user] = lambda: self.gm_user
        response = self.client.delete(f"/campaigns/{self.campaign.id}/handouts/{handout_id}")
        self.assertEqual(response.status_code, 200)

    def test_journal_creation_and_update(self):
        """
        Test Phase 3 Journal Creation and Update:
        1) Create a note.
        2) Verify it exists in DB.
        3) Update the note.
        4) Verify update in DB.
        """
        app.dependency_overrides[get_current_user] = lambda: self.player_user
        
        # 1. Create
        note_content = "<p>Test Note</p>"
        payload = {"content": note_content, "is_private": True}
        response = self.client.post(f"/campaigns/{self.campaign.id}/notes", json=payload)
        self.assertEqual(response.status_code, 200)
        note_id = response.json()["id"]
        
        # 2. Verify in DB
        db_note = self.db_session.query(models.CampaignNote).filter(models.CampaignNote.id == note_id).first()
        self.assertIsNotNone(db_note)
        self.assertEqual(db_note.content, note_content)
        
        # 3. Update
        updated_content = "<p>Updated Content</p>"
        payload_update = {"content": updated_content, "is_private": True}
        response = self.client.patch(f"/campaigns/{self.campaign.id}/notes/{note_id}", json=payload_update)
        self.assertEqual(response.status_code, 200)
        
        # 4. Verify Update
        self.db_session.refresh(db_note)
        self.assertEqual(db_note.content, updated_content)

if __name__ == "__main__":
    unittest.main()
