import cv2
import numpy as np
from typing import Callable

class OpenCVFilters:
    """Статический класс-коллекция базовых фильтров машинного зрения."""
    
    @staticmethod
    def grayscale(frame: np.ndarray) -> np.ndarray:
        """1. Оттенки серого (классика)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR) # Возвращаем 3 канала для видео-райтера

    @staticmethod
    def gaussian_blur(frame: np.ndarray) -> np.ndarray:
        """2. Гауссово размытие (анонимизация, сглаживание шумов)."""
        return cv2.GaussianBlur(frame, (31, 31), 0)

    @staticmethod
    def canny_edges(frame: np.ndarray) -> np.ndarray:
        """3. Детектор границ Кенни (фундаментальный алгоритм CV)."""
        edges = cv2.Canny(frame, 100, 200)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    @staticmethod
    def invert_colors(frame: np.ndarray) -> np.ndarray:
        """4. Инверсия цветов (Негатив)."""
        return cv2.bitwise_not(frame)

    @staticmethod
    def sepia(frame: np.ndarray) -> np.ndarray:
        """5. Сепия (матричное преобразование цвета)."""
        kernel = np.array([[0.272, 0.534, 0.393],
                           [0.349, 0.686, 0.534],
                           [0.393, 0.769, 0.189]])
        sepia_frame = cv2.transform(frame, kernel)
        return np.clip(sepia_frame, 0, 255).astype(np.uint8)

    @staticmethod
    def enhance_contrast(frame: np.ndarray) -> np.ndarray:
        """6. Выравнивание гистограммы CLAHE (вытягивает детали в тени)."""
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        merged = cv2.merge((cl, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    @staticmethod
    def pixelate(frame: np.ndarray) -> np.ndarray:
        """7. Пикселизация (эффект мозаики)."""
        h, w = frame.shape[:2]
        # Уменьшаем картинку
        small = cv2.resize(frame, (w // 20, h // 20), interpolation=cv2.INTER_LINEAR)
        # Увеличиваем обратно без сглаживания (INTER_NEAREST дает четкие квадраты)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
