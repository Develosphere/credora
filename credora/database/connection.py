"""Database connection management for Credora FP&A Engine.

Provides async PostgreSQL connection pool and query helpers for Supabase.

Requirements: 1.1
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass
class DatabaseConfig:
    """Database connection configuration."""
    
    url: str
    min_connections: int = 2
    max_connections: int = 10
    
    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        """Create config from environment variables."""
        url = os.environ.get("DATABASE_URL", "")
        if not url:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Please set it in your .env file."
            )
        return cls(url=url)


class Database:
    """Async PostgreSQL database connection manager.
    
    Uses asyncpg for async database operations with connection pooling.
    
    Requirements: 1.1
    """
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        """Initialize database manager.
        
        Args:
            config: Database configuration. If None, loads from environment.
        """
        self._config = config or DatabaseConfig.from_env()
        self._pool = None
        self._connected = False
    
    async def connect(self) -> None:
        """Establish database connection pool."""
        if self._connected:
            return
        
        try:
            import asyncpg
            
            self._pool = await asyncpg.create_pool(
                self._config.url,
                min_size=self._config.min_connections,
                max_size=self._config.max_connections,
            )
            self._connected = True
        except ImportError:
            raise ImportError(
                "asyncpg is required for database operations. "
                "Install it with: uv add asyncpg"
            )
        except Exception as e:
            raise ConnectionError(f"Failed to connect to database: {e}")
    
    async def disconnect(self) -> None:
        """Close database connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            self._connected = False
    
    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool.
        
        Usage:
            async with db.acquire() as conn:
                await conn.fetch("SELECT * FROM users")
        """
        if not self._connected:
            await self.connect()
        
        async with self._pool.acquire() as connection:
            yield connection
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query that doesn't return rows.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            Status string from the query
        """
        async with self.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a query and return all rows as dictionaries.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            List of row dictionaries
        """
        async with self.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def fetchrow(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute a query and return a single row as dictionary.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            Row dictionary or None if no rows
        """
        async with self.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetchval(self, query: str, *args) -> Any:
        """Execute a query and return a single value.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            Single value from the query
        """
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)
    
    async def run_migration(self, migration_path: str) -> None:
        """Run a SQL migration file.
        
        Args:
            migration_path: Path to the SQL migration file
        """
        path = Path(migration_path)
        if not path.exists():
            raise FileNotFoundError(f"Migration file not found: {migration_path}")
        
        sql = path.read_text()
        
        async with self.acquire() as conn:
            await conn.execute(sql)
    
    async def run_all_migrations(self) -> None:
        """Run all pending migrations from the migrations directory."""
        migrations_dir = Path(__file__).parent / "migrations"
        
        if not migrations_dir.exists():
            return
        
        # Get all .sql files sorted by name
        migration_files = sorted(migrations_dir.glob("*.sql"))
        
        for migration_file in migration_files:
            print(f"Running migration: {migration_file.name}")
            await self.run_migration(str(migration_file))
            print(f"Completed: {migration_file.name}")
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._connected


# Global database instance
_database: Optional[Database] = None


def get_database() -> Database:
    """Get the global database instance.
    
    Returns:
        Database instance
    """
    global _database
    if _database is None:
        _database = Database()
    return _database


async def init_database() -> Database:
    """Initialize and connect to the database.
    
    Returns:
        Connected Database instance
    """
    db = get_database()
    await db.connect()
    return db


async def close_database() -> None:
    """Close the database connection."""
    global _database
    if _database:
        await _database.disconnect()
        _database = None
