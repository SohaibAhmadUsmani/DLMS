from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from django.conf import settings

client: AsyncIOMotorClient | None = None
_db_connected: bool = False
def is_db_connected() -> bool:
    return _db_connected
async def connect_db() -> None:
    global client, _db_connected
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=3000,
    )
    try:
        await client.admin.command("ping")
        _db_connected = True
    except Exception:
        _db_connected = False
async def close_db() -> None:
    global client, _db_connected
    if client is not None:
        client.close()
        client = None
    _db_connected = False
async def get_database() -> AsyncIOMotorDatabase:
    if client is None:
        await connect_db()
    return client[settings.MONGO_DB_NAME]
