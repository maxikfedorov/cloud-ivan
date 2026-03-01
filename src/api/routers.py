from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from pydantic import BaseModel

from .database import get_db
from .models import MediaTask, TaskStatus
from .schemas import TaskCreateRequest, TaskCreateResponse, TaskProcessRequest, TaskStatusResponse
from .s3_service import s3_service
from .queue import task_queue, redis_conn

router = APIRouter(prefix="/api/v1/videos", tags=["Videos"])

# Схема для приема Webhook от воркера
class StatusUpdateRequest(BaseModel):
    status: TaskStatus

@router.post("/upload-url", response_model=TaskCreateResponse)
async def request_upload_url(request: TaskCreateRequest, db: AsyncSession = Depends(get_db)):
    """Этап А: Регистрация файла и выдача билета на загрузку в MinIO."""
    task_id = uuid.uuid4()
    input_object_name = f"raw_{task_id}_{request.filename}"
    output_object_name = f"processed_{task_id}_{request.filename}"
    
    new_task = MediaTask(
        id=task_id,
        original_filename=request.filename,
        input_object_name=input_object_name,
        output_object_name=output_object_name,
        status=TaskStatus.UPLOADED
    )
    db.add(new_task)
    await db.commit()
    
    upload_url = s3_service.generate_presigned_upload_url(input_object_name)
    return {"task_id": task_id, "upload_url": upload_url}


@router.post("/{task_id}/process")
async def start_processing(task_id: uuid.UUID, request: TaskProcessRequest, db: AsyncSession = Depends(get_db)):
    """Этап Б: Отправка задачи воркеру."""
    result = await db.execute(select(MediaTask).where(MediaTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.UPLOADED:
        raise HTTPException(status_code=400, detail="File not uploaded or already processing")

    task.filter_type = request.filter_type
    task.status = TaskStatus.QUEUED
    await db.commit()
    
    task_queue.enqueue(
        'worker.process_media_task',
        args=(task.input_object_name, task.output_object_name, task.filter_type),
        job_id=str(task.id),
        job_timeout=600
    )
    return {"message": "Task queued successfully"}


@router.patch("/{task_id}/status")
async def update_task_status(task_id: uuid.UUID, request: StatusUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Этап В: Прием Webhook от воркера для обновления статуса."""
    result = await db.execute(select(MediaTask).where(MediaTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = request.status
    await db.commit()
    return {"message": f"Status updated to {request.status}"}


@router.get("/", response_model=list[TaskStatusResponse])
async def get_all_tasks(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Возвращает список всех загруженных медиа (для галереи на фронтенде)."""
    result = await db.execute(select(MediaTask).order_by(desc(MediaTask.created_at)).limit(limit))
    tasks = result.scalars().all()
    
    response_list = []
    for task in tasks:
        item = TaskStatusResponse(
            task_id=task.id,
            status=task.status,
            original_filename=task.original_filename,
            filter_type=task.filter_type,
            created_at=task.created_at,
            original_file_url=s3_service.generate_presigned_download_url(task.input_object_name),
            download_url=s3_service.generate_presigned_download_url(task.output_object_name) if task.output_object_name and task.status == TaskStatus.COMPLETED else None
        )
        response_list.append(item)
        
    return response_list


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MediaTask).where(MediaTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    response_data = TaskStatusResponse(
        task_id=task.id,
        status=task.status,
        original_filename=task.original_filename,
        filter_type=task.filter_type,
        created_at=task.created_at,
        original_file_url=s3_service.generate_presigned_download_url(task.input_object_name),
        download_url=s3_service.generate_presigned_download_url(task.output_object_name) if task.status == TaskStatus.COMPLETED and task.output_object_name else None
    )
    return response_data


@router.delete("/{task_id}")
async def delete_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Удаляет конкретную задачу из БД и связанные файлы из S3."""
    result = await db.execute(select(MediaTask).where(MediaTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Фундаментально: сначала удаляем физические файлы
    try:
        s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=task.input_object_name)
        if task.output_object_name:
            s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=task.output_object_name)
    except Exception as e:
        print(f"Warning: Failed to delete S3 objects for task {task_id}: {e}")

    # Затем удаляем метаданные из БД
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task and associated files deleted successfully"}


@router.delete("/")
async def delete_all_tasks(db: AsyncSession = Depends(get_db)):
    """Удаляет ВСЕ задачи из БД и очищает бакет S3 (Опасно, но удобно для разработки)."""
    result = await db.execute(select(MediaTask))
    tasks = result.scalars().all()
    
    deleted_count = 0
    for task in tasks:
        try:
            s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=task.input_object_name)
            if task.output_object_name:
                s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=task.output_object_name)
        except Exception:
            pass # Игнорируем ошибки отсутствия файлов в S3 при массовом удалении
            
        await db.delete(task)
        deleted_count += 1

    await db.commit()
    return {"message": f"Successfully deleted {deleted_count} tasks and their files"}