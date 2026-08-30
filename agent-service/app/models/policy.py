from pydantic import BaseModel, Field
from typing import List, Optional

class PolicyInputInvoice(BaseModel):
    status: str
    outstandingAmount: float
    daysOverdue: int

class PolicyInputSignals(BaseModel):
    hasDispute: bool = False
    hasOpenException: bool = False
    hasPartialPayment: bool = False

class PolicyInputAgent(BaseModel):
    priority: str  # 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    recommendedAction: str
    confidence: float

class PolicyInput(BaseModel):
    invoice: Optional[PolicyInputInvoice] = None
    signals: PolicyInputSignals = Field(default_factory=PolicyInputSignals)
    agent: Optional[PolicyInputAgent] = None
    error: Optional[str] = None

class PolicyDecision(BaseModel):
    decision: str  # 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW'
    reason: str
    rulesTriggered: List[str] = Field(default_factory=list)
    safeAction: Optional[str] = None
