### ---------- BUILDER ----------
FROM python:3.12-slim AS builder

WORKDIR /builder

# ffmpeg + ffprobe (do audio analysis)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.in-project true && \
    poetry install --no-root --no-interaction --no-ansi


### ---------- FINAL APP ----------
FROM python:3.12-slim AS app

WORKDIR /app

# Runtime: ffmpeg + ffprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /builder/.venv /app/.venv
COPY ./ ./

ENV PATH="/app/.venv/bin:$PATH"
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
