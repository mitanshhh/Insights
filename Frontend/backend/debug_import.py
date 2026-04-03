import sys
import os

_backend_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "Backend")
)
sys.path.insert(0, _backend_dir)

print(f"Python path: {sys.path}")

try:
    print("Importing main...")
    import main
    print("Successfully imported main")
except Exception as e:
    print(f"Failed to import main: {e}")
    import traceback
    traceback.print_exc()

try:
    print("Importing classification_log...")
    import classification_log
    print("Successfully imported classification_log")
except Exception as e:
    print(f"Failed to import classification_log: {e}")
    import traceback
    traceback.print_exc()
