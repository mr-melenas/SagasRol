import sys
from backend import database, models
from sqlalchemy.orm import Session

def fix_ownership(new_owner_id):
    db = database.SessionLocal()
    try:
        print(f"Updating all universes and characters to owner: {new_owner_id}")
        
        # Update Universes
        universes = db.query(models.Universe).all()
        for u in universes:
            u.gm_id = new_owner_id
            
        # Update Characters
        characters = db.query(models.Character).all()
        for c in characters:
            c.user_id = new_owner_id
            
        # Update Campaigns
        campaigns = db.query(models.Campaign).all()
        for c in campaigns:
            c.gm_id = new_owner_id

        # Update Sheet Templates
        templates = db.query(models.CharacterSheetTemplate).all()
        for t in templates:
            t.ownerId = new_owner_id

        # Ensure the user exists in the DB
        user = db.query(models.User).filter(models.User.id == new_owner_id).first()
        if not user:
            print("Creating user entry for new owner...")
            user = models.User(id=new_owner_id, username="Fixed User")
            db.add(user)

        db.commit()
        print("Success! Database updated.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_db.py <YOUR_CLERK_USER_ID>")
        print("You can find your User ID in the Dashboard header.")
    else:
        fix_ownership(sys.argv[1])
