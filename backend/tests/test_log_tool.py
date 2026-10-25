"""Unit tests for the log_tool module."""
from pathlib import Path
from unittest.mock import patch
from app.tools.log_tool import read_logs


def test_read_logs_file_exists(tmp_path):
    log_file = tmp_path / "test_app.log"
    log_file.write_text("2026-10-25 10:00:00 [ERROR] Database timeout", encoding="utf-8")

    with patch("app.tools.log_tool.LOG_FILE", log_file):
        output = read_logs.invoke({})
        assert "2026-10-25 10:00:00 [ERROR] Database timeout" in output


def test_read_logs_file_missing(tmp_path):
    missing_file = tmp_path / "non_existent.log"

    with patch("app.tools.log_tool.LOG_FILE", missing_file):
        output = read_logs.invoke({})
        assert "Log file not found" in output
