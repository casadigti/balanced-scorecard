import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  colorClass?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  colorClass = "text-brand-600"
}) => {
  return (
    <div className="flex items-center gap-4 mb-8">
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        className={cn("p-2.5 rounded-xl bg-white shadow-sm border border-slate-100", colorClass)}
      >
        <Icon className="w-6 h-6" />
      </motion.div>
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{title}</h2>
        {subtitle && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>}
      </div>
    </div>
  );
};
