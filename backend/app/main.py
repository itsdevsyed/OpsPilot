from fastapi import FastAPI

from app.api.chat import router as chat_router


app = FastAPI(
    title="OpsPilot AI",
    version="1.0.0"
)


app.include_router(
    chat_router,
    prefix="/api"
)


@app.get("/")
def home():
    return {
        "message": "OpsPilot AI is running on Groq Cloud"
    }
