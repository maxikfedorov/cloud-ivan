FROM python:3.12-slim

WORKDIR /app

# Системные зависимости для сборки asyncpg/psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY src/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код. Обрати внимание, мы копируем папку api в /app/api, 
# чтобы импорты внутри Python работали корректно (относительно корня)
COPY src/api/ /app/api/

ENV PYTHONPATH=/app

# Запускаем uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]