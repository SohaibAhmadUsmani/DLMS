import os, asyncio
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["MONGO_DB_NAME"] = "lms_test"
import django; django.setup()
from django.conf import settings
os.environ.setdefault("TEST_MONGO_URI", settings.MONGO_URI)
print(f"TEST_MONGO_URI: {os.environ['TEST_MONGO_URI']}")
print(f"MONGO_DB_NAME: {os.environ['MONGO_DB_NAME']}")

from motor.motor_asyncio import AsyncIOMotorClient
mongo_uri = os.environ["TEST_MONGO_URI"]
client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
async def ping():
    try:
        await client.admin.command("ping")
        print("Ping succeeded!")
    except Exception as e:
        print(f"Ping failed: {e}")
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
loop.run_until_complete(ping())
loop.close()
client.close()
