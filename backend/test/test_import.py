import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

try:
    from backend import models

    print("Success importing backend.models")
except Exception as exc:
    print(f"Error: {exc}")
