import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
    DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
    DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "http://localhost:8000/api/auth/discord/callback")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    SESSION_SECRET = os.environ.get("SESSION_SECRET", "change_this_to_a_long_random_string_at_least_32_chars")
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./gamemoa.db")

settings = Settings()
