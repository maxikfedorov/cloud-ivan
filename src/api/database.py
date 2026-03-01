import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Берем URL из переменных окружения Docker, иначе fallback для локальной отладки
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://admin:password@localhost:5432/yolo_db"
)

# engine - точка подключения к БД. echo=True выводит SQL-запросы в консоль (удобно для дебага)
engine = create_async_engine(DATABASE_URL, echo=False)

# Фабрика сессий
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

# Dependency для FastAPI роутеров
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session