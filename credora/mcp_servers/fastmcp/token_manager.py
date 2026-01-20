"""
Secure Token Manager for FastMCP Servers.

Production-ready token storage with database persistence
and automatic refresh handling.

Uses PostgreSQL (Supabase) for token storage instead of local files.
"""

import os
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, asdict

import httpx
from dotenv import load_dotenv

load_dotenv()


@dataclass
class TokenData:
    """Stored token data with metadata."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    platform_user_id: Optional[str] = None
    scopes: Optional[list] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def is_expired(self, buffer_seconds: int = 300) -> bool:
        """Check if token is expired or will expire soon."""
        if not self.expires_at:
            return False
        # Use timezone-aware comparison for database compatibility
        now = datetime.now(timezone.utc)
        expires_at = self.expires_at
        # If expires_at is naive, assume UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return now >= (expires_at - timedelta(seconds=buffer_seconds))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        if self.expires_at:
            data["expires_at"] = self.expires_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TokenData":
        """Create from dictionary."""
        if data.get("expires_at") and isinstance(data["expires_at"], str):
            data["expires_at"] = datetime.fromisoformat(data["expires_at"])
        return cls(**data)


class TokenManager:
    """
    Production-ready token manager with:
    - Database persistence (PostgreSQL/Supabase)
    - Automatic token refresh
    - Multi-user support
    - Thread-safe operations
    """
    
    def __init__(self):
        """Initialize token manager with database connection."""
        self._db = None
        self._lock = asyncio.Lock()
        self._cache: Dict[str, Dict[str, TokenData]] = {}
    
    async def _get_db(self):
        """Get database connection."""
        if self._db is None:
            try:
                from credora.database.connection import get_database
                self._db = get_database()
                if not self._db.is_connected:
                    await self._db.connect()
            except Exception as e:
                print(f"TokenManager: Database connection failed: {e}")
                return None
        return self._db
    
    async def _get_user_uuid(self, user_id: str) -> Optional[str]:
        """Get the actual database UUID for a user."""
        print(f"TokenManager: Looking up UUID for user_id={user_id}")
        db = await self._get_db()
        if db is None:
            print(f"TokenManager: DB not available for UUID lookup")
            return None
        try:
            result = await db.fetchval(
                "SELECT id FROM users WHERE external_id = $1 OR email = $1",
                user_id
            )
            if result:
                print(f"TokenManager: Found UUID {result} for user {user_id}")
            else:
                print(f"TokenManager: No UUID found for user {user_id}")
            return str(result) if result else None
        except Exception as e:
            print(f"TokenManager: Error getting user UUID: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def store_token(
        self,
        user_id: str,
        platform: str,
        token_data: TokenData
    ) -> None:
        """Store a token for a user/platform in the database."""
        print(f"TokenManager: store_token called for user={user_id}, platform={platform}")
        async with self._lock:
            if user_id not in self._cache:
                self._cache[user_id] = {}
            self._cache[user_id][platform] = token_data
            
            db = await self._get_db()
            if db is None:
                print(f"TokenManager: DB unavailable, token cached in memory only")
                return
            
            try:
                user_uuid = await self._get_user_uuid(user_id)
                if not user_uuid:
                    print(f"TokenManager: User not found in DB: {user_id} - token NOT stored in database!")
                    return
                
                import uuid
                await db.execute(
                    """
                    INSERT INTO tokens (
                        user_id, platform, access_token_encrypted, refresh_token_encrypted,
                        expires_at, scopes, platform_user_id, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                    ON CONFLICT (user_id, platform) DO UPDATE SET
                        access_token_encrypted = EXCLUDED.access_token_encrypted,
                        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                        expires_at = EXCLUDED.expires_at,
                        scopes = EXCLUDED.scopes,
                        platform_user_id = EXCLUDED.platform_user_id,
                        updated_at = NOW()
                    """,
                    uuid.UUID(user_uuid), platform, token_data.access_token,
                    token_data.refresh_token, token_data.expires_at,
                    token_data.scopes, token_data.platform_user_id,
                )
                print(f"TokenManager: ✅ Token stored in DB for {user_id}/{platform} (uuid={user_uuid})")
            except Exception as e:
                print(f"TokenManager: ❌ Error storing token: {e}")
                import traceback
                traceback.print_exc()

    
    async def get_token(
        self,
        user_id: str,
        platform: str,
        auto_refresh: bool = True
    ) -> Optional[TokenData]:
        """Get token for a user/platform from database."""
        async with self._lock:
            if user_id in self._cache and platform in self._cache[user_id]:
                token_data = self._cache[user_id][platform]
                if not token_data.is_expired():
                    return token_data
            
            db = await self._get_db()
            if db is None:
                return self._cache.get(user_id, {}).get(platform)
            
            try:
                user_uuid = await self._get_user_uuid(user_id)
                if not user_uuid:
                    return None
                
                import uuid
                row = await db.fetchrow(
                    """SELECT access_token_encrypted, refresh_token_encrypted, expires_at,
                           scopes, platform_user_id FROM tokens
                    WHERE user_id = $1 AND platform = $2""",
                    uuid.UUID(user_uuid), platform,
                )
                
                if not row:
                    return None
                
                token_data = TokenData(
                    access_token=row["access_token_encrypted"],
                    refresh_token=row["refresh_token_encrypted"],
                    expires_at=row["expires_at"],
                    scopes=row["scopes"],
                    platform_user_id=row["platform_user_id"],
                )
                
                if user_id not in self._cache:
                    self._cache[user_id] = {}
                self._cache[user_id][platform] = token_data
                
                if auto_refresh and token_data.is_expired() and token_data.refresh_token:
                    try:
                        refreshed = await self._refresh_token(platform, token_data)
                        if refreshed:
                            await self.store_token(user_id, platform, refreshed)
                            return refreshed
                    except Exception as e:
                        print(f"TokenManager: Token refresh failed: {e}")
                
                return token_data
            except Exception as e:
                print(f"TokenManager: Error getting token: {e}")
                return self._cache.get(user_id, {}).get(platform)
    
    async def delete_token(self, user_id: str, platform: str) -> bool:
        """Delete token for a user/platform from database."""
        async with self._lock:
            if user_id in self._cache and platform in self._cache[user_id]:
                del self._cache[user_id][platform]
                if not self._cache[user_id]:
                    del self._cache[user_id]
            
            db = await self._get_db()
            if db is None:
                return True
            
            try:
                user_uuid = await self._get_user_uuid(user_id)
                if not user_uuid:
                    return False
                
                import uuid
                await db.execute(
                    "DELETE FROM tokens WHERE user_id = $1 AND platform = $2",
                    uuid.UUID(user_uuid), platform,
                )
                print(f"TokenManager: Token deleted for {user_id}/{platform}")
                return True
            except Exception as e:
                print(f"TokenManager: Error deleting token: {e}")
                return False
    
    async def list_platforms(self, user_id: str) -> List[str]:
        """List connected platforms for a user."""
        async with self._lock:
            db = await self._get_db()
            if db is None:
                return list(self._cache.get(user_id, {}).keys())
            
            try:
                user_uuid = await self._get_user_uuid(user_id)
                if not user_uuid:
                    return []
                
                import uuid
                rows = await db.fetch(
                    "SELECT platform FROM tokens WHERE user_id = $1",
                    uuid.UUID(user_uuid),
                )
                return [row["platform"] for row in rows]
            except Exception as e:
                print(f"TokenManager: Error listing platforms: {e}")
                return list(self._cache.get(user_id, {}).keys())

    
    async def _refresh_token(
        self,
        platform: str,
        token_data: TokenData
    ) -> Optional[TokenData]:
        """Refresh an expired token."""
        if platform == "shopify":
            return None
        
        prefix = platform.upper()
        client_id = os.environ.get(f"{prefix}_CLIENT_ID", "")
        client_secret = os.environ.get(f"{prefix}_CLIENT_SECRET", "")
        
        if not client_id or not client_secret:
            return None
        
        async with httpx.AsyncClient() as client:
            if platform == "meta":
                response = await client.get(
                    "https://graph.facebook.com/v21.0/oauth/access_token",
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "fb_exchange_token": token_data.refresh_token,
                    },
                )
            elif platform == "google":
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "refresh_token": token_data.refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
            else:
                return None
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            return TokenData(
                access_token=data.get("access_token", ""),
                refresh_token=data.get("refresh_token", token_data.refresh_token),
                expires_at=datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600)),
                platform_user_id=token_data.platform_user_id,
                scopes=token_data.scopes,
                metadata=token_data.metadata,
            )


# Global token manager instance
_token_manager: Optional[TokenManager] = None


def get_token_manager() -> TokenManager:
    """Get the global token manager instance."""
    global _token_manager
    if _token_manager is None:
        _token_manager = TokenManager()
    return _token_manager
