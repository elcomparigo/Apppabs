import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Navigation } from 'lucide-react';

interface AndroidStatusBarProps {
  isGpsActive?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isGpsActive }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/95 backdrop-blur-md px-4 py-1.5 flex items-center justify-between text-xs text-slate-300 font-mono border-b border-white/5 select-none z-50">
      <div className="flex items-center gap-2 font-bold tracking-wider">
        <span>{time || '12:00'}</span>
        {isGpsActive && (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
            <Navigation className="w-2.5 h-2.5 animate-pulse" /> GPS
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-slate-400">
        <span className="text-[10px] font-bold tracking-widest text-orange-400">PABS 4G</span>
        <Wifi className="w-3.5 h-3.5 text-slate-300" />
        <div className="flex items-center gap-1">
          <span className="text-[10px]">98%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
