import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  UserMinus, 
  Smile, 
  Info,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { HRData } from '../types/dashboard';

interface StrategicConfigProps {
  hrData: HRData;
  setHrData: (data: HRData) => void;
}

export const StrategicConfig: React.FC<StrategicConfigProps> = ({
  hrData,
  setHrData
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-10 bg-slate-900 border-none relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-110">
          <Settings className="w-32 h-32 text-slate-400" />
        </div>
        <div className="max-w-xl relative z-10">
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">Configuración de Objetivos</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Define las metas estratégicas para el periodo de análisis. Estos valores servirán 
            como base para calcular los porcentajes de cumplimiento y el éxito operativo.
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 bg-white shadow-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          {/* Main targets */}
          {[
            { label: 'Meta de Ingresos', icon: TrendingUp, key: 'metaFacturacion', type: 'number', color: 'text-brand-600' },
            { label: 'Total Colaboradores', icon: Users, key: 'totalEmployees', type: 'number', color: 'text-purple-600' },
            { label: 'Costo Capacitación ($)', icon: TrendingUp, key: 'trainingInvestment', type: 'number', color: 'text-brand-500' },
            { label: 'Meta Capacitación (h)', icon: Clock, key: 'trainingHours', type: 'number', color: 'text-amber-600' },
            { label: 'Bajas Per. (Mes)', icon: UserMinus, key: 'departures', type: 'number', color: 'text-rose-600' },
          ].map((item) => (
            <div key={item.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <item.icon className={cn("w-4 h-4", item.color)} />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor={item.key}>{item.label}</label>
              </div>
              <input
                id={item.key}
                type={item.type}
                placeholder={item.label}
                title={item.label}
                value={(hrData as any)[item.key]}
                onChange={(e) => setHrData({ ...hrData, [item.key]: parseFloat(e.target.value) || 0 })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 text-lg shadow-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
           {/* NPS Feedback section */}
           <div className="p-8 bg-brand-50/30 rounded-3xl border border-brand-100/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
               <Smile className="w-24 h-24 text-brand-600" />
             </div>
             <h4 className="text-sm font-black text-brand-800 uppercase tracking-widest mb-6 flex items-center gap-2">
               Resultados NPS Pacientes
             </h4>
             <div className="grid grid-cols-3 gap-4 relative z-10">
               {[
                 { label: 'Promotores', key: 'patientPromoters', color: 'focus:ring-emerald-500/20 focus:border-emerald-500', info: 'Cantidad de pacientes que calificaron con 9 o 10.' },
                 { label: 'Pasivos', key: 'patientPassives', color: 'focus:ring-amber-500/20 focus:border-amber-500', info: 'Cantidad de pacientes que calificaron con 7 u 8.' },
                 { label: 'Detractores', key: 'patientDetractors', color: 'focus:ring-rose-500/20 focus:border-rose-500', info: 'Cantidad de pacientes que calificaron de 0 a 6.' },
               ].map((field) => (
                 <div key={field.key} className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 cursor-help" htmlFor={field.key} title={field.info}>
                     {field.label} <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
                   </label>
                   <input
                     id={field.key}
                     type="number"
                     placeholder={field.label}
                     title={field.label}
                     value={(hrData as any)[field.key]}
                     onChange={(e) => setHrData({ ...hrData, [field.key]: parseInt(e.target.value) || 0 })}
                     className={cn("w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none transition-all shadow-sm", field.color)}
                   />
                 </div>
               ))}
             </div>
           </div>

           {/* eNPS Feedback section */}
           <div className="p-8 bg-purple-50/30 rounded-3xl border border-purple-100/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
               <Users className="w-24 h-24 text-purple-600" />
             </div>
             <h4 className="text-sm font-black text-purple-800 uppercase tracking-widest mb-6 flex items-center gap-2">
               Clima Organizacional (eNPS)
             </h4>
             <div className="grid grid-cols-3 gap-4 relative z-10">
               {[
                 { label: 'Fieles', key: 'employeePromoters', color: 'focus:ring-emerald-500/20 focus:border-emerald-500', info: 'Cantidad de empleados que calificaron con 9 o 10.' },
                 { label: 'Neutrales', key: 'employeePassives', color: 'focus:ring-amber-500/20 focus:border-amber-500', info: 'Cantidad de empleados que calificaron con 7 u 8.' },
                 { label: 'Insatisfechos', key: 'employeeDetractors', color: 'focus:ring-rose-500/20 focus:border-rose-500', info: 'Cantidad de empleados que calificaron de 0 a 6.' },
               ].map((field) => (
                 <div key={field.key} className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 cursor-help" htmlFor={field.key} title={field.info}>
                     {field.label} <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
                   </label>
                   <input
                     id={field.key}
                     type="number"
                     placeholder={field.label}
                     title={field.label}
                     value={(hrData as any)[field.key]}
                     onChange={(e) => setHrData({ ...hrData, [field.key]: parseInt(e.target.value) || 0 })}
                     className={cn("w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-800 outline-none transition-all shadow-sm", field.color)}
                   />
                 </div>
               ))}
             </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
