# Receivables Intelligence Agent Service (Python + FastAPI + LangGraph)

Python-based agent microservice for **AI Revenue Recovery & Receivables Intelligence**.

## Architecture Overview
- **Framework**: FastAPI (Port 8000)
- **Orchestration**: LangGraph
- **Reasoning**: Gemini 1.5 Pro / Flash API
- **Persistence**: Supabase PostgreSQL

## Running Locally

```bash
# Create virtual environment
py -3 -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI dev server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints
- `GET /health`: Health check endpoint
