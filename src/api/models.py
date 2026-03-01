import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from .database import Base

class TaskStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"       # Файл загружен в сырой бакет
    QUEUED = "QUEUED"           # Задача отправлена в Redis
    PROCESSING = "PROCESSING"   # Воркер взял в работу (опционально, RQ сам трекает, но для консистентности)
    COMPLETED = "COMPLETED"     # Готово
    FAILED = "FAILED"           # Ошибка

class MediaTask(Base):
    __tablename__ = "media_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    original_filename = Column(String, nullable=False)
    input_object_name = Column(String, nullable=False, unique=True) # Имя файла в MinIO (raw)
    output_object_name = Column(String, nullable=True)              # Имя файла в MinIO (processed)
    status = Column(Enum(TaskStatus), default=TaskStatus.UPLOADED, nullable=False)
    filter_type = Column(String, nullable=True)                     # yolo, grayscale и т.д.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())