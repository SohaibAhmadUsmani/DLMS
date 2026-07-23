import os, asyncio
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["MONGO_DB_NAME"] = "lms_test"
os.environ.setdefault("TEST_MONGO_URI", os.environ.get("MONGO_URI", "mongodb://localhost:27017"))
print(f"TEST_MONGO_URI: {os.environ['TEST_MONGO_URI']}")
print(f"MONGO_URI: {os.environ.get('MONGO_URI', 'not set')}")
import django; django.setup()
from motor.motor_asyncio import AsyncIOMotorClient
from django.conf import settings

mongo_uri = os.environ["TEST_MONGO_URI"]
client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
try:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(client.admin.command("ping"))
    loop.close()
    print("Ping succeeded with new_event_loop!")
except Exception as e:
    client.close()
    print(f"Ping failed: {type(e).__name__}: {e}")
