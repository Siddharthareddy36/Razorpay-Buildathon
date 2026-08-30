from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.grounding import validate_evidence_grounding

def validate_output_node(state: ReceivablesState) -> Dict[str, Any]:
    errors = []

    priority = state.get("agent_priority")
    if priority not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        errors.append(f"Invalid agent priority enum: '{priority}'")

    confidence = state.get("confidence", 0.0)
    if not (0.0 <= confidence <= 1.0):
        errors.append(f"Confidence score out of bounds [0.0, 1.0]: {confidence}")

    if not state.get("priority_reason"):
        errors.append("Missing priority reason summary.")

    if not state.get("recommended_action"):
        errors.append("Missing recommended operational action.")

    # Validate evidence grounding against state facts
    evidence = state.get("evidence", [])
    grounding_valid, grounding_errors = validate_evidence_grounding(evidence, state)
    if not grounding_valid:
        errors.extend(grounding_errors)

    if errors:
        return {
            "validation_status": "INVALID",
            "validation_errors": errors,
        }

    return {
        "validation_status": "VALID",
        "validation_errors": [],
    }
