import asyncio
import sys
sys.path.insert(0, '.')
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from shared.security import hash_password
from bson.objectid import ObjectId
import datetime

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command('ping')
        print('MongoDB connected')
    except Exception as e:
        print('Failed:', e)
        return
    
    db = client[settings.MONGO_DB_NAME]
    users = await db['users'].find().to_list(length=10)
    print('Users in collection:', len(users))
    for u in users:
        print('  {} role={}'.format(u['email'], u['role']))
    
    admin_exists = any(u.get('email') == 'admin@dlms.com' for u in users)
    if not admin_exists:
        result = await db['users'].insert_one({
            '_id': ObjectId(),
            'name': 'Admin User',
            'email': 'admin@gmail.com',
            'password_hash': hash_password('admin123'),
            'role': 'admin',
            'is_active': True,
            'created_at': datetime.datetime.utcnow()
        })
        print('Created admin user:', result.inserted_id)
    else:
        print('Admin user already exists')
    
    await client.close()

asyncio.run(main())
