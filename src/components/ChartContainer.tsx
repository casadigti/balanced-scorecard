import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  className,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={cn("glass-card p-8 flex flex-col h-full", className)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
        <div>
          <h3 className="text-slate-800 text-lg font-black tracking-tight leading-none mb-1">{title}</h3>
          {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] font-black text-slate-400 uppercase">Real-Time</span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[300px]">
        {children}
      </div>
    </motion.div>
  );
};
