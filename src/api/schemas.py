from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from .models import TaskStatus
from typing import Optional, Union

# Запрос от юзера на загрузку
class TaskCreateRequest(BaseModel):
    filename: str

# Ответ юзеру с сылкой для загрузки
class TaskCreateResponse(BaseModel):
    task_id: UUID
    upload_url: str  # Presigned URL для PUT запроса

# Запрос на старт обработки
class TaskProcessRequest(BaseModel):
    filter_type: str  # например: "yolo", "blur"

# Ответ о статусе задачи
class TaskStatusResponse(BaseModel):
    task_id: UUID
    status: TaskStatus
    original_filename: str
    filter_type: str | None = None
    original_file_url: str | None = None  # НОВОЕ: Ссылка на просмотр оригинала
    download_url: str | None = None       # Ссылка на просмотр результата
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    