from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class P2PAgentStructuredOutput(BaseModel):
    promiseAssessment: Literal["RELIABLE", "AT_RISK", "BROKEN", "PARTIALLY_FULFILLED", "FULFILLED"] = Field(
        ..., description="Assessment of promise status and fulfillment reliability."
    )
    reason: str = Field(..., description="Operational explanation based strictly on financial & historical facts.")
    evidence: List[str] = Field(default_factory=list, description="Array of bulleted factual evidence strings.")
    recommendedAction: str = Field(..., description="Actionable collections step recommended for operations team.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0.")

class RunP2PAgentRequest(BaseModel):
    promiseId: Optional[str] = Field(None, description="UUID of promise in Supabase")
    invoiceId: Optional[str] = Field(None, description="UUID or number of linked invoice")
    invoiceNumber: Optional[str] = Field(None, description="Invoice number e.g. INV-1002")

class RunP2PAgentResponse(BaseModel):
    success: bool
    promiseId: str
    invoiceId: str
    customerId: str
    invoiceNumber: str
    customerName: str
    promisedAmount: float
    promisedDate: str
    fulfilledAmount: float
    fulfillmentRatio: float
    daysUntilPromise: int
    daysPastPromise: int
    deterministicPromiseState: str
    commitmentReliability: str
    promiseAssessment: str
    reason: str
    evidence: List[str]
    recommendedAction: str
    confidence: float
    policyDecision: str
    policyReason: str
    rulesTriggered: List[str]
    safeAction: str
    agentRunId: Optional[str] = None
    agentDecisionId: Optional[str] = None
