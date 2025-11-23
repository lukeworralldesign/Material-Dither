import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DitherMethod, DitherSettings } from './types';
import { processImage } from './services/ditherService';
import { getSmartVibe } from './services/geminiService';
import { extractColorAndTheme } from './services/colorService';
import Controls from './components/Controls';

const DEFAULT_SETTINGS: DitherSettings = {
  method: DitherMethod.ATKINSON,
  threshold: 128,
  pixelSize: 2,
  contrast: 10,
  brightness: 0,
  greyscale: true,
};

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [settings, setSettings] = useState<DitherSettings>(DEFAULT_SETTINGS);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingVibe, setIsProcessingVibe] = useState(false);
  const [vibeReasoning, setVibeReasoning] = useState<string | null>(null);
  const [themeStyles, setThemeStyles] = useState<React.CSSProperties>({});

  // References
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Handle File Upload
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      setVibeReasoning(null);
      
      // Extract color and update theme
      const theme = await extractColorAndTheme(src);
      setThemeStyles(theme as React.CSSProperties);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Revert theme if dragged out? No, keep it stable.
  }, []);

  // Handle Download
  const handleDownload = () => {
    if (!displayCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `material-dither-${Date.now()}.png`;
    link.href = displayCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Handle AI Vibe
  const handleVibeCheck = async () => {
    if (!imageSrc) return;
    setIsProcessingVibe(true);
    setVibeReasoning(null);
    
    // We need a smaller version for the AI to save bandwidth/latency
    const img = new Image();
    img.src = imageSrc;
    await img.decode();
    
    const tempCanvas = document.createElement('canvas');
    const scale = Math.min(512 / img.width, 512 / img.height, 1);
    tempCanvas.width = img.width * scale;
    tempCanvas.height = img.height * scale;
    tempCanvas.getContext('2d')?.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
    const lowResBase64 = tempCanvas.toDataURL('image/jpeg', 0.8);

    const vibe = await getSmartVibe(lowResBase64);
    
    setSettings(prev => ({ ...prev, ...vibe.settings }));
    setVibeReasoning(vibe.reasoning);
    setIsProcessingVibe(false);
  };

  // Main Image Processing Loop
  useEffect(() => {
    if (!imageSrc || !originalCanvasRef.current || !displayCanvasRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const origCtx = originalCanvasRef.current!.getContext('2d', { willReadFrequently: true });
      const dispCtx = displayCanvasRef.current!.getContext('2d');
      
      if (!origCtx || !dispCtx) return;

      const procWidth = Math.ceil(img.width / settings.pixelSize);
      const procHeight = Math.ceil(img.height / settings.pixelSize);

      const MAX_PROC_WIDTH = 1000;
      let finalProcWidth = procWidth;
      let finalProcHeight = procHeight;
      
      if (finalProcWidth > MAX_PROC_WIDTH) {
          const ratio = MAX_PROC_WIDTH / finalProcWidth;
          finalProcWidth = MAX_PROC_WIDTH;
          finalProcHeight = Math.floor(finalProcHeight * ratio);
      }

      originalCanvasRef.current!.width = finalProcWidth;
      originalCanvasRef.current!.height = finalProcHeight;
      
      origCtx.drawImage(img, 0, 0, finalProcWidth, finalProcHeight);

      processImage(origCtx, finalProcWidth, finalProcHeight, settings);

      displayCanvasRef.current!.width = finalProcWidth;
      displayCanvasRef.current!.height = finalProcHeight;
      
      dispCtx.imageSmoothingEnabled = false;
      dispCtx.drawImage(originalCanvasRef.current!, 0, 0);
    };
  }, [imageSrc, settings]);

  return (
    <main 
      className="fixed inset-0 w-full h-dvh flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[var(--primary)] selection:text-[var(--on-primary)] transition-colors duration-500"
      style={themeStyles}
    >
      
      {/* --- Top / Left: Image Viewport --- */}
      <div 
        className="flex-1 relative flex flex-col items-center justify-center p-4 lg:p-6 min-h-0 bg-[var(--surface-container-low)] transition-colors duration-500"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
         {/* Branding */}
         <div className="absolute top-6 left-6 z-20 pointer-events-none opacity-80">
            <h1 className="text-xl font-bold tracking-tight text-[var(--on-surface)] flex items-center gap-2">
               <span className="material-symbols-outlined filled">gradient</span>
               Material Dither
            </h1>
         </div>

         {/* Empty State */}
         {!imageSrc && (
            <div className={`
              group relative flex flex-col items-center justify-center
              w-full max-w-sm aspect-square rounded-[32px] border-2 border-dashed
              transition-all duration-500 ease-[var(--md-sys-motion-easing-emphasized)]
              ${isDragging 
                ? 'border-[var(--primary)] bg-[var(--surface-container-high)] scale-105 shadow-2xl' 
                : 'border-[var(--outline)] hover:border-[var(--on-surface)] bg-[var(--surface-container)]'
              }
            `}>
               <div className="mb-6 p-6 rounded-[24px] bg-[var(--secondary-container)] text-[var(--on-secondary-container)] group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
               </div>
               <p className="text-xl font-medium mb-2 tracking-tight text-[var(--on-surface)]">Drop Image</p>
               <label className="cursor-pointer">
                  <span className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-container)] transition-colors">
                    or browse files
                  </span>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
               </label>
            </div>
         )}

         {/* Canvas Area */}
         <div className={`relative w-full h-full flex items-center justify-center transition-all duration-700 ${imageSrc ? 'opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}`}>
           <canvas ref={originalCanvasRef} className="hidden" />
           <canvas 
             ref={displayCanvasRef}
             className="max-w-full max-h-full object-contain rounded-[24px] shadow-2xl"
             style={{ imageRendering: 'pixelated' }}
           />
           
           {/* Floating AI Vibe Badge */}
           {vibeReasoning && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] md:max-w-md w-auto animate-in fade-in slide-in-from-bottom-4 duration-500 z-30">
                <div className="bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] backdrop-blur-xl p-5 rounded-[20px] shadow-xl flex gap-4 items-start border border-[var(--on-tertiary-container)]/10">
                  <span className="material-symbols-outlined mt-0.5">auto_awesome</span>
                  <div>
                    <span className="font-bold block mb-1 text-xs font-mono uppercase tracking-wider opacity-80">Vibe Detected</span>
                    <p className="leading-relaxed text-sm">{vibeReasoning}</p>
                  </div>
                </div>
             </div>
           )}
         </div>
      </div>

      {/* --- Bottom / Right: Controls --- */}
      <div className={`
          flex-none 
          w-full lg:w-[460px] 
          h-[55vh] lg:h-auto 
          bg-[var(--surface-container)]
          text-[var(--on-surface)]
          rounded-t-[32px] lg:rounded-none lg:rounded-l-[32px]
          shadow-[0_-8px_32px_rgba(0,0,0,0.3)] lg:shadow-[-8px_0_32px_rgba(0,0,0,0.3)]
          flex flex-col 
          z-30 
          transition-all duration-500 cubic-bezier(0.2, 0.0, 0, 1.0)
          ${imageSrc ? 'translate-y-0' : 'translate-y-[calc(100%-90px)] lg:translate-y-0 lg:translate-x-[calc(100%-100px)]'} 
      `}>
         
         {/* Mobile Drag Handle */}
         <div className="w-full flex justify-center py-5 lg:hidden shrink-0 opacity-40">
            <div className="w-12 h-1.5 rounded-full bg-[var(--on-surface-variant)]"></div>
         </div>

         {/* Scrollable Content with Snap */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 lg:px-6 pb-24 pt-4 lg:pt-6 snap-y snap-mandatory scroll-smooth">
            <Controls 
              settings={settings} 
              onChange={setSettings} 
              onVibeCheck={handleVibeCheck}
              isProcessingVibe={isProcessingVibe}
            />
         </div>

         {/* Action Bar */}
         <div className="p-6 lg:p-8 bg-[var(--surface-container)] shrink-0 flex gap-4 border-t border-[var(--outline-variant)]/20 relative z-50">
             <label className="flex-1 flex items-center justify-center gap-2 h-14 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--primary)] rounded-[20px] cursor-pointer transition-all font-medium border border-[var(--outline-variant)]">
                <span className="material-symbols-outlined">add</span>
                <span className="hidden sm:inline">New</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
             </label>
             
             <button 
                onClick={handleDownload}
                className="flex-[2] flex items-center justify-center gap-2 h-14 bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-110 active:scale-95 rounded-[20px] font-bold text-lg transition-all shadow-lg shadow-[var(--primary)]/20"
             >
                Download
                <span className="material-symbols-outlined">download</span>
             </button>
         </div>
      </div>

    </main>
  );
};

export default App;