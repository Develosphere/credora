"""
OAuth Callback Server using FastAPI.

This module provides HTTP endpoints for handling OAuth callbacks
from Meta Ads, Google Ads, and Shopify platforms.

NOTE: This is a standalone OAuth server. The main api_server.py now handles
OAuth callbacks directly using FastMCP token manager. This file is kept for
backward compatibility but can be deprecated.

Requirements: 2.2
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
import httpx
import uvicorn

from credora.mcp_servers.fastmcp.token_manager import get_token_manager, TokenData


# OAuth state storage for CSRF protection
_oauth_states: Dict[str, Dict[str, Any]] = {}


def store_oauth_state(state: str, user_id: str, platform: str) -> None:
    """Store OAuth state for verification."""
    _oauth_states[state] = {
        "user_id": user_id,
        "platform": platform,
        "created_at": datetime.now(),
    }


def verify_oauth_state(state: str) -> Optional[str]:
    """Verify OAuth state and return user_id if valid."""
    state_data = _oauth_states.pop(state, None)
    if not state_data:
        return None
    # Check expiry (10 minutes)
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        return None
    return state_data.get("user_id")


# OAuth callback success page HTML - using string substitution to avoid CSS brace issues
def get_success_html(platform: str) -> str:
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
        .success-icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: #333;
            margin-bottom: 10px;
        }}
        p {{
            color: #666;
            line-height: 1.6;
        }}
        .platform {{
            color: #667eea;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Connection Successful!</h1>
        <p>Your <span class="platform">{platform}</span> account has been connected to Credora.</p>
        <p>You can now close this window and return to the CLI to start analyzing your data.</p>
    </div>
</body>
</html>
"""

# OAuth callback error page HTML - using string substitution to avoid CSS brace issues
def get_error_html(error: str) -> str:
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
        .error-icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: #333;
            margin-bottom: 10px;
        }}
        p {{
            color: #666;
            line-height: 1.6;
        }}
        .error-msg {{
            background: #fff5f5;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            padding: 12px;
            margin-top: 20px;
            color: #c53030;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Connection Failed</h1>
        <p>We couldn't connect your account. Please try again.</p>
        <div class="error-msg">{error}</div>
    </div>
</body>
</html>
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("OAuth callback server starting...")
    yield
    # Shutdown
    print("OAuth callback server shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Credora OAuth Callback Server",
    description="Handles OAuth callbacks for platform integrations",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Credora OAuth Server"}


@app.get("/oauth/callback/meta")
async def meta_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """
    Handle Meta (Facebook) OAuth callback.
    
    Args:
        code: Authorization code from Meta
        state: State parameter (contains user_id)
        error: Error code if authorization failed
        error_description: Error description
    """
    if error:
        return HTMLResponse(
            content=get_error_html(error_description or error),
            status_code=400,
        )
    
    if not code or not state:
        return HTMLResponse(
            content=get_error_html("Missing authorization code or state"),
            status_code=400,
        )
    
    try:
        # Verify state and get user_id
        user_id = verify_oauth_state(state)
        if not user_id:
            user_id = "default_user"
            print(f"Warning: State verification failed, using default user_id: {user_id}")
        
        # Get OAuth configuration
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
                return HTMLResponse(
                    content=get_error_html(f"Token exchange failed: {response.text}"),
                    status_code=400,
                )
            
            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                return HTMLResponse(
                    content=get_error_html("No access token in response"),
                    status_code=400,
                )
            
            # Store token using FastMCP token manager
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="meta",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=access_token,
                    expires_at=datetime.now() + timedelta(seconds=expires_in),
                )
            )
        
        return HTMLResponse(content=get_success_html("Meta Ads"))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(
            content=get_error_html(str(e)),
            status_code=500,
        )


@app.get("/oauth/callback/google")
async def google_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """
    Handle Google OAuth callback.
    
    Args:
        code: Authorization code from Google
        state: State parameter (contains user_id)
        error: Error code if authorization failed
    """
    if error:
        return HTMLResponse(
            content=get_error_html(f"Google authorization failed: {error}"),
            status_code=400,
        )
    
    if not code or not state:
        return HTMLResponse(
            content=get_error_html("Missing authorization code or state"),
            status_code=400,
        )
    
    try:
        # Verify state and get user_id
        user_id = verify_oauth_state(state)
        if not user_id:
            user_id = "default_user"
            print(f"Warning: State verification failed, using default user_id: {user_id}")
        
        # Get OAuth configuration
        redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/callback/google")
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
        
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
                return HTMLResponse(
                    content=get_error_html(f"Token exchange failed: {response.text}"),
                    status_code=400,
                )
            
            data = response.json()
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 3600)
            
            if not access_token:
                return HTMLResponse(
                    content=get_error_html("No access token in response"),
                    status_code=400,
                )
            
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
        
        return HTMLResponse(content=get_success_html("Google Ads"))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(
            content=get_error_html(str(e)),
            status_code=500,
        )


@app.get("/oauth/callback/shopify")
async def shopify_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    shop: Optional[str] = Query(None),
    hmac: Optional[str] = Query(None),
):
    """
    Handle Shopify OAuth callback.
    
    Args:
        code: Authorization code from Shopify
        state: State parameter (contains user_id)
        shop: Shop domain
        hmac: HMAC signature for verification
    """
    if not code or not state or not shop:
        return HTMLResponse(
            content=get_error_html("Missing required parameters"),
            status_code=400,
        )
    
    try:
        # Verify state and get user_id
        user_id = verify_oauth_state(state)
        if not user_id:
            user_id = "default_user"
            print(f"Warning: State verification failed, using default user_id: {user_id}")
        
        # Get OAuth configuration
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
                return HTMLResponse(
                    content=get_error_html(f"Token exchange failed: {response.text}"),
                    status_code=400,
                )
            
            data = response.json()
            access_token = data.get("access_token")
            
            if not access_token:
                return HTMLResponse(
                    content=get_error_html("No access token in response"),
                    status_code=400,
                )
            
            # Store token using FastMCP token manager
            # Shopify tokens don't expire
            token_manager = get_token_manager()
            await token_manager.store_token(
                user_id=user_id,
                platform="shopify",
                token_data=TokenData(
                    access_token=access_token,
                    refresh_token=None,
                    expires_at=None,
                    metadata={"shop_domain": shop},
                )
            )
        
        return HTMLResponse(content=get_success_html("Shopify"))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(
            content=get_error_html(str(e)),
            status_code=500,
        )


def run_oauth_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the OAuth callback server.
    
    Args:
        host: Host to bind to
        port: Port to listen on
    """
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_oauth_server()
