from langgraph.graph import StateGraph, START, END

from app.agent.state import AgentState
from app.agent.nodes import (
    analyze_logs,
    answer_directly,
    route_question,
)

builder = StateGraph(AgentState)

builder.add_node("analyze_logs", analyze_logs)
builder.add_node("answer_directly", answer_directly)

builder.add_conditional_edges(
    START,
    route_question,
)

builder.add_edge("analyze_logs", END)
builder.add_edge("answer_directly", END)

graph = builder.compile()
