from langchain_groq import ChatGroq

from app.config.settings import settings


api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else "gsk_dummy_dev_key"

llm = ChatGroq(
    model=settings.MODEL_NAME,
    groq_api_key=api_key,
    temperature=0
)
