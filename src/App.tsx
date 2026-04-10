import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  BookOpen, 
  Smile, 
  AlertCircle, 
  Calendar, 
  Filter, 
  ArrowRight,
  Upload,
  BarChart3,
  Settings,
  MapPin,
  CheckCircle,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Premium Components
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { KPICard } from './components/KPICard';
import { SectionHeader } from './components/SectionHeader';
import { ChartContainer } from './components/ChartContainer';
import { DataUpload } from './components/DataUpload';
import { StrategicConfig } from './components/StrategicConfig';
import { Login } from './components/Login';

// Supabase
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Hooks & Logic
import { useDashboardData } from './hooks/useDashboardData';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0
  }).format(value);
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16'];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMounted, setIsMounted] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { 
    filteredInvoices,
    selectedSucursal,
    setSelectedSucursal,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    hrData,
    setHrData,
    stats,
    salesByProcedure,
    appointmentsByProcedure,
    salesByBranch,
    patientsByBranch,
    enpsDistribution,
    patientSatisfactionDistribution,
    sucursales,
    setInvoices,
    setAppointments,
    clearData,
    dataLoaded,
    setDataLoaded,
    saveToSupabase,
    loading: loadingData,
    saveUserSettings,
    savingSettings
  } = useDashboardData();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);
  const [showTalentModal, setShowTalentModal] = useState(false);
  
  const handleClearData = async () => {
    if (window.confirm('¿ESTÁ SEGURO? Esta acción eliminará permanentemente todas las facturas y citas cargadas de su cuenta de Supabase. Esta operación no se puede deshacer.')) {
      await clearData();
    }
  };


  useEffect(() => {
    setIsMounted(true);

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderDashboard = () => (
    <div className="space-y-16 pb-32">
      {/* 1. Perspectiva Financiera */}
      <section>
        <SectionHeader 
          title="Perspectiva Financiera" 
          subtitle="Valor para el accionista y rentabilidad"
          icon={TrendingUp} 
          colorClass="text-brand-600"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Facturación Total"
            value={formatCurrency(stats.facturacionTotal)}
            description="Ingresos brutos generados en el periodo seleccionado."
            icon={TrendingUp}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50/50"
            delay={0}
          />
          <KPICard
            title="Cumplimiento de Meta"
            value={stats.cumplimientoMeta.toFixed(1)}
            unit="%"
            description={`Meta definida: ${formatCurrency(hrData.metaFacturacion)}`}
            icon={BarChart3}
            colorClass="text-brand-600"
            bgClass="bg-brand-50/50"
            trend={{ value: 12, isUp: true }}
            delay={0.1}
          />
          <KPICard
            title="Promedio por Factura"
            value={formatCurrency(filteredInvoices.length > 0 ? stats.facturacionTotal / filteredInvoices.length : 0)}
            description="Ingreso promedio por cada factura emitida."
            icon={Activity}
            colorClass="text-amber-600"
            bgClass="bg-amber-50/50"
            delay={0.2}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartContainer title="Ingresos por Sucursal" subtitle="Distribución geográfica de la facturación">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByBranch}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Ingresos']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {salesByBranch.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
          <div className="glass-card p-10 premium-gradient-blue text-white flex flex-col justify-center">
            <h4 className="text-2xl font-black mb-4 tracking-tight">Análisis Financiero</h4>
            <p className="text-blue-100 font-medium leading-relaxed mb-8">
              El cumplimiento de meta se sitúa en el <span className="text-white font-black">{stats.cumplimientoMeta.toFixed(1)}%</span>. 
              {salesByBranch.length > 0 ? (
                <>La sucursal de <span className="text-white font-black">{salesByBranch[0]?.name}</span> lidera la generación de valor, aportando el {((salesByBranch[0]?.value / stats.facturacionTotal) * 100).toFixed(0)}% del total facturado.</>
              ) : 'Cargue datos para ver el desglose por sucursal.'}
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowIncomeModal(true)}
                className="bg-white text-brand-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg active:scale-95"
              >
                Ver Detalle de Ingresos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* 2. Perspectiva del Cliente (Paciente) */}
      <section>
        <SectionHeader 
          title="Perspectiva del Cliente" 
          subtitle="Satisfacción y fidelización del paciente"
          icon={Users} 
          colorClass="text-purple-600"
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Índice NPS"
            value={stats.npsPacientes.toFixed(1)}
            description="Net Promoter Score: Medida de lealtad y satisfacción."
            icon={Smile}
            colorClass="text-purple-600"
            bgClass="bg-purple-50/50"
            delay={0}
          />
          <KPICard
            title="Pacientes Únicos"
            value={stats.totalPacientesUnicos}
            description="Volumen total de pacientes individuales atendidos."
            icon={Users}
            colorClass="text-blue-600"
            bgClass="bg-blue-50/50"
            delay={0.1}
          />
          <KPICard
            title="Total Citas"
            value={stats.totalCitas}
            description="Cantidad total de citas registradas en el periodo."
            icon={Calendar}
            colorClass="text-brand-600"
            bgClass="bg-brand-50/50"
            delay={0.2}
          />
          <KPICard
            title="Citas Realizadas"
            value={stats.citasRealizadas}
            description="Total de citas con estatus 'Realizada' o 'Facturada'."
            icon={CheckCircle}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50/50"
            delay={0.3}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <ChartContainer title="Pacientes por Sucursal" subtitle="Distribución de la base de pacientes activos">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={patientsByBranch}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {patientsByBranch.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          <div className="glass-card p-10 bg-slate-900 text-white flex flex-col justify-center">
            <h4 className="text-2xl font-black mb-4 tracking-tight">Voz del Paciente</h4>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
              Con un NPS de <span className="text-brand-400 font-black">{stats.npsPacientes.toFixed(1)}</span>, la percepción de calidad se mantiene en rango de excelencia. 
              Se han atendido <span className="text-white font-black">{stats.totalPacientesUnicos}</span> pacientes únicos, con una tasa de conversión de citas del {stats.eficienciaOperativa.toFixed(1)}%.
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSatisfactionModal(true)}
                className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-lg active:scale-95"
              >
                Ver Encuestas de Satisfacción <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* 3. Perspectiva de Procesos Internos */}
      <section>
        <SectionHeader 
          title="Procesos Internos" 
          subtitle="Excelencia operativa y servicios críticos"
          icon={Activity} 
          colorClass="text-emerald-600"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Cumplimiento de Protocolos"
            value={stats.cumplimientoProtocolos.toFixed(1)}
            unit="%"
            description={`${hrData.compliantProtocols} de ${hrData.auditedProtocols} auditorías con éxito.`}
            icon={CheckCircle}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50/50"
            delay={0}
          />
          <KPICard
            title="Eficiencia Operativa"
            value={stats.eficienciaOperativa.toFixed(1)}
            unit="%"
            description="Relación entre citas agendadas y efectivamente realizadas."
            icon={Activity}
            colorClass="text-brand-600"
            bgClass="bg-brand-50/50"
            delay={0.1}
          />
          <KPICard
            title="Tasa de No-Show"
            value={(100 - stats.eficienciaOperativa).toFixed(1)}
            unit="%"
            description="Porcentaje de citas que no llegaron a concretarse."
            icon={AlertCircle}
            colorClass="text-rose-600"
            bgClass="bg-rose-50/50"
            delay={0.2}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartContainer title="Ventas por Procedimiento (Top 10)" subtitle="Análisis de facturación bruta por tipo de servicio">
            {isMounted && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={salesByProcedure.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={150} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Monto']}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                    {salesByProcedure.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          <ChartContainer title="Citas por Procedimiento (Demanda)" subtitle="Frecuencia de atenciones médicas por servicio">
            {isMounted && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={appointmentsByProcedure.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={150} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                    formatter={(value: any) => [Number(value), 'Citas']}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                    {appointmentsByProcedure.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>
      </section>

      {/* 4. Aprendizaje y Crecimiento */}
      <section>
        <SectionHeader 
          title="Aprendizaje y Crecimiento" 
          subtitle="Desarrollo del capital humano y clima laboral"
          icon={BookOpen} 
          colorClass="text-amber-600"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Instrucción Promedio"
            value={stats.horasInstruccion.toFixed(1)}
            unit="h/emp"
            description="Horas de formación recibidas por cada empleado."
            icon={BookOpen}
            colorClass="text-amber-600"
            bgClass="bg-amber-50/50"
            delay={0}
          />
          <KPICard
            title="Índice eNPS"
            value={stats.enps.toFixed(1)}
            description="Nivel de satisfacción del personal (Employee NPS)."
            icon={Activity}
            colorClass="text-brand-600"
            bgClass="bg-brand-50/50"
            delay={0.1}
          />
          <KPICard
            title="Rotación de Personal"
            value={stats.indiceRotacion.toFixed(1)}
            unit="%"
            description="Estabilidad laboral del equipo en el periodo."
            icon={ArrowRight}
            colorClass="text-rose-600"
            bgClass="bg-rose-50/50"
            delay={0.2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ChartContainer title="Distribución de Clima Laboral" subtitle="Basado en encuestas de eNPS interno">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enpsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {enpsDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          <div className="glass-card p-10 bg-emerald-600 text-white flex flex-col justify-center">
            <h4 className="text-2xl font-black mb-4 tracking-tight">Capital Humano</h4>
            <p className="text-emerald-50 font-medium leading-relaxed mb-8">
              El equipo reporta un eNPS de <span className="text-white font-black">{stats.enps.toFixed(1)}</span>. 
              La inversión en capacitación de <span className="text-white font-black">{stats.horasInstruccion.toFixed(1)}h</span> por empleado ha impactado positivamente en la retención, manteniendo la rotación en un {stats.indiceRotacion.toFixed(1)}%.
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowTalentModal(true)}
                className="bg-white text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-lg active:scale-95"
              >
                Gestionar Talento <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );

  if (loadingSession || loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-600/40"
        >
          <Activity className="w-8 h-8 text-white" />
        </motion.div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
          {loadingSession ? 'Iniciando Sesión Segura...' : 'Sincronizando con la Nube...'}
        </p>
      </div>
    );
  }

  if (!session || showResetPassword) {
    return <Login forceReset={showResetPassword} onPasswordReset={() => setShowResetPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} session={session} />
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="lg:ml-72 min-h-screen pb-24 lg:pb-0">
        {/* Header Global */}
        <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md px-4 sm:px-8 lg:px-16 py-6 lg:py-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 xl:gap-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Contenedor del Logo Empresarial */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-16 h-16 rounded-2xl premium-gradient-blue p-0.5 shadow-xl shadow-brand-500/20 flex-shrink-0"
                title="Sustituye el archivo public/logo.png con el logo de tu empresa"
              >
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden relative">
                  <Activity className="w-8 h-8 text-brand-600 absolute" />
                  <img 
                    src="/logo.png" 
                    alt="Logo Empresa" 
                    className="w-full h-full object-contain relative z-10 bg-white transition-opacity duration-300"
                    onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  />
                </div>
              </motion.div>

              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-1 sm:mb-2"
                >
                  {activeTab === 'dashboard' ? 'Dashboard Estratégico' : activeTab === 'upload' ? 'Gestión de Datos' : 'Configuración'}
                </motion.h1>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span>Última actualización: {new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Filtro Sucursal Premium */}
              <div className="glass-card flex items-center p-1 gap-1">
                <div className="p-2 flex items-center gap-2 text-slate-400">
                  <Filter className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sucursal</span>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <select
                  value={selectedSucursal}
                  onChange={(e) => setSelectedSucursal(e.target.value)}
                  title="Seleccionar Sucursal"
                  aria-label="Seleccionar Sucursal"
                  className="px-3 py-2 text-xs font-black text-slate-700 bg-transparent outline-none cursor-pointer uppercase tracking-widest"
                >
                  {sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Fecha Premium */}
              <div className="glass-card flex flex-col sm:flex-row items-stretch sm:items-center p-1.5 gap-2 sm:gap-3 w-full sm:w-auto">
                 <div className="flex items-center gap-2 px-2 sm:pl-3">
                   <Calendar className="w-4 h-4 text-brand-600 flex-shrink-0" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 sm:w-auto">Desde</span>
                   <input
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     title="Fecha de Inicio"
                     aria-label="Fecha de Inicio"
                     className="text-xs font-black text-slate-700 bg-transparent outline-none cursor-pointer flex-1"
                   />
                 </div>
                 <div className="hidden sm:block h-4 w-px bg-slate-200" />
                 <div className="h-px w-full bg-slate-200 sm:hidden block" />
                 <div className="flex items-center gap-2 px-2 sm:pr-3">
                   <Calendar className="w-4 h-4 text-transparent sm:hidden flex-shrink-0" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 sm:w-auto">Hasta</span>
                   <input
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     title="Fecha de Fin"
                     aria-label="Fecha de Fin"
                     className="text-xs font-black text-slate-700 bg-transparent outline-none cursor-pointer flex-1"
                   />
                 </div>
              </div>
              
              {/* Botón limpiar filtros */}

              {(startDate || endDate || selectedSucursal !== 'Todas') && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSelectedSucursal('Todas');
                    }}
                    title="Limpiar todos los filtros"
                    className="bg-rose-50 text-rose-600 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                  >
                    Limpiar Filtros
                  </button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="px-4 sm:px-8 lg:px-16 pt-2 lg:pt-4 max-w-7xl mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {activeTab === 'dashboard' && (
                <>
                  {!dataLoaded && (
                    <div className="mb-12 p-8 glass-card border-brand-200 bg-brand-50/10 flex flex-col items-center text-center">
                       <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-6">
                         <AlertCircle className="w-8 h-8" />
                       </div>
                       <h3 className="text-xl font-black text-slate-800 mb-2">Esperando Datos Operativos</h3>
                       <p className="text-slate-500 max-w-sm font-medium mb-8">
                         Para visualizar los indicadores estratégicos, por favor carga los archivos de facturas y citas en la sección de gestión.
                       </p>
                       <button
                         onClick={() => setActiveTab('upload')}
                         className="premium-gradient-blue text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-transform"
                       >
                         Ir a Cargar Datos
                       </button>
                    </div>
                  )}
                  {renderDashboard()}
                </>
              )}
              
              {activeTab === 'upload' && (
                <DataUpload 
                  hrData={hrData} 
                  setHrData={setHrData}
                  setInvoices={setInvoices}
                  setAppointments={setAppointments}
                  setDataLoaded={setDataLoaded}
                  clearData={handleClearData}
                  saveToSupabase={saveToSupabase}
                  onSuccess={() => setActiveTab('dashboard')}
                />
              )}

              {activeTab === 'settings' && (
                <StrategicConfig 
                  hrData={hrData} 
                  setHrData={setHrData} 
                  onSave={() => saveUserSettings(hrData)}
                  isSaving={savingSettings}
                  onClearData={handleClearData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl flex justify-around shadow-2xl z-50">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          title="Dashboard"
          className={cn("p-4 rounded-2xl transition-all", activeTab === 'dashboard' ? "bg-brand-600 text-white" : "text-slate-400")}
        >
          <Activity className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('upload')} 
          title="Cargar Datos"
          className={cn("p-4 rounded-2xl transition-all", activeTab === 'upload' ? "bg-brand-600 text-white" : "text-slate-400")}
        >
          <Upload className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          title="Configuración"
          className={cn("p-4 rounded-2xl transition-all", activeTab === 'settings' ? "bg-brand-600 text-white" : "text-slate-400")}
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showIncomeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowIncomeModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 lg:px-10 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de Ingresos por Procedimiento</h2>
                  <p className="text-slate-500 font-medium text-sm">Ranking completo de facturación bruta por servicio</p>
                </div>
                <button 
                  onClick={() => setShowIncomeModal(false)}
                  title="Cerrar"
                  className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  {salesByProcedure.map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 hover:bg-brand-50/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-brand-600 text-xs border border-slate-100 group-hover:border-brand-200">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight mb-0.5">{item.fullName}</p>
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Servicio Médico</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-lg mb-0.5">{formatCurrency(item.value)}</p>
                        <p className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full inline-block">
                          {((item.value / stats.facturacionTotal) * 100).toFixed(1)}% del total
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {salesByProcedure.length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-slate-400 font-bold uppercase tracking-widest">No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Consolidado Total</span>
                      <span className="text-2xl font-black text-slate-900 leading-tight">{formatCurrency(stats.facturacionTotal)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowIncomeModal(false)}
                    className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                  >
                    Cerrar Informe
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSatisfactionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSatisfactionModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 lg:px-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Barómetro de Satisfacción (NPS)</h2>
                  <p className="text-slate-500 font-medium text-sm">Desglose de lealtad y percepción del paciente</p>
                </div>
                <button 
                  onClick={() => setShowSatisfactionModal(false)}
                  title="Cerrar"
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-10">
                  <div className="lg:col-span-1 flex flex-col items-center justify-center p-8 bg-brand-600 rounded-[24px] text-white shadow-xl shadow-brand-500/20">
                    <span className="text-[10px] uppercase font-black tracking-widest mb-2 opacity-80">Índice NPS Global</span>
                    <span className="text-6xl font-black mb-2">{stats.npsPacientes.toFixed(1)}</span>
                    <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                      Rango de Excelencia
                    </div>
                  </div>
                  
                  <div className="lg:col-span-2">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Distribución de Respuestas</h4>
                    <div className="space-y-6">
                      {[
                        { label: 'Promotores (9-10)', value: hrData.patientPromoters, color: 'bg-emerald-500', total: hrData.patientPromoters + hrData.patientPassives + hrData.patientDetractors, icon: '🌟' },
                        { label: 'Pasivos (7-8)', value: hrData.patientPassives, color: 'bg-amber-500', total: hrData.patientPromoters + hrData.patientPassives + hrData.patientDetractors, icon: '😐' },
                        { label: 'Detractores (0-6)', value: hrData.patientDetractors, color: 'bg-rose-500', total: hrData.patientPromoters + hrData.patientPassives + hrData.patientDetractors, icon: '⚠️' },
                      ].map((group, i) => {
                        const percentage = group.total > 0 ? (group.value / group.total) * 100 : 0;
                        return (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                                <span className="text-lg">{group.icon}</span> {group.label}
                              </span>
                              <span className="text-xs font-black text-slate-900">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className={cn("h-full rounded-full", group.color)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Users className="w-5 h-5 text-brand-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 tracking-tight">Metas de Servicio</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      El objetivo estratégico es mantener un NPS por encima de **70.0**. Un NPS de **{stats.npsPacientes.toFixed(1)}** indica una fidelización superior al promedio de la industria.
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 tracking-tight">Análisis de Retención</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      El **{( (hrData.patientPromoters / (hrData.patientPromoters + hrData.patientPassives + hrData.patientDetractors)) * 100).toFixed(0)}%** de tu base de pacientes actuará como embajador de marca voluntario.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowSatisfactionModal(false)}
                  className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-xl active:scale-95"
                >
                  Cerrar Análisis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTalentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowTalentModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 lg:px-10 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                <div>
                  <h2 className="text-2xl font-black text-emerald-900 tracking-tight">Monitor de Capital Humano</h2>
                  <p className="text-emerald-700/60 font-medium text-sm">Clima organizacional y desarrollo del equipo</p>
                </div>
                <button 
                  onClick={() => setShowTalentModal(false)}
                  title="Cerrar"
                  className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                  <div className="p-8 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Employee NPS (eNPS)</h4>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Smile className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="flex items-end gap-4 mb-6">
                      <span className="text-5xl font-black text-slate-900">{stats.enps.toFixed(1)}</span>
                      <div className="mb-2">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Saludable</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Promotores', value: hrData.employeePromoters, color: 'bg-emerald-500', total: hrData.employeePromoters + hrData.employeePassives + hrData.employeeDetractors },
                        { label: 'Detractores', value: hrData.employeeDetractors, color: 'bg-rose-500', total: hrData.employeePromoters + hrData.employeePassives + hrData.employeeDetractors },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">{item.label}</span>
                          <span className="font-black text-slate-900">
                             {item.total > 0 ? ((item.value / item.total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Inversión en Aprendizaje</h4>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <div className="flex items-end gap-3 mb-6">
                      <span className="text-5xl font-black text-slate-900">{stats.horasInstruccion.toFixed(1)}</span>
                      <span className="text-sm font-bold text-slate-400 mb-2">Horas/Emp</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progreso Meta Anual</span>
                        <span>{((hrData.trainingHours / (hrData.metaFacturacion / 10000)) * 10).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rotación Mensual</p>
                     <p className="text-2xl font-black text-slate-900">{stats.indiceRotacion.toFixed(1)}%</p>
                     <p className="text-[10px] text-emerald-600 font-bold mt-1">Bajo Control</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Colaboradores</p>
                     <p className="text-2xl font-black text-slate-900">{hrData.totalEmployees}</p>
                     <p className="text-[10px] text-slate-500 font-bold mt-1">Plantilla Activa</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Formación</p>
                     <p className="text-2xl font-black text-slate-900">{formatCurrency(stats.costoPorColaborador)}</p>
                     <p className="text-[10px] text-slate-500 font-bold mt-1">Por Colaborador</p>
                   </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowTalentModal(false)}
                  className="px-10 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg active:scale-95"
                >
                  Finalizar Revisión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
