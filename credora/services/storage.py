"""
Session Storage Service for Credora FP&A Engine.

Provides persistent session storage using PostgreSQL.

Requirements: Architecture Phase 4 - Production Storage
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import uuid

from credora.database.connection import get_database, Database


# Session expiry
SESSION_EXPIRY_HOURS = 24


class SessionStore:
    """Persistent session storage using PostgreSQL.
    
    Replaces in-memory session storage for production use.
    """
    
    def __init__(self, database: Optional[Database] = None):
        """Initialize the session store.
        
        Args:
            database: Database instance (uses global if not provided)
        """
        self._db = database
        self._memory_fallback: Dict[str, Dict[str, Any]] = {}  # Fallback if DB unavailable
    
    async def _get_db(self) -> Optional[Database]:
        """Get database instance."""
        try:
            if self._db is None:
                self._db = get_database()
                if not self._db.is_connected:
                    await self._db.connect()
            return self._db
        except Exception:
            return None
    
    async def create_session(
        self,
        user_id: str,
        user_data: Dict[str, Any],
    ) -> str:
        """Create a new session.
        
        Args:
            user_id: User's external ID (email)
            user_data: User data to store in session
            
        Returns:
            Session token
        """
        import secrets
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=SESSION_EXPIRY_HOURS)
        
        db = await self._get_db()
        
        if db is not None:
            try:
                # Get user UUID
                user_row = await db.fetchrow(
                    "SELECT id FROM users WHERE external_id = $1",
                    user_id
                )
                
                if user_row:
                    await db.execute(
                        """
                        INSERT INTO sessions (token, user_id, created_at, expires_at, metadata)
                        VALUES ($1, $2, NOW(), $3, $4::jsonb)
                        """,
                        token,
                        user_row["id"],
                        expires_at,
                        str(user_data).replace("'", '"'),
                    )
                    return token
            except Exception as e:
                print(f"Session create DB error: {e}")
        
        # Fallback to memory
        self._memory_fallback[token] = {
            "user_id": user_id,
            "user_data": user_data,
            "expires_at": expires_at,
        }
        return token
    
    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Get session data by token.
        
        Args:
            token: Session token
            
        Returns:
            Session data or None if not found/expired
        """
        db = await self._get_db()
        
        if db is not None:
            try:
                row = await db.fetchrow(
                    """
                    SELECT s.*, u.external_id, u.email, u.name
                    FROM sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.token = $1 AND s.expires_at > NOW()
                    """,
                    token
                )
                
                if row:
                    return {
                        "user_id": row["external_id"],
                        "email": row["email"],
                        "name": row["name"],
                        "expires_at": row["expires_at"],
                    }
            except Exception as e:
                print(f"Session get DB error: {e}")
        
        # Fallback to memory
        session = self._memory_fallback.get(token)
        if session and session["expires_at"] > datetime.utcnow():
            return session
        
        return None
    
    async def delete_session(self, token: str) -> None:
        """Delete a session.
        
        Args:
            token: Session token
        """
        db = await self._get_db()
        
        if db is not None:
            try:
                await db.execute(
                    "DELETE FROM sessions WHERE token = $1",
                    token
                )
            except Exception as e:
                print(f"Session delete DB error: {e}")
        
        # Also remove from memory fallback
        self._memory_fallback.pop(token, None)
    
    async def cleanup_expired(self) -> int:
        """Clean up expired sessions.
        
        Returns:
            Number of sessions deleted
        """
        db = await self._get_db()
        count = 0
        
        if db is not None:
            try:
                result = await db.execute(
                    "DELETE FROM sessions WHERE expires_at < NOW()"
                )
                # Parse count from result like "DELETE 5"
                if result:
                    parts = result.split()
                    if len(parts) >= 2:
                        count = int(parts[1])
            except Exception as e:
                print(f"Session cleanup DB error: {e}")
        
        # Clean memory fallback
        now = datetime.utcnow()
        expired = [k for k, v in self._memory_fallback.items() if v["expires_at"] < now]
        for k in expired:
            del self._memory_fallback[k]
            count += 1
        
        return count


class ChatHistoryStore:
    """Persistent chat history storage using PostgreSQL.
    
    Replaces in-memory chat history for production use.
    """
    
    def __init__(self, database: Optional[Database] = None):
        """Initialize the chat history store.
        
        Args:
            database: Database instance (uses global if not provided)
        """
        self._db = database
        self._memory_fallback: Dict[str, list] = {}  # Fallback if DB unavailable
    
    async def _get_db(self) -> Optional[Database]:
        """Get database instance."""
        try:
            if self._db is None:
                self._db = get_database()
                if not self._db.is_connected:
                    await self._db.connect()
            return self._db
        except Exception:
            return None
    
    async def _get_user_uuid(self, external_id: str) -> Optional[uuid.UUID]:
        """Get user UUID from external ID."""
        db = await self._get_db()
        if db is None:
            return None
        
        try:
            result = await db.fetchval(
                "SELECT id FROM users WHERE external_id = $1",
                external_id
            )
            return result
        except Exception:
            return None
    
    async def add_message(
        self,
        user_id: str,
        message: Dict[str, Any],
    ) -> None:
        """Add a message to chat history.
        
        Args:
            user_id: User's external ID (email)
            message: Message data including id, role, content, sources
        """
        db = await self._get_db()
        
        if db is not None:
            try:
                user_uuid = await self._get_user_uuid(user_id)
                
                if user_uuid:
                    sources = message.get("sources", [])
                    await db.execute(
                        """
                        INSERT INTO chat_messages (user_id, message_id, role, content, sources, created_at)
                        VALUES ($1, $2, $3, $4, $5, NOW())
                        """,
                        user_uuid,
                        message.get("id", ""),
                        message.get("role", "user"),
                        message.get("content", ""),
                        sources if sources else None,
                    )
                    return
            except Exception as e:
                print(f"Chat history add DB error: {e}")
        
        # Fallback to memory
        if user_id not in self._memory_fallback:
            self._memory_fallback[user_id] = []
        self._memory_fallback[user_id].append(message)
    
    async def get_history(
        self,
        user_id: str,
        limit: int = 100,
    ) -> list:
        """Get chat history for a user.
        
        Args:
            user_id: User's external ID (email)
            limit: Maximum messages to return
            
        Returns:
            List of messages
        """
        db = await self._get_db()
        
        if db is not None:
            try:
                user_uuid = await self._get_user_uuid(user_id)
                
                if user_uuid:
                    rows = await db.fetch(
                        """
                        SELECT message_id, role, content, sources, created_at
                        FROM chat_messages
                        WHERE user_id = $1
                        ORDER BY created_at ASC
                        LIMIT $2
                        """,
                        user_uuid,
                        limit,
                    )
                    
                    return [
                        {
                            "id": row["message_id"],
                            "role": row["role"],
                            "content": row["content"],
                            "sources": row["sources"] or [],
                            "timestamp": row["created_at"].isoformat() if row["created_at"] else None,
                        }
                        for row in rows
                    ]
            except Exception as e:
                print(f"Chat history get DB error: {e}")
        
        # Fallback to memory
        return self._memory_fallback.get(user_id, [])[-limit:]
    
    async def clear_history(self, user_id: str) -> None:
        """Clear chat history for a user.
        
        Args:
            user_id: User's external ID (email)
        """
        db = await self._get_db()
        
        if db is not None:
            try:
                user_uuid = await self._get_user_uuid(user_id)
                
                if user_uuid:
                    await db.execute(
                        "DELETE FROM chat_messages WHERE user_id = $1",
                        user_uuid,
                    )
            except Exception as e:
                print(f"Chat history clear DB error: {e}")
        
        # Also clear memory fallback
        self._memory_fallback.pop(user_id, None)


# Global instances
_session_store: Optional[SessionStore] = None
_chat_history_store: Optional[ChatHistoryStore] = None


def get_session_store() -> SessionStore:
    """Get the global session store instance."""
    global _session_store
    if _session_store is None:
        _session_store = SessionStore()
    return _session_store


def get_chat_history_store() -> ChatHistoryStore:
    """Get the global chat history store instance."""
    global _chat_history_store
    if _chat_history_store is None:
        _chat_history_store = ChatHistoryStore()
    return _chat_history_store


__all__ = [
    "SessionStore",
    "ChatHistoryStore",
    "get_session_store",
    "get_chat_history_store",
]
