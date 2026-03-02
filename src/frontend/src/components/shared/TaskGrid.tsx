"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Loader2, Play, CheckCircle2, AlertCircle, Clock, 
  Trash2, RefreshCw, ChevronRight, MoreVertical 
} from 'lucide-react';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { videoApi } from '@/lib/api';
import { VideoTask, FilterType } from '@/types';

export function TaskGrid() {
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Состояние для управления модальным окном удаления
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchTasks();
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setTasks((currentTasks) => {
        const hasActiveTasks = currentTasks.some(t => 
          ['QUEUED', 'PROCESSING', 'UPLOADED'].includes(t.status)
        );
        if (hasActiveTasks || currentTasks.length === 0) fetchTasks();
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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await videoApi.deleteTask(deleteId);
      setTasks(prev => prev.filter(t => t.task_id !== deleteId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: VideoTask['status']) => {
    const baseClasses = "text-[10px] uppercase tracking-wider font-semibold border shadow-none px-2 py-0.5";
    switch (status) {
      case 'COMPLETED': return <Badge className={cn(baseClasses, "bg-white/90 text-green-700 border-green-200 backdrop-blur-sm")}><CheckCircle2 className="w-3 h-3 mr-1" /> Готово</Badge>;
      case 'PROCESSING': return <Badge className={cn(baseClasses, "bg-white/90 text-blue-700 border-blue-200 backdrop-blur-sm")}><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Обработка</Badge>;
      case 'FAILED': return <Badge className={cn(baseClasses, "bg-white/90 text-red-700 border-red-200 backdrop-blur-sm")}><AlertCircle className="w-3 h-3 mr-1" /> Ошибка</Badge>;
      case 'UPLOADED': return <Badge className={cn(baseClasses, "bg-white/90 text-slate-700 border-slate-200 backdrop-blur-sm")}><Clock className="w-3 h-3 mr-1" /> Ожидает</Badge>;
      default: return <Badge className={baseClasses}>{status}</Badge>;
    }
  };

  const isVideo = (filename: string) => /\.(mp4|mov|avi|mkv)$/i.test(filename || '');

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Card key={`skeleton-${i}`} className="h-[320px] animate-pulse bg-white border-slate-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Медиатека</h2>
        <div className="flex items-center gap-5">
          <div className="flex items-center space-x-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} className="scale-90 data-[state=checked]:bg-blue-600" />
            <Label htmlFor="auto-refresh" className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer">
              Автообновление
            </Label>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <Button variant="ghost" size="sm" onClick={() => fetchTasks(true)} disabled={isRefreshing} className="text-slate-500 hover:text-slate-900 h-8 px-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-slate-300/50 rounded-xl bg-white/50">
          <p className="text-slate-900 font-medium tracking-tight">Нет загруженных файлов</p>
          <p className="text-slate-500 text-sm mt-1">Они появятся здесь после загрузки</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const isVid = isVideo(task.original_filename);

            return (
              <Card key={task.task_id} className="group relative overflow-hidden border border-slate-200 bg-white rounded-xl hover:border-blue-200 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col">
                
                {/* Preview Zone */}
                <div className="aspect-video bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-100">
                  {task.original_file_url ? (
                    isVid ? (
                      <video src={`${task.original_file_url}#t=0.1`} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                    ) : (
                      <img src={task.original_file_url} alt={task.original_filename} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100/50 text-slate-300">
                      <Play className="w-8 h-8 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">{getStatusBadge(task.status)}</div>
                </div>

                {/* Metadata Zone */}
                <div className="p-4 flex justify-between items-start">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate leading-tight" title={task.original_filename}>
                      {task.original_filename || "Без имени"}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">
                      {task.created_at ? new Date(task.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Дата неизвестна"}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 -mr-2 -mt-1">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-white/95 backdrop-blur-md border-slate-200">
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(task.task_id)}
                        className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Action Zone (Footer) */}
                <div className="mt-auto border-t border-slate-100">
                  {task.status === 'UPLOADED' && (
                    <div className="flex items-center p-2 gap-2 bg-slate-50/80 backdrop-blur-sm">
                      <Select onValueChange={(val) => (task.filter_type = val as FilterType)}>
                        <SelectTrigger className="w-full h-9 text-xs bg-white border-slate-200 shadow-none focus:ring-1 focus:ring-blue-500/20 text-slate-700 font-medium transition-all">
                          <SelectValue placeholder="Алгоритм обработки..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl border-slate-200">
                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-2 py-1.5">Компьютерное зрение</SelectLabel>
                            <SelectItem value="yolo" className="text-sm py-2 cursor-pointer focus:bg-blue-50">
                              <div className="flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                                YOLO Object Detection
                              </div>
                            </SelectItem>
                            <SelectItem value="canny" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Canny Edge Detection</SelectItem>
                          </SelectGroup>

                          <Separator className="my-1 bg-slate-100" />

                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-2 py-1.5">Визуальные эффекты</SelectLabel>
                            <SelectItem value="blur" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Gaussian Blur</SelectItem>
                            <SelectItem value="pixelate" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Pixelate (Pixel Art)</SelectItem>
                            <SelectItem value="grayscale" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Classic Grayscale</SelectItem>
                          </SelectGroup>

                          <Separator className="my-1 bg-slate-100" />

                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-2 py-1.5">Коррекция цвета</SelectLabel>
                            <SelectItem value="sepia" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Vintage Sepia</SelectItem>
                            <SelectItem value="invert" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Color Inversion</SelectItem>
                            <SelectItem value="contrast" className="text-sm py-2 cursor-pointer focus:bg-blue-50">Contrast Enhance</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        size="sm"
                        className="h-9 px-5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 shrink-0"
                        onClick={() => handleStartProcess(task.task_id, task.filter_type || 'yolo')}
                      >
                        ПУСК
                      </Button>
                    </div>
                  )}

                  {task.status === 'COMPLETED' && (
                    <Link href={`/task/${task.task_id}`} className="block p-2 bg-slate-50/50">
                      <Button variant="ghost" className="w-full h-8 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 group/btn">
                        Смотреть результат
                        <ChevronRight className="w-3 h-3 ml-1 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                      </Button>
                    </Link>
                  )}
                  
                  {task.status === 'PROCESSING' && (
                     <div className="p-4 flex items-center justify-center text-xs text-slate-500 font-medium bg-slate-50/50">
                        AI анализирует файл...
                     </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Централизованное окно подтверждения удаления */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border-slate-200 rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold tracking-tight">
              Удалить этот файл?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm">
              Это действие необратимо. Файл и все результаты его обработки будут навсегда удалены с серверов VisionFlow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-none rounded-lg font-bold shadow-sm shadow-red-200 transition-all active:scale-95"
            >
              Да, удалить файл
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}