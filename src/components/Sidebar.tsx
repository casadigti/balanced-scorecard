import React from 'react';
import { LayoutDashboard, Upload, Settings, ShieldCheck, Activity, BarChart3, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: Session | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, session }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Balanced Scorecard', icon: LayoutDashboard },
    { id: 'upload', label: 'Cargar Datos', icon: Upload },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const userEmail = session?.user?.email || 'Admin User';
  const userName = session?.user?.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <aside className="glass-sidebar fixed left-0 top-0 h-full w-72 p-8 hidden lg:flex flex-col z-50">
      <div className="flex items-center gap-4 mb-12 px-2">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-12 h-12 relative flex items-center justify-center"
        >
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-full h-full object-contain relative z-10"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>
        <div>
          <span className="font-black text-2xl tracking-tighter text-slate-900 block leading-none uppercase">BSC</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-600 block">Health Core v1.1</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group",
                isActive 
                  ? "bg-brand-50 text-brand-700 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1.5 h-6 premium-gradient-blue rounded-full"
                />
              )}
              <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-brand-600" : "text-slate-400")} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-6">
        {/* User Profile Visual Section */}
        <div className="p-4 rounded-[24px] bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl premium-gradient-blue flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-500/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate tracking-tight">{userName}</p>
              <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter">{userEmail}</p>
            </div>
          </div>
          
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all duration-300 group"
          >
            <span className="font-black text-[10px] uppercase tracking-widest">Cerrar Sesión</span>
            <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="p-5 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-3xl relative overflow-hidden shadow-2xl">
          <ShieldCheck className="w-12 h-12 text-slate-700 absolute -right-2 -bottom-2 rotate-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado del Sistema</span>
            </div>
            <p className="text-white text-xs font-bold leading-tight mb-1">Protección Activa</p>
            <p className="text-slate-400 text-[10px] leading-relaxed">Infraestructura local segura para datos médicos sensibles.</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
