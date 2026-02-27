import os
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
yolo_model = YoloONNX(ONNX_PATH)

TMP_DIR = Path("/tmp/cv_processing")
TMP_DIR.mkdir(parents=True, exist_ok=True)

AVAILABLE_FILTERS = {
    "yolo": yolo_model.predict_and_draw,
    "grayscale": OpenCVFilters.grayscale,
    "blur": OpenCVFilters.gaussian_blur,
    "canny": OpenCVFilters.canny_edges,
    "pixelate": OpenCVFilters.pixelate
}

def process_media_task(input_object_name: str, output_object_name: str, filter_type: str):
    """Жизненный цикл обработки файла (вызывается из Redis)."""
    logger.info(f"Начало задачи: {input_object_name} -> фильтр [{filter_type}]")
    
    input_path = TMP_DIR / Path(input_object_name).name
    output_path = TMP_DIR / Path(output_object_name).name

    try:
        s3.download_file(input_object_name, input_path)
        
        filter_func = AVAILABLE_FILTERS.get(filter_type)
        if not filter_func:
            raise ValueError(f"Неизвестный фильтр: {filter_type}")
            
        logger.info("Запуск MediaProcessor...")
        UniversalMediaProcessor.process_file(input_path, output_path, filter_func)
        
        s3.upload_file(output_path, output_object_name)
        logger.info(f"Задача успешно завершена. Результат: {output_object_name}")
        
        return {"status": "success", "result_file": output_object_name}
        
    except Exception as e:
        logger.error(f"Ошибка при обработке: {e}")
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