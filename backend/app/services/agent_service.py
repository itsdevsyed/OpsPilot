from app.agent.graph import graph


def run_agent(question: str):

    result = graph.invoke(
        {
            "question": question,
            "logs": "",
            "answer": ""
        }
    )

    return result["answer"]
