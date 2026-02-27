import logging
import sys

def setup_logger(name: str = "cv_worker") -> logging.Logger:
    """MVP-настройка строгого и чистого логгера для консоли Docker."""
    logger = logging.getLogger(name)
    
    # Чтобы не дублировать логи при повторных вызовах
    if not logger.hasHandlers():
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        
        # Формат: Время [Уровень] Модуль: Сообщение
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger