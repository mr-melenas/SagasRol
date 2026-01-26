import sys
import os
from sqlalchemy import text

# Add current directory to path so we can import backend
sys.path.append(os.getcwd())

try:
    from backend.database import engine
    
    # Try to connect
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Successfully connected to the database!")
        print(f"Result: {result.fetchone()[0]}")
        
except Exception as e:
    print(f"Connection failed: {e}")
