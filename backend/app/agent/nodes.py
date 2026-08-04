from app.agent.state import AgentState
from app.tools.log_tool import read_logs
from app.llm.client import llm


def analyze_logs(state: AgentState):

    # Read logs from the tool
    logs = read_logs.invoke({})

    print("\n========== LOGS FROM TOOL ==========")
    print(repr(logs))
    print("====================================")

    prompt = f"""
You are a Senior DevOps Engineer.

Your job is to analyze ONLY the logs provided below.

Rules:
1. Do NOT invent problems.
2. Do NOT ask the user for more information.
3. Do NOT mention API keys, authentication, tokens, or credentials unless they appear in the logs.
4. Base your answer ONLY on the logs.
5. If the logs do not contain enough information, explicitly say so.

User Question:
{state["question"]}

Application Logs:
{logs}

Respond in exactly this format:

Problem:
...

Evidence:
...

Suggested Fix:
...
"""

    print("\n========== PROMPT SENT TO LLM ==========")
    print(prompt)
    print("========================================")

    response = llm.invoke(prompt)

    print("\n========== LLM RESPONSE ==========")
    print(response.content)
    print("==================================")

    return {
        "logs": logs,
        "answer": response.content
    }


def answer_directly(state: AgentState):

    response = llm.invoke(state["question"])

    return {
        "answer": response.content
    }


def route_question(state: AgentState):

    question = state["question"].lower()

    keywords = [
        "log",
        "error",
        "failure",
        "failed",
        "down",
        "crash",
        "timeout",
        "redis",
        "database",
        "application"
    ]

    for keyword in keywords:
        if keyword in question:
            return "analyze_logs"

    return "answer_directly"
