import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  colorClass?: string;
  bgClass?: string;
  delay?: number;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  description,
  icon: Icon,
  trend,
  colorClass = "text-blue-600",
  bgClass = "bg-blue-50/50",
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card p-6 relative group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", bgClass)}>
          <Icon className={cn("w-6 h-6", colorClass)} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{value}</span>
          {unit && <span className="text-sm font-bold text-slate-400 uppercase">{unit}</span>}
        </div>
        {description && (
          <p className="text-xs text-slate-400 leading-relaxed font-medium mt-2">
            {description}
          </p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
