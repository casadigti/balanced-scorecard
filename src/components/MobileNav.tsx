import React from 'react';
import { LayoutDashboard, Upload, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Scorecard', icon: LayoutDashboard },
    { id: 'upload', label: 'Datos', icon: Upload },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/80 z-[100] px-6 py-4 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {menuItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300 relative",
              isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {isActive && (
              <div className="absolute -top-4 w-12 h-1 bg-brand-600 rounded-b-full shadow-[0_4px_10px_rgba(37,99,235,0.5)]" />
            )}
            <item.icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110 drop-shadow-sm")} />
            <span className={cn("text-[10px] font-bold tracking-tight", isActive && "font-black")}>{item.label}</span>
          </button>
        );
      })}
      
      <button
        onClick={() => supabase.auth.signOut()}
        className="flex flex-col items-center gap-1.5 text-rose-400 hover:text-rose-600 transition-colors pt-0.5"
      >
        <LogOut className="w-[22px] h-[22px]" />
        <span className="text-[10px] font-bold tracking-tight">Salir</span>
      </button>
    </div>
  );
};
