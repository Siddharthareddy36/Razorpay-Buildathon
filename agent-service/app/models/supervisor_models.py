from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class SpecialistInsight(BaseModel):
    agent: Literal["RECEIVABLES", "P2P", "RECONCILIATION"]
    status: str
    headline: str
    details: Dict[str, Any] = Field(default_factory=dict)

class RunSupervisorRequest(BaseModel):
    query: str = Field(..., description="Natural language prompt or system question")
    invoiceNumber: Optional[str] = Field(None, description="Explicit invoice number e.g. INV-1002")
    customerId: Optional[str] = Field(None, description="Explicit customer UUID")
    promiseId: Optional[str] = Field(None, description="Explicit promise UUID")
    exceptionId: Optional[str] = Field(None, description="Explicit reconciliation exception UUID")

class RunSupervisorResponse(BaseModel):
    success: bool
    query: str
    intent: str
    selectedAgents: List[str]
    executiveSummary: str
    financialFacts: Dict[str, Any] = Field(default_factory=dict)
    agentInsights: List[SpecialistInsight] = Field(default_factory=list)
    crossAgentFindings: List[str] = Field(default_factory=list)
    hasConflict: bool = False
    conflictSummary: Optional[str] = None
    recommendedAction: str
    confidence: float
    policyDecision: str
    policyReason: str
    rulesTriggered: List[str] = Field(default_factory=list)
    agentRunId: Optional[str] = None
    auditId: Optional[str] = None
