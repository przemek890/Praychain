FROM python:3.12-slim

WORKDIR /builder

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.in-project true && \
    poetry install --no-root --no-interaction --no-ansi --only main

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
