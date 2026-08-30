from pydantic import BaseModel, Field
from typing import List, Optional

class RankedInvoiceItem(BaseModel):
    rank: int
    invoiceId: str
    invoiceNumber: str
    businessId: str
    customerId: str
    customerName: str
    amount: float
    paidAmount: float
    outstandingAmount: float
    dueDate: str
    daysOverdue: int
    baselineScore: float
    baselinePriority: str  # 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    agentPriority: str     # 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    priorityReason: str
    evidence: List[str] = Field(default_factory=list)
    recommendedAction: str
    confidence: float
    reasoningMode: str     # 'GEMINI' | 'DETERMINISTIC_FALLBACK'
    policyDecision: str    # 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW'
    policyReason: str
    rulesTriggered: List[str] = Field(default_factory=list)
    safeAction: str

class PortfolioRankRequest(BaseModel):
    topK: int = Field(10, ge=1, le=50)
    candidateK: int = Field(20, ge=1, le=100)

class PortfolioRankResponse(BaseModel):
    success: bool
    portfolioSize: int
    candidateCount: int
    finalRankedCount: int
    rankedInvoices: List[RankedInvoiceItem] = Field(default_factory=list)
    agentRunId: Optional[str] = None
