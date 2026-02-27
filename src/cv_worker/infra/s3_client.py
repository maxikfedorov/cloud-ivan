import boto3
import os
from pathlib import Path
from infra.logger import setup_logger

logger = setup_logger("s3_client")

class S3Client:
    """Минималистичный клиент для работы с MinIO/S3."""
    def __init__(self):
        # MVP доступы по умолчанию синхронизированы с docker-compose
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
        self.access_key = os.getenv("S3_ACCESS_KEY", "admin")
        self.secret_key = os.getenv("S3_SECRET_KEY", "password123")
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "media-bucket")
        
        self.s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key
        )
        
        try:
            self.s3.head_bucket(Bucket=self.bucket_name)
        except Exception:
            logger.info(f"Создание бакета {self.bucket_name}...")
            self.s3.create_bucket(Bucket=self.bucket_name)

    def download_file(self, object_name: str, download_path: Path) -> Path:
        logger.info(f"Скачивание {object_name} из S3...")
        self.s3.download_file(self.bucket_name, object_name, str(download_path))
        return download_path

    def upload_file(self, file_path: Path, object_name: str):
        logger.info(f"Загрузка {object_name} в S3...")
        self.s3.upload_file(str(file_path), self.bucket_name, object_name)