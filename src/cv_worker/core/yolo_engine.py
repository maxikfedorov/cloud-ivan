import cv2
import numpy as np
from pathlib import Path

class YoloONNX:
    """
    Минималистичный класс для инференса YOLOv8-ONNX через OpenCV DNN.
    Без зависимостей от PyTorch и Ultralytics.
    """
    def __init__(self, onnx_path: str | Path, conf_threshold: float = 0.5, iou_threshold: float = 0.4):
        self.onnx_path = str(onnx_path)
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        self.classes = {0: 'Helmet', 1: 'Vest', 2: 'Head'}
        self.colors = {
            0: (255, 0, 0),   # Helmet - Синий (OpenCV использует BGR)
            1: (0, 255, 0),   # Vest - Зеленый
            2: (0, 0, 255)    # Head - Красный
        }
        
        print(f"[*] Инициализация cv2.dnn. Загрузка графа: {Path(self.onnx_path).name}")
        self.net = cv2.dnn.readNetFromONNX(self.onnx_path)
        
        # Жестко фиксируем выполнение на CPU. 
        # Это гарантирует, что код будет работать на любом сервере/контейнере из коробки.
        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        print("  [*] DNN Backend: OpenCV (CPU)")

    def _prepare_input(self, image: np.ndarray) -> tuple[np.ndarray, float, float]:
        """Предобработка: ресайз с сохранением пропорций (letterbox) и нормализация."""
        # YOLOv8 ждет квадратное изображение 640x640
        input_size = 640
        shape = image.shape[:2]
        
        # Вычисляем масштаб
        scale = min(input_size / shape[0], input_size / shape[1])
        new_shape = (int(shape[1] * scale), int(shape[0] * scale))
        
        # Ресайз
        resized_img = cv2.resize(image, new_shape, interpolation=cv2.INTER_LINEAR)
        
        # Добавляем паддинг (серые полосы), чтобы получить ровно 640x640
        pad_w = (input_size - new_shape[0]) / 2
        pad_h = (input_size - new_shape[1]) / 2
        
        top, bottom = int(round(pad_h - 0.1)), int(round(pad_h + 0.1))
        left, right = int(round(pad_w - 0.1)), int(round(pad_w + 0.1))
        
        padded_img = cv2.copyMakeBorder(resized_img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
        
        # Конвертация в блоб для сети: BGR->RGB, нормализация [0-1] (1/255.0)
        blob = cv2.dnn.blobFromImage(padded_img, 1/255.0, (input_size, input_size), swapRB=True, crop=False)
        
        return blob, scale, pad_w, pad_h

    def _postprocess(self, output_tensor: np.ndarray, orig_shape: tuple, scale: float, pad_w: float, pad_h: float) -> list:
        """Сложнейший этап: разбор сырого тензора YOLOv8 (1, 7, 8400)."""
        # YOLOv8 отдает матрицу [1, 7, 8400]. 
        # 7 = [x_center, y_center, width, height, conf_class_0, conf_class_1, conf_class_2]
        # 8400 = количество возможных якорей (окон) на разных масштабах
        
        predictions = np.squeeze(output_tensor).T # Транспонируем в (8400, 7)
        
        boxes = []
        scores = []
        class_ids = []
        
        for pred in predictions:
            # Получаем вероятности классов
            classes_scores = pred[4:]
            class_id = np.argmax(classes_scores)
            confidence = classes_scores[class_id]
            
            if confidence > self.conf_threshold:
                # Получаем координаты из тензора
                x_center, y_center, w, h = pred[0], pred[1], pred[2], pred[3]
                
                # Убираем паддинг (откат letterbox)
                x_center = (x_center - pad_w) / scale
                y_center = (y_center - pad_h) / scale
                w = w / scale
                h = h / scale
                
                # Перевод из center в top-left (для OpenCV)
                x = int(x_center - (w / 2))
                y = int(y_center - (h / 2))
                
                boxes.append([x, y, int(w), int(h)])
                scores.append(float(confidence))
                class_ids.append(class_id)
                
        # NMS: Удаляем перекрывающиеся рамки
        indices = cv2.dnn.NMSBoxes(boxes, scores, self.conf_threshold, self.iou_threshold)
        
        results = []
        for i in indices:
            # В разных версиях OpenCV NMSBoxes возвращает разные структуры
            idx = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i 
            box = boxes[idx]
            results.append({
                'class_id': class_ids[idx],
                'class_name': self.classes[class_ids[idx]],
                'confidence': scores[idx],
                'box': box # [x, y, w, h]
            })
            
        return results

    def predict_and_draw(self, image: np.ndarray) -> np.ndarray:
        """Сквозной пайплайн для одного кадра."""
        # 1. Предобработка
        blob, scale, pad_w, pad_h = self._prepare_input(image)
        
        # 2. Инференс
        self.net.setInput(blob)
        output_tensor = self.net.forward()
        
        # 3. Постобработка (Декодирование и NMS)
        detections = self._postprocess(output_tensor, image.shape, scale, pad_w, pad_h)
        
        # 4. Отрисовка
        annotated_img = image.copy()
        for det in detections:
            x, y, w, h = det['box']
            label = f"{det['class_name']} {det['confidence']:.2f}"
            color = self.colors[det['class_id']]
            
            # Рисуем рамку
            cv2.rectangle(annotated_img, (x, y), (x + w, y + h), color, 2)
            
            # Рисуем плашку для текста
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated_img, (x, y - 20), (x + tw, y), color, -1)
            cv2.putText(annotated_img, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
        return annotated_img
