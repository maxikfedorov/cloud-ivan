FROM python:3.12-slim

# Устанавливаем ТОЛЬКО ffmpeg. 
# opencv-python-headless не требует тяжелых GL-библиотек.
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем requirements
COPY src/cv_worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код воркера
COPY src/cv_worker/core/ ./core/
COPY src/cv_worker/infra/ ./infra/
COPY src/cv_worker/worker.py .

# Копируем ONNX-модель
COPY models/runs/hardhat_v2/weights/best.onnx /app/models/best.onnx

# Запускаем RQ Worker
CMD ["python", "worker.py"]