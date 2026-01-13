"""
Credora Services Module.

Contains service classes for:
- Data sync (platform data ingestion)
- FPA caching (database-backed computation caching)
- Storage (session and chat history persistence)
"""

from credora.services.data_sync import (
    DataSyncService,
    get_data_sync_service,
    sync_platform,
    sync_all_platforms,
)

from credora.services.fpa_cache import (
    FPACacheService,
    get_fpa_cache_service,
    get_cached_pnl,
    get_cached_forecast,
)

from credora.services.storage import (
    SessionStore,
    ChatHistoryStore,
    get_session_store,
    get_chat_history_store,
)

__all__ = [
    # Data sync
    "DataSyncService",
    "get_data_sync_service",
    "sync_platform",
    "sync_all_platforms",
    # FPA cache
    "FPACacheService",
    "get_fpa_cache_service",
    "get_cached_pnl",
    "get_cached_forecast",
    # Storage
    "SessionStore",
    "ChatHistoryStore",
    "get_session_store",
    "get_chat_history_store",
]

