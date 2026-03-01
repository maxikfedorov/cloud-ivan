"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { videoApi } from '@/lib/api';
import { VideoTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Image as ImageIcon, Video, Calendar, Activity, AlertCircle } from 'lucide-react';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<VideoTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;
    
    const fetchTaskDetails = async () => {
      try {
        const { data } = await videoApi.getTask(taskId);
        setTask(data);
      } catch (error) {
        console.error("Failed to fetch task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  // Состояние 1: Загрузка
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-10 w-40 bg-slate-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[60vh] bg-slate-200 animate-pulse rounded-2xl" />
          <div className="h-96 bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  // Состояние 2: Ошибка / Не найдено
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-slate-400" />
        <h2 className="text-2xl font-semibold text-slate-700">Задача не найдена</h2>
        <p className="text-slate-500">Возможно, она была удалена или ссылка устарела.</p>
        <Link href="/">
          <Button className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> Вернуться на главную</Button>
        </Link>
      </div>
    );
  }

  // Логика определения типа медиа (фундаментально просто и надежно)
  const isVideo = task.original_filename.match(/\.(mp4|mov|avi|mkv)$/i);
  const isCompleted = task.status === 'COMPLETED';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header (Навигация и Скачивание) */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к истории
          </Button>
        </Link>
        
        {isCompleted && task.download_url && (
          <a href={task.download_url} download={task.original_filename} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-md">
              <Download className="w-5 h-5 mr-2" />
              Скачать результат
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Главная секция: Медиа (Занимает 2 колонки) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-1 overflow-hidden bg-white shadow-sm border-slate-200 rounded-2xl">
            {isCompleted && task.original_file_url && task.download_url ? (
              isVideo ? (
                // Рендер для Видео: Два плеера
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-900 p-2 rounded-xl">
                  <div className="relative">
                    <Badge variant="secondary" className="absolute top-2 left-2 z-10 bg-black/50 text-white border-none">Оригинал</Badge>
                    <video src={task.original_file_url} controls className="w-full aspect-video rounded-lg bg-black" />
                  </div>
                  <div className="relative">
                    <Badge className="absolute top-2 left-2 z-10 bg-blue-600 border-none">Результат</Badge>
                    <video src={task.download_url} controls className="w-full aspect-video rounded-lg bg-black" />
                  </div>
                </div>
              ) : (
                // Рендер для Фото: Наш Слайдер
                <BeforeAfterSlider 
                  beforeImage={task.original_file_url} 
                  afterImage={task.download_url} 
                />
              )
            ) : (
              // Заглушка, если задача ещё обрабатывается или сломалась
              <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                {task.original_file_url && (
                  <img src={task.original_file_url} alt="preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/10">
                  <Activity className="w-12 h-12 text-blue-400 mb-4 animate-pulse" />
                  <h3 className="text-white text-xl font-medium mb-2">Файл в обработке</h3>
                  <Badge variant="outline" className="text-white border-white/30">{task.status}</Badge>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Сайдбар: Метаданные (Занимает 1 колонку) */}
        <div className="space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Детали задачи</h3>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center text-slate-500">
                  {isVideo ? <Video className="w-4 h-4 mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                  <span className="text-sm font-medium">Файл</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 truncate max-w-[140px]" title={task.original_filename}>
                  {task.original_filename}
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center text-slate-500">
                  <Activity className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Алгоритм</span>
                </div>
                <Badge variant="secondary" className="capitalize px-3 py-1">{task.filter_type || '—'}</Badge>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center text-slate-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Дата</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="pt-2">
                 <div className="text-sm font-medium text-slate-500 mb-3">Текущий статус</div>
                 <div className={`w-full p-4 rounded-xl border flex items-center justify-center font-semibold text-sm transition-colors ${
                    task.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-700' : 
                    task.status === 'FAILED' ? 'bg-red-50 border-red-200 text-red-700' : 
                    'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                 }`}>
                    {task.status === 'COMPLETED' ? 'Успешно завершено' : 
                     task.status === 'FAILED' ? 'Ошибка обработки' : 
                     'В процессе выполнения...'}
                 </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}