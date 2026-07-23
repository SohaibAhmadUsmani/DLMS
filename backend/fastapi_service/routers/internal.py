from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from fastapi_service.core.database import get_database, is_db_connected

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/health")
async def internal_health(db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        await db.command("ping")
        return {"status": "ok", "service": "dlms-core", "db": "connected"}
    except Exception:
        return {"status": "ok", "service": "dlms-core", "db": "disconnected"}
