import os
import sys
import pytest
import httpx
from unittest.mock import MagicMock, patch

# Add parent dir to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.supabase import (
    execute_supabase_with_retry,
    is_retryable_exception,
    SupabaseTransientError,
)
from app.services.p2p_context import (
    fetch_p2p_context_by_promise_id,
    fetch_promise_id_by_lookup,
)
from app.nodes.p2p_nodes import load_p2p_context_node
from app.state.p2p_state import create_initial_p2p_state

class TestP2PNetworkHardening:

    def test_01_successful_payment_context_load(self):
        """Scenario 1: Normal successful query execution without retries."""
        mock_fn = MagicMock(return_value="SUCCESS")
        result = execute_supabase_with_retry(mock_fn, component_name="test_query", max_retries=3, initial_delay=0.01)
        assert result == "SUCCESS"
        assert mock_fn.call_count == 1

    def test_02_first_attempt_fails_retry_succeeds(self):
        """Scenario 2: First request fails with httpx.ReadError, second attempt succeeds."""
        mock_fn = MagicMock(side_effect=[httpx.ReadError("Read error [WinError 10035]"), "SUCCESS"])
        result = execute_supabase_with_retry(mock_fn, component_name="payments", max_retries=3, initial_delay=0.01)
        assert result == "SUCCESS"
        assert mock_fn.call_count == 2

    def test_03_two_failures_third_succeeds(self):
        """Scenario 3: First two attempts fail with ConnectError & ReadTimeout, third succeeds."""
        mock_fn = MagicMock(side_effect=[
            httpx.ConnectError("Connection refused"),
            httpx.ReadTimeout("Socket timeout"),
            "SUCCESS_THIRD_ATTEMPT"
        ])
        result = execute_supabase_with_retry(mock_fn, component_name="payments", max_retries=3, initial_delay=0.01)
        assert result == "SUCCESS_THIRD_ATTEMPT"
        assert mock_fn.call_count == 3

    def test_04_all_retries_fail_raises_transient_error(self):
        """Scenario 4: All 3 retries fail -> raises SupabaseTransientError with retryable=True."""
        mock_fn = MagicMock(side_effect=httpx.ReadError("Read error [WinError 10035]"))
        with pytest.raises(SupabaseTransientError) as exc_info:
            execute_supabase_with_retry(mock_fn, component_name="payments", max_retries=3, initial_delay=0.01)
        
        assert exc_info.value.component == "payments"
        assert exc_info.value.attempts == 3
        assert mock_fn.call_count == 3

    def test_05_invalid_uuid_non_retryable(self):
        """Scenario 5: Invalid UUID (PostgreSQL 22P02) raises immediately without retry."""
        invalid_uuid_error = Exception("PostgREST Error 22P02: invalid input syntax for type uuid: 'invalid-id'")
        mock_fn = MagicMock(side_effect=invalid_uuid_error)

        with pytest.raises(Exception) as exc_info:
            execute_supabase_with_retry(mock_fn, component_name="promise_lookup", max_retries=3, initial_delay=0.01)

        assert not is_retryable_exception(exc_info.value)
        assert mock_fn.call_count == 1  # No retries executed for permanent syntax errors!

    def test_06_authorization_query_failure_non_retryable(self):
        """Scenario 6: Auth failure (401 Unauthorized) raises immediately without retry."""
        auth_error = Exception("HTTP 401 Unauthorized: JWT expired or invalid key")
        mock_fn = MagicMock(side_effect=auth_error)

        with pytest.raises(Exception) as exc_info:
            execute_supabase_with_retry(mock_fn, component_name="auth_check", max_retries=3, initial_delay=0.01)

        assert not is_retryable_exception(exc_info.value)
        assert mock_fn.call_count == 1

    def test_07_missing_payment_context_handling(self):
        """Scenario 7: When payments are empty, context fetching handles missing payments gracefully."""
        mock_promise = {"id": "prm-101", "customer_id": "cust-101", "invoice_id": "inv-101", "promised_amount": 1000}
        mock_invoice = {"id": "inv-101", "amount": 1000, "due_date": "2026-08-01"}
        mock_customer = {"id": "cust-101", "name": "Acme Test Corp"}

        with patch("app.services.p2p_context.execute_supabase_with_retry") as mock_exec:
            mock_res_promise = MagicMock()
            mock_res_promise.data = [mock_promise]
            mock_res_invoice = MagicMock()
            mock_res_invoice.data = [mock_invoice]
            mock_res_cust = MagicMock()
            mock_res_cust.data = [mock_customer]
            mock_res_empty = MagicMock()
            mock_res_empty.data = []

            mock_exec.side_effect = [
                mock_res_promise, # promise
                mock_res_invoice, # invoice
                mock_res_cust,    # customer
                mock_res_empty,   # payment_allocations
                mock_res_empty,   # customer payments fallback
                mock_res_empty,   # customer promises
                mock_res_empty,   # communications
                mock_res_empty,   # exceptions
            ]

            ctx = fetch_p2p_context_by_promise_id("prm-101")
            assert ctx is not None
            assert ctx["promise"]["id"] == "prm-101"
            assert ctx["payments"] == []

    def test_08_missing_promise_handling(self):
        """Scenario 8: Non-existent promise returns None and sets workflow_status=FAILED."""
        state = create_initial_p2p_state("00000000-0000-0000-0000-000000000999")
        with patch("app.nodes.p2p_nodes.fetch_promise_id_by_lookup", return_value=None):
            update = load_p2p_context_node(state)
            assert update["workflow_status"] == "FAILED"
            assert "not found" in update["error"]
            assert update["retryable"] is False

    def test_09_missing_invoice_handling(self):
        """Scenario 9: Missing invoice record defaults to empty invoice without crashing."""
        mock_promise = {"id": "prm-102", "customer_id": "cust-102", "invoice_id": None, "promised_amount": 500}

        with patch("app.services.p2p_context.execute_supabase_with_retry") as mock_exec:
            mock_prm = MagicMock()
            mock_prm.data = [mock_promise]
            mock_empty = MagicMock()
            mock_empty.data = []

            mock_exec.side_effect = [
                mock_prm,   # promise
                mock_empty, # customer
                mock_empty, # customer promises
                mock_empty, # communications
            ]

            ctx = fetch_p2p_context_by_promise_id("prm-102")
            assert ctx is not None
            assert ctx["promise"]["id"] == "prm-102"
            assert ctx["invoice"] == {}

    def test_10_missing_customer_handling(self):
        """Scenario 10: Missing customer record defaults gracefully to empty customer dict."""
        mock_promise = {"id": "prm-103", "customer_id": "cust-missing", "invoice_id": None, "promised_amount": 500}

        with patch("app.services.p2p_context.execute_supabase_with_retry") as mock_exec:
            mock_prm = MagicMock()
            mock_prm.data = [mock_promise]
            mock_empty = MagicMock()
            mock_empty.data = []

            mock_exec.side_effect = [
                mock_prm,   # promise
                mock_empty, # customer
                mock_empty, # customer promises
                mock_empty, # communications
            ]

            ctx = fetch_p2p_context_by_promise_id("prm-103")
            assert ctx is not None
            assert ctx["customer"] == {}

if __name__ == "__main__":
    pytest.main(["-v", __file__])
