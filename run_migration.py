"""Run database migration to add picture column to users table."""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    """Run the migration."""
    from credora.database import Database
    
    db = Database()
    await db.connect()
    
    print("Running migration 004: Add user picture column...")
    
    # Read migration file
    with open("credora/database/migrations/004_add_user_picture.sql", "r") as f:
        migration_sql = f.read()
    
    # Execute migration
    await db.execute(migration_sql)
    
    print("Migration completed successfully!")
    
    await db.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
