from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from rq.job import Job
from rq.exceptions import NoSuchJobError
import uuid

from .database import get_db
from .models import MediaTask, TaskStatus
from .schemas import TaskCreateRequest, TaskCreateResponse, TaskProcessRequest, TaskStatusResponse
from .s3_service import s3_service
from .queue import task_queue, redis_conn

router = APIRouter(prefix="/api/v1/videos", tags=["Videos"])

@router.post("/upload-url", response_model=TaskCreateResponse)
async def request_upload_url(request: TaskCreateRequest, db: AsyncSession = Depends(get_db)):
    """Этап А: Регистрация файла и выдача билета на загрузку в MinIO."""
    task_id = uuid.uuid4()
    # Генерируем уникальные имена для S3, чтобы избежать коллизий
    input_object_name = f"raw_{task_id}_{request.filename}"
    output_object_name = f"processed_{task_id}_{request.filename}"
    
    # 1. Создаем запись в БД
    new_task = MediaTask(
        id=task_id,
        original_filename=request.filename,
        input_object_name=input_object_name,
        output_object_name=output_object_name,
        status=TaskStatus.UPLOADED
    )
    db.add(new_task)
    await db.commit()
    
    # 2. Генерируем Presigned URL
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

    # Обновляем статус в БД
    task.filter_type = request.filter_type
    task.status = TaskStatus.QUEUED
    await db.commit()
    
    # Кидаем в Redis! ВАЖНО: мы передаем ID задачи из БД как job_id для RQ
    task_queue.enqueue(
        'worker.process_media_task',
        args=(task.input_object_name, task.output_object_name, task.filter_type),
        job_id=str(task.id),
        job_timeout=600
    )
    return {"message": "Task queued successfully"}

@router.get("/", response_model=list[TaskStatusResponse])
async def get_all_tasks(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Возвращает список всех загруженных медиа (для галереи на фронтенде)."""
    # Сортируем по убыванию даты (новые сверху)
    result = await db.execute(select(MediaTask).order_by(desc(MediaTask.created_at)).limit(limit))
    tasks = result.scalars().all()
    
    response_list = []
    for task in tasks:
        # Для списка мы можем не лезть в Redis за каждым статусом, чтобы не вешать БД,
        # отдаем то, что есть в Postgres. Точечный апдейт будет при запросе конкретной таски.
        
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

    # Если задача в очереди или в процессе — проверяем Redis
    if task.status in [TaskStatus.QUEUED, TaskStatus.PROCESSING]:
        try:
            job = Job.fetch(str(task.id), connection=redis_conn)
            # Синхронизируем статусы RQ -> Postgres
            if job.is_started and task.status != TaskStatus.PROCESSING:
                task.status = TaskStatus.PROCESSING
                await db.commit()
            elif job.is_finished:
                task.status = TaskStatus.COMPLETED
                await db.commit()
            elif job.is_failed:
                task.status = TaskStatus.FAILED
                await db.commit()
        except NoSuchJobError:
            pass # Если джоба пропала из редиса, оставляем статус как есть (или можно ставить FAILED)

    response_data = TaskStatusResponse(
            task_id=task.id,
            status=task.status,
            original_filename=task.original_filename,
            filter_type=task.filter_type,
            created_at=task.created_at,
            original_file_url=s3_service.generate_presigned_download_url(task.input_object_name), # Генерируем ссылку на просмотр сырого файла
            download_url=s3_service.generate_presigned_download_url(task.output_object_name) if task.status == TaskStatus.COMPLETED and task.output_object_name else None
        )
    
    # Если готово - прикрепляем ссылку на скачивание/просмотр
    if task.status == TaskStatus.COMPLETED and task.output_object_name:
        response_data.download_url = s3_service.generate_presigned_download_url(task.output_object_name)
        
    return response_data