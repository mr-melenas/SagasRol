import os
import sys

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
sys.path.insert(0, PROJECT_ROOT)

from backend import database, models


def fix_ownership(new_owner_id: str):
    db = database.SessionLocal()
    try:
        print(f"Updating all universes and characters to owner: {new_owner_id}")

        universes = db.query(models.Universe).all()
        for universe in universes:
            universe.gm_id = new_owner_id

        characters = db.query(models.Character).all()
        for character in characters:
            character.user_id = new_owner_id

        campaigns = db.query(models.Campaign).all()
        for campaign in campaigns:
            campaign.gm_id = new_owner_id

        templates = db.query(models.CharacterSheetTemplate).all()
        for template in templates:
            template.ownerId = new_owner_id

        user = db.query(models.User).filter(models.User.id == new_owner_id).first()
        if not user:
            print("Creating user entry for new owner...")
            user = models.User(id=new_owner_id, username="Fixed User")
            db.add(user)

        db.commit()
        print("Success! Database updated.")
    except Exception as exc:
        print(f"Error: {exc}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/test/debug/fix_db.py <YOUR_CLERK_USER_ID>")
        print("You can find your User ID in the Dashboard header.")
    else:
        fix_ownership(sys.argv[1])
