"""
Credora API Server using FastAPI.

This module provides HTTP endpoints for the Next.js frontend including:
- User authentication via Google OAuth
- Session management
- Platform connections (Shopify, Meta Ads, Google Ads)
- Proxy to FPA Engine

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
"""

import os
import secrets
import base64
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Request, Response, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import uvicorn

from credora.mcp_servers.fastmcp.token_manager import get_token_manager, TokenData
from credora.security import TokenEncryption
from credora.config import get_or_create_encryption_key


# ============================================================================
# Configuration
# ============================================================================

# Google OAuth for user authentication
# Uses the same Google OAuth credentials but with a different redirect URI for user sign-in
GOOGLE_AUTH_CLIENT_ID = os.environ.get("GOOGLE_AUTH_CLIENT_ID", os.environ.get("GOOGLE_CLIENT_ID", ""))
GOOGLE_AUTH_CLIENT_SECRET = os.environ.get("GOOGLE_AUTH_CLIENT_SECRET", os.environ.get("GOOGLE_CLIENT_SECRET", ""))
GOOGLE_AUTH_REDIRECT_URI = os.environ.get("GOOGLE_AUTH_REDIRECT_URI", "http://localhost:3000/api/auth/callback")

# Session configuration
SESSION_SECRET = os.environ.get("SESSION_SECRET", secrets.token_urlsafe(32))
SESSION_EXPIRY_HOURS = 24 * 7  # 1 week

# In-memory session store (use Redis/DB in production)
_sessions: Dict[str, Dict[str, Any]] = {}

# In-memory user store (fallback, DB is primary)
_users: Dict[str, Dict[str, Any]] = {}

# Pending OAuth states
_pending_auth_states: Dict[str, Dict[str, Any]] = {}

# Database instance (lazy loaded)
_database = None


# ============================================================================
# Database Helper Functions
# ============================================================================

async def get_db():
    """Get database connection (lazy initialization)."""
    global _database
    if _database is None:
        try:
            from credora.database import Database
            _database = Database()
            await _database.connect()
            print("Database connected successfully")
        except Exception as e:
            print(f"Database connection failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    return _database


async def db_get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user from database by external_id (email)."""
    db = await get_db()
    if db is None:
        print(f"DB not available, checking in-memory for user: {user_id}")
        return _users.get(user_id)
    
    try:
        row = await db.fetchrow(
            "SELECT * FROM users WHERE external_id = $1 OR email = $1",
            user_id
        )
        if row:
            print(f"Found user in DB: {user_id}")
            return {
                "id": row["external_id"],
                "email": row["email"] or row["external_id"],
                "name": row["name"] or row["external_id"].split("@")[0],
                "picture": row.get("picture"),  # Include picture field
                "createdAt": row["created_at"].isoformat() if row["created_at"] else datetime.now().isoformat(),
                "onboardingComplete": True,  # TODO: Add to DB schema
            }
        else:
            print(f"User not found in DB: {user_id}")
    except Exception as e:
        print(f"DB get_user error for {user_id}: {e}")
    
    return _users.get(user_id)


async def db_get_user_uuid(external_id: str) -> Optional[str]:
    """Get the actual database UUID for a user from their external_id (email).
    
    This is needed because the Java engine expects the actual database UUID,
    not the external_id/email.
    """
    print(f"[db_get_user_uuid] Looking up UUID for external_id={external_id}")
    db = await get_db()
    if db is None:
        print(f"[db_get_user_uuid] DB not available")
        return None
    
    try:
        result = await db.fetchval(
            "SELECT id FROM users WHERE external_id = $1 OR email = $1",
            external_id
        )
        if result:
            print(f"[db_get_user_uuid] Found UUID: {result}")
        else:
            print(f"[db_get_user_uuid] No user found for {external_id}")
        return str(result) if result else None
    except Exception as e:
        print(f"[db_get_user_uuid] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


async def db_create_or_update_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update user in database."""
    db = await get_db()
    user_id = user_data["id"]
    email = user_data.get("email", user_id)
    
    # Always update in-memory store
    _users[user_id] = user_data
    print(f"User stored in memory: {user_id}")
    
    if db is None:
        print(f"DB not available, user only in memory: {user_id}")
        return user_data
    
    try:
        # Check if user exists first (by external_id OR email)
        existing = await db.fetchrow(
            "SELECT id, external_id FROM users WHERE external_id = $1 OR email = $2",
            user_id,
            email
        )
        
        if existing:
            # Update existing user - use the existing external_id
            existing_external_id = existing["external_id"]
            await db.execute(
                """
                UPDATE users SET
                    email = $2,
                    name = $3,
                    updated_at = NOW()
                WHERE external_id = $1
                """,
                existing_external_id,
                email,
                user_data.get("name", "")
            )
            print(f"Updated user in DB: {existing_external_id}")
            
            # Update in-memory store with correct external_id if different
            if existing_external_id != user_id:
                user_data["id"] = existing_external_id
                _users[existing_external_id] = user_data
                if user_id in _users:
                    del _users[user_id]
        else:
            # Insert new user
            await db.execute(
                """
                INSERT INTO users (external_id, email, name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                """,
                user_id,
                email,
                user_data.get("name", "")
            )
            print(f"Created user in DB: {user_id}")
    except Exception as e:
        print(f"DB create_user error for {user_id}: {e}")
        import traceback
        traceback.print_exc()
    
    return user_data


# ============================================================================
# Platform Connection Database Functions
# ============================================================================

async def db_save_platform_connection(
    user_id: str,
    platform: str,
    status: str = "connected",
    platform_account_id: str = None,
    platform_account_name: str = None,
    data_summary: dict = None
) -> bool:
    """Save or update platform connection state in database.
    
    Args:
        user_id: User's external_id (email)
        platform: Platform name ('shopify', 'meta', 'google')
        status: Connection status ('connected', 'disconnected', 'expired', 'error')
        platform_account_id: Platform-specific account ID
        platform_account_name: Human-readable account name
        data_summary: Summary of synced data
        
    Returns:
        True if saved successfully
    """
    db = await get_db()
    if db is None:
        print(f"DB not available, cannot save platform connection for {user_id}")
        return False
    
    try:
        # Get user UUID
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            print(f"User not found in DB: {user_id}")
            return False
        
        user_uuid = user_row["id"]
        
        # Upsert platform connection
        await db.execute(
            """
            INSERT INTO platform_connections (user_id, platform, status, platform_account_id, platform_account_name, data_summary, connected_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id, platform) DO UPDATE SET
                status = $3,
                platform_account_id = COALESCE($4, platform_connections.platform_account_id),
                platform_account_name = COALESCE($5, platform_connections.platform_account_name),
                data_summary = COALESCE($6, platform_connections.data_summary),
                updated_at = NOW()
            """,
            user_uuid,
            platform,
            status,
            platform_account_id,
            platform_account_name,
            json.dumps(data_summary) if data_summary else None
        )
        
        print(f"Platform connection saved: {user_id} -> {platform} ({status})")
        return True
        
    except Exception as e:
        print(f"Error saving platform connection: {e}")
        import traceback
        traceback.print_exc()
        return False


async def db_update_platform_sync_status(
    user_id: str,
    platform: str,
    sync_status: str,
    sync_error: str = None,
    data_summary: dict = None
) -> bool:
    """Update platform sync status after data sync.
    
    Args:
        user_id: User's external_id (email)
        platform: Platform name
        sync_status: 'success', 'failed', 'in_progress'
        sync_error: Error message if failed
        data_summary: Updated data summary
    """
    db = await get_db()
    if db is None:
        return False
    
    try:
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            return False
        
        await db.execute(
            """
            UPDATE platform_connections SET
                last_sync_at = NOW(),
                last_sync_status = $3,
                sync_error = $4,
                data_summary = COALESCE($5, data_summary),
                updated_at = NOW()
            WHERE user_id = $1 AND platform = $2
            """,
            user_row["id"],
            platform,
            sync_status,
            sync_error,
            json.dumps(data_summary) if data_summary else None
        )
        
        return True
        
    except Exception as e:
        print(f"Error updating sync status: {e}")
        return False


async def db_get_platform_connections(user_id: str) -> list:
    """Get all platform connections for a user.
    
    Args:
        user_id: User's external_id (email)
        
    Returns:
        List of platform connection dicts
    """
    db = await get_db()
    if db is None:
        return []
    
    try:
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            return []
        
        rows = await db.fetch(
            """
            SELECT platform, status, connected_at, last_sync_at, last_sync_status,
                   sync_error, platform_account_id, platform_account_name, data_summary
            FROM platform_connections
            WHERE user_id = $1
            ORDER BY platform
            """,
            user_row["id"]
        )
        
        return [
            {
                "platform": row["platform"],
                "status": row["status"],
                "connectedAt": row["connected_at"].isoformat() if row["connected_at"] else None,
                "lastSyncAt": row["last_sync_at"].isoformat() if row["last_sync_at"] else None,
                "lastSyncStatus": row["last_sync_status"],
                "syncError": row["sync_error"],
                "accountId": row["platform_account_id"],
                "accountName": row["platform_account_name"],
                "dataSummary": json.loads(row["data_summary"]) if row["data_summary"] else None,
            }
            for row in rows
        ]
        
    except Exception as e:
        print(f"Error getting platform connections: {e}")
        return []


async def db_disconnect_platform(user_id: str, platform: str) -> bool:
    """Mark a platform as disconnected.
    
    Args:
        user_id: User's external_id (email)
        platform: Platform name
        
    Returns:
        True if updated successfully
    """
    db = await get_db()
    if db is None:
        return False
    
    try:
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            return False
        
        await db.execute(
            """
            UPDATE platform_connections SET
                status = 'disconnected',
                updated_at = NOW()
            WHERE user_id = $1 AND platform = $2
            """,
            user_row["id"],
            platform
        )
        
        print(f"Platform disconnected: {user_id} -> {platform}")
        return True
        
    except Exception as e:
        print(f"Error disconnecting platform: {e}")
        return False


# ============================================================================
# Token Manager (FastMCP)
# ============================================================================

# OAuth state storage for CSRF protection
_oauth_states: Dict[str, Dict[str, Any]] = {}


def store_oauth_state(state: str, user_id: str, platform: str) -> None:
    """Store OAuth state for verification."""
    print(f"[OAuth] Storing state {state[:16]}... for user={user_id}, platform={platform}")
    _oauth_states[state] = {
        "user_id": user_id,
        "platform": platform,
        "created_at": datetime.now(),
    }
    print(f"[OAuth] Total pending states: {len(_oauth_states)}")


def verify_oauth_state(state: str) -> Optional[str]:
    """Verify OAuth state and return user_id if valid."""
    print(f"[OAuth] Verifying state {state[:16]}... (pending states: {len(_oauth_states)})")
    state_data = _oauth_states.pop(state, None)
    if not state_data:
        print(f"[OAuth] State NOT found in pending states!")
        return None
    # Check expiry (10 minutes)
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        print(f"[OAuth] State expired!")
        return None
    user_id = state_data.get("user_id")
    print(f"[OAuth] State verified for user: {user_id}")
    return user_id


# ============================================================================
# Pydantic Models
# ============================================================================

class User(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    createdAt: str
    onboardingComplete: bool = False


class AuthResponse(BaseModel):
    token: str
    user: User


class OAuthRedirect(BaseModel):
    redirectUrl: str


class PlatformStatus(BaseModel):
    platform: str
    status: str  # connected, pending, failed, not_connected
    lastSync: Optional[str] = None
    error: Optional[str] = None


class MessageRequest(BaseModel):
    message: str


# ============================================================================
# Session Management
# ============================================================================

def create_session(user_id: str) -> str:
    """Create a new session for a user."""
    session_token = secrets.token_urlsafe(32)
    _sessions[session_token] = {
        "user_id": user_id,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS),
    }
    return session_token


def get_session_user(token: str) -> Optional[str]:
    """Get user_id from session token."""
    if not token:
        return None
    
    session = _sessions.get(token)
    if not session:
        return None
    
    if datetime.now() > session["expires_at"]:
        del _sessions[token]
        return None
    
    return session["user_id"]


def delete_session(token: str) -> bool:
    """Delete a session."""
    if token in _sessions:
        del _sessions[token]
        return True
    return False


def get_current_user(request: Request) -> Optional[User]:
    """Get current user from request (sync version - uses in-memory cache)."""
    # Try Authorization header first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        # Try cookie
        token = request.cookies.get("session_token", "")
    
    user_id = get_session_user(token)
    if not user_id:
        return None
    
    # Check in-memory cache first
    user_data = _users.get(user_id)
    if not user_data:
        return None
    
    return User(**user_data)


async def get_current_user_async(request: Request) -> Optional[User]:
    """Get current user from request (async version - checks DB)."""
    # Try Authorization header first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        # Try cookie
        token = request.cookies.get("session_token", "")
    
    user_id = get_session_user(token)
    if not user_id:
        return None
    
    # Check in-memory cache first
    user_data = _users.get(user_id)
    if not user_data:
        # Try database
        user_data = await db_get_user(user_id)
        if user_data:
            _users[user_id] = user_data
    
    if not user_data:
        return None
    
    return User(**user_data)


def require_auth(request: Request) -> User:
    """Require authentication, raise 401 if not authenticated."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ============================================================================
# FastAPI App
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("Credora API server starting...")
    yield
    print("Credora API server shutting down...")


app = FastAPI(
    title="Credora API Server",
    description="Backend API for Credora CFO Agent",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded profile pictures
import pathlib
uploads_dir = pathlib.Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ============================================================================
# Health Check
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Credora API Server"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/debug/db")
async def debug_db():
    """Debug endpoint to test database connection."""
    db = await get_db()
    if db is None:
        return {"status": "error", "message": "Database not connected"}
    
    try:
        # Test query
        result = await db.fetchval("SELECT 1")
        
        # Count users
        user_count = await db.fetchval("SELECT COUNT(*) FROM users")
        
        # Get recent users with their UUIDs
        users = await db.fetch("SELECT id, external_id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5")
        
        # Count tokens
        token_count = await db.fetchval("SELECT COUNT(*) FROM tokens")
        
        # Get tokens info
        tokens = await db.fetch("""
            SELECT t.user_id, t.platform, t.expires_at, u.email 
            FROM tokens t 
            LEFT JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC LIMIT 5
        """)
        
        return {
            "status": "connected",
            "test_query": result,
            "user_count": user_count,
            "recent_users": [
                {
                    "uuid": str(u["id"]),
                    "external_id": u["external_id"],
                    "email": u["email"],
                    "name": u["name"],
                }
                for u in users
            ],
            "token_count": token_count,
            "tokens": [
                {
                    "user_id": str(t["user_id"]),
                    "platform": t["platform"],
                    "email": t["email"],
                    "expires_at": t["expires_at"].isoformat() if t["expires_at"] else None,
                }
                for t in tokens
            ],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


# ============================================================================
# Google OAuth Authentication (User Sign-In)
# ============================================================================

@app.get("/auth/google/login")
async def google_login():
    """Initiate Google OAuth login flow for user authentication."""
    if not GOOGLE_AUTH_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured. Set GOOGLE_AUTH_CLIENT_ID environment variable."
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _pending_auth_states[state] = {
        "created_at": datetime.now(),
        "type": "user_auth",
    }
    
    # Build Google OAuth URL for user authentication
    params = {
        "client_id": GOOGLE_AUTH_CLIENT_ID,
        "redirect_uri": GOOGLE_AUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    
    from urllib.parse import urlencode
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    return {"redirectUrl": auth_url}


@app.post("/auth/google/callback")
async def google_callback(request: Request):
    """Handle Google OAuth callback and create session."""
    body = await request.json()
    code = body.get("code")
    state = body.get("state")
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_AUTH_CLIENT_ID,
                    "client_secret": GOOGLE_AUTH_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_AUTH_REDIRECT_URI,
                },
            )
            token_response.raise_for_status()
            tokens = token_response.json()
            
            # Get user info
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()
            
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")
    
    # Create or update user - email is the user_id (Credora ID)
    user_id = userinfo["email"]
    now = datetime.now().isoformat()
    
    print(f"Processing login for user: {user_id}")
    
    # Check if user exists (in memory first, then DB)
    existing_user = await db_get_user(user_id)
    
    if existing_user is None:
        # New user - create in DB
        print(f"Creating new user: {user_id}")
        user_data = {
            "id": user_id,
            "email": userinfo["email"],
            "name": userinfo.get("name", userinfo["email"]),
            "picture": userinfo.get("picture"),
            "createdAt": now,
            "onboardingComplete": False,
        }
        await db_create_or_update_user(user_data)
    else:
        # Existing user - update info
        print(f"Updating existing user: {user_id}")
        user_data = existing_user.copy()
        user_data["name"] = userinfo.get("name", existing_user.get("name", ""))
        user_data["picture"] = userinfo.get("picture")
        await db_create_or_update_user(user_data)
    
    # Ensure user is in memory store
    _users[user_id] = user_data
    
    # Create session
    session_token = create_session(user_id)
    
    print(f"Login successful for user: {user_id}")
    
    return {
        "token": session_token,
        "user": _users[user_id],
    }


@app.get("/auth/session")
async def get_session(request: Request):
    """Get current user session."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post("/auth/logout")
async def logout(request: Request):
    """Logout and clear session."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        delete_session(token)
    
    token = request.cookies.get("session_token", "")
    if token:
        delete_session(token)
    
    return {"success": True}


# ============================================================================
# Platform Connections (Shopify, Meta Ads, Google Ads)
# ============================================================================

@app.get("/platforms/status")
async def get_platforms_status(request: Request):
    """Get connection status for all platforms.
    
    Checks both the FastMCP token manager and the database
    for platform connection state.
    """
    user = require_auth(request)
    token_manager = get_token_manager()
    
    platforms = ["shopify", "meta", "google"]
    statuses = []
    
    # First, get platform connections from database
    db_connections = await db_get_platform_connections(user.id)
    db_connection_map = {c["platform"]: c for c in db_connections}
    
    for platform in platforms:
        try:
            # Check database first for connection state
            db_conn = db_connection_map.get(platform)
            
            if db_conn and db_conn.get("status") == "connected":
                statuses.append({
                    "platform": platform,
                    "status": "connected",
                    "lastSync": db_conn.get("lastSyncAt"),
                    "accountName": db_conn.get("accountName"),
                    "error": db_conn.get("syncError"),
                })
            else:
                # Fallback to token manager (for OAuth token state)
                token_data = await token_manager.get_token(user.id, platform, auto_refresh=False)
                
                if token_data:
                    statuses.append({
                        "platform": platform,
                        "status": "connected" if not token_data.is_expired() else "expired",
                        "lastSync": None,
                        "error": None,
                    })
                else:
                    statuses.append({
                        "platform": platform,
                        "status": "not_connected",
                        "lastSync": None,
                        "error": None,
                    })
        except Exception as e:
            statuses.append({
                "platform": platform,
                "status": "not_connected",
                "lastSync": None,
                "error": str(e),
            })
    
    return statuses


@app.get("/platforms/{platform}/oauth")
async def initiate_platform_oauth(platform: str, request: Request):
    """Initiate OAuth flow for a platform connection.
    
    Generates OAuth URL and stores state for CSRF protection.
    The actual OAuth is handled by FastMCP servers on ports 8001-8003.
    """
    user = require_auth(request)
    
    # Validate platform
    if platform not in ["shopify", "meta", "google"]:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    store_oauth_state(state, user.id, platform)
    
    # Get OAuth configuration from environment
    if platform == "google":
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/callback/google")
        scopes = "https://www.googleapis.com/auth/adwords"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scopes}&"
            f"state={state}&"
            f"response_type=code&"
            f"access_type=offline&"
            f"prompt=consent"
        )
    elif platform == "meta":
        client_id = os.environ.get("META_CLIENT_ID", os.environ.get("META_APP_ID", ""))
        redirect_uri = os.environ.get("META_REDIRECT_URI", "http://localhost:8000/oauth/callback/meta")
        scopes = "ads_read,ads_management,business_management"
        auth_url = (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scopes}&"
            f"state={state}&"
            f"response_type=code"
        )
    elif platform == "shopify":
        shop = request.query_params.get("shop")
        if not shop:
            raise HTTPException(status_code=400, detail="Shop parameter required for Shopify OAuth")
        client_id = os.environ.get("SHOPIFY_CLIENT_ID", os.environ.get("SHOPIFY_API_KEY", ""))
        redirect_uri = os.environ.get("SHOPIFY_REDIRECT_URI", "http://localhost:8000/oauth/callback/shopify")
        scopes = "read_orders,read_products,read_customers,read_inventory,read_analytics"
        auth_url = (
            f"https://{shop}/admin/oauth/authorize?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scopes}&"
            f"state={state}"
        )
    else:
        raise HTTPException(status_code=400, detail=f"OAuth not configured for platform: {platform}")
    
    if not client_id:
        raise HTTPException(status_code=500, detail=f"{platform.upper()} OAuth not configured")
    
    return {"redirectUrl": auth_url}


@app.delete("/platforms/{platform}")
async def disconnect_platform(platform: str, request: Request):
    """Disconnect a platform."""
    user = require_auth(request)
    token_manager = get_token_manager()
    
    try:
        # Delete token from FastMCP token manager
        await token_manager.delete_token(user.id, platform)
        
        # Update database status
        await db_disconnect_platform(user.id, platform)
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# OAuth Callbacks (for platform connections)
# ============================================================================

def get_success_html(platform: str) -> str:
    """Generate success HTML page."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Connection Successful - Credora</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
        }}
        .success-icon {{ font-size: 64px; margin-bottom: 20px; }}
        h1 {{ color: #333; margin-bottom: 10px; }}
        p {{ color: #666; line-height: 1.6; }}
        .platform {{ color: #667eea; font-weight: bold; }}
        .btn {{
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Connection Successful!</h1>
        <p>Your <span class="platform">{platform}</span> account has been connected to Credora.</p>
        <a href="http://localhost:3000/onboarding" class="btn">Return to Credora</a>
    </div>
</body>
</html>
"""


def get_error_html(error: str) -> str:
    """Generate error HTML page."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Connection Failed - Credora</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
        }}
        .error-icon {{ font-size: 64px; margin-bottom: 20px; }}
        h1 {{ color: #333; margin-bottom: 10px; }}
        p {{ color: #666; line-height: 1.6; }}
        .error-msg {{
            background: #fff5f5;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            padding: 12px;
            margin-top: 20px;
            color: #c53030;
            font-size: 14px;
        }}
        .btn {{
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Connection Failed</h1>
        <p>We couldn't connect your account. Please try again.</p>
        <div class="error-msg">{error}</div>
        <a href="http://localhost:3000/onboarding" class="btn">Return to Credora</a>
    </div>
</body>
</html>
"""


@app.get("/oauth/callback/meta")
async def meta_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """Handle Meta OAuth callback."""
    if error:
        return HTMLResponse(content=get_error_html(error_description or error), status_code=400)
    
    if not code or not state:
        return HTMLResponse(content=get_error_html("Missing authorization code or state"), status_code=400)
    
    try:
        # Verify state and get user_id
        state_data = _oauth_states.pop(state, None)
        if not state_data:
            user_id = "default_user"
            print(f"Warning: State verification failed, using default user_id: {user_id}")
        else:
            user_id = state_data.get("user_id", "default_user")
        
        redirect_uri = os.environ.get("META_REDIRECT_URI", "http://localhost:8000/oauth/callback/meta")
        client_id = os.environ.get("META_CLIENT_ID", os.environ.get("META_APP_ID", ""))
        client_secret = os.environ.get("META_CLIENT_SECRET", os.environ.get("META_APP_SECRET", ""))
        
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.facebook.com/v21.0/oauth/access_token",
                params={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                }
            )
            
            if response.status_code != 200:
                return HTMLResponse(content=get_error_html(f"Token exchange failed: {response.text}"), status_code=400)
            
            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                return HTMLResponse(content=get_error_html("No access token in response"), status_code=400)
            
            # Store token using FastMCP token manager
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="meta",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=access_token,  # Meta uses same token for refresh
                    expires_at=datetime.now() + timedelta(seconds=expires_in),
                )
            )
        
        # Save platform connection to database
        await db_save_platform_connection(
            user_id=user_id,
            platform="meta",
            status="connected",
            platform_account_name="Meta Ads Account"
        )
        
        return HTMLResponse(content=get_success_html("Meta Ads"))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(content=get_error_html(str(e)), status_code=500)


@app.get("/oauth/callback/google")
async def google_ads_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """Handle Google Ads OAuth callback."""
    print(f"🔐 [GOOGLE] OAuth callback received on API server")
    print(f"🔐 [GOOGLE] State: {state[:16] if state else 'None'}...")
    print(f"🔐 [GOOGLE] Pending states count: {len(_oauth_states)}")
    
    if error:
        print(f"❌ [GOOGLE] OAuth error: {error}")
        return HTMLResponse(content=get_error_html(f"Google authorization failed: {error}"), status_code=400)
    
    if not code or not state:
        print(f"❌ [GOOGLE] Missing code or state")
        return HTMLResponse(content=get_error_html("Missing authorization code or state"), status_code=400)
    
    try:
        # Verify state and get user_id
        state_data = _oauth_states.pop(state, None)
        if not state_data:
            print(f"⚠️ [GOOGLE] State not found in pending states - using default user")
            user_id = "default_user"
        else:
            user_id = state_data.get("user_id", "default_user")
            print(f"✅ [GOOGLE] State verified for user: {user_id}")
        
        redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/callback/google")
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
        
        print(f"🔄 [GOOGLE] Exchanging code for token...")
        
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                    "grant_type": "authorization_code",
                }
            )
            
            if response.status_code != 200:
                print(f"❌ [GOOGLE] Token exchange failed: {response.status_code}")
                return HTMLResponse(content=get_error_html(f"Token exchange failed: {response.text}"), status_code=400)
            
            data = response.json()
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                print(f"❌ [GOOGLE] No access token in response")
                return HTMLResponse(content=get_error_html("No access token in response"), status_code=400)
            
            # Store token using FastMCP token manager
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="google",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_at=datetime.now() + timedelta(seconds=expires_in),
                )
            )
        
        # Save platform connection to database
        await db_save_platform_connection(
            user_id=user_id,
            platform="google",
            status="connected",
            platform_account_name="Google Ads Account"
        )
        
        print(f"✅ [GOOGLE] Successfully connected for user: {user_id}")
        return HTMLResponse(content=get_success_html("Google Ads"))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ [GOOGLE] OAuth error: {str(e)}")
        return HTMLResponse(content=get_error_html(str(e)), status_code=500)


@app.get("/oauth/callback/shopify")
async def shopify_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    shop: Optional[str] = Query(None),
    hmac: Optional[str] = Query(None),
):
    """Handle Shopify OAuth callback."""
    if not code or not state or not shop:
        return HTMLResponse(content=get_error_html("Missing required parameters"), status_code=400)
    
    try:
        # Verify state and get user_id
        state_data = _oauth_states.pop(state, None)
        if not state_data:
            user_id = "default_user"
            print(f"Warning: State verification failed, using default user_id: {user_id}")
        else:
            user_id = state_data.get("user_id", "default_user")
        
        redirect_uri = os.environ.get("SHOPIFY_REDIRECT_URI", "http://localhost:8000/oauth/callback/shopify")
        client_id = os.environ.get("SHOPIFY_CLIENT_ID", os.environ.get("SHOPIFY_API_KEY", ""))
        client_secret = os.environ.get("SHOPIFY_CLIENT_SECRET", os.environ.get("SHOPIFY_API_SECRET", ""))
        
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{shop}/admin/oauth/access_token",
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                }
            )
            
            if response.status_code != 200:
                return HTMLResponse(content=get_error_html(f"Token exchange failed: {response.text}"), status_code=400)
            
            data = response.json()
            access_token = data.get("access_token")
            
            if not access_token:
                return HTMLResponse(content=get_error_html("No access token in response"), status_code=400)
            
            # Store token using FastMCP token manager
            # Shopify tokens don't expire
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="shopify",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=None,  # Shopify tokens don't refresh
                    expires_at=None,  # Shopify tokens don't expire
                    metadata={"shop_domain": shop},
                )
            )
        
        # Save platform connection to database
        await db_save_platform_connection(
            user_id=user_id,
            platform="shopify",
            status="connected",
            platform_account_id=shop,
            platform_account_name=shop
        )
        
        return HTMLResponse(content=get_success_html("Shopify"))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(content=get_error_html(str(e)), status_code=500)


# ============================================================================
# User Settings
# ============================================================================

@app.post("/user/onboarding-complete")
async def mark_onboarding_complete(request: Request):
    """Mark user onboarding as complete."""
    user = require_auth(request)
    
    if user.id in _users:
        _users[user.id]["onboardingComplete"] = True
    
    return {"success": True}


@app.post("/user/profile-picture")
async def upload_profile_picture(
    request: Request,
    profile_picture: UploadFile = File(...)
):
    """Upload and save user profile picture.
    
    Accepts an image file, validates it, saves it to disk, and updates the user record.
    """
    user = require_auth(request)
    
    # Validate file type
    if not profile_picture.content_type or not profile_picture.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 5MB)
    contents = await profile_picture.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
    
    try:
        # Create uploads directory if it doesn't exist
        import pathlib
        uploads_dir = pathlib.Path("uploads/profile-pictures")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        import uuid
        file_extension = profile_picture.filename.split('.')[-1] if '.' in profile_picture.filename else 'jpg'
        unique_filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Generate URL for the file (relative to API server)
        picture_url = f"/uploads/profile-pictures/{unique_filename}"
        
        # Update user in memory
        if user.id in _users:
            _users[user.id]["picture"] = picture_url
        
        # Update user in database
        db = await get_db()
        if db:
            try:
                await db.execute(
                    """
                    UPDATE users SET picture = $2, updated_at = NOW()
                    WHERE external_id = $1
                    """,
                    user.id,
                    picture_url
                )
                print(f"Profile picture updated in DB for user: {user.id}")
            except Exception as e:
                print(f"Failed to update profile picture in DB: {e}")
        
        return {
            "success": True,
            "picture": picture_url,
            "user": _users.get(user.id)
        }
        
    except Exception as e:
        print(f"Profile picture upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")


# ============================================================================
# Data Sync Endpoints - Platform Data Ingestion
# ============================================================================

# NOTE: /sync/all MUST be defined BEFORE /sync/{platform} to avoid route conflict
@app.post("/sync/all")
async def sync_all_platforms_data(request: Request):
    """Sync data from all connected platforms.
    
    Fetches and stores data from all platforms the user has connected.
    """
    user = require_auth(request)
    
    try:
        from credora.services.data_sync import sync_all_platforms as do_sync_all
        result = await do_sync_all(user.id)
        return result
    except Exception as e:
        print(f"Sync all error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sync/{platform}")
async def sync_platform_data(platform: str, request: Request):
    """Sync data from a connected platform.
    
    Fetches raw data from the platform, normalizes it, and stores in the database.
    This should be called after a successful OAuth connection or periodically to refresh data.
    """
    user = require_auth(request)
    
    if platform not in ["shopify", "meta", "google"]:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    try:
        from credora.services.data_sync import sync_platform as do_sync
        result = await do_sync(user.id, platform)
        return result
    except Exception as e:
        print(f"Sync error for {platform}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sync/status")
async def get_sync_status(request: Request):
    """Get the sync status for all platforms.
    
    Returns last sync time and data counts for each platform.
    """
    user = require_auth(request)
    
    try:
        db = await get_db()
        if db is None:
            return {"error": "Database not available"}
        
        # Get user UUID
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user.id
        )
        
        if not user_row:
            return {"platforms": []}
        
        user_uuid = user_row["id"]
        
        # Get counts per platform
        transactions = await db.fetch(
            """
            SELECT platform, COUNT(*) as count, MAX(created_at) as last_sync
            FROM transactions
            WHERE user_id = $1
            GROUP BY platform
            """,
            user_uuid
        )
        
        products = await db.fetchval(
            "SELECT COUNT(*) FROM products WHERE user_id = $1",
            user_uuid
        )
        
        campaigns = await db.fetch(
            """
            SELECT platform, COUNT(*) as count, MAX(updated_at) as last_sync
            FROM campaigns
            WHERE user_id = $1
            GROUP BY platform
            """,
            user_uuid
        )
        
        return {
            "transactions_by_platform": [dict(t) for t in transactions] if transactions else [],
            "total_products": products or 0,
            "campaigns_by_platform": [dict(c) for c in campaigns] if campaigns else [],
        }
    except Exception as e:
        print(f"Sync status error: {e}")
        return {"error": str(e)}


# ============================================================================
# FPA Engine Proxy Endpoints
# ============================================================================

# Java FPA Engine URL
JAVA_ENGINE_HOST = os.environ.get("JAVA_ENGINE_HOST", "http://localhost")
JAVA_ENGINE_PORT = os.environ.get("JAVA_ENGINE_PORT", "8081")
JAVA_ENGINE_URL = os.environ.get("JAVA_ENGINE_URL", f"{JAVA_ENGINE_HOST}:{JAVA_ENGINE_PORT}")


@app.get("/fpa/dashboard")
async def get_dashboard_kpis(request: Request):
    """Get dashboard KPIs - aggregates data from multiple sources."""
    user = require_auth(request)
    
    # Get the actual database UUID for the user
    user_uuid = await db_get_user_uuid(user.id)
    print(f"[Dashboard] user.id={user.id}, resolved user_uuid={user_uuid}")
    if not user_uuid:
        user_uuid = user.id  # Fallback to external_id if not found
        print(f"[Dashboard] WARNING - Could not resolve user UUID, using fallback")
    
    # First check if user has any connected platforms using FastMCP token manager
    token_manager = get_token_manager()
    try:
        connected_platforms = await token_manager.list_platforms(user.id)
        has_connections = len(connected_platforms) > 0
    except Exception:
        has_connections = False
    
    # If no platforms connected, return zeros
    if not has_connections:
        return {
            "revenue": 0,
            "netProfit": 0,
            "cashRunway": 0,
            "topSku": None,
            "worstCampaign": None,
            "hasConnectedPlatforms": False,
        }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try to get P&L data for revenue and profit
            from datetime import date, timedelta
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            
            pnl_response = await client.post(
                f"{JAVA_ENGINE_URL}/api/pnl/calculate",
                json={
                    "userId": user_uuid,
                    "startDate": start_date.isoformat(),
                    "endDate": end_date.isoformat(),
                },
            )
            
            # Get forecast for runway
            forecast_response = await client.post(
                f"{JAVA_ENGINE_URL}/api/forecast/cash",
                json={
                    "userId": user_uuid,
                    "daysAhead": 90,
                    "currentCash": 50000.0,
                },
            )
            
            # Get SKU analysis for top SKU
            sku_response = await client.get(
                f"{JAVA_ENGINE_URL}/api/sku/analyze/all",
                params={"userId": user_uuid},
            )
            
            # Get campaigns for worst campaign
            campaign_response = await client.get(
                f"{JAVA_ENGINE_URL}/api/campaigns/ranked",
                params={"user_id": user_uuid, "top": 1, "bottom": 1, "gross_margin": 0.30},
            )
            
            # Aggregate the data
            pnl_data = pnl_response.json() if pnl_response.status_code == 200 else {}
            forecast_data = forecast_response.json() if forecast_response.status_code == 200 else {}
            sku_data = sku_response.json() if sku_response.status_code == 200 else {}
            campaign_data = campaign_response.json() if campaign_response.status_code == 200 else {}
            
            # Find top SKU by profit
            top_sku = None
            if sku_data.get("skuResults"):
                sorted_skus = sorted(sku_data["skuResults"], key=lambda x: x.get("totalProfit", 0), reverse=True)
                if sorted_skus:
                    top = sorted_skus[0]
                    top_sku = {
                        "id": top.get("skuId", ""),
                        "name": top.get("skuName", "Unknown"),
                        "profit": top.get("totalProfit", 0),
                    }
            
            # Find worst campaign by ROAS
            worst_campaign = None
            if campaign_data.get("bottomCampaigns"):
                bottom = campaign_data["bottomCampaigns"][0]
                worst_campaign = {
                    "id": bottom.get("campaignId", ""),
                    "name": bottom.get("campaignName", "Unknown"),
                    "roas": bottom.get("effectiveRoas", 0),
                }
            
            return {
                "revenue": pnl_data.get("netRevenue", 0),
                "netProfit": pnl_data.get("netProfit", 0),
                "cashRunway": forecast_data.get("runwayDays", 0),
                "topSku": top_sku,
                "worstCampaign": worst_campaign,
                "hasConnectedPlatforms": True,
            }
    except httpx.ConnectError:
        # Return zeros if Java engine is not available and no mock data
        return {
            "revenue": 0,
            "netProfit": 0,
            "cashRunway": 0,
            "topSku": None,
            "worstCampaign": None,
            "hasConnectedPlatforms": has_connections,
        }
    except Exception as e:
        # Return zeros on any error
        print(f"Dashboard error: {e}")
        return {
            "revenue": 0,
            "netProfit": 0,
            "cashRunway": 0,
            "topSku": None,
            "worstCampaign": None,
            "hasConnectedPlatforms": has_connections,
        }


@app.get("/fpa/pnl")
async def get_pnl(
    request: Request,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    force_refresh: bool = Query(False, description="Force fresh computation"),
):
    """Get P&L statement - uses database cache, falls back to Java FPA Engine."""
    user = require_auth(request)
    
    try:
        from datetime import date as date_type
        from credora.services.fpa_cache import get_cached_pnl
        
        # Parse dates
        start = date_type.fromisoformat(start_date)
        end = date_type.fromisoformat(end_date)
        
        # Get from cache (or compute if stale/missing)
        result = await get_cached_pnl(user.id, start, end, force_refresh)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        print(f"P&L error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to mock data
        return {
            "userId": user.id,
            "startDate": start_date,
            "endDate": end_date,
            "revenue": 125000.00,
            "refunds": 2500.00,
            "netRevenue": 122500.00,
            "cogs": 48000.00,
            "grossProfit": 74500.00,
            "adSpend": 35000.00,
            "otherExpenses": 12000.00,
            "operatingCosts": 47000.00,
            "netProfit": 27500.00,
            "grossMargin": 60.82,
            "netMargin": 22.45,
            "cached": False,
            "error": str(e),
        }


@app.get("/fpa/forecast")
async def get_forecast(
    request: Request,
    days: int = Query(30, description="Forecast period in days"),
    force_refresh: bool = Query(False, description="Force fresh computation"),
):
    """Get cash flow forecast - uses database cache, falls back to Java FPA Engine."""
    user = require_auth(request)
    
    try:
        from credora.services.fpa_cache import get_cached_forecast
        
        # Get from cache (or compute if stale/missing)
        result = await get_cached_forecast(user.id, days, force_refresh)
        return result
        
    except Exception as e:
        print(f"Forecast error: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to mock data
        from datetime import date, timedelta
        
        base_date = date.today()
        forecast_points = []
        current_cash = 50000.0
        
        for i in range(days):
            forecast_date = base_date + timedelta(days=i)
            low = current_cash - (i * 800)
            mid = current_cash - (i * 500)
            high = current_cash - (i * 200)
            forecast_points.append({
                "date": forecast_date.isoformat(),
                "low": max(0, low),
                "mid": max(0, mid),
                "high": max(0, high),
            })
        
        return {
            "currentCash": current_cash,
            "burnRate": 1500.00,
            "runwayDays": 45,
            "lowScenario": max(0, current_cash - (days * 800)),
            "midScenario": max(0, current_cash - (days * 500)),
            "highScenario": max(0, current_cash - (days * 200)),
            "forecastPoints": forecast_points,
            "cached": False,
            "error": str(e),
        }


@app.get("/fpa/sku-analysis")
async def get_sku_analysis(request: Request):
    """Get SKU unit economics - proxies to Java FPA Engine."""
    user = require_auth(request)
    
    # Get the actual database UUID for the user
    user_uuid = await db_get_user_uuid(user.id)
    if not user_uuid:
        user_uuid = user.id  # Fallback to external_id if not found
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{JAVA_ENGINE_URL}/api/sku/analyze/all",
                params={"userId": user_uuid},
            )
            response.raise_for_status()
            data = response.json()
            
            # Transform Java response to frontend format
            sku_results = data.get("skuResults", [])
            return [
                {
                    "skuId": sku.get("skuId", ""),
                    "name": sku.get("skuName", "Unknown"),
                    "profitPerUnit": sku.get("profitPerUnit", 0),
                    "cac": sku.get("customerAcquisitionCost", 0),
                    "refundRate": sku.get("refundRate", 0) * 100,  # Convert to percentage
                    "trueRoas": sku.get("trueRoas", 0),
                    "inventoryDays": sku.get("inventoryDays", 0),
                    "totalRevenue": sku.get("totalRevenue", 0),
                    "totalProfit": sku.get("totalProfit", 0),
                }
                for sku in sku_results
            ]
    except httpx.ConnectError:
        # Return mock data if Java engine is not available
        return [
            {
                "skuId": "SKU-001",
                "name": "Premium Widget",
                "profitPerUnit": 25.50,
                "cac": 12.00,
                "refundRate": 2.5,
                "trueRoas": 3.2,
                "inventoryDays": 15,
                "totalRevenue": 45000.00,
                "totalProfit": 12750.00,
            },
            {
                "skuId": "SKU-002",
                "name": "Standard Widget",
                "profitPerUnit": 15.00,
                "cac": 8.00,
                "refundRate": 3.0,
                "trueRoas": 2.8,
                "inventoryDays": 22,
                "totalRevenue": 32000.00,
                "totalProfit": 8000.00,
            },
            {
                "skuId": "SKU-003",
                "name": "Budget Widget",
                "profitPerUnit": 8.00,
                "cac": 5.00,
                "refundRate": 5.0,
                "trueRoas": 2.1,
                "inventoryDays": 30,
                "totalRevenue": 18000.00,
                "totalProfit": 3600.00,
            },
        ]
    except Exception as e:
        print(f"SKU analysis error: {e}")
        return [
            {
                "skuId": "SKU-001",
                "name": "Premium Widget",
                "profitPerUnit": 25.50,
                "cac": 12.00,
                "refundRate": 2.5,
                "trueRoas": 3.2,
                "inventoryDays": 15,
                "totalRevenue": 45000.00,
                "totalProfit": 12750.00,
            },
            {
                "skuId": "SKU-002",
                "name": "Standard Widget",
                "profitPerUnit": 15.00,
                "cac": 8.00,
                "refundRate": 3.0,
                "trueRoas": 2.8,
                "inventoryDays": 22,
                "totalRevenue": 32000.00,
                "totalProfit": 8000.00,
            },
            {
                "skuId": "SKU-003",
                "name": "Budget Widget",
                "profitPerUnit": 8.00,
                "cac": 5.00,
                "refundRate": 5.0,
                "trueRoas": 2.1,
                "inventoryDays": 30,
                "totalRevenue": 18000.00,
                "totalProfit": 3600.00,
            },
        ]


@app.get("/fpa/campaigns")
async def get_campaigns(
    request: Request,
    top: int = Query(5, description="Number of top performers"),
    bottom: int = Query(5, description="Number of bottom performers"),
):
    """Get ranked campaigns - proxies to Java FPA Engine."""
    user = require_auth(request)
    
    # Get the actual database UUID for the user
    user_uuid = await db_get_user_uuid(user.id)
    if not user_uuid:
        user_uuid = user.id  # Fallback to external_id if not found
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{JAVA_ENGINE_URL}/api/campaigns/ranked",
                params={"user_id": user_uuid, "top": top, "bottom": bottom, "gross_margin": 0.30},
            )
            response.raise_for_status()
            data = response.json()
            
            # Transform Java response to frontend format
            def transform_campaign(c):
                return {
                    "id": c.get("campaignId", ""),
                    "name": c.get("campaignName", "Unknown"),
                    "platform": c.get("platform", "unknown").lower(),
                    "spend": c.get("adSpend", 0),
                    "revenue": c.get("attributedRevenue", 0),
                    "conversions": c.get("conversions", 0),
                    "effectiveRoas": c.get("effectiveRoas", 0),
                    "dataQuality": c.get("dataQuality", "medium").lower(),
                }
            
            return {
                "topCampaigns": [transform_campaign(c) for c in data.get("topCampaigns", [])],
                "bottomCampaigns": [transform_campaign(c) for c in data.get("bottomCampaigns", [])],
                "totalSpend": data.get("totalSpend", 0),
                "totalRevenue": data.get("totalRevenue", 0),
                "overallRoas": data.get("overallRoas", 0),
            }
    except httpx.ConnectError:
        # Return mock data if Java engine is not available
        return {
            "topCampaigns": [
                {
                    "id": "CAMP-001",
                    "name": "Black Friday 2024",
                    "platform": "meta",
                    "spend": 5000.00,
                    "revenue": 25000.00,
                    "conversions": 150,
                    "effectiveRoas": 5.0,
                    "dataQuality": "high",
                },
                {
                    "id": "CAMP-002",
                    "name": "Holiday Special",
                    "platform": "google",
                    "spend": 3500.00,
                    "revenue": 14000.00,
                    "conversions": 95,
                    "effectiveRoas": 4.0,
                    "dataQuality": "high",
                },
            ],
            "bottomCampaigns": [
                {
                    "id": "CAMP-003",
                    "name": "Summer Sale 2024",
                    "platform": "meta",
                    "spend": 2500.00,
                    "revenue": 2000.00,
                    "conversions": 12,
                    "effectiveRoas": 0.8,
                    "dataQuality": "medium",
                },
                {
                    "id": "CAMP-004",
                    "name": "Brand Awareness",
                    "platform": "google",
                    "spend": 1800.00,
                    "revenue": 1620.00,
                    "conversions": 8,
                    "effectiveRoas": 0.9,
                    "dataQuality": "low",
                },
            ],
            "totalSpend": 35000.00,
            "totalRevenue": 125000.00,
            "overallRoas": 3.57,
        }
    except Exception as e:
        print(f"Campaigns error: {e}")
        return {
            "topCampaigns": [
                {
                    "id": "CAMP-001",
                    "name": "Black Friday 2024",
                    "platform": "meta",
                    "spend": 5000.00,
                    "revenue": 25000.00,
                    "conversions": 150,
                    "effectiveRoas": 5.0,
                    "dataQuality": "high",
                },
                {
                    "id": "CAMP-002",
                    "name": "Holiday Special",
                    "platform": "google",
                    "spend": 3500.00,
                    "revenue": 14000.00,
                    "conversions": 95,
                    "effectiveRoas": 4.0,
                    "dataQuality": "high",
                },
            ],
            "bottomCampaigns": [
                {
                    "id": "CAMP-003",
                    "name": "Summer Sale 2024",
                    "platform": "meta",
                    "spend": 2500.00,
                    "revenue": 2000.00,
                    "conversions": 12,
                    "effectiveRoas": 0.8,
                    "dataQuality": "medium",
                },
                {
                    "id": "CAMP-004",
                    "name": "Brand Awareness",
                    "platform": "google",
                    "spend": 1800.00,
                    "revenue": 1620.00,
                    "conversions": 8,
                    "effectiveRoas": 0.9,
                    "dataQuality": "low",
                },
            ],
            "totalSpend": 35000.00,
            "totalRevenue": 125000.00,
            "overallRoas": 3.57,
        }


class WhatIfScenario(BaseModel):
    type: str  # AD_SPEND_CHANGE, PRICE_CHANGE, INVENTORY_ORDER
    parameters: Dict[str, Any]


@app.post("/fpa/whatif")
async def simulate_whatif(request: Request, scenario: WhatIfScenario):
    """Run what-if simulation - proxies to Java FPA Engine."""
    user = require_auth(request)
    
    # Get the actual database UUID for the user
    user_uuid = await db_get_user_uuid(user.id)
    if not user_uuid:
        user_uuid = user.id  # Fallback to external_id if not found
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Map scenario type to Java endpoint
            endpoint_map = {
                "AD_SPEND_CHANGE": "/api/whatif/ad-spend",
                "PRICE_CHANGE": "/api/whatif/price",
                "INVENTORY_ORDER": "/api/whatif/inventory",
            }
            
            endpoint = endpoint_map.get(scenario.type, "/api/whatif/simulate")
            
            # Build request body based on scenario type
            request_body = {
                "userId": user_uuid,
                **scenario.parameters,
            }
            
            response = await client.post(
                f"{JAVA_ENGINE_URL}{endpoint}",
                json=request_body,
            )
            response.raise_for_status()
            data = response.json()
            
            # Transform Java response to frontend format
            return {
                "baseline": data.get("baseline", {}),
                "projected": data.get("projected", {}),
                "impact": data.get("impact", {}),
                "recommendations": data.get("recommendations", []),
            }
    except httpx.ConnectError:
        # Return mock data if Java engine is not available
        if scenario.type == "AD_SPEND_CHANGE":
            change_pct = scenario.parameters.get("changePercent", 10)
            return {
                "baseline": {
                    "adSpend": 35000.00,
                    "revenue": 125000.00,
                    "netProfit": 27500.00,
                    "roas": 3.57,
                },
                "projected": {
                    "adSpend": 35000.00 * (1 + change_pct / 100),
                    "revenue": 125000.00 * (1 + change_pct * 0.8 / 100),
                    "netProfit": 27500.00 * (1 + change_pct * 0.5 / 100),
                    "roas": 3.57 * (1 - change_pct * 0.02 / 100),
                },
                "impact": {
                    "revenueChange": change_pct * 0.8,
                    "profitChange": change_pct * 0.5,
                    "roasChange": -change_pct * 0.02,
                },
                "recommendations": [
                    f"A {change_pct}% increase in ad spend is projected to increase revenue by {change_pct * 0.8:.1f}%",
                    "Consider focusing additional spend on top-performing campaigns",
                    "Monitor ROAS closely as diminishing returns may occur",
                ],
            }
        elif scenario.type == "PRICE_CHANGE":
            change_pct = scenario.parameters.get("changePercent", 5)
            return {
                "baseline": {
                    "price": 100.00,
                    "unitsSold": 1250,
                    "revenue": 125000.00,
                    "netProfit": 27500.00,
                },
                "projected": {
                    "price": 100.00 * (1 + change_pct / 100),
                    "unitsSold": 1250 * (1 - change_pct * 0.3 / 100),
                    "revenue": 125000.00 * (1 + change_pct * 0.7 / 100),
                    "netProfit": 27500.00 * (1 + change_pct * 1.2 / 100),
                },
                "impact": {
                    "revenueChange": change_pct * 0.7,
                    "profitChange": change_pct * 1.2,
                    "volumeChange": -change_pct * 0.3,
                },
                "recommendations": [
                    f"A {change_pct}% price increase may reduce volume by {change_pct * 0.3:.1f}%",
                    "Net profit is projected to increase due to higher margins",
                    "Consider A/B testing the price change on a subset of products",
                ],
            }
        else:
            return {
                "baseline": {},
                "projected": {},
                "impact": {},
                "recommendations": ["Scenario type not fully supported yet"],
            }
    except Exception as e:
        print(f"What-if error: {e}")
        # Return mock data on any error
        if scenario.type == "AD_SPEND_CHANGE":
            change_pct = scenario.parameters.get("changePercent", 10)
            return {
                "baseline": {
                    "adSpend": 35000.00,
                    "revenue": 125000.00,
                    "netProfit": 27500.00,
                    "roas": 3.57,
                },
                "projected": {
                    "adSpend": 35000.00 * (1 + change_pct / 100),
                    "revenue": 125000.00 * (1 + change_pct * 0.8 / 100),
                    "netProfit": 27500.00 * (1 + change_pct * 0.5 / 100),
                    "roas": 3.57 * (1 - change_pct * 0.02 / 100),
                },
                "impact": {
                    "revenueChange": change_pct * 0.8,
                    "profitChange": change_pct * 0.5,
                    "roasChange": -change_pct * 0.02,
                },
                "recommendations": [
                    f"A {change_pct}% increase in ad spend is projected to increase revenue by {change_pct * 0.8:.1f}%",
                ],
            }
        return {
            "baseline": {},
            "projected": {},
            "impact": {},
            "recommendations": ["Unable to process simulation at this time"],
        }


# ============================================================================
# Chat Endpoints - Connected to CFO Agent
# ============================================================================

# In-memory chat history store (fallback when DB unavailable)
_chat_histories: Dict[str, list] = {}

# Import the CFO agent - lazy loading to avoid startup issues
_cfo_agent = None
_agent_available = None  # None = not checked yet, True/False = checked


def get_agent():
    """Lazy load the CFO agent."""
    global _cfo_agent, _agent_available
    
    if _agent_available is None:
        try:
            from credora.agents.cfo import get_cfo_agent
            _cfo_agent = get_cfo_agent()
            _agent_available = True
            print("CFO Agent loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load CFO agent: {e}")
            import traceback
            traceback.print_exc()
            _cfo_agent = None
            _agent_available = False
    
    return _cfo_agent, _agent_available


async def save_chat_message_to_db(user_id: str, message: dict) -> bool:
    """Save a chat message to the database.
    
    Args:
        user_id: The user's external_id (email)
        message: Message dict with id, role, content, timestamp, sources
        
    Returns:
        True if saved successfully, False otherwise
    """
    try:
        db = await get_db()
        if db is None:
            return False
        
        # Get user UUID from external_id
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            print(f"User not found in DB: {user_id}")
            return False
        
        user_uuid = user_row["id"]
        
        # Insert chat message
        await db.execute(
            """
            INSERT INTO chat_messages (user_id, message_id, role, content, sources, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            """,
            user_uuid,
            message.get("id", secrets.token_urlsafe(8)),
            message.get("role", "user"),
            message.get("content", ""),
            message.get("sources", []),
            json.dumps({"timestamp": message.get("timestamp", datetime.now().isoformat())})
        )
        
        print(f"Chat message saved to DB for user {user_id}")
        return True
        
    except Exception as e:
        print(f"Error saving chat message to DB: {e}")
        import traceback
        traceback.print_exc()
        return False


async def load_chat_history_from_db(user_id: str, limit: int = 50) -> list:
    """Load chat history from the database.
    
    Args:
        user_id: The user's external_id (email)
        limit: Maximum number of messages to load
        
    Returns:
        List of chat messages
    """
    try:
        db = await get_db()
        if db is None:
            return []
        
        # Get user UUID from external_id
        user_row = await db.fetchrow(
            "SELECT id FROM users WHERE external_id = $1",
            user_id
        )
        
        if not user_row:
            return []
        
        user_uuid = user_row["id"]
        
        # Fetch chat messages
        rows = await db.fetch(
            """
            SELECT message_id, role, content, sources, created_at, metadata
            FROM chat_messages
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT $2
            """,
            user_uuid,
            limit
        )
        
        messages = []
        for row in rows:
            messages.append({
                "id": row["message_id"],
                "role": row["role"],
                "content": row["content"],
                "sources": row["sources"] or [],
                "timestamp": row["created_at"].isoformat() if row["created_at"] else datetime.now().isoformat(),
            })
        
        return messages
        
    except Exception as e:
        print(f"Error loading chat history from DB: {e}")
        return []


@app.post("/chat/message")
async def send_chat_message(request: Request, message_req: MessageRequest):
    """Send a chat message to the AI CFO agent with RAG context."""
    user = require_auth(request)
    
    # Initialize chat history for user if not exists (in-memory fallback)
    if user.id not in _chat_histories:
        _chat_histories[user.id] = []
    
    # Create user message
    user_message = {
        "id": secrets.token_urlsafe(8),
        "role": "user",
        "content": message_req.message,
        "timestamp": datetime.now().isoformat(),
        "sources": [],
    }
    
    # Save user message to database
    await save_chat_message_to_db(user.id, user_message)
    
    # Also keep in memory for quick access
    _chat_histories[user.id].append(user_message)
    
    # =========================================================================
    # RAG: Retrieve financial context from database
    # =========================================================================
    retrieved_documents = []
    context_summary = ""
    platform_connections = []
    
    try:
        db = await get_db()
        if db is not None:
            # Get user UUID
            user_row = await db.fetchrow(
                "SELECT id FROM users WHERE external_id = $1",
                user.id
            )
            
            if user_row:
                user_uuid = user_row["id"]
                
                # =========================================================
                # PLATFORM CONNECTION STATE (Critical for context-awareness)
                # =========================================================
                platform_rows = await db.fetch(
                    """
                    SELECT platform, status, connected_at, last_sync_at, last_sync_status,
                           platform_account_name, data_summary
                    FROM platform_connections
                    WHERE user_id = $1 AND status = 'connected'
                    ORDER BY platform
                    """,
                    user_uuid
                )
                
                if platform_rows:
                    platform_connections = [row["platform"] for row in platform_rows]
                    platform_lines = ["**Connected Platforms:**"]
                    for row in platform_rows:
                        platform_name = row["platform"].title()
                        account_name = row["platform_account_name"] or ""
                        last_sync = row["last_sync_at"]
                        sync_info = f" (last synced: {last_sync.strftime('%Y-%m-%d %H:%M')})" if last_sync else ""
                        platform_lines.append(f"- {platform_name}: Connected{sync_info}")
                        if account_name:
                            platform_lines[-1] += f" - {account_name}"
                    
                    platform_context = "\n".join(platform_lines)
                    retrieved_documents.append({
                        "type": "platform_connections",
                        "content": platform_context,
                    })
                    context_summary += platform_context + "\n\n"
                else:
                    # No platforms connected - important context for AI
                    platform_context = """**Connected Platforms:**
- No platforms connected yet.
- User needs to connect Shopify, Meta Ads, or Google Ads from the Settings page to see real data."""
                    retrieved_documents.append({
                        "type": "platform_connections",
                        "content": platform_context,
                    })
                    context_summary += platform_context + "\n\n"
                
                # Retrieve recent P&L data
                pnl = await db.fetchrow(
                    """
                    SELECT * FROM pnl_reports
                    WHERE user_id = $1
                    ORDER BY calculated_at DESC
                    LIMIT 1
                    """,
                    user_uuid
                )
                
                if pnl:
                    pnl_context = f"""
**Recent P&L Summary:**
- Revenue: ${pnl.get('revenue', 0):,.2f}
- Net Revenue: ${pnl.get('net_revenue', 0):,.2f}  
- COGS: ${pnl.get('cogs', 0):,.2f}
- Ad Spend: ${pnl.get('ad_spend', 0):,.2f}
- Net Profit: ${pnl.get('net_profit', 0):,.2f}
- Gross Margin: {(pnl.get('gross_margin', 0) or 0) * 100:.1f}%
- Net Margin: {(pnl.get('net_margin', 0) or 0) * 100:.1f}%
"""
                    retrieved_documents.append({
                        "type": "pnl_report",
                        "content": pnl_context.strip(),
                    })
                    context_summary += pnl_context
                
                # Retrieve recent forecast data
                forecast = await db.fetchrow(
                    """
                    SELECT * FROM forecasts
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    user_uuid
                )
                
                if forecast:
                    forecast_context = f"""
**Cash Flow Forecast:**
- Current Cash: ${forecast.get('current_cash', 0):,.2f}
- Daily Burn Rate: ${forecast.get('burn_rate', 0):,.2f}
- Runway Days: {forecast.get('runway_days', 0)}
"""
                    retrieved_documents.append({
                        "type": "forecast",
                        "content": forecast_context.strip(),
                    })
                    context_summary += forecast_context
                
                # Retrieve top campaigns
                campaigns = await db.fetch(
                    """
                    SELECT name, platform, spend, conversions
                    FROM campaigns
                    WHERE user_id = $1
                    ORDER BY spend DESC
                    LIMIT 5
                    """,
                    user_uuid
                )
                
                if campaigns:
                    campaign_lines = ["**Top Campaigns by Spend:**"]
                    for c in campaigns:
                        campaign_lines.append(f"- {c['name']} ({c['platform']}): ${c.get('spend', 0):,.2f} spend, {c.get('conversions', 0)} conversions")
                    campaign_context = "\n".join(campaign_lines)
                    retrieved_documents.append({
                        "type": "campaigns",
                        "content": campaign_context,
                    })
                    context_summary += "\n" + campaign_context
                
                # Retrieve transaction summary
                tx_summary = await db.fetchrow(
                    """
                    SELECT 
                        COUNT(*) as tx_count,
                        SUM(CASE WHEN type = 'order' THEN amount ELSE 0 END) as total_orders,
                        SUM(CASE WHEN type = 'ad_spend' THEN amount ELSE 0 END) as total_ad_spend
                    FROM transactions
                    WHERE user_id = $1
                    AND occurred_at > NOW() - INTERVAL '30 days'
                    """,
                    user_uuid
                )
                
                if tx_summary and tx_summary.get('tx_count', 0) > 0:
                    tx_context = f"""
**Last 30 Days Transactions:**
- Total Transactions: {tx_summary.get('tx_count', 0)}
- Order Revenue: ${float(tx_summary.get('total_orders', 0) or 0):,.2f}
- Ad Spend: ${float(tx_summary.get('total_ad_spend', 0) or 0):,.2f}
"""
                    retrieved_documents.append({
                        "type": "transactions",
                        "content": tx_context.strip(),
                    })
                    context_summary += tx_context
                    
    except Exception as e:
        print(f"RAG context retrieval error: {e}")
        import traceback
        traceback.print_exc()
    
    # =========================================================================
    # Run CFO agent with context
    # =========================================================================
    cfo_agent, agent_available = get_agent()
    
    if agent_available and cfo_agent:
        try:
            from agents import Runner
            
            # Build prompt with context
            if context_summary:
                augmented_message = f"""Based on the user's financial data:

{context_summary}

User question: {message_req.message}

Please provide insights and recommendations based on the data above."""
            else:
                augmented_message = message_req.message
            
            # Run the agent with context-augmented message
            result = await Runner.run(cfo_agent, input=augmented_message)
            
            # Extract the response
            assistant_content = ""
            sources = [doc["type"] for doc in retrieved_documents]
            
            if result and hasattr(result, 'final_output') and result.final_output:
                assistant_content = result.final_output
            elif result and hasattr(result, 'messages') and result.messages:
                for msg in result.messages:
                    if hasattr(msg, 'content') and msg.content:
                        assistant_content = msg.content
                        break
            
            if not assistant_content:
                assistant_content = "I apologize, but I couldn't process your request. Please try again."
            
            # Create assistant message
            assistant_message = {
                "id": secrets.token_urlsafe(8),
                "role": "assistant",
                "content": assistant_content,
                "timestamp": datetime.now().isoformat(),
                "sources": sources,
            }
            
            # Save assistant message to database
            await save_chat_message_to_db(user.id, assistant_message)
            
            # Add to in-memory history
            _chat_histories[user.id].append(assistant_message)
            
            return {
                "message": assistant_message,
                "context": {
                    "retrievedDocuments": [doc["content"] for doc in retrieved_documents],
                    "relevanceScores": [1.0] * len(retrieved_documents),
                    "usedInResponse": len(retrieved_documents) > 0,
                },
            }
            
        except Exception as e:
            print(f"Agent error: {e}")
            import traceback
            traceback.print_exc()
            # Fall back to simple response
            pass
    
    # Fallback response when agent is not available
    # Include context summary if available
    fallback_content = f"Hello! I'm your AI CFO assistant."
    
    if context_summary:
        fallback_content = f"""Hello! I'm your AI CFO assistant. Based on your data:

{context_summary}

I received your message: '{message_req.message}'. How can I help you analyze this data?"""
    else:
        fallback_content = f"""Hello! I'm your AI CFO assistant. I received your message: '{message_req.message}'. I can help you with:

• **Financial Analysis** - P&L statements, cash flow forecasts
• **SKU Performance** - Product profitability analysis
• **Campaign Insights** - Marketing ROI and optimization
• **Business Recommendations** - Data-driven suggestions

Please connect your platforms (Shopify, Meta Ads, Google Ads) from Settings to get personalized insights based on your actual business data."""
    
    assistant_message = {
        "id": secrets.token_urlsafe(8),
        "role": "assistant",
        "content": fallback_content,
        "timestamp": datetime.now().isoformat(),
        "sources": [doc["type"] for doc in retrieved_documents],
    }
    
    # Save fallback assistant message to database
    await save_chat_message_to_db(user.id, assistant_message)
    
    # Add to in-memory history
    _chat_histories[user.id].append(assistant_message)
    
    return {
        "message": assistant_message,
        "context": {
            "retrievedDocuments": [doc["content"] for doc in retrieved_documents],
            "relevanceScores": [1.0] * len(retrieved_documents),
            "usedInResponse": len(retrieved_documents) > 0,
        },
    }


@app.get("/chat/history")
async def get_chat_history(request: Request):
    """Get chat history for the current user from database."""
    user = require_auth(request)
    
    # Try to load from database first
    db_history = await load_chat_history_from_db(user.id)
    
    if db_history:
        # Update in-memory cache
        _chat_histories[user.id] = db_history
        return db_history
    
    # Fallback to in-memory history
    return _chat_histories.get(user.id, [])


@app.delete("/chat/history")
async def clear_chat_history(request: Request):
    """Clear chat history for the current user from database and memory."""
    user = require_auth(request)
    
    # Clear from database
    try:
        db = await get_db()
        if db is not None:
            user_row = await db.fetchrow(
                "SELECT id FROM users WHERE external_id = $1",
                user.id
            )
            if user_row:
                await db.execute(
                    "DELETE FROM chat_messages WHERE user_id = $1",
                    user_row["id"]
                )
                print(f"Chat history cleared from DB for user {user.id}")
    except Exception as e:
        print(f"Error clearing chat history from DB: {e}")
    
    # Clear from in-memory
    if user.id in _chat_histories:
        _chat_histories[user.id] = []
    
    return {"success": True}


# ============================================================================
# Insights Endpoints
# ============================================================================

@app.get("/insights")
async def get_insights(request: Request):
    """Get AI-generated insights."""
    user = require_auth(request)
    
    # Return mock insights for now
    # Categories must be: revenue, cost, efficiency, risk
    return [
        {
            "id": "insight-001",
            "title": "Increase ad spend on Black Friday campaign",
            "description": "Your Black Friday campaign has a 5.0x ROAS, significantly above average. Consider increasing budget by 20% to capture more conversions.",
            "reasoning": "Based on historical data, campaigns with ROAS above 4.0x typically maintain efficiency when scaled by 20-30%. Your Black Friday campaign shows consistent performance.",
            "impact": "high",
            "category": "revenue",
            "relatedPage": "campaigns",
            "dismissed": False,
            "createdAt": datetime.now().isoformat(),
        },
        {
            "id": "insight-002",
            "title": "Summer Sale campaign underperforming",
            "description": "Your Summer Sale campaign has a 0.8x ROAS, below break-even. Consider pausing or restructuring this campaign.",
            "reasoning": "This campaign is spending $2,500 but only generating $2,000 in revenue. At a 30% gross margin, you're losing money on every conversion.",
            "impact": "high",
            "category": "cost",
            "relatedPage": "campaigns",
            "dismissed": False,
            "createdAt": datetime.now().isoformat(),
        },
        {
            "id": "insight-003",
            "title": "Cash runway is healthy",
            "description": "At your current burn rate, you have 45 days of runway. This is above the recommended 30-day minimum.",
            "reasoning": "Your daily burn rate of $1,500 against current cash of $50,000 provides adequate buffer for operations.",
            "impact": "medium",
            "category": "efficiency",
            "relatedPage": "forecast",
            "dismissed": False,
            "createdAt": datetime.now().isoformat(),
        },
        {
            "id": "insight-004",
            "title": "High refund rate on Budget Widget",
            "description": "Budget Widget has a 5% refund rate, significantly higher than your 2.5% average. This is impacting profitability.",
            "reasoning": "At 5% refund rate vs 2.5% average, you're losing an additional $900 per month on this SKU alone.",
            "impact": "medium",
            "category": "risk",
            "relatedPage": "sku",
            "dismissed": False,
            "createdAt": datetime.now().isoformat(),
        },
    ]

# ============================================================================
# Competitor Analysis Endpoints (Orchestrated Agent System)
# ============================================================================

class CompetitorAnalysisRequest(BaseModel):
    """Request model for competitor analysis."""
    business_type: str  # e.g., "perfume", "clothing", "electronics"
    city: str = "Karachi"
    max_competitors: int = 5
    generate_report: bool = True
    visible_browser: bool = False  # Enable visible browser for demos


class CompetitorAnalysisResponse(BaseModel):
    """Response model for competitor analysis."""
    status: str
    message: str
    result: Optional[str] = None
    report_path: Optional[str] = None
    competitors_analyzed: int = 0


@app.options("/competitor/analyze")
async def competitor_analyze_options():
    """Handle CORS preflight for competitor analyze endpoint."""
    return {"status": "ok"}


@app.post("/competitor/analyze", response_model=CompetitorAnalysisResponse)
async def analyze_competitors_endpoint(
    request: Request,
    body: CompetitorAnalysisRequest
):
    """
    Run comprehensive competitor analysis using orchestrated agent system.
    
    This endpoint launches the Competitor Analysis Agent System which:
    1. Triage Agent receives the request and delegates to specialists
    2. Search Agent finds competitors in the specified market
    3. Scraper Agent extracts content from competitor websites
    4. Analyzer Agent evaluates competitor strategies
    5. Reporter Agent generates a comprehensive .txt report
    
    No authentication required - public endpoint for testing.
    
    Args:
        business_type: Type of business (e.g., "perfume", "candles")
        city: Target city for competitor search (default: "Karachi")
        max_competitors: Maximum number of competitors to analyze (default: 5)
        generate_report: Whether to generate a .txt report file (default: True)
    
    Returns:
        Analysis result with competitor insights and report path
    """
    # No authentication required for now
    print(f"[Competitor] Analysis requested")
    print(f"[Competitor] Params: {body.business_type} in {body.city}, max={body.max_competitors}")
    print(f"[Competitor] 🔍 DEBUG - visible_browser parameter: {body.visible_browser}")
    print(f"[Competitor] 🔍 DEBUG - generate_report parameter: {body.generate_report}")
    print(f"[Competitor] 🔍 DEBUG - Full request body: {body}")
    
    if body.visible_browser:
        print(f"[Competitor] 🎯 VISIBLE BROWSER MODE REQUESTED FROM FRONTEND!")
        print(f"[Competitor] 🎯 Browser should launch in visible mode")
    else:
        print(f"[Competitor] 🔇 Headless mode - no visible browser requested")
    
    try:
        # Use direct browser approach instead of MCP to avoid timeout issues
        print(f"[Competitor] Starting direct browser analysis...")
        print(f"[Competitor] Visible browser: {body.visible_browser}")
        
        # Import required modules
        from playwright.async_api import async_playwright
        from ddgs import DDGS
        from bs4 import BeautifulSoup
        from openai import OpenAI
        from credora.config import get_api_key, get_model_config
        from datetime import datetime
        import os
        import asyncio
        
        competitors = []
        
        # Step 1: Search for competitors
        print(f"[Competitor] Step 1: Searching for competitors...")
        query = f"best {body.business_type} shops {body.city} Pakistan"
        
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=body.max_competitors))
            
            if not results:
                # Fallback search with simpler query
                print(f"[Competitor] No results found, trying simpler search...")
                query = f"{body.business_type} {body.city}"
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=body.max_competitors))
        
        except Exception as search_error:
            print(f"[Competitor] Search error: {search_error}")
            # Use fallback competitors for demo
            results = [
                {'title': f'Sample {body.business_type} Store 1', 'href': 'https://example.com', 'body': 'Sample competitor for testing'},
                {'title': f'Sample {body.business_type} Store 2', 'href': 'https://google.com', 'body': 'Another sample competitor'},
                {'title': f'Sample {body.business_type} Store 3', 'href': 'https://wikipedia.org', 'body': 'Third sample competitor'},
            ]
        
        for i, result in enumerate(results, 1):
            competitor = {
                'rank': i,
                'name': result.get('title', 'Unknown'),
                'url': result.get('href', result.get('link', '')),
                'snippet': result.get('body', '')[:200]
            }
            competitors.append(competitor)
            print(f"[Competitor] Found: {competitor['name'][:50]}...")
        
        # Step 2: Scrape competitors with visible browser
        print(f"[Competitor] Step 2: Scraping {len(competitors)} competitor websites...")
        
        if body.visible_browser:
            print(f"[Competitor] 🎯 VISIBLE BROWSER MODE ENABLED!")
            print(f"[Competitor] 🎯 Browser window will open and visit each competitor website")
            print(f"[Competitor] 🎯 You can watch the analysis happen in real-time!")
            print(f"[Competitor] 🎯 Launching browser with headless=False...")
        else:
            print(f"[Competitor] 🔇 Running in headless mode (no visible browser)")
        
        try:
            async with async_playwright() as p:
                # Enhanced browser launch options for maximum visibility
                launch_options = {
                    'headless': not body.visible_browser,
                    'slow_mo': 3000 if body.visible_browser else 0,  # Very slow for maximum visibility
                }
                
                if body.visible_browser:
                    launch_options['args'] = [
                        '--start-maximized',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--no-first-run',
                        '--disable-default-apps',
                        '--window-position=0,0',  # Position at top-left
                        '--force-device-scale-factor=1'
                    ]
                    # Try to use Chrome if available, fall back to Chromium
                    try:
                        launch_options['channel'] = 'chrome'
                        print(f"[Competitor] Attempting to use Chrome browser...")
                    except:
                        print(f"[Competitor] Chrome not available, using Chromium...")
                
                print(f"[Competitor] Launching browser with options: headless={launch_options['headless']}")
                browser = await p.chromium.launch(**launch_options)
                print(f"[Competitor] Browser object created: {browser}")
                
                if body.visible_browser:
                    print(f"[Competitor] ✅ Browser launched in VISIBLE mode!")
                    print(f"[Competitor] 🌐 Browser window should now be visible on your screen")
                
                context = await browser.new_context(
                    viewport=None if body.visible_browser else {"width": 1280, "height": 720},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                # Create initial page to show we're starting
                if body.visible_browser:
                    welcome_page = await context.new_page()
                    await welcome_page.set_content(f"""
                    <html>
                    <head>
                        <title>🎯 Competitor Analysis Starting...</title>
                        <style>
                            @keyframes flash {{
                                0%, 100% {{ background: #f0f9ff; }}
                                50% {{ background: #fef3c7; }}
                            }}
                            body {{
                                font-family: Arial;
                                padding: 40px;
                                text-align: center;
                                animation: flash 1s infinite;
                            }}
                        </style>
                    </head>
                    <body>
                        <h1 style="color: #0c4a6e; font-size: 48px;">🚀 COMPETITOR ANALYSIS STARTING</h1>
                        <h2 style="color: #dc2626; font-size: 36px;">🎯 BROWSER IS NOW VISIBLE!</h2>
                        <p style="font-size: 24px; color: #374151;">Analyzing {body.business_type} competitors in {body.city}</p>
                        <p style="font-size: 20px; color: #6b7280;">Found {len(competitors)} competitors to analyze...</p>
                        <p style="font-size: 18px; color: #6b7280;">Browser will start visiting websites in 5 seconds...</p>
                        <div style="margin-top: 30px; padding: 20px; background: #e0f2fe; border-radius: 8px;">
                            <h3 style="color: #0c4a6e;">📊 Analysis Details:</h3>
                            <p style="font-size: 16px;">Business Type: {body.business_type}</p>
                            <p style="font-size: 16px;">City: {body.city}</p>
                            <p style="font-size: 16px;">Competitors Found: {len(competitors)}</p>
                        </div>
                    </body>
                    </html>
                    """)
                    print(f"[Competitor] 🎯 Welcome page displayed - browser should be VERY visible now!")
                    await welcome_page.wait_for_timeout(5000)  # Show for 5 seconds
                    await welcome_page.close()
                
                successful_scrapes = 0
                
                for i, competitor in enumerate(competitors, 1):
                    try:
                        if body.visible_browser:
                            print(f"[Competitor] 🌐 ({i}/{len(competitors)}) Opening browser to visit: {competitor['name'][:50]}...")
                        
                        page = await context.new_page()
                        
                        # Navigate to competitor website
                        await page.goto(competitor['url'], timeout=30000, wait_until='domcontentloaded')
                        
                        if body.visible_browser:
                            print(f"[Competitor] ⏳ Page loaded: {competitor['name'][:50]}")
                            print(f"[Competitor] 🔍 Analyzing content (you can see it in browser)...")
                            await page.wait_for_timeout(3000)  # Let user see the page
                        else:
                            await page.wait_for_timeout(2000)
                        
                        title = await page.title()
                        html = await page.content()
                        
                        if body.visible_browser:
                            print(f"[Competitor] 📄 Loaded: {title}")
                            # Scroll to show content
                            await page.evaluate("window.scrollTo(0, document.body.scrollHeight/3)")
                            await page.wait_for_timeout(2000)
                            await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                            await page.wait_for_timeout(2000)
                            await page.evaluate("window.scrollTo(0, 0)")
                            await page.wait_for_timeout(1500)
                        
                        # Parse content
                        soup = BeautifulSoup(html, 'html.parser')
                        for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header']):
                            tag.decompose()
                        
                        text = soup.get_text(separator='\n', strip=True)
                        lines = [line.strip() for line in text.splitlines() if line.strip()]
                        clean_text = '\n'.join(lines)[:8000]
                        
                        # Analyze content
                        text_lower = clean_text.lower()
                        competitor.update({
                            'scraped_title': title,
                            'content': clean_text,
                            'content_length': len(clean_text),
                            'has_prices': any(x in text_lower for x in ['rs', 'pkr', 'price', '/-', 'rupee']),
                            'has_discounts': any(x in text_lower for x in ['sale', 'discount', 'off', 'offer', 'deal']),
                            'has_shipping': any(x in text_lower for x in ['delivery', 'shipping', 'free delivery', 'cod']),
                            'has_reviews': any(x in text_lower for x in ['review', 'rating', 'star', 'customer']),
                            'has_whatsapp': any(x in text_lower for x in ['whatsapp', 'wa.me', '+92']),
                        })
                        
                        successful_scrapes += 1
                        print(f"[Competitor] ✅ Scraped: {competitor['name'][:30]}... - {len(clean_text)} chars")
                        await page.close()
                        
                    except Exception as e:
                        print(f"[Competitor] ❌ Scrape error for {competitor['name'][:30]}: {str(e)[:100]}")
                        competitor['error'] = str(e)
                        try:
                            await page.close()
                        except:
                            pass
                
                # Show completion page
                if body.visible_browser:
                    print(f"[Competitor] 🎉 Scraping complete! Successfully analyzed {successful_scrapes} competitors")
                    final_page = await context.new_page()
                    await final_page.set_content(f"""
                    <html>
                    <head>
                        <title>🎉 Analysis Complete!</title>
                        <style>
                            @keyframes celebrate {{
                                0%, 100% {{ transform: scale(1); }}
                                50% {{ transform: scale(1.1); }}
                            }}
                            body {{
                                font-family: Arial;
                                padding: 40px;
                                text-align: center;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                            }}
                            h1 {{
                                animation: celebrate 1s infinite;
                                font-size: 48px;
                            }}
                        </style>
                    </head>
                    <body>
                        <h1>🎉 COMPETITOR ANALYSIS COMPLETE!</h1>
                        <h2 style="font-size: 36px;">✅ Successfully Analyzed {successful_scrapes} Competitors</h2>
                        <p style="font-size: 24px;">Business Type: {body.business_type}</p>
                        <p style="font-size: 24px;">City: {body.city}</p>
                        <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                            <h3 style="font-size: 28px;">📊 Analysis Summary:</h3>
                            <p style="font-size: 20px;">Total Competitors Found: {len(competitors)}</p>
                            <p style="font-size: 20px;">Successfully Scraped: {successful_scrapes}</p>
                            <p style="font-size: 20px;">Now generating AI insights...</p>
                        </div>
                        <p style="font-size: 18px; margin-top: 30px;">Browser will close in 15 seconds...</p>
                    </body>
                    </html>
                    """)
                    await final_page.wait_for_timeout(15000)  # Keep open longer
                
                await browser.close()
                
        except Exception as browser_error:
            print(f"[Competitor] Browser error: {browser_error}")
            # Continue with analysis even if browser fails
            for competitor in competitors:
                competitor.update({
                    'error': 'Browser scraping failed',
                    'content': competitor.get('snippet', ''),
                    'content_length': len(competitor.get('snippet', '')),
                    'has_prices': False,
                    'has_discounts': False,
                    'has_shipping': False,
                    'has_reviews': False,
                    'has_whatsapp': False,
                })
        
        # Step 3: AI Analysis
        print(f"[Competitor] Step 3: AI analysis...")
        
        try:
            api_key = get_api_key()
            config = get_model_config()
            client = OpenAI(api_key=api_key, base_url=config.base_url)
            
            # Prepare analysis prompt
            successful = [c for c in competitors if 'error' not in c]
            if not successful:
                # Use all competitors even if scraping failed
                successful = competitors
            
            analysis_prompt = f"Analyze these {body.business_type} competitors in {body.city}, Pakistan:\n\n"
            
            for comp in successful:
                content_preview = comp.get('content', comp.get('snippet', ''))[:1000]
                analysis_prompt += f"""
COMPETITOR: {comp['name']}
URL: {comp['url']}
Strategies: Prices: {'Yes' if comp.get('has_prices') else 'Unknown'}, Discounts: {'Yes' if comp.get('has_discounts') else 'Unknown'}, Shipping: {'Yes' if comp.get('has_shipping') else 'Unknown'}, WhatsApp: {'Yes' if comp.get('has_whatsapp') else 'Unknown'}
Content Preview: {content_preview}...

---
"""
            
            analysis_prompt += "\nProvide strategic insights and actionable recommendations for beating these competitors in the Pakistani market."
            
            response = client.chat.completions.create(
                model=config.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert business strategist specializing in Pakistani e-commerce and competitor analysis."},
                    {"role": "user", "content": analysis_prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            ai_analysis = response.choices[0].message.content
            print(f"[Competitor] AI analysis complete")
            
        except Exception as ai_error:
            print(f"[Competitor] AI analysis error: {ai_error}")
            ai_analysis = f"AI analysis failed due to: {str(ai_error)}. However, we found {len(competitors)} competitors: " + ", ".join([c['name'] for c in competitors[:3]])
        
        # Step 4: Generate report (if requested)
        report_path = None
        successful = [c for c in competitors if 'error' not in c]
        
        if body.generate_report:
            print(f"[Competitor] Step 4: Generating report...")
            
            report_filename = f"api_competitor_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            
            report = []
            report.append("COMPETITOR ANALYSIS REPORT")
            report.append("=" * 50)
            report.append(f"Business Type: {body.business_type.upper()}")
            report.append(f"Location: {body.city}")
            report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            report.append(f"Competitors Analyzed: {len(successful)}")
            report.append(f"Visible Browser Mode: {'Yes' if body.visible_browser else 'No'}")
            report.append("")
            
            # Summary stats
            with_prices = [c for c in successful if c.get('has_prices')]
            with_discounts = [c for c in successful if c.get('has_discounts')]
            with_shipping = [c for c in successful if c.get('has_shipping')]
            with_whatsapp = [c for c in successful if c.get('has_whatsapp')]
            
            report.append("EXECUTIVE SUMMARY")
            report.append("-" * 30)
            report.append(f"Successfully analyzed: {len(successful)} websites")
            report.append(f"Show prices: {len(with_prices)} ({len(with_prices)*100//max(len(successful),1)}%)")
            report.append(f"Offer discounts: {len(with_discounts)} ({len(with_discounts)*100//max(len(successful),1)}%)")
            report.append(f"Provide delivery: {len(with_shipping)} ({len(with_shipping)*100//max(len(successful),1)}%)")
            report.append(f"Use WhatsApp: {len(with_whatsapp)} ({len(with_whatsapp)*100//max(len(successful),1)}%)")
            report.append("")
            
            # Competitor details
            for comp in successful:
                report.append(f"COMPETITOR: {comp['name']}")
                report.append(f"URL: {comp['url']}")
                report.append(f"Strategies: Prices: {'Yes' if comp.get('has_prices') else 'No'}, Discounts: {'Yes' if comp.get('has_discounts') else 'No'}")
                if comp.get('content'):
                    report.append(f"Content Length: {comp.get('content_length', 0)} characters")
                report.append("")
            
            # AI Analysis
            report.append("AI STRATEGIC ANALYSIS")
            report.append("-" * 30)
            report.append(ai_analysis)
            report.append("")
            report.append("=" * 50)
            report.append("END OF REPORT")
            
            # Save report
            try:
                with open(report_filename, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(report))
                report_path = report_filename
                print(f"[Competitor] Report saved: {report_filename}")
            except Exception as report_error:
                print(f"[Competitor] Report save error: {report_error}")
        
        # Create result summary
        with_prices = [c for c in successful if c.get('has_prices')]
        with_discounts = [c for c in successful if c.get('has_discounts')]
        with_shipping = [c for c in successful if c.get('has_shipping')]
        
        result_summary = f"Successfully analyzed {len(successful)} competitors in {body.city}. "
        
        if len(with_prices) > 0:
            result_summary += f"{len(with_prices)} show prices, "
        if len(with_discounts) > 0:
            result_summary += f"{len(with_discounts)} offer discounts, "
        if len(with_shipping) > 0:
            result_summary += f"{len(with_shipping)} provide delivery. "
        
        result_summary += f"\n\nKey Insights: {ai_analysis[:300]}..."
        
        print(f"[Competitor] Analysis complete! Analyzed {len(successful)} competitors")
        
        return CompetitorAnalysisResponse(
            status="success",
            message=f"Competitor analysis completed for {body.business_type} in {body.city}",
            result=result_summary,
            report_path=report_path,
            competitors_analyzed=len(successful),
        )
        
    except ImportError as e:
        print(f"[Competitor] Import error: {e}")
        return CompetitorAnalysisResponse(
            status="error",
            message=f"Competitor agent system not available: {str(e)}",
        )
    except Exception as e:
        print(f"[Competitor] Analysis error: {e}")
        import traceback
        traceback.print_exc()
        return CompetitorAnalysisResponse(
            status="error",
            message=f"Analysis failed: {str(e)}",
        )


@app.get("/competitor/search")
async def search_competitors_endpoint(
    request: Request,
    business_type: str = Query(..., description="Type of business"),
    city: str = Query("Karachi", description="Target city"),
    max_results: int = Query(5, description="Maximum results", ge=1, le=10),
):
    """
    Search for competitors in a specific market.
    
    This is a lightweight endpoint that only performs the search step
    without full analysis. Useful for getting a quick list of competitors.
    
    No authentication required - public endpoint for testing.
    """
    print(f"[Competitor Search] {business_type} in {city}")
    
    try:
        from credora.agents.competitor import get_mcp_server, create_search_agent
        
        # TODO: Implement lightweight search using just the Search Agent
        # For now, return a placeholder response
        return {
            "status": "success",
            "message": f"Searching for {business_type} competitors in {city}",
            "competitors": [],
            "note": "Full implementation requires running Search Agent",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/competitor/report/content")
async def get_report_content(
    request: Request,
    path: str = Query(..., description="Report file path"),
):
    """
    Get the content of a competitor analysis report.
    
    No authentication required - public endpoint for testing.
    """
    print(f"[Competitor Report] Content requested: {path}")
    
    try:
        import os
        
        # Security check - only allow files in current directory
        if not os.path.exists(path) or '..' in path or path.startswith('/'):
            raise HTTPException(status_code=404, detail="Report not found")
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "status": "success",
            "content": content,
            "path": path
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading report: {str(e)}")


@app.get("/competitor/report/download")
async def download_report(
    request: Request,
    path: str = Query(..., description="Report file path"),
):
    """
    Download a competitor analysis report file.
    
    No authentication required - public endpoint for testing.
    """
    print(f"[Competitor Report] Download requested: {path}")
    
    try:
        import os
        from fastapi.responses import FileResponse
        
        # Security check - only allow files in current directory
        if not os.path.exists(path) or '..' in path or path.startswith('/'):
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Get filename for download
        filename = os.path.basename(path)
        
        return FileResponse(
            path=path,
            filename=filename,
            media_type='text/plain',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading report: {str(e)}")


@app.post("/competitor/quick-analyze")
async def quick_analyze_competitor(
    request: Request,
    url: str = Query(..., description="Competitor website URL"),
):
    """
    Quick analysis of a single competitor website.
    
    Performs a lightweight scrape and analysis of one competitor URL.
    
    No authentication required - public endpoint for testing.
    """
    print(f"[Competitor Quick] URL: {url}")
    
    try:
        # Use playwright directly for quick scrape
        from playwright.async_api import async_playwright
        from bs4 import BeautifulSoup
        import re
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()
            
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            
            title = await page.title()
            html = await page.content()
            
            await browser.close()
        
        # Parse and analyze
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.find_all(["script", "style", "noscript"]):
            tag.decompose()
        
        text = soup.get_text(separator="\n", strip=True).lower()
        
        # Analyze indicators
        analysis = {
            "url": url,
            "title": title,
            "strategies": {
                "shows_prices": any(x in text for x in ["rs.", "pkr", "/-", "rupee"]),
                "has_discounts": any(x in text for x in ["sale", "discount", "% off", "offer"]),
                "offers_delivery": any(x in text for x in ["delivery", "shipping", "cod"]),
                "has_reviews": any(x in text for x in ["review", "rating", "customer"]),
                "has_whatsapp": "whatsapp" in text or bool(re.search(r'03\d{9}', text)),
            },
            "content_length": len(text),
        }
        
        # Calculate score
        score = sum(1 for v in analysis["strategies"].values() if v)
        analysis["strategy_score"] = f"{score}/5"
        
        return {
            "status": "success",
            "analysis": analysis,
        }
        
    except Exception as e:
        print(f"[Competitor Quick] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# System Status Endpoints
# ============================================================================

@app.get("/status/services")
async def get_services_status(request: Request):
    """Get status of all backend services."""
    user = require_auth(request)
    
    services = []
    
    # Check Python API (self)
    services.append({
        "service": "python_api",
        "status": "healthy",
        "responseTime": 5,
        "lastChecked": datetime.now().isoformat(),
    })
    
    # Check Java FPA Engine
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            start = datetime.now()
            # Java engine health endpoint is at /api/health
            response = await client.get(f"{JAVA_ENGINE_URL}/api/health")
            response_time = (datetime.now() - start).total_seconds() * 1000
            
            if response.status_code == 200:
                services.append({
                    "service": "java_engine",
                    "status": "healthy",
                    "responseTime": int(response_time),
                    "lastChecked": datetime.now().isoformat(),
                })
            else:
                services.append({
                    "service": "java_engine",
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "lastChecked": datetime.now().isoformat(),
                })
    except Exception as e:
        services.append({
            "service": "java_engine",
            "status": "unhealthy",
            "error": str(e),
            "lastChecked": datetime.now().isoformat(),
        })
    
    return services

def run_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the API server."""
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_api_server()
