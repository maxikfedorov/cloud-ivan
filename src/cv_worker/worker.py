import os
import re
import requests
from pathlib import Path
from redis import Redis
from rq import Worker, Queue, Connection

# Инфраструктура
from infra.logger import setup_logger
from infra.s3_client import S3Client

# Ядро
from core.yolo_engine import YoloONNX
from core.filters import OpenCVFilters
from core.media import UniversalMediaProcessor

# Инициализация
logger = setup_logger("worker_main")
s3 = S3Client()

ONNX_PATH = os.getenv("ONNX_MODEL_PATH", "/app/models/best.onnx")
# URL нашего внутреннего API (внутри сети Docker Compose)
API_INTERNAL_URL = os.getenv("API_INTERNAL_URL", "http://api:8000/api/v1")

yolo_model = YoloONNX(ONNX_PATH)

TMP_DIR = Path("/tmp/cv_processing")
TMP_DIR.mkdir(parents=True, exist_ok=True)

AVAILABLE_FILTERS = {
    "yolo": yolo_model.predict_and_draw,
    "grayscale": OpenCVFilters.grayscale,
    "blur": OpenCVFilters.gaussian_blur,
    "canny": OpenCVFilters.canny_edges,
    "pixelate": OpenCVFilters.pixelate,
    "invert": OpenCVFilters.invert_colors,
    "sepia": OpenCVFilters.sepia,
    "contrast": OpenCVFilters.enhance_contrast
}

def extract_task_id(filename: str) -> str | None:
    """Фундаментально надежный способ вытащить UUID из имени файла"""
    match = re.search(r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', filename, re.IGNORECASE)
    return match.group(1) if match else None

def notify_backend(task_id: str, status: str):
    """Отправка Webhook-а в API для обновления статуса в БД"""
    if not task_id:
        logger.error("Невозможно отправить Webhook: task_id не найден")
        return
        
    try:
        url = f"{API_INTERNAL_URL}/videos/{task_id}/status"
        response = requests.patch(url, json={"status": status})
        response.raise_for_status()
        logger.info(f"API успешно уведомлен: задача {task_id} -> {status}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Критическая ошибка связи с API при обновлении статуса: {e}")

def process_media_task(input_object_name: str, output_object_name: str, filter_type: str):
    """Жизненный цикл обработки файла"""
    task_id = extract_task_id(input_object_name)
    logger.info(f"Начало задачи ID: {task_id} | Файл: {input_object_name} -> фильтр [{filter_type}]")
    
    input_path = TMP_DIR / Path(input_object_name).name
    output_path = TMP_DIR / Path(output_object_name).name

    try:
        # Уведомляем API, что реально начали процессинг (не просто в очереди, а уже считаем)
        notify_backend(task_id, "PROCESSING")

        s3.download_file(input_object_name, input_path)
        
        filter_func = AVAILABLE_FILTERS.get(filter_type)
        if not filter_func:
            raise ValueError(f"Неизвестный фильтр: {filter_type}")
            
        logger.info("Запуск MediaProcessor...")
        UniversalMediaProcessor.process_file(input_path, output_path, filter_func)
        
        s3.upload_file(output_path, output_object_name)
        logger.info(f"Задача успешно завершена. Результат: {output_object_name}")
        
        # Успешный финал
        notify_backend(task_id, "COMPLETED")
        return {"status": "success", "result_file": output_object_name}
        
    except Exception as e:
        logger.error(f"Ошибка при обработке: {e}")
        # Сообщаем об ошибке, чтобы фронтенд не висел вечно
        notify_backend(task_id, "FAILED")
        raise
        
    finally:
        if input_path.exists(): input_path.unlink()
        if output_path.exists(): output_path.unlink()

if __name__ == '__main__':
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_conn = Redis.from_url(redis_url)
    
    with Connection(redis_conn):
        worker = Worker(['media_tasks'])
        logger.info("CV Worker запущен. Ожидание задач в очереди 'media_tasks'...")
        worker.work()