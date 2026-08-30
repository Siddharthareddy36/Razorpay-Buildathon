from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

ActionType = Literal[
    "SEND_PAYMENT_REMINDER",
    "REQUEST_TDS_DOCUMENT",
    "ESCALATE_COLLECTION_CASE",
    "CREATE_FINANCE_REVIEW_TASK",
    "NOTIFY_OPERATOR"
]

ChannelType = Literal["EMAIL", "WEBHOOK", "TASK_SYSTEM"]
PriorityType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
PolicyDecisionType = Literal["APPROVED", "HUMAN_REVIEW", "REJECTED"]
ApprovalStatus = Literal["NOT_REQUIRED", "PENDING_APPROVAL", "APPROVED", "REJECTED"]
WorkflowExecutionStatus = Literal[
    "PENDING", "COMPLETED", "FAILED", "BLOCKED_PAID_INVOICE",
    "BLOCKED_DISPUTE", "BLOCKED_IDEMPOTENCY", "BLOCKED_POLICY_REJECTED", "BLOCKED_HUMAN_REJECTED"
]

class ActionPlanRequest(BaseModel):
    query: Optional[str] = None
    invoiceId: Optional[str] = None
    customerId: Optional[str] = None
    promiseId: Optional[str] = None

class ActionPlan(BaseModel):
    actionId: str
    requestId: str
    idempotencyKey: str
    actionType: ActionType
    entityType: Literal["INVOICE", "CUSTOMER", "PROMISE", "RECONCILIATION_EXCEPTION"]
    invoiceId: Optional[str] = None
    invoiceNumber: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    promiseId: Optional[str] = None
    reason: str
    priority: PriorityType
    channel: ChannelType
    policyDecision: PolicyDecisionType
    policyReason: str
    requiresApproval: bool
    approvalStatus: ApprovalStatus
    createdAt: str
    expiresAt: str

class ActionExecutionRequest(BaseModel):
    actionPlan: ActionPlan
    humanApproval: Optional[bool] = None
    approvalNotes: Optional[str] = None

class ActionExecutionResponse(BaseModel):
    success: bool
    actionId: str
    requestId: str
    idempotencyKey: str
    status: WorkflowExecutionStatus
    reason: str
    providerResult: Dict[str, Any]
    executedAt: str
    isMockExecution: bool
    auditId: Optional[str] = None

class OutcomeTrackingRequest(BaseModel):
    invoiceId: str
    actionId: str
    observationWindowHours: Optional[int] = 72

class OutcomeTrackingResponse(BaseModel):
    success: bool
    invoiceId: str
    actionId: str
    outstandingBefore: float
    outstandingAfter: float
    paymentReceivedAfterAction: float
    recoveredAmount: float
    recoveryRatePercentage: float
    outcomeStatus: Literal["FULL_RECOVERY_OBSERVED", "PARTIAL_RECOVERY_OBSERVED", "NO_RECOVERY_OBSERVED"]
    observationWindowHours: int
    evaluatedAt: str
