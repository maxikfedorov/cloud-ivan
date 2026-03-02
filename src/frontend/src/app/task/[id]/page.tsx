"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { videoApi } from '@/lib/api';
import { VideoTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Image as ImageIcon, Video, Calendar, Activity, AlertCircle, FileCheck2 } from 'lucide-react';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { cn } from '@/lib/utils';

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Skeleton className="lg:col-span-3 h-[70vh] rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-slate-500">
        <AlertCircle className="w-12 h-12 opacity-20" />
        <h2 className="text-xl font-medium text-slate-900 tracking-tight">Задача не найдена</h2>
        <p className="text-sm">Возможно, файл был удален.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 bg-white"><ArrowLeft className="w-4 h-4 mr-2" /> Назад в медиатеку</Button>
        </Link>
      </div>
    );
  }

  const isVideo = task.original_filename.match(/\.(mp4|mov|avi|mkv)$/i);
  const isCompleted = task.status === 'COMPLETED';

  // Вспомогательная функция для рендера статуса в стиле "Инспектора"
  const renderStatusIndicator = (status: string) => {
    switch(status) {
      case 'COMPLETED':
        return (
          <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" /> Успешно
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" /> Ошибка
          </div>
        );
      default:
        return (
          <div className="flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse" /> В обработке
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Навигационный Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
        <Link href="/">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 -ml-4 h-8 px-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div className="text-sm font-medium text-slate-900 truncate px-4">
          Просмотр: {task.original_filename}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Главная сцена (Слайдер / Видео) - 3 колонки */}
        <div className="lg:col-span-3 bg-white border border-slate-200/60 rounded-xl p-2 shadow-sm">
          {isCompleted && task.original_file_url && task.download_url ? (
            isVideo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <div className="relative group">
                  <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-md text-white/90 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest">Оригинал</div>
                  <video src={task.original_file_url} controls className="w-full aspect-video rounded bg-slate-900" />
                </div>
                <div className="relative group">
                  <div className="absolute top-3 left-3 z-10 bg-blue-600/80 backdrop-blur-md text-white/90 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest">Результат</div>
                  <video src={task.download_url} controls className="w-full aspect-video rounded bg-slate-900" />
                </div>
              </div>
            ) : (
              <BeforeAfterSlider 
                beforeImage={task.original_file_url} 
                afterImage={task.download_url} 
              />
            )
          ) : (
            <div className="aspect-video bg-slate-50 rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-100">
              {task.original_file_url && (
                <img src={task.original_file_url} alt="preview" className="absolute inset-0 w-full h-full object-cover opacity-10 grayscale" />
              )}
              <div className="relative z-10 flex flex-col items-center text-slate-500">
                <Activity className="w-8 h-8 text-blue-500 mb-3 animate-pulse" />
                <p className="text-sm font-medium uppercase tracking-widest">Обработка нейросетью...</p>
              </div>
            </div>
          )}
        </div>

        {/* Инспектор свойств (Сайдбар) - 1 колонка */}
        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">
          
          {/* Главное действие вынесено наверх для быстрого доступа */}
          {isCompleted && task.download_url && (
            <a href={task.download_url} download={task.original_filename} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-10">
                <Download className="w-4 h-4 mr-2" />
                Скачать результат
              </Button>
            </a>
          )}

          <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Свойства файла</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Параметр: Тип */}
              <div className="flex justify-between items-start">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center mt-0.5">
                  {isVideo ? <Video className="w-3.5 h-3.5 mr-1.5" /> : <ImageIcon className="w-3.5 h-3.5 mr-1.5" />}
                  Формат
                </span>
                <span className="text-sm font-medium text-slate-900 text-right uppercase">
                  {isVideo ? 'Видео' : 'Изображение'}
                </span>
              </div>

              <Separator className="bg-slate-100" />

              {/* Параметр: Алгоритм */}
              <div className="flex justify-between items-start">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center mt-0.5">
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Алгоритм
                </span>
                <span className="text-sm font-medium text-slate-900 text-right capitalize">
                  {task.filter_type || '—'}
                </span>
              </div>

              <Separator className="bg-slate-100" />

              {/* Параметр: Дата */}
              <div className="flex justify-between items-start">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center mt-0.5">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Создано
                </span>
                <span className="text-sm font-medium text-slate-900 text-right">
                  {new Date(task.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>

              <Separator className="bg-slate-100" />

              {/* Параметр: Статус */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center">
                  <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                  Статус
                </span>
                {renderStatusIndicator(task.status)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}