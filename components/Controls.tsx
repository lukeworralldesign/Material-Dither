import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DitherMethod, DitherSettings } from '../types';

interface ControlsProps {
  settings: DitherSettings;
  onChange: (newSettings: DitherSettings) => void;
  onVibeCheck: () => void;
  isProcessingVibe: boolean;
}

// --- Expressive Slider Component (Strict M3 Spec) ---
// Link: https://m3.material.io/components/sliders/specs
interface ExpressiveSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  icon: string;
  unit?: string;
  onChange: (val: number) => void;
}

const ExpressiveSlider: React.FC<ExpressiveSliderProps> = ({
  label,
  value,
  min,
  max,
  icon,
  unit = '',
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external changes (e.g. Auto-Tune updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue); // Instant UI update (60fps)

    // Debounce the heavy parent update (Dithering)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(newValue);
    }, 50); // 50ms delay for responsiveness
  };

  // Calculate percentage for track fill
  const percent = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="snap-center shrink-0 relative bg-[var(--surface-container-high)] rounded-[32px] p-6 flex flex-col justify-between min-h-[220px] select-none shadow-sm">
      
      {/* Label & Value Header */}
      <div className="flex-1 flex flex-col justify-start pt-2 pointer-events-none z-10">
        <div className="flex items-center gap-3 text-[var(--primary)] mb-2 opacity-90">
          <span className="material-symbols-outlined text-2xl">{icon}</span>
          <span className="font-bold uppercase tracking-widest text-sm">{label}</span>
        </div>
        <span className="text-6xl font-mono tracking-tighter font-medium text-[var(--on-surface)]">
          {localValue}<span className="text-2xl opacity-40 ml-2 font-sans">{unit}</span>
        </span>
      </div>

      {/* Slider Container - Large touch target */}
      <div className="relative w-full h-16 flex items-center group">
        
        {/* --- Visual Layer (Purely Decorative) --- */}
        
        {/* Inactive Track (Background) - 4dp height */}
        <div className="absolute w-full h-1 bg-[var(--surface-variant)] rounded-full overflow-hidden">
            {/* Active Track (Fill) - Primary color */}
            <div 
              className="h-full bg-[var(--primary)] rounded-full" 
              style={{ width: `${percent}%` }} 
            />
        </div>

        {/* Thumb Container - Centered on value */}
        <div 
           className="absolute h-10 w-10 flex items-center justify-center -translate-x-1/2 pointer-events-none transition-transform duration-75 ease-out"
           style={{ left: `${percent}%` }}
        >
            {/* State Layer (Halo) - 40dp circle, visible on hover/active */}
            <div className={`
              absolute w-10 h-10 rounded-full bg-[var(--primary)] 
              opacity-0 transition-opacity duration-200
              ${isDragging ? 'opacity-[0.12]' : 'group-hover:opacity-[0.08]'}
            `} />
            
            {/* Handle (Thumb) - 20dp circle, elevation 1 */}
            <div className={`
              w-5 h-5 bg-[var(--primary)] rounded-full shadow-md z-10 
              transition-transform duration-200
              ${isDragging ? 'scale-125' : 'scale-100'}
            `} />
        </div>

        {/* --- Interaction Layer --- */}
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={localValue}
          onInput={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="
            absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20
            m-0 p-0
          "
        />
      </div>
    </div>
  );
};

const Controls: React.FC<ControlsProps> = ({ settings, onChange, onVibeCheck, isProcessingVibe }) => {
  
  const handleDirectChange = (key: keyof DitherSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const handleSliderChange = useCallback((key: keyof DitherSettings, val: number) => {
    onChange({ ...settings, [key]: val });
  }, [settings, onChange]);

  return (
    <div className="flex flex-col gap-4 pb-32">
      
      {/* 1. Vibe Auto-Tune Card */}
      <div 
        onClick={!isProcessingVibe ? onVibeCheck : undefined}
        className={`
            snap-center shrink-0 min-h-[200px] rounded-[32px] p-8 relative overflow-hidden transition-all duration-500
            flex flex-col justify-between cursor-pointer group select-none shadow-sm
            ${isProcessingVibe 
                ? 'bg-[var(--surface-container-highest)]' 
                : 'bg-[var(--secondary-container)] hover:bg-[var(--secondary)] hover:shadow-xl active:scale-[0.98]'
            }
        `}
      >
        <div className="flex justify-between items-start z-10 relative">
          <span className={`material-symbols-outlined text-5xl transition-transform duration-700 ${isProcessingVibe ? 'text-[var(--on-surface-variant)] animate-spin' : 'text-[var(--on-secondary-container)] group-hover:rotate-12'}`}>
              {isProcessingVibe ? 'progress_activity' : 'auto_fix_high'}
          </span>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${isProcessingVibe ? 'bg-[var(--surface)] text-[var(--on-surface)]' : 'bg-[var(--on-secondary-container)] text-[var(--secondary-container)]'}`}>
              {isProcessingVibe ? 'Thinking...' : 'AI Auto-Tune'}
          </span>
        </div>
        
        <div className="z-10 mt-4 relative">
          <h3 className={`text-3xl font-bold leading-tight tracking-tight ${isProcessingVibe ? 'text-[var(--on-surface-variant)]' : 'text-[var(--on-secondary-container)]'}`}>
              {isProcessingVibe ? 'Analyzing Vibe' : 'Vibe Check'}
          </h3>
          <p className={`text-base mt-2 font-medium opacity-80 max-w-[80%] leading-snug ${isProcessingVibe ? 'text-[var(--on-surface-variant)]' : 'text-[var(--on-secondary-container)]'}`}>
              Let Gemini generate the perfect 1-bit aesthetic.
          </p>
        </div>

        {/* Abstract Background Shapes */}
        <div className={`absolute -right-12 -top-12 w-64 h-64 rounded-full opacity-10 transition-transform duration-1000 ${isProcessingVibe ? 'scale-110' : 'group-hover:scale-110'} bg-[var(--on-surface)]`} />
        <div className={`absolute -left-12 -bottom-12 w-48 h-48 rounded-full opacity-5 bg-[var(--on-surface)]`} />
      </div>

      {/* 2. Algorithm Selector Card */}
      <div className="snap-center shrink-0 bg-[var(--surface-container-high)] rounded-[32px] p-6 flex flex-col gap-6 min-h-[340px]">
        <div className="flex items-center gap-3 text-[var(--primary)] pl-2">
            <span className="material-symbols-outlined text-2xl">style</span>
            <span className="font-bold uppercase tracking-widest text-sm">Algorithm</span>
        </div>
        
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {Object.values(DitherMethod).map((method) => {
                const isActive = settings.method === method;
                return (
                    <button
                        key={method}
                        onClick={() => handleDirectChange('method', method)}
                        className={`
                            relative w-full p-4 rounded-[20px] text-left transition-all duration-300 flex items-center justify-between group
                            ${isActive 
                                ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-lg shadow-[var(--primary)]/30 scale-[1.02]' 
                                : 'bg-[var(--surface-container)] text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] hover:pl-5'
                            }
                        `}
                    >
                        <span className="text-lg font-medium tracking-tight relative z-10">{method}</span>
                        {isActive && (
                            <span className="material-symbols-outlined animate-in zoom-in spin-in-12 duration-300">check_circle</span>
                        )}
                        {!isActive && (
                            <span className="material-symbols-outlined opacity-0 group-hover:opacity-30 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">arrow_right_alt</span>
                        )}
                    </button>
                )
            })}
        </div>
      </div>

      {/* 3. Expressive Sliders */}
      <ExpressiveSlider 
        label="Threshold" 
        icon="tune" 
        value={settings.threshold} 
        min={0} 
        max={255} 
        onChange={(v) => handleSliderChange('threshold', v)} 
      />

      <ExpressiveSlider 
        label="Pixel Size" 
        icon="grid_view" 
        unit="px"
        value={settings.pixelSize} 
        min={1} 
        max={20} 
        onChange={(v) => handleSliderChange('pixelSize', v)} 
      />

      <ExpressiveSlider 
        label="Contrast" 
        icon="contrast" 
        unit="%"
        value={settings.contrast} 
        min={-100} 
        max={100} 
        onChange={(v) => handleSliderChange('contrast', v)} 
      />

      <ExpressiveSlider 
        label="Brightness" 
        icon="brightness_6" 
        unit="%"
        value={settings.brightness} 
        min={-100} 
        max={100} 
        onChange={(v) => handleSliderChange('brightness', v)} 
      />

    </div>
  );
};

export default Controls;