"""
Database Token Store for persistent OAuth token storage.

This module provides PostgreSQL-based storage for OAuth tokens,
replacing the file-based storage for production use.

Requirements: 1.2, 2.3, 7.1
"""

from datetime import datetime
from typing import List, Optional
import asyncio

from credora.mcp_servers.fastmcp.token_manager import TokenData
from credora.security import TokenEncryption
from credora.database.connection import get_database, Database


class DatabaseTokenStore:
    """
    PostgreSQL-based encrypted storage for OAuth tokens.
    
    Stores tokens in the database with encryption, providing
    persistent storage that works across multiple processes.
    
    Requirements: 1.2, 2.3, 7.1
    """
    
    def __init__(
        self, 
        encryption: Optional[TokenEncryption] = None,
        database: Optional[Database] = None
    ):
        """Initialize the database token store.
        
        Args:
            encryption: Optional TokenEncryption instance.
            database: Optional Database instance. Uses global if not provided.
        """
        self._encryption = encryption or TokenEncryption(TokenEncryption.generate_key())
        self._db = database
    
    def _get_db(self) -> Database:
        """Get database instance."""
        if self._db is None:
            self._db = get_database()
        return self._db
    
    def _validate_inputs(self, user_id: str, platform: str) -> None:
        """Validate user_id and platform inputs."""
        if not user_id or not user_id.strip():
            raise ValueError("user_id is required and cannot be empty")
        if not platform or not platform.strip():
            raise ValueError("platform is required and cannot be empty")
    
    async def _ensure_user_exists(self, user_id: str) -> str:
        """Ensure user exists in database and return their UUID.
        
        Args:
            user_id: External user identifier
            
        Returns:
            UUID of the user record
        """
        db = self._get_db()
        
        # Try to get existing user
        row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if row:
            return str(row["id"])
        
        # Create new user
        row = await db.fetchrow(
            """
            INSERT INTO users (external_id) 
            VALUES ($1) 
            ON CONFLICT (external_id) DO UPDATE SET updated_at = NOW()
            RETURNING id
            """,
            user_id
        )
        return str(row["id"])
    
    async def store_token_async(
        self, user_id: str, platform: str, token_data: TokenData
    ) -> None:
        """Store an OAuth token with encryption (async).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            token_data: The token data to store
        """
        self._validate_inputs(user_id, platform)
        
        if token_data is None:
            raise ValueError("token_data is required")
        
        platform_lower = platform.lower().strip()
        user_id_clean = user_id.strip()
        
        # Ensure user exists and get UUID
        user_uuid = await self._ensure_user_exists(user_id_clean)
        
        # Encrypt sensitive token fields
        encrypted_access = self._encryption.encrypt(token_data.access_token)
        encrypted_refresh = self._encryption.encrypt(token_data.refresh_token)
        
        db = self._get_db()
        
        await db.execute(
            """
            INSERT INTO tokens (
                user_id, platform, access_token_encrypted, refresh_token_encrypted,
                expires_at, scopes, platform_user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, platform) DO UPDATE SET
                access_token_encrypted = EXCLUDED.access_token_encrypted,
                refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                expires_at = EXCLUDED.expires_at,
                scopes = EXCLUDED.scopes,
                platform_user_id = EXCLUDED.platform_user_id,
                updated_at = NOW()
            """,
            user_uuid,
            platform_lower,
            encrypted_access,
            encrypted_refresh,
            token_data.expires_at,
            token_data.scopes,
            token_data.platform_user_id,
        )
    
    def store_token(
        self, user_id: str, platform: str, token_data: TokenData
    ) -> None:
        """Store an OAuth token with encryption (sync wrapper).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            token_data: The token data to store
        """
        self._run_async(self.store_token_async(user_id, platform, token_data))
    
    async def get_token_async(self, user_id: str, platform: str) -> Optional[TokenData]:
        """Retrieve and decrypt an OAuth token (async).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            
        Returns:
            TokenData with decrypted tokens, or None if not found
        """
        self._validate_inputs(user_id, platform)
        
        platform_lower = platform.lower().strip()
        user_id_clean = user_id.strip()
        
        db = self._get_db()
        
        row = await db.fetchrow(
            """
            SELECT t.access_token_encrypted, t.refresh_token_encrypted,
                   t.expires_at, t.scopes, t.platform_user_id
            FROM tokens t
            JOIN users u ON t.user_id = u.id
            WHERE u.external_id = $1 AND t.platform = $2
            """,
            user_id_clean,
            platform_lower
        )
        
        if not row:
            return None
        
        try:
            return TokenData(
                access_token=self._encryption.decrypt(row["access_token_encrypted"]),
                refresh_token=self._encryption.decrypt(row["refresh_token_encrypted"]),
                expires_at=row["expires_at"],
                scopes=list(row["scopes"]) if row["scopes"] else None,
                platform_user_id=row["platform_user_id"],
            )
        except Exception:
            # If decryption fails (different encryption key), return None
            return None
    
    def get_token(self, user_id: str, platform: str) -> Optional[TokenData]:
        """Retrieve and decrypt an OAuth token (sync wrapper).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            
        Returns:
            TokenData with decrypted tokens, or None if not found
        """
        return self._run_async(self.get_token_async(user_id, platform))
    
    async def delete_token_async(self, user_id: str, platform: str) -> bool:
        """Delete a stored OAuth token (async).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            
        Returns:
            True if token was deleted, False if it didn't exist
        """
        self._validate_inputs(user_id, platform)
        
        platform_lower = platform.lower().strip()
        user_id_clean = user_id.strip()
        
        db = self._get_db()
        
        result = await db.execute(
            """
            DELETE FROM tokens t
            USING users u
            WHERE t.user_id = u.id 
              AND u.external_id = $1 
              AND t.platform = $2
            """,
            user_id_clean,
            platform_lower
        )
        
        # Result format: "DELETE N" where N is number of rows deleted
        return result.endswith("1")
    
    def delete_token(self, user_id: str, platform: str) -> bool:
        """Delete a stored OAuth token (sync wrapper).
        
        Args:
            user_id: The user identifier
            platform: The platform name
            
        Returns:
            True if token was deleted, False if it didn't exist
        """
        return self._run_async(self.delete_token_async(user_id, platform))
    
    async def list_platforms_async(self, user_id: str) -> List[str]:
        """List all platforms with stored tokens for a user (async).
        
        Args:
            user_id: The user identifier
            
        Returns:
            List of platform names with stored tokens
        """
        if not user_id or not user_id.strip():
            raise ValueError("user_id is required and cannot be empty")
        
        user_id_clean = user_id.strip()
        
        db = self._get_db()
        
        rows = await db.fetch(
            """
            SELECT t.platform
            FROM tokens t
            JOIN users u ON t.user_id = u.id
            WHERE u.external_id = $1
            """,
            user_id_clean
        )
        
        return [row["platform"] for row in rows]
    
    def list_platforms(self, user_id: str) -> List[str]:
        """List all platforms with stored tokens for a user (sync wrapper).
        
        Args:
            user_id: The user identifier
            
        Returns:
            List of platform names with stored tokens
        """
        return self._run_async(self.list_platforms_async(user_id))
    
    async def has_token_async(self, user_id: str, platform: str) -> bool:
        """Check if a token exists for user/platform (async)."""
        self._validate_inputs(user_id, platform)
        
        platform_lower = platform.lower().strip()
        user_id_clean = user_id.strip()
        
        db = self._get_db()
        
        count = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM tokens t
            JOIN users u ON t.user_id = u.id
            WHERE u.external_id = $1 AND t.platform = $2
            """,
            user_id_clean,
            platform_lower
        )
        
        return count > 0
    
    def has_token(self, user_id: str, platform: str) -> bool:
        """Check if a token exists for user/platform (sync wrapper)."""
        return self._run_async(self.has_token_async(user_id, platform))
    
    async def clear_user_tokens_async(self, user_id: str) -> int:
        """Delete all tokens for a user (async).
        
        Args:
            user_id: The user identifier
            
        Returns:
            Number of tokens deleted
        """
        if not user_id or not user_id.strip():
            raise ValueError("user_id is required and cannot be empty")
        
        user_id_clean = user_id.strip()
        
        db = self._get_db()
        
        result = await db.execute(
            """
            DELETE FROM tokens t
            USING users u
            WHERE t.user_id = u.id AND u.external_id = $1
            """,
            user_id_clean
        )
        
        # Result format: "DELETE N"
        try:
            return int(result.split()[-1])
        except (ValueError, IndexError):
            return 0
    
    def clear_user_tokens(self, user_id: str) -> int:
        """Delete all tokens for a user (sync wrapper).
        
        Args:
            user_id: The user identifier
            
        Returns:
            Number of tokens deleted
        """
        return self._run_async(self.clear_user_tokens_async(user_id))
    
    async def list_all_users_async(self) -> List[str]:
        """List all users with stored tokens (async).
        
        Returns:
            List of user IDs
        """
        db = self._get_db()
        
        rows = await db.fetch(
            """
            SELECT DISTINCT u.external_id
            FROM users u
            JOIN tokens t ON u.id = t.user_id
            """
        )
        
        return [row["external_id"] for row in rows]
    
    def list_all_users(self) -> List[str]:
        """List all users with stored tokens (sync wrapper).
        
        Returns:
            List of user IDs
        """
        return self._run_async(self.list_all_users_async())
    
    def _run_async(self, coro):
        """Run an async coroutine from sync code."""
        try:
            loop = asyncio.get_running_loop()
            # If we're in an async context, use a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        except RuntimeError:
            # No running loop, we can use asyncio.run directly
            return asyncio.run(coro)


# Factory function to get appropriate token store
def get_token_store(
    use_database: bool = True,
    encryption: Optional[TokenEncryption] = None
):
    """Get a token store instance.
    
    Args:
        use_database: If True, use DatabaseTokenStore.
        encryption: Optional encryption instance.
        
    Returns:
        DatabaseTokenStore instance
    """
    return DatabaseTokenStore(encryption=encryption)
