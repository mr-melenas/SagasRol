import os
import sys

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
sys.path.insert(0, PROJECT_ROOT)

from backend import database, models

db = database.SessionLocal()

try:
    print("--- USERS ---")
    users = db.query(models.User).all()
    for user in users:
        print(f"ID: {user.id}, Name: {user.username}")

    print("\n--- UNIVERSES ---")
    universes = db.query(models.Universe).all()
    for universe in universes:
        print(f"ID: {universe.id}, Name: {universe.name}, GM_ID: {universe.gm_id}")
finally:
    db.close()
