from pydantic import BaseModel, Field
from typing import List, Literal

class AgentStructuredOutput(BaseModel):
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    priorityReason: str
    evidence: List[str] = Field(default_factory=list)
    recommendedAction: str
    confidence: float
