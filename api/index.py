import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Ensure uploads directory exists (Vercel doesn't have it by default)
os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'backend', 'uploads'), exist_ok=True)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from config.asgi import application as app
