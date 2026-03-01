"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Убедись, что установил его!
import { Label } from "@/components/ui/label";
import { videoApi } from '@/lib/api';
import { VideoTask, FilterType } from '@/types';
import { Loader2, Play, CheckCircle2, AlertCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function TaskGrid() {
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Состояние для управления поллингом
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTasks = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const { data } = await videoApi.getAllTasks();
      const incomingTasks = Array.isArray(data) ? data : [];

      setTasks((prevTasks) => {
        if (prevTasks.length === 0) return incomingTasks;
        return incomingTasks.map(newTask => {
          const existingTask = prevTasks.find(t => t.task_id === newTask.task_id);
          if (existingTask && existingTask.status === newTask.status) {
            return existingTask; 
          }
          return newTask;
        });
      });
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  // Управляемый поллинг
  useEffect(() => {
    fetchTasks();
    
    if (!autoRefresh) return; // Если выключено - не ставим интервал

    const interval = setInterval(() => {
      setTasks((currentTasks) => {
        const hasActiveTasks = currentTasks.some(t => 
          ['QUEUED', 'PROCESSING', 'UPLOADED'].includes(t.status)
        );
        if (hasActiveTasks || currentTasks.length === 0) {
          fetchTasks();
        }
        return currentTasks;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchTasks, autoRefresh]);

  const handleStartProcess = async (taskId: string, filterType: string) => {
    try {
      await videoApi.processVideo(taskId, filterType);
      fetchTasks();
    } catch (error) {
      console.error("Processing trigger failed:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("Удалить этот файл навсегда?")) return;
    try {
      await videoApi.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.task_id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("ВНИМАНИЕ: Вы уверены, что хотите удалить ВСЕ файлы и историю?")) return;
    try {
      await videoApi.deleteAllTasks();
      setTasks([]);
    } catch (error) {
      console.error("Failed to delete all tasks:", error);
    }
  };

  const getStatusUI = (status: VideoTask['status']) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-green-500/10 text-green-600 border-green-200 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Готово</Badge>;
      case 'PROCESSING': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 shadow-sm"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> В работе</Badge>;
      case 'FAILED': return <Badge variant="destructive" className="shadow-sm"><AlertCircle className="w-3 h-3 mr-1" /> Ошибка</Badge>;
      case 'UPLOADED': return <Badge variant="secondary" className="bg-slate-100 text-slate-700 shadow-sm"><Clock className="w-3 h-3 mr-1" /> Готов к запуску</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Вспомогательная функция для определения видео
  const isVideo = (filename: string) => /\.(mp4|mov|avi|mkv)$/i.test(filename || '');

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Card key={`skeleton-${i}`} className="h-72 animate-pulse bg-slate-50 border-slate-200" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enterprise Панель управления */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Медиатека</h2>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-refresh" 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh} 
            />
            <Label htmlFor="auto-refresh" className="text-sm text-slate-600 cursor-pointer">
              Автообновление
            </Label>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchTasks(true)}
            disabled={isRefreshing}
            className="text-slate-600 border-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>

          {tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить всё
            </Button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <p className="text-slate-500 font-medium">Нет загруженных файлов.</p>
          <p className="text-slate-400 text-sm mt-1">Перетащите медиафайл в область загрузки выше.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const isVid = isVideo(task.original_filename);

            return (
              <Card key={task.task_id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300 bg-white flex flex-col group/card">
                
                {/* Preview Area - Улучшено для видео */}
                <div className="aspect-video bg-slate-100 relative overflow-hidden shrink-0 border-b border-slate-100">
                  {task.original_file_url ? (
                    isVid ? (
                      <video 
                        src={`${task.original_file_url}#t=0.1`} 
                        className="w-full h-full object-cover opacity-90"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={task.original_file_url} alt={task.original_filename} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Play className="w-12 h-12 opacity-20" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 left-3">{getStatusUI(task.status)}</div>
                </div>

                {/* Content Area - Элегантная кнопка удаления */}
                <div className="p-5 space-y-5 flex flex-col flex-grow justify-between">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate" title={task.original_filename}>
                        {task.original_filename || "Без имени"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.created_at ? new Date(task.created_at).toLocaleString() : "Дата неизвестна"}
                      </p>
                    </div>
                    {/* Кнопка удаления теперь аккуратно сидит в углу контента */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 -mt-1 -mr-1 opacity-0 group-hover/card:opacity-100 transition-opacity" 
                      onClick={() => handleDelete(task.task_id)}
                      title="Удалить задачу"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {task.status === 'UPLOADED' && (
                    <div className="flex gap-2">
                      <Select onValueChange={(val) => (task.filter_type = val as FilterType)}>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-700">
                          <SelectValue placeholder="Выберите фильтр" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yolo">YOLO Detection</SelectItem>
                          <SelectItem value="blur">Gaussian Blur</SelectItem>
                          <SelectItem value="canny">Canny Edges</SelectItem>
                          <SelectItem value="grayscale">Grayscale</SelectItem>
                          <SelectItem value="pixelate">Pixelate</SelectItem>
                          <SelectItem value="invert">Invert Colors</SelectItem>
                          <SelectItem value="sepia">Sepia</SelectItem>
                          <SelectItem value="contrast">Contrast Enhance</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
                        onClick={() => handleStartProcess(task.task_id, task.filter_type || 'yolo')}
                      >
                        Пуск
                      </Button>
                    </div>
                  )}

                  {task.status === 'COMPLETED' && (
                    <Link href={`/task/${task.task_id}`} className="block mt-auto">
                      <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                        Сравнить результат
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}