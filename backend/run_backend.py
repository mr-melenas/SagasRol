import uvicorn
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

if __name__ == "__main__":
    # The user wants to use the existing venv. 
    # This script is intended to be run BY the venv python.
    # e.g. backend\venv\Scripts\python.exe run_backend.py
    print(f"Running with Python: {sys.executable}")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
