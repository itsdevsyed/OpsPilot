"""Unit tests for LangGraph routing logic and state graph."""
from app.agent.nodes import route_question
from app.agent.graph import graph


def test_route_question_keywords():
    error_queries = [
        "Why is the application returning a 500 error?",
        "Check the latest log files please",
        "The redis service is failing to connect",
        "Is the database down?",
        "Worker process crash detected",
        "Connection timeout on payment gateway",
    ]

    for q in error_queries:
        state = {"question": q, "logs": "", "answer": ""}
        assert route_question(state) == "analyze_logs", f"Failed for query: {q}"


def test_route_question_general():
    general_queries = [
        "What is OpsPilot?",
        "Who is on call today?",
        "Tell me a joke about Kubernetes",
        "How do I configure Slack webhooks?",
    ]

    for q in general_queries:
        state = {"question": q, "logs": "", "answer": ""}
        assert route_question(state) == "answer_directly", f"Failed for query: {q}"


def test_graph_structure():
    # Verify LangGraph compiled state graph contains expected nodes
    nodes = graph.nodes
    assert "analyze_logs" in nodes
    assert "answer_directly" in nodes
