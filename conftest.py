"""
Root conftest.py for pytest configuration.
"""

import sys
from pathlib import Path

# Add project root to Python path
root_dir = Path(__file__).parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
