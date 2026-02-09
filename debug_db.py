from backend import database, models
from sqlalchemy.orm import Session

db = database.SessionLocal()

try:
    print("--- USERS ---")
    users = db.query(models.User).all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.username}")

    print("\n--- UNIVERSES ---")
    universes = db.query(models.Universe).all()
    for u in universes:
        print(f"ID: {u.id}, Name: {u.name}, GM_ID: {u.gm_id}")

finally:
    db.close()
