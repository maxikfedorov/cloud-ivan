"use client";

import { FileUploader } from "@/components/shared/FileUploader";
import { TaskGrid } from "@/components/shared/TaskGrid";
import { Separator } from "@/components/ui/separator";

export default function Dashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
          Обработка видео нового поколения
        </h1>
        <p className="text-lg text-slate-600">
          Загрузите видео или изображение, выберите алгоритм компьютерного зрения и получите результат за считанные секунды.
        </p>
        <div className="pt-8">
          <FileUploader />
        </div>
      </section>

      <Separator className="bg-blue-100" />

      {/* Gallery Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Ваши проекты</h2>
        </div>
        <TaskGrid />
      </section>
    </div>
  );
}