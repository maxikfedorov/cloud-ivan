import os
import boto3
from botocore.client import Config

class S3Service:
    def __init__(self):
        # Внутренний URL (для общения контейнеров, если потребуется)
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
        # Внешний URL (для браузера)
        self.public_endpoint_url = os.getenv("S3_PUBLIC_ENDPOINT_URL", "http://localhost:9000")
        
        self.access_key = os.getenv("S3_ACCESS_KEY", "admin")
        self.secret_key = os.getenv("S3_SECRET_KEY", "password123")
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "media-bucket")
        
        # 1. Клиент для внутренних нужд бэкенда
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4')
        )

        # 2. Клиент СПЕЦИАЛЬНО для генерации публичных ссылок для фронтенда
        # Он сразу использует localhost:9000, поэтому подпись будет математически верной!
        self.s3_public_client = boto3.client(
            's3',
            endpoint_url=self.public_endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4')
        )

    def generate_presigned_upload_url(self, object_name: str, expiration: int = 3600) -> str:
        """Генерирует криптографически верную ссылку для фронтенда."""
        # Используем public_client, никаких replace() больше не нужно!
        return self.s3_public_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': self.bucket_name, 'Key': object_name},
            ExpiresIn=expiration
        )

    def generate_presigned_download_url(self, object_name: str, expiration: int = 3600) -> str:
        return self.s3_public_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': object_name},
            ExpiresIn=expiration
        )

s3_service = S3Service()