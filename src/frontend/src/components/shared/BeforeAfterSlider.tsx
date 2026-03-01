"use client";

import React, { useState } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-slate-900 select-none group">
      {/* "Стало" (Базовое изображение) */}
      <img 
        src={afterImage} 
        alt="Результат" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
      />

      {/* "Было" (Обрезается с помощью clip-path) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={beforeImage} 
          alt="Оригинал" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        />
      </div>

      {/* Невидимый ползунок (Native Input Range) и Визуальная линия */}
      <div className="absolute inset-0 w-full h-full">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10 m-0 p-0"
        />
        {/* Визуальная разделяющая полоса */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-0 pointer-events-none flex items-center justify-center transition-transform"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Круглая ручка по центру */}
          <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center ring-2 ring-slate-200">
            <div className="flex gap-1">
              <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
              <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Подсказки (исчезают при наведении) */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm font-medium opacity-100 transition-opacity group-hover:opacity-0 pointer-events-none">
        Было
      </div>
      <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm font-medium opacity-100 transition-opacity group-hover:opacity-0 pointer-events-none">
        Стало
      </div>
    </div>
  );
}