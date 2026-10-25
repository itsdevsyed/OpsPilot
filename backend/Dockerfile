FROM ghcr.io/astral-sh/uv:python3.12-alpine

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1

# Install build dependencies for C-extensions
































(aiokafka, psycopg)
RUN apk add --no-cache gcc musl-dev libffi-dev zlib-dev

COPY pyproject.toml ./

RUN uv pip install --system -r pyproject.toml

COPY app ./app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
