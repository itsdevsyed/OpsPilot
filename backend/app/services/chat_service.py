from app.llm.client import llm


def get_response(message: str):

    response = llm.invoke(message)

    return response.content
