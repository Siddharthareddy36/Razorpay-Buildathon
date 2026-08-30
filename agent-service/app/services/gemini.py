import os
import json
import httpx
from typing import Dict, Any
from dotenv import load_dotenv
from app.models.agent_output import AgentStructuredOutput

load_dotenv()

SYSTEM_PROMPT = """You are an expert Receivables Intelligence Agent for B2B financial operations.
Analyze the provided normalized customer invoice context and baseline risk signals, then return a JSON assessment for collection prioritization.

Rules:
1. Use ONLY supplied facts. Never invent amounts, dates, or payment facts.
2. Do NOT calculate authoritative financial values or attempt ledger state mutations.
3. Explain priority using clear evidence bullets referencing factual data provided.
4. Recommend a safe, operational collection next step.
5. If evidence is insufficient, explicitly state so.
6. Avoid aggressive collection recommendations if active customer dispute exists.
7. Return ONLY valid JSON matching this schema:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priorityReason": "Concise summary explaining why this invoice has this priority",
  "evidence": ["Bullet point 1 referencing facts", "Bullet point 2 referencing facts"],
  "recommendedAction": "Concrete operational next step for collections team",
  "confidence": 0.95
}"""

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
]

def call_gemini_api(context_payload: Dict[str, Any]) -> AgentStructuredOutput | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return None

    prompt = f"{SYSTEM_PROMPT}\n\nContext JSON:\n{json.dumps(context_payload, indent=2)}"

    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    with httpx.Client(timeout=15.0) as client:
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                res = client.post(url, headers=headers, json=body)
                if res.status_code != 200:
                    continue

                data = res.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    continue

                text = candidates[0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                
                # Normalize priority uppercase string
                if "priority" in parsed and isinstance(parsed["priority"], str):
                    parsed["priority"] = parsed["priority"].upper()
                
                # Ensure evidence is a list of strings
                if "evidence" in parsed and isinstance(parsed["evidence"], str):
                    parsed["evidence"] = [parsed["evidence"]]

                return AgentStructuredOutput(**parsed)
            except Exception as e:
                print(f"Gemini API model {model_name} invocation failed: {e}")
                continue

    return None

P2P_SYSTEM_PROMPT = """You are an expert Promise-to-Pay (P2P) Intelligence Agent for B2B financial operations.
Analyze the provided normalized customer promise context, fulfillment metrics, historical commitment reliability, and communication signals, then return a JSON operational assessment.

Business Questions to Answer:
1. What did the customer promise to pay, and did they fulfill it based on payment evidence?
2. How reliable is this commitment based on their historical behavior?
3. What specific operational action should the collections team take next?

CRITICAL RULES:
1. Use ONLY supplied financial facts. Never invent amounts, dates, payments, or promise records.
2. The LLM does NOT calculate financial truth—financial amounts and fulfillment ratios are pre-computed in Python.
3. Distinguish between CURRENT PROMISE STATUS (e.g., ACTIVE, BROKEN, FULFILLED) and CUSTOMER COMMITMENT RELIABILITY (e.g., HIGH, MEDIUM, LOW, CRITICAL).
4. Explain your assessment using factual evidence bullet strings referencing the provided data.
5. If evidence shows active invoice disputes or open reconciliation exceptions, recommend human review before aggressive escalation.
6. Return ONLY valid JSON matching this schema:
{
  "promiseAssessment": "RELIABLE" | "AT_RISK" | "BROKEN" | "PARTIALLY_FULFILLED" | "FULFILLED",
  "reason": "Clear 1-2 sentence explanation of assessment",
  "evidence": ["Factual bullet point 1", "Factual bullet point 2", "Factual bullet point 3"],
  "recommendedAction": "Concrete operational collection next step",
  "confidence": 0.95
}"""

from app.models.p2p import P2PAgentStructuredOutput

def call_p2p_gemini_api(context_payload: Dict[str, Any]) -> P2PAgentStructuredOutput | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return None

    prompt = f"{P2P_SYSTEM_PROMPT}\n\nContext JSON:\n{json.dumps(context_payload, indent=2)}"

    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    with httpx.Client(timeout=15.0) as client:
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                res = client.post(url, headers=headers, json=body)
                if res.status_code != 200:
                    continue

                data = res.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    continue

                text = candidates[0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                
                # Normalize promiseAssessment uppercase string
                if "promiseAssessment" in parsed and isinstance(parsed["promiseAssessment"], str):
                    parsed["promiseAssessment"] = parsed["promiseAssessment"].upper()
                
                # Ensure evidence is a list of strings
                if "evidence" in parsed and isinstance(parsed["evidence"], str):
                    parsed["evidence"] = [parsed["evidence"]]

                return P2PAgentStructuredOutput(**parsed)
            except Exception as e:
                print(f"Gemini P2P API model {model_name} invocation failed: {e}")
                continue

    return None

RECONCILIATION_SYSTEM_PROMPT = """You are an expert Reconciliation Intelligence Agent for B2B financial operations.
Analyze the provided normalized reconciliation context, evidence hierarchy (Level 1 Facts > Level 2 Metadata > Level 3 History > Level 4 Comms), conflict status, and candidate hypotheses, then return a JSON operational assessment.

Business Questions to Answer:
1. Why does the money received differ from what was expected?
2. What factual evidence explains the difference?
3. What specific operational action should the finance operator take next?

CRITICAL RULES:
1. EVIDENCE HIERARCHY: Level 1 Direct Financial Facts (Expected/Received math, payment allocations) strictly override Level 4 Communication claims. Never override financial math based solely on customer claims.
2. FINANCIAL MUTATION PROHIBITION: You MUST NEVER recommend writing off balances ("write off ₹25,000"), changing invoice totals, marking invoices fully paid automatically, or posting accounting entries.
3. SAFE ACTIONS ONLY: Recommend audit/verification steps only (e.g. "Verify Form 16A withholding certificate", "Request gateway fee statement", "Audit payment allocations").
4. CONFLICT HANDLING: If has_conflict is true or evidence is inconclusive, select UNKNOWN and recommend human operator review. Do NOT fabricate certainty.
5. Select primaryHypothesis from: TDS, MDR, GST, PARTIAL_PAYMENT, REFUND, WRONG_INVOICE, DUPLICATE_PAYMENT, UNALLOCATED_PAYMENT, or UNKNOWN.
6. Return ONLY valid JSON matching this schema:
{
  "primaryHypothesis": "TDS" | "MDR" | "GST" | "PARTIAL_PAYMENT" | "REFUND" | "WRONG_INVOICE" | "DUPLICATE_PAYMENT" | "UNALLOCATED_PAYMENT" | "UNKNOWN",
  "reason": "Clear 1-2 sentence operational explanation",
  "evidence": ["Bulleted factual evidence 1", "Bulleted factual evidence 2"],
  "alternativeHypotheses": ["Secondary candidate hypothesis 1"],
  "recommendedAction": "Concrete safe action for finance operator",
  "confidence": 0.92
}"""


from app.models.reconciliation_models import ReconciliationAgentStructuredOutput

def call_reconciliation_gemini_api(context_payload: Dict[str, Any]) -> ReconciliationAgentStructuredOutput | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return None

    prompt = f"{RECONCILIATION_SYSTEM_PROMPT}\n\nContext JSON:\n{json.dumps(context_payload, indent=2)}"

    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    with httpx.Client(timeout=15.0) as client:
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                res = client.post(url, headers=headers, json=body)
                if res.status_code != 200:
                    continue

                data = res.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    continue

                text = candidates[0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                
                # Normalize primaryHypothesis uppercase string
                if "primaryHypothesis" in parsed and isinstance(parsed["primaryHypothesis"], str):
                    parsed["primaryHypothesis"] = parsed["primaryHypothesis"].upper()
                
                # Ensure evidence & alternativeHypotheses are lists
                if "evidence" in parsed and isinstance(parsed["evidence"], str):
                    parsed["evidence"] = [parsed["evidence"]]
                if "alternativeHypotheses" in parsed and isinstance(parsed["alternativeHypotheses"], str):
                    parsed["alternativeHypotheses"] = [parsed["alternativeHypotheses"]]

                return ReconciliationAgentStructuredOutput(**parsed)
            except Exception as e:
                print(f"Gemini Reconciliation API model {model_name} invocation failed: {e}")
                continue

    return None


