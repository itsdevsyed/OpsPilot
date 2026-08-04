from langchain_groq import ChatGroq

from app.config.settings import settings


llm = ChatGroq(
    model=settings.MODEL_NAME,
    groq_api_key=settings.GROQ_API_KEY,
    temperature=0
)
