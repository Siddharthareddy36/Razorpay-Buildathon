from pydantic import BaseModel, Field
from typing import List, Optional

class InvoiceFact(BaseModel):
    invoiceId: str
    invoiceNumber: str
    businessId: str
    customerId: str
    amount: float
    paidAmount: float
    outstandingAmount: float
    dueDate: str
    daysOverdue: int
    status: str

class CustomerFact(BaseModel):
    customerId: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    averagePaymentDelayDays: int = 0
    totalInvoices: int = 0
    overdueInvoices: int = 0
    totalPromises: int = 0
    brokenPromises: int = 0

class PaymentFact(BaseModel):
    id: str
    amount: float
    status: str
    paymentMethod: Optional[str] = None
    reference: Optional[str] = None
    createdAt: Optional[str] = None

class PromiseFact(BaseModel):
    id: str
    promisedAmount: float
    promisedDate: str
    status: str
    originalMessage: Optional[str] = None

class CommunicationFact(BaseModel):
    id: str
    channel: str
    direction: str
    message: str
    createdAt: Optional[str] = None

class ExceptionFact(BaseModel):
    id: str
    status: str
    discrepancyAmount: float
    reason: Optional[str] = None

class NormalizedContext(BaseModel):
    invoice: InvoiceFact
    customer: CustomerFact
    payments: List[PaymentFact] = Field(default_factory=list)
    promises: List[PromiseFact] = Field(default_factory=list)
    communications: List[CommunicationFact] = Field(default_factory=list)
    exceptions: List[ExceptionFact] = Field(default_factory=list)
