import os
from fastapi import FastAPI
from dotenv import load_dotenv
from app.api import health_router
from app.api.receivables import router as receivables_router
from app.api.p2p import router as p2p_router
from app.api.reconciliation_api import router as reconciliation_router
from app.api.supervisor_api import router as supervisor_router
from app.api.action_api import router as action_router

load_dotenv()

app = FastAPI(
    title="Multi-Agent Revenue Recovery & Receivables Intelligence Platform",
    description="Python FastAPI Multi-Agent Microservice powered by LangGraph & Gemini",
    version="1.0.0"
)

app.include_router(health_router)
app.include_router(receivables_router)
app.include_router(p2p_router)
app.include_router(reconciliation_router)
app.include_router(supervisor_router)
app.include_router(action_router)





@app.get("/health")
def root_health():
    return {
        "status": "ok",
        "service": "receivables-agent-service"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
