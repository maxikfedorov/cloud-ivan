"use client";

import React, { useState } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-slate-100 select-none group border border-slate-200">
      
      {/* "Стало" (Базовое изображение - Результат обработки) */}
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

      {/* Интерактивный слой (Input) */}
      <div className="absolute inset-0 w-full h-full">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 p-0"
          aria-label="Слайдер сравнения изображений"
        />
        
        {/* Визуальная разделяющая полоса и ползунок */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.2)] z-10 pointer-events-none flex items-center justify-center"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Элегантная ручка-контроллер */}
          <div className="w-7 h-7 bg-white/80 backdrop-blur-md rounded-full shadow-md flex items-center justify-center border border-slate-200/50 text-slate-600 transition-transform group-hover:scale-110 group-active:scale-95 group-active:bg-blue-50 group-active:text-blue-600">
            <ChevronsLeftRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
      
      {/* Минималистичные лейблы, которые не кричат */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <span className="bg-black/40 backdrop-blur-md text-white/90 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest shadow-sm">
          Было
        </span>
      </div>
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <span className="bg-blue-600/80 backdrop-blur-md text-white/90 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest shadow-sm">
          Стало
        </span>
      </div>
    </div>
  );
}