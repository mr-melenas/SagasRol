from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    url = DATABASE_URL
    if not url:
        print("DATABASE_URL not found")
        return
    
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to DB...")
    engine = create_engine(url)
    
    with engine.connect() as conn:
        print("Migrating attendance system...")
        
        # 1. Create new column
        try:
            # Check if column exists first (to be safe)
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='campaign_members' AND column_name='attendance_status'"))
            if not result.fetchone():
                print("Adding attendance_status column...")
                conn.execute(text("ALTER TABLE campaign_members ADD COLUMN attendance_status VARCHAR DEFAULT 'UNKNOWN'"))
            
            # 2. Create AttendanceLog table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS attendance_logs (
                    id SERIAL PRIMARY KEY,
                    campaign_id INTEGER REFERENCES campaigns(id),
                    actor_id VARCHAR REFERENCES users(id),
                    target_id VARCHAR REFERENCES users(id),
                    action VARCHAR,
                    previous_status VARCHAR,
                    new_status VARCHAR,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            """))
            
            # 3. Migrate data
            print("Migrating existing data...")
            # If attending_next_session was True -> CONFIRMED (Assuming default was True/auto-join)
            # Actually, previous system default was True.
            # Let's say True -> CONFIRMED, False -> DECLINED
            
            # We need to check if attending_next_session exists before trying to read it
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='campaign_members' AND column_name='attending_next_session'"))
            if result.fetchone():
                conn.execute(text("""
                    UPDATE campaign_members 
                    SET attendance_status = CASE 
                        WHEN attending_next_session = TRUE THEN 'CONFIRMED'
                        WHEN attending_next_session = FALSE THEN 'DECLINED'
                        ELSE 'UNKNOWN'
                    END
                    WHERE attendance_status = 'UNKNOWN'
                """))
                # Optional: Drop the old column? Let's keep it for safety for now, or drop it.
                # conn.execute(text("ALTER TABLE campaign_members DROP COLUMN attending_next_session"))
                print("Data migrated.")
            else:
                print("Old column not found, skipping data migration.")

            print("Migration successful!")
            conn.commit()
        except Exception as e:
            print(f"Migration failed: {e}")
            
if __name__ == "__main__":
    migrate()
