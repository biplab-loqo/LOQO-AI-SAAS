# Re-export auth deps so existing imports keep working
from app.core.auth import get_current_user, get_current_active_user

__all__ = ["get_current_user", "get_current_active_user"]
