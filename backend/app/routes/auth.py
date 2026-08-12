import secrets
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel

from app.database import get_db
from app.models import User, OAuthAccount, Session
from app.config import settings

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

# Helper functions
def create_session(db: DBSession, user_id: int) -> str:
    session_id = secrets.token_hex(64)
    expires_at = datetime.utcnow() + timedelta(days=30)
    db_session = Session(
        id=session_id,
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_session)
    db.commit()
    return session_id

def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User | None:
    session_id = request.cookies.get("gamemoa_session")
    if not session_id:
        return None
    db_session = db.query(Session).filter(Session.id == session_id).first()
    if not db_session:
        return None
    if db_session.expires_at < datetime.utcnow():
        db.delete(db_session)
        db.commit()
        return None
    return db_session.user

def set_session_cookie(response: Response, session_id: str, request: Request):
    is_localhost = request.url.hostname in ("localhost", "127.0.0.1")
    response.set_cookie(
        key="gamemoa_session",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=not is_localhost,
        max_age=30 * 24 * 60 * 60,
        path="/"
    )

def find_or_create_user(db: DBSession, provider: str, provider_user_id: str, email: str | None, name: str, avatar_url: str | None) -> User:
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.provider == provider,
        OAuthAccount.provider_user_id == provider_user_id
    ).first()
    
    if oauth_account:
        user = oauth_account.user
        if email and user.email != email:
            user.email = email
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
        if oauth_account.provider_email != email:
            oauth_account.provider_email = email
        db.commit()
        return user
    
    new_user = User(
        nickname=name,
        email=email,
        avatar_url=avatar_url
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    new_oauth = OAuthAccount(
        user_id=new_user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=email
    )
    db.add(new_oauth)
    db.commit()
    
    return new_user

class GoogleAuthRequest(BaseModel):
    credential: str

@auth_router.post("/google")
async def google_auth(data: GoogleAuthRequest, request: Request, response: Response, db: DBSession = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        userid = idinfo['sub']
        email = idinfo.get('email')
        name = idinfo.get('name', 'Google User')
        picture = idinfo.get('picture')
        
        user = find_or_create_user(
            db,
            provider="google",
            provider_user_id=userid,
            email=email,
            name=name,
            avatar_url=picture
        )
        
        session_id = create_session(db, user.id)
        set_session_cookie(response, session_id, request)
        
        providers = [acc.provider for acc in user.oauth_accounts]
        
        return {
            "authenticated": True,
            "user": {
                "id": user.id,
                "nickname": user.nickname,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "providers": providers,
                "created_at": user.created_at.isoformat()
            }
        }
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@auth_router.get("/discord")
async def discord_auth():
    state = secrets.token_urlsafe(32)
    discord_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={settings.DISCORD_CLIENT_ID}"
        f"&redirect_uri={settings.DISCORD_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=identify%20email"
        f"&state={state}"
    )
    response = RedirectResponse(url=discord_url)
    response.set_cookie(
        key="discord_oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=600
    )
    return response

@auth_router.get("/discord/callback")
async def discord_callback(request: Request, code: str, state: str, db: DBSession = Depends(get_db)):
    cookie_state = request.cookies.get("discord_oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")
    
    token_data = {
        "client_id": settings.DISCORD_CLIENT_ID,
        "client_secret": settings.DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.DISCORD_REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://discord.com/api/oauth2/token",
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to retrieve token")
        
        access_token = token_response.json().get("access_token")
        
        user_response = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to retrieve user info")
        
        user_info = user_response.json()
    
    user_id = user_info["id"]
    username = user_info["username"]
    email = user_info.get("email")
    avatar_hash = user_info.get("avatar")
    
    if avatar_hash:
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png"
    else:
        avatar_url = None
        
    user = find_or_create_user(
        db,
        provider="discord",
        provider_user_id=user_id,
        email=email,
        name=username,
        avatar_url=avatar_url
    )
    
    session_id = create_session(db, user.id)
    response = RedirectResponse(url=settings.FRONTEND_URL)
    set_session_cookie(response, session_id, request)
    response.delete_cookie("discord_oauth_state")
    
    return response

@auth_router.get("/me")
async def get_me(request: Request, db: DBSession = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return Response(content='{"authenticated": false}', media_type="application/json", status_code=401)
    
    providers = [acc.provider for acc in user.oauth_accounts]
    
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "providers": providers,
            "created_at": user.created_at.isoformat()
        }
    }

@auth_router.post("/logout")
async def logout(request: Request, response: Response, db: DBSession = Depends(get_db)):
    session_id = request.cookies.get("gamemoa_session")
    if session_id:
        db_session = db.query(Session).filter(Session.id == session_id).first()
        if db_session:
            db.delete(db_session)
            db.commit()
    
    response.delete_cookie("gamemoa_session", path="/")
    return {"success": True}
