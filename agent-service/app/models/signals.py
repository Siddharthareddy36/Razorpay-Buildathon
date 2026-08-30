from pydantic import BaseModel, Field
from typing import List

class DeterministicSignals(BaseModel):
    outstandingAmount: float
    daysOverdue: int
    averagePaymentDelayDays: int = 0
    overdueInvoiceCount: int = 0
    totalPromises: int = 0
    brokenPromiseCount: int = 0
    hasActivePromise: bool = False
    hasBrokenPromise: bool = False
    hasOpenException: bool = False
    hasDispute: bool = False
    hasPartialPayment: bool = False
    recentCommunicationCount: int = 0
    recentInboundCount: int = 0
    recentOutboundCount: int = 0
    paymentCount: int = 0

class BaselineAnalysis(BaseModel):
    invoiceId: str
    invoiceNumber: str
    outstandingAmount: float
    daysOverdue: int
    signals: DeterministicSignals
    baselineScore: float
    baselinePriority: str  # 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    signalSummary: List[str] = Field(default_factory=list)
