FROM python:3.12-bookworm AS builder

WORKDIR /builder

RUN pip install --upgrade pip && pip install poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.in-project true
RUN poetry install --no-root --no-interaction --no-ansi

FROM python:3.12-bookworm AS app

WORKDIR /app

RUN apt-get update && \
    apt-get install -y ffmpeg libsndfile1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./ ./

COPY --from=builder /builder/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH"

RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["/app/.venv/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
