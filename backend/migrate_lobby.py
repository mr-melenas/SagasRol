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
        print("Adding banner_url to campaigns table if not exists...")
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_url VARCHAR"))
            print("Added banner_url!")
        except Exception as e:
            print(f"Failed to add banner_url: {e}")

        print("Adding attending_next_session to campaign_members table if not exists...")
        try:
            conn.execute(text("ALTER TABLE campaign_members ADD COLUMN IF NOT EXISTS attending_next_session BOOLEAN DEFAULT TRUE"))
            print("Added attending_next_session!")
        except Exception as e:
            print(f"Failed to add attending_next_session: {e}")
            
        conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    migrate()
