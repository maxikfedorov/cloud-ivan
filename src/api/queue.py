import os
from redis import Redis
from rq import Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Синхронный клиент Redis для RQ. 
# В Enterprise для FastAPI используют асинхронные брокеры (например, ARQ или Celery+RabbitMQ), 
# но для учебного проекта синхронный вызов к быстрому In-Memory Redis приемлем.
redis_conn = Redis.from_url(REDIS_URL)
task_queue = Queue('media_tasks', connection=redis_conn)