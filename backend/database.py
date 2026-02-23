import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGODB_URL)
db = client["inclusive_jobs"]
fs = AsyncIOMotorGridFSBucket(db)


async def ping_db() -> bool:
    """Vérifie la connexion à la base de données MongoDB au démarrage."""
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
