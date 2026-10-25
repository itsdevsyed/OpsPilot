import os
from pathlib import Path
from langchain_core.tools import tool

# Resolves relative to backend app directory by default, configurable via env var
_DEFAULT_LOG = Path(__file__).resolve().parent.parent / "logs" / "application.log"
LOG_FILE = Path(os.getenv("LOG_FILE_PATH", str(_DEFAULT_LOG)))


@tool
def read_logs() -> str:
    """Read the latest application logs."""

    if LOG_FILE.exists():
        return LOG_FILE.read_text(encoding="utf-8")

    if LOG_FILE == _DEFAULT_LOG:
        alt = Path("app/logs/application.log")
        if alt.exists():
            return alt.read_text(encoding="utf-8")

    return f"Log file not found: {LOG_FILE.resolve()}"

    print("========== FILE CONTENT ==========")
    print(content)
    print("==================================")

    return content
