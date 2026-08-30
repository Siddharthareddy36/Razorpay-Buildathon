from typing import Dict, Any, List

def calculate_customer_commitment_reliability(
    customer_promises: List[Dict[str, Any]],
    current_promise_id: str,
    deterministic_promise_state: str,
    fulfillment_ratio: float,
    days_past_promise: int,
    customer_risk_score: int = 50,
) -> Dict[str, Any]:
    """
    Evaluates customer promise history and computes Customer Commitment Reliability score (HIGH, MEDIUM, LOW, CRITICAL).
    """
    # Exclude or isolate current promise from historical baseline
    past_promises = [p for p in customer_promises if str(p.get("id")) != str(current_promise_id)]
    
    total_count = len(past_promises)
    fulfilled_count = 0
    partial_count = 0
    broken_count = 0
    cancelled_count = 0
    total_promised_sum = 0.0
    total_fulfilled_sum = 0.0

    for p in past_promises:
        st = str(p.get("status", "")).upper()
        amt = float(p.get("promised_amount", 0.0))
        total_promised_sum += amt

        if st in ["FULFILLED", "COMPLETED"]:
            fulfilled_count += 1
            total_fulfilled_sum += amt
        elif st in ["PARTIALLY_FULFILLED", "PARTIAL"]:
            partial_count += 1
            total_fulfilled_sum += amt * 0.5
        elif st in ["BROKEN", "DEFAULTED", "FAILED"]:
            broken_count += 1
        elif st in ["CANCELLED", "VOID"]:
            cancelled_count += 1
        else:
            # Active or pending past promises
            if st == "ACTIVE":
                # If promised_date has passed, consider it broken in historical analysis
                p_date_str = str(p.get("promised_date", ""))
                if p_date_str and p_date_str < "2026-08-30":
                    broken_count += 1
                else:
                    fulfilled_count += 1

    broken_ratio = 0.0 if total_count == 0 else broken_count / total_count
    hist_fulfillment_ratio = 0.0 if total_count == 0 else (fulfilled_count + partial_count * 0.5) / total_count
    avg_promised_amt = 0.0 if total_count == 0 else total_promised_sum / total_count
    avg_fulfilled_amt = 0.0 if total_count == 0 else total_fulfilled_sum / total_count

    # Determine Recent Broken Trend
    if total_count == 0:
        recent_broken_trend = "NO_HISTORY"
    elif broken_count >= 2:
        recent_broken_trend = "REPEATED_BROKEN"
    elif broken_count == 1 and total_count > 1:
        # Check if the most recent promise was broken
        latest_st = str(past_promises[0].get("status", "")).upper() if past_promises else ""
        if latest_st in ["BROKEN", "DEFAULTED"]:
            recent_broken_trend = "DETERIORATING"
        else:
            recent_broken_trend = "IMPROVING"
    elif broken_count == 0 and total_count >= 1:
        recent_broken_trend = "STABLE_FULFILLMENT"
    else:
        recent_broken_trend = "STABLE_FULFILLMENT"

    # Deterministic Commitment Reliability Rules (HIGH, MEDIUM, LOW, CRITICAL)
    # Note: Reliability evaluates customer's track record and current overdue severity.
    if broken_ratio >= 0.50 or recent_broken_trend == "REPEATED_BROKEN" or (days_past_promise > 7 and fulfillment_ratio == 0):
        commitment_reliability = "CRITICAL"
    elif broken_ratio >= 0.25 or broken_count >= 1 or (days_past_promise > 2 and fulfillment_ratio == 0) or customer_risk_score >= 75:
        commitment_reliability = "LOW"
    elif broken_ratio < 0.25 and (deterministic_promise_state in ["ACTIVE", "PARTIALLY_FULFILLED"] or days_past_promise <= 0):
        commitment_reliability = "MEDIUM"
    elif broken_ratio < 0.10 and (deterministic_promise_state == "FULFILLED" or hist_fulfillment_ratio >= 0.80):
        commitment_reliability = "HIGH"
    else:
        commitment_reliability = "MEDIUM"

    return {
        "historical_promise_count": total_count,
        "historical_fulfilled_count": fulfilled_count,
        "historical_partial_count": partial_count,
        "historical_broken_count": broken_count,
        "historical_cancelled_count": cancelled_count,
        "historical_broken_ratio": round(broken_ratio, 4),
        "historical_fulfillment_ratio": round(hist_fulfillment_ratio, 4),
        "historical_average_promised_amount": round(avg_promised_amt, 2),
        "historical_average_fulfillment_amount": round(avg_fulfilled_amt, 2),
        "recent_broken_trend": recent_broken_trend,
        "commitment_reliability": commitment_reliability,
    }
