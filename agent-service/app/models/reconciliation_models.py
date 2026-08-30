from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class ReconciliationAgentStructuredOutput(BaseModel):
    primaryHypothesis: Literal[
        "TDS", "MDR", "GST", "PARTIAL_PAYMENT", "REFUND",
        "WRONG_INVOICE", "DUPLICATE_PAYMENT", "UNALLOCATED_PAYMENT", "UNKNOWN"
    ] = Field(..., description="Most defensible hypothesis explaining payment discrepancy based strictly on evidence.")
    reason: str = Field(..., description="Clear operational explanation for primary hypothesis.")
    evidence: List[str] = Field(default_factory=list, description="Bulleted factual evidence strings supporting conclusion.")
    alternativeHypotheses: List[str] = Field(default_factory=list, description="Plausible secondary or alternative hypotheses considered.")
    recommendedAction: str = Field(..., description="Actionable next step for financial operations operator.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0 reflecting evidence strength.")

class RunReconciliationAgentRequest(BaseModel):
    exceptionId: Optional[str] = Field(None, description="UUID of reconciliation exception in Supabase")
    invoiceId: Optional[str] = Field(None, description="UUID or number of linked invoice")
    invoiceNumber: Optional[str] = Field(None, description="Invoice number e.g. INV-1039")

class RunReconciliationAgentResponse(BaseModel):
    success: bool
    exceptionId: str
    invoiceId: str
    paymentId: str
    customerId: str
    invoiceNumber: str
    customerName: str
    expectedAmount: float
    receivedAmount: float
    difference: float
    allocatedAmount: float
    unallocatedAmount: float
    primaryHypothesis: str
    reason: str
    evidence: List[str]
    alternativeHypotheses: List[str]
    recommendedAction: str
    confidence: float
    policyDecision: str
    policyReason: str
    rulesTriggered: List[str]
    safeAction: str

    # Phase 5.5 Business Logic Hardening Additions
    hasConflict: bool = False
    conflictReason: Optional[str] = None
    conflictDetails: List[str] = Field(default_factory=list)
    evidenceQualityScore: float = 0.5
    level1Evidence: List[str] = Field(default_factory=list)
    level2Evidence: List[str] = Field(default_factory=list)
    level3Evidence: List[str] = Field(default_factory=list)
    level4Evidence: List[str] = Field(default_factory=list)
    humanReviewReason: Optional[str] = None
    humanReviewDetails: Optional[Dict[str, Any]] = None

    agentRunId: Optional[str] = None
    agentDecisionId: Optional[str] = None
