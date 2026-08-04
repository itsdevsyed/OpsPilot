from pathlib import Path
from langchain_core.tools import tool

LOG_FILE = Path("app/logs/application.log")


@tool
def read_logs() -> str:
    """Read the latest application logs."""

    print(f"Reading logs from: {LOG_FILE.resolve()}")

    if not LOG_FILE.exists():
        return f"Log file not found: {LOG_FILE.resolve()}"

    content = LOG_FILE.read_text(encoding="utf-8")

    print("========== FILE CONTENT ==========")
    print(content)
    print("==================================")

    return content
