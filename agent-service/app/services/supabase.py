import os
import time
import logging
import httpx
from typing import Callable, TypeVar, Any, Optional
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("p2p_supabase")
logger.setLevel(logging.INFO)

_supabase_client: Client | None = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.")
        
        custom_httpx = httpx.Client(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
        _supabase_client = create_client(url, key, options=ClientOptions(httpx_client=custom_httpx))
    return _supabase_client

T = TypeVar("T")

class SupabaseTransientError(Exception):
    """Raised when a Supabase PostgREST query fails after exhausting transient retries."""
    def __init__(self, message: str, component: str = "database", attempts: int = 1, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.component = component
        self.attempts = attempts
        self.original_error = original_error

def is_retryable_exception(exc: Exception) -> bool:
    """Classifies whether an exception is a transient network/socket failure."""
    if isinstance(exc, (httpx.ReadError, httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout, httpx.NetworkError, httpx.PoolTimeout, httpx.CloseError)):
        return True
    
    if isinstance(exc, OSError):
        # Catches WinError 10035, WSAEWOULDBLOCK, connection reset by peer, socket errors
        return True

    err_str = str(exc).lower()
    transient_keywords = [
        "10035", "non-blocking socket", "wsarecv", "wsasend", "connection closed",
        "read error", "connect error", "timeout", "networkerror", "connection reset",
        "temporarily unavailable", "service unavailable", "502 bad gateway", "503 service unavailable", "504 gateway timeout"
    ]
    if any(kw in err_str for kw in transient_keywords):
        # Exclude permanent DB schema/auth errors
        non_retryable_keywords = ["22p02", "42p01", "invalid input syntax", "relation", "does not exist", "401", "403", "unauthorized", "forbidden"]
        if not any(nk in err_str for nk in non_retryable_keywords):
            return True

    return False

def execute_supabase_with_retry(
    query_fn: Callable[[], T],
    component_name: str = "database",
    max_retries: int = 3,
    initial_delay: float = 0.2,
) -> T:
    """Executes a Supabase query with bounded exponential backoff for transient network errors."""
    delay = initial_delay
    last_exception: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            return query_fn()
        except Exception as exc:
            last_exception = exc
            if not is_retryable_exception(exc):
                logger.warning(f"[Supabase] Non-retryable error in '{component_name}' (attempt {attempt}/{max_retries}): {exc}")
                raise exc
            
            logger.warning(
                f"[Supabase] Transient network failure in '{component_name}' (attempt {attempt}/{max_retries}): {exc}. Retrying in {delay:.2f}s..."
            )
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2.0

    raise SupabaseTransientError(
        message=f"Supabase network read failed for '{component_name}' after {max_retries} attempts: {last_exception}",
        component=component_name,
        attempts=max_retries,
        original_error=last_exception,
    )
