import os
import sys
import importlib.util

_backend_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "Backend")
)

def _load_backend_module(module_name: str, filename: str):
    """Load a module from Backend/ by absolute path to avoid name collisions."""
    if _backend_dir not in sys.path:
        sys.path.insert(0, _backend_dir)
    spec = importlib.util.spec_from_file_location(
        f"_ai_engine.{module_name}",
        os.path.join(_backend_dir, filename),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

try:
    print(f"Loading main.py from {_backend_dir}...")
    _ai_main = _load_backend_module("main", "main.py")
    print("Successfully loaded main.py")
    
    print(f"Loading classification_log.py from {_backend_dir}...")
    _ai_classif = _load_backend_module("classification_log", "classification_log.py")
    print("Successfully loaded classification_log.py")
    
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
