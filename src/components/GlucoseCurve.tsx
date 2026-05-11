import React from 'react';

interface GlucoseCurveProps {
  gi: number;
  gy: number;
  color: string;
  darkMode: boolean;
}

export function GlucoseCurve({ gi, gy, color, darkMode }: GlucoseCurveProps) {
  const height = Math.min(30, (gy / 20) * 25 + 5);
  const peakX = Math.max(20, 50 - (gi / 100) * 15);
  
  return (
    <div className={`mt-4 h-[50px] w-full rounded-2xl overflow-hidden relative border group/curve ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <div className={`absolute inset-0 opacity-0 group-hover/curve:opacity-100 transition-opacity ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
      <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute bottom-0">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path 
          d={`M 0 50 Q ${peakX} ${50 - height} 100 50`} 
          fill="none" 
          stroke={color} 
          strokeWidth="3"
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        />
        <path 
          d={`M 0 50 Q ${peakX} ${50 - height} 100 50 L 100 50 L 0 50 Z`} 
          fill={`url(#grad-${color})`}
        />
      </svg>
      <div className="absolute top-2 left-4 text-[0.6rem] text-zinc-500 font-black uppercase tracking-[0.2em] opacity-50 group-hover/curve:opacity-100 transition-opacity">Glikoz Eğrisi</div>
    </div>
  );
}
