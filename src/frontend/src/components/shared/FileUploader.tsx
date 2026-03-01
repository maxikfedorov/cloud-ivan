"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileVideo, X, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { videoApi } from '@/lib/api';
import axios from 'axios';
import { cn } from '@/lib/utils';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);

      // 1. Получаем Presigned URL
      const { data } = await videoApi.getUploadUrl(file.name);

      // 2. Отправляем файл. Никаких подмен URL и никаких лишних заголовков.
      await axios.put(data.upload_url, file, {
        // Заголовки убраны, чтобы не конфликтовать с AWS Signature v4
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        },
      });

      setStatus('success');
      // Здесь можно добавить триггер для обновления списка (мы сделаем это позже через Context или SWR)
      console.log("Task Created:", data.task_id);
    } catch (error) {
      console.error("Upload failed:", error);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center",
          isDragActive
            ? "border-blue-400 bg-blue-50/50"
            : "border-slate-200 hover:border-[#D7EFFF] hover:bg-[#D7EFFF]/10"
        )}
      >
        <input {...getInputProps()} />

        <div className="w-16 h-16 bg-[#D7EFFF] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="text-blue-600 w-8 h-8" />
        </div>

        {file ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <p className="font-medium text-slate-900 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-blue-500" />
              {file.name}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900">
              Перетащите файл или кликните для выбора
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Поддерживаются MP4, MOV, PNG, JPG (до 100MB)
            </p>
          </div>
        )}
      </div>

      {/* Progress & Actions */}
      {file && (
        <div className="mt-6 space-y-4">
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Загрузка в облако...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-blue-100" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Файл успешно загружен!</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-11"
              onClick={handleUpload}
              disabled={uploading || status === 'success'}
            >
              {uploading ? "Загружаем..." : "Начать обработку"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={() => { setFile(null); setStatus('idle'); }}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}