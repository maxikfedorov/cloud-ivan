import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import engine, Base
from .routers import router
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # При запуске приложения создаем таблицы в БД (если их нет)
    logger.info("Инициализация базы данных...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("База данных готова.")
    yield
    # Логика при выключении приложения
    await engine.dispose()

app = FastAPI(
    title="Computer Vision API",
    description="Асинхронный сервис для обработки медиа",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем наши эндпоинты
app.include_router(router)