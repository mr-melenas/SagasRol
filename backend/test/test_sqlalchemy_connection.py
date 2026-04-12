from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Get URL
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'UNKNOWN'}")

# Fix protocol for SQLAlchemy
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Try connection
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("\n✅ Connection Successful!")
        print(f"Query Result: {result.scalar()}")
        
except Exception as e:
    print("\n❌ Connection Failed")
    print(f"Error: {e}")
