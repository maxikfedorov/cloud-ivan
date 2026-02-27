from pathlib import Path
from typing import Callable
import subprocess

import cv2
import numpy as np

class UniversalMediaProcessor:
    """
    Единый интерфейс для обработки как фото, так и видео 
    с помощью переданной функции (алгоритма).
    """
    
    # Расширения, которые мы считаем изображениями
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}
    
    @classmethod
    def process_file(cls, input_path: str | Path, output_path: str | Path, filter_func: Callable[[np.ndarray], np.ndarray]):
        """Точка входа. Определяет тип файла и направляет в нужный метод."""
        input_path = Path(input_path)
        
        if not input_path.exists():
            raise FileNotFoundError(f"Файл не найден: {input_path}")
            
        if input_path.suffix.lower() in cls.IMAGE_EXTENSIONS:
            cls._process_image(input_path, output_path, filter_func)
        else:
            # Считаем, что всё остальное — это видео (mp4, avi, mov)
            cls._process_video(input_path, output_path, filter_func)

    @staticmethod
    def _process_image(input_path: Path, output_path: Path, filter_func: Callable):
        """Пайплайн для фото."""
        img = cv2.imread(str(input_path))
        if img is None:
            raise ValueError(f"Не удалось прочитать изображение: {input_path}")
            
        result_img = filter_func(img)
        cv2.imwrite(str(output_path), result_img)
        print(f"  [+] Изображение сохранено: {output_path.name}")

    @staticmethod
    def _process_video(input_path: Path, output_path: Path, filter_func: Callable):
        """Пайплайн для видео с финальной конвертацией под Web."""
        import subprocess # Можно добавить наверх файла
        
        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            raise ValueError(f"Не удалось открыть видео: {input_path}")
            
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Временный файл для сырого вывода OpenCV
        temp_output = output_path.with_name(f"temp_{output_path.name}")
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(temp_output), fourcc, fps, (width, height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            result_frame = filter_func(frame)
            out.write(result_frame)
            
        cap.release()
        out.release()
        
        # [ФУНДАМЕНТАЛЬНЫЙ ШАГ]: Конвертация в H.264 для поддержки в любых браузерах
        print(f"  [*] Конвертация {output_path.name} в H.264 через FFmpeg...")
        subprocess.run([
            "ffmpeg", "-y", 
            "-i", str(temp_output), 
            "-vcodec", "libx264", 
            "-preset", "fast", # Быстрая конвертация
            "-crf", "23",      # Баланс качества и сжатия
            str(output_path)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        
        # Удаляем сырой файл OpenCV
        if temp_output.exists():
            temp_output.unlink()
            
        print(f"  [+] Видео сохранено и готово для Web: {output_path.name}")