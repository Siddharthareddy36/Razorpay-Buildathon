import re
from typing import Dict, Any, List, Optional
from app.services.supabase import get_supabase_client

UUID_PATTERN = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

def classify_supervisor_intent(query: str) -> str:
    """
    Deterministic Intent Classifier for Supervisor queries (Phase 6.1 Hardened).
    """
    q = query.lower().strip()

    # 1. Multi-domain conflict / cross-domain investigation (Case 4 & Case 5)
    if "cross-domain" in q or "cross domain" in q or "all three" in q:
        return "CROSS_DOMAIN_INVESTIGATION"
    if ("receivables" in q or "urgency" in q or "high" in q) and ("claims" in q or "payment made" in q or "dispute" in q or "conflict" in q):
        return "CROSS_DOMAIN_INVESTIGATION"
    if ("why outstanding" in q or "why delayed" in q or "why unpaid" in q or "why hasn't" in q or "why is inv" in q or "full status" in q or "what about" in q or "write off" in q):
        return "CROSS_DOMAIN_INVESTIGATION"
    if ("promise" in q or "commitment" in q) and ("overdue" in q or "mismatch" in q or "tds" in q or "differ" in q or "payment" in q):
        return "CROSS_DOMAIN_INVESTIGATION"
    if ("differ" in q or "mismatch" in q) and ("expected" in q or "amount" in q):
        return "CROSS_DOMAIN_INVESTIGATION"


    # 2. Reconciliation explicit clues (Case 3: Exception UUIDs, Form 16A, short pay, TDS)
    if "form 16a" in q or "reconciliation" in q or "short pay" in q or "short by" in q or "exception" in q or "tds withholding" in q:
        if "risk score" in q or "priority" in q or "overdue" in q:
            return "CROSS_DOMAIN_INVESTIGATION"
        return "RECONCILIATION"



    # 3. Promise questions
    p2p_kw = ["promise", "commitment", "trust this customer", "fulfilled promise", "broken promise", "pay date"]
    if any(kw in q for kw in p2p_kw):
        return "PROMISE"

    # 4. Portfolio summary questions
    portfolio_kw = ["portfolio", "total overdue", "overall receivables", "all invoices", "portfolio priority"]
    if any(kw in q for kw in portfolio_kw):
        return "PORTFOLIO_SUMMARY"

    # 5. Customer risk analysis questions
    customer_kw = ["customer risk", "account history", "customer profile", "credit risk", "customer status"]
    if any(kw in q for kw in customer_kw):
        return "CUSTOMER_ANALYSIS"

    # 6. Receivables questions
    rec_kw = ["invoice", "overdue", "collection", "priority", "exposure", "focus first", "which invoices", "owe the most", "customer"]
    if any(kw in q for kw in rec_kw):
        return "RECEIVABLES"

    # 7. Vague / Unknown / Ambiguous questions (Case 2: "What should I do today?")
    return "UNKNOWN"


def resolve_supervisor_entities(query: str, explicit_entities: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Entity Resolution Engine with Authoritative Supabase Existence Check (Phase 6.1 Hardened).
    """
    entities = explicit_entities.copy() if explicit_entities else {}
    supabase = get_supabase_client()

    entities["entity_not_found"] = False
    entities["missing_entity_id"] = None

    # 1. Regex match for explicit invoice numbers e.g. INV-1002, INV-SYNTH-10002, or "invoice 999999"
    inv_num_match = re.search(r'INV-[A-Z0-9-]+', query, re.IGNORECASE)
    if inv_num_match:
        entities["invoice_number"] = inv_num_match.group(0).upper()
    else:
        # Check for numeric pattern after keyword "invoice" e.g. "invoice 999999"
        digit_match = re.search(r'invoice\s+([A-Z0-9-]+)', query, re.IGNORECASE)
        if digit_match:
            raw_inv = digit_match.group(1).upper()
            if not raw_inv.startswith("INV-"):
                entities["invoice_number"] = f"INV-{raw_inv}"
            else:
                entities["invoice_number"] = raw_inv

    # 1B. Extract explicit Customer IDs e.g. CUST-999999 or "customer CUST-999999"
    cust_match = re.search(r'CUST-[A-Z0-9-]+', query, re.IGNORECASE) or re.search(r'customer\s+(CUST-[A-Z0-9-]+|[0-9]{4,})', query, re.IGNORECASE)
    if cust_match:
        raw_cust_id = (cust_match.group(1) if cust_match.lastindex else cust_match.group(0)).upper()
        if not raw_cust_id.startswith("CUST-") and not raw_cust_id.startswith("UUID"):
            raw_cust_id = f"CUST-{raw_cust_id}"
        cust_res = supabase.from_("customers").select("id, name").ilike("name", f"%{raw_cust_id}%").execute()
        if cust_res.data and len(cust_res.data) > 0:
            entities["customer_id"] = cust_res.data[0]["id"]
            entities["customer_name"] = cust_res.data[0]["name"]
        else:
            entities["entity_not_found"] = True
            entities["missing_entity_id"] = raw_cust_id
            return entities
    elif "blueorbit" in query.lower():
        cust_res = supabase.from_("customers").select("id, name").ilike("name", "%blueorbit%").execute()
        if cust_res.data and len(cust_res.data) > 0:
            entities["customer_id"] = cust_res.data[0]["id"]
            entities["customer_name"] = cust_res.data[0]["name"]



    # 2. Extract UUIDs (Exception UUIDs, Invoice UUIDs, Customer UUIDs)
    uuid_matches = re.findall(UUID_PATTERN, query, re.IGNORECASE)
    if uuid_matches:
        for u in uuid_matches:
            # Check if UUID exists in reconciliation_exceptions
            exc_check = supabase.from_("reconciliation_exceptions").select("id, invoice_id").eq("id", u).execute()
            if exc_check.data and len(exc_check.data) > 0:
                entities["exception_id"] = u
                entities["invoice_id"] = exc_check.data[0].get("invoice_id")
                break
            # Check if UUID exists in invoices
            inv_check = supabase.from_("invoices").select("id, invoice_number, customer_id").eq("id", u).execute()
            if inv_check.data and len(inv_check.data) > 0:
                entities["invoice_id"] = u
                entities["invoice_number"] = inv_check.data[0].get("invoice_number")
                entities["customer_id"] = inv_check.data[0].get("customer_id")
                break

    # 3. Perform database validation for invoice_number
    if entities.get("invoice_number") and not entities.get("invoice_id"):
        inv_res = supabase.from_("invoices").select("*").eq("invoice_number", entities["invoice_number"]).execute()
        if inv_res.data and len(inv_res.data) > 0:
            inv = inv_res.data[0]
            entities["invoice_id"] = inv["id"]
            entities["customer_id"] = inv.get("customer_id")
            entities["business_id"] = inv.get("business_id")
        else:
            # Case 1: Invoice referenced in query DOES NOT EXIST in database
            entities["entity_not_found"] = True
            entities["missing_entity_id"] = entities["invoice_number"]
            return entities

    # 4. If query mentions an exception UUID that DOES NOT exist in DB
    if "exception" in query.lower() and uuid_matches and not entities.get("exception_id"):
        # Check if the UUID exists anywhere in DB
        raw_exc_uuid = uuid_matches[0]
        exc_res = supabase.from_("reconciliation_exceptions").select("id").eq("id", raw_exc_uuid).execute()
        if not exc_res.data or len(exc_res.data) == 0:
            entities["entity_not_found"] = True
            entities["missing_entity_id"] = raw_exc_uuid
            return entities

    # 5. Resolve linked promise_id if invoice_id exists
    if entities.get("invoice_id") and not entities.get("promise_id"):
        p2p_res = supabase.from_("promises").select("id").eq("invoice_id", entities["invoice_id"]).order("created_at", desc=True).execute()
        if p2p_res.data and len(p2p_res.data) > 0:
            entities["promise_id"] = p2p_res.data[0]["id"]

    # 6. Resolve linked exception_id if invoice_id exists
    if entities.get("invoice_id") and not entities.get("exception_id"):
        exc_res = supabase.from_("reconciliation_exceptions").select("id").eq("invoice_id", entities["invoice_id"]).order("created_at", desc=True).execute()
        if exc_res.data and len(exc_res.data) > 0:
            entities["exception_id"] = exc_res.data[0]["id"]

    # 7. Resolve customer_name
    if entities.get("customer_id") and not entities.get("customer_name"):
        cust_res = supabase.from_("customers").select("name").eq("id", entities["customer_id"]).execute()
        if cust_res.data and len(cust_res.data) > 0:
            entities["customer_name"] = cust_res.data[0]["name"]

    return entities


def determine_specialist_selection(intent: str, entities: Dict[str, Any], query: str = "") -> List[str]:
    """
    Deterministic Specialist Selection & Minimization Engine (Part 4).
    Do NOT execute specialists for NOT_FOUND or UNKNOWN queries.
    """
    if entities.get("entity_not_found") or intent == "NOT_FOUND" or intent == "UNKNOWN":
        return []

    q = query.lower()

    if intent == "RECEIVABLES" or intent == "PORTFOLIO_SUMMARY":
        return ["RECEIVABLES"]
    if intent == "PROMISE":
        return ["P2P"]
    if intent == "RECONCILIATION":
        return ["RECONCILIATION"]
    if intent == "CUSTOMER_ANALYSIS":
        return ["RECEIVABLES", "P2P"]

    if intent == "CROSS_DOMAIN_INVESTIGATION":
        # Case 4: Risk score + TDS withholding -> Receivables + Reconciliation
        if ("risk score" in q or "priority" in q) and ("tds" in q or "reconciliation" in q or "withholding" in q):
            return ["RECEIVABLES", "RECONCILIATION"]

        # Case 5 & General why outstanding -> Receivables + P2P + Reconciliation if invoice exists
        if entities.get("invoice_id") or entities.get("invoice_number"):
            return ["RECEIVABLES", "P2P", "RECONCILIATION"]
        return ["RECEIVABLES", "P2P"]

    return []
