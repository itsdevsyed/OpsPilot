import logging

from app.db.base import Base
from app.db.session import engine

from app.db import models  # noqa: F401

logger = logging.getLogger(__name__)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured")
