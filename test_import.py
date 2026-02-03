import sys
import os
sys.path.insert(0, os.getcwd())
try:
    from backend import models
    print("Success importing backend.models")
except Exception as e:
    print(f"Error: {e}")
