FROM ghcr.io/astral-sh/uv:python3.13-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1
ENV UV_NO_CACHE=1

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN uv pip install --system .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
