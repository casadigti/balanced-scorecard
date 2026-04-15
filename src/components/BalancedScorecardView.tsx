import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { parseDate, transformRawInvoice, transformRawAppointment, calculateKPIs, getPeriods, filterByPeriod } from '../lib/data-processor';
import { ChevronDown, RefreshCw, Target, TrendingUp, Users, Zap, BookOpen } from 'lucide-react';
import { Invoice, Appointment, HRData } from '../types/dashboard';

//#region ─── TIPOS ─────────────────────────────────────────────────────────────

interface KPIs {
  facturacionTotal: number; promedioFactura: number; totalCitas: number;
  citasRealizadas: number; eficienciaCitas: number; tasaNoShow: number;
  pacientesUnicos: number; horasInstruccion: number; indiceRotacion: number;
  enps: number; cumplimientoProtocolos: number; costoCapacitacion: number;
}
interface Indicator {
  id: string; label: string; weight: number; isInverse?: boolean;
  getValue: (kpi: KPIs, manualValues: Record<string, number>) => number;
  extraordinary: number; effort: number; target: number; minimum: number;
  formatValue: (v: number) => string;
}
interface Perspective {
  id: string; label: string; color: string; icon: React.ReactNode;
  indicators: Indicator[];
}

//#endregion

//#region ─── HELPERS ───────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
const fmtN = (n: number, d = 0) => n.toLocaleString('es-DO', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function calcScore(value: number, ind: Indicator): number {
  const { extraordinary: ext, effort: eff, target: tgt, minimum: min, isInverse } = ind;
  if (!isInverse) {
    if (value >= ext) return 5;
    if (value >= eff) return 4;
    if (value >= tgt) return 3;
    if (value >= min) return 2;
    return 1;
  } else {
    if (value <= ext) return 5;
    if (value <= eff) return 4;
    if (value <= tgt) return 3;
    if (value <= min) return 2;
    return 1;
  }
}

const bscStyles = `
  @keyframes bsc-fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bsc-glow { 0% { box-shadow: 0 0 5px rgba(168,85,247,0.2); } 50% { box-shadow: 0 0 20px rgba(168,85,247,0.4); } 100% { box-shadow: 0 0 5px rgba(168,85,247,0.2); } }
  .bsc-perspective-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .bsc-perspective-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.2) !important; background: rgba(30,58,138,0.4) !important; }
  .bsc-indicator-row { transition: background 0.2s; }
  .bsc-indicator-row:hover { background: rgba(255,255,255,0.06) !important; }
  .bsc-dropdown-item:hover { background: rgba(168,85,247,0.1) !important; }
`;

function scoreLabel(score: number): string {
  if (score >= 4.5) return 'Excelente';
  if (score >= 3.5) return 'Muy Bueno';
  if (score >= 2.5) return 'En Horizonte';
  if (score >= 1.5) return 'Bajo Alerta';
  return 'Crítico';
}

function scoreColor(score: number): string {
  if (score >= 4.5) return '#00ff9d'; // Neon Emerald
  if (score >= 3.5) return '#00d2ff'; // Sky Blue
  if (score >= 2.5) return '#ffcc00'; // Vivid Gold
  if (score >= 1.5) return '#ff8a00'; // Pure Orange
  return '#ff2d55'; // Vibrant Red
}

function getMonthName(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
}

async function fetchAll(table: string, dateCol: string): Promise<any[]> {
  let results: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999).order(dateCol, { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) break;
    results = [...results, ...data];
    if (data.length < 1000) break;
    from += 1000;
  }
  return results;
}

//#endregion

//#region ─── PERSPECTIVAS ──────────────────────────────────────────────────────

const PERSPECTIVES: Perspective[] = [
  {
    id: 'fin', label: 'Financiera', color: '#10b981',
    icon: <TrendingUp className="w-5 h-5" />,
    indicators: [
      {
        id: 'ingresos', label: 'Ingresos por Ventas', weight: 20,
        getValue: (k) => k.facturacionTotal,
        extraordinary: 2_500_000, effort: 2_000_000, target: 1_500_000, minimum: 1_000_000,
        formatValue: fmt,
      },
      {
        id: 'ticket', label: 'Ticket Promedio por Factura', weight: 10,
        getValue: (k) => k.promedioFactura,
        extraordinary: 3_000, effort: 2_500, target: 1_700, minimum: 1_200,
        formatValue: fmt,
      },
    ],
  },
  {
    id: 'cli', label: 'Clientes', color: '#3b82f6',
    icon: <Users className="w-5 h-5" />,
    indicators: [
      {
        id: 'pacientes', label: 'Pacientes Únicos Atendidos', weight: 15,
        getValue: (k) => k.pacientesUnicos,
        extraordinary: 900, effort: 750, target: 600, minimum: 400,
        formatValue: (v) => fmtN(v),
      },
      {
        id: 'citas', label: 'Total Citas Procesadas', weight: 10,
        getValue: (k) => k.totalCitas,
        extraordinary: 1_800, effort: 1_400, target: 1_000, minimum: 700,
        formatValue: (v) => fmtN(v),
      },
    ],
  },
  {
    id: 'ops', label: 'Procesos y Eficiencia Operativa', color: '#f59e0b',
    icon: <Zap className="w-5 h-5" />,
    indicators: [
      {
        id: 'eficiencia', label: 'Eficiencia de Citas', weight: 15,
        getValue: (k) => k.eficienciaCitas,
        extraordinary: 90, effort: 80, target: 70, minimum: 60,
        formatValue: fmtPct,
      },
      {
        id: 'noshow', label: 'Tasa No-Show / Ausentismo', weight: 10, isInverse: true,
        getValue: (k) => k.tasaNoShow,
        extraordinary: 5, effort: 10, target: 20, minimum: 30,
        formatValue: fmtPct,
      },
      {
        id: 'protocolos', label: 'Cumplimiento de Protocolos', weight: 10,
        getValue: (k) => k.cumplimientoProtocolos,
        extraordinary: 95, effort: 90, target: 80, minimum: 70,
        formatValue: fmtPct,
      },
    ],
  },
  {
    id: 'apr', label: 'Aprendizaje y Crecimiento', color: '#a855f7',
    icon: <BookOpen className="w-5 h-5" />,
    indicators: [
      {
        id: 'instruccion', label: 'Instrucción Promedio', weight: 3,
        getValue: (k) => k.horasInstruccion,
        extraordinary: 1.0, effort: 0.8, target: 0.5, minimum: 0.2,
        formatValue: (v) => `${v.toFixed(1)} h/emp`,
      },
      {
        id: 'enps', label: 'Índice eNPS', weight: 3,
        getValue: (k) => k.enps,
        extraordinary: 50, effort: 30, target: 15, minimum: 5,
        formatValue: (v) => v.toFixed(1),
      },
      {
        id: 'capacitacion', label: 'Inversión en Capacitación', weight: 2,
        getValue: (k) => k.costoCapacitacion,
        extraordinary: 1000, effort: 800, target: 500, minimum: 200,
        formatValue: (v) => `RD$ ${v.toFixed(0)}/emp`,
      },
      {
        id: 'rotacion', label: 'Rotación de Personal', weight: 2, isInverse: true,
        getValue: (k) => k.indiceRotacion,
        extraordinary: 5, effort: 10, target: 15, minimum: 20,
        formatValue: fmtPct,
      },
    ],
  },
];

//#endregion

//#region ─── SUB-COMPONENTES ───────────────────────────────────────────────────

const GaugeSVG: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const cx = size / 2, cy = size / 2 + 10;
  const r = size * 0.38;
  const circumference = Math.PI * r;
  const pct = Math.min(Math.max((score - 1) / 4, 0), 1);
  const offset = circumference * (1 - pct);
  const color = scoreColor(score);

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} style={{ filter: 'drop-shadow(0 0 8px ' + color + '44)' }}>
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff2d55" />
          <stop offset="50%" stopColor="#ffcc00" />
          <stop offset="100%" stopColor="#00ff9d" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.12} strokeLinecap="round" />
      {/* Colored arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={size * 0.12} strokeLinecap="round"
        strokeDasharray={`${circumference}`} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.6s ease' }} />
      {/* Score text */}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="white"
        fontSize={size * 0.28} fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
        {score.toFixed(2)}
      </text>
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fill={color}
        fontSize={size * 0.08} fontWeight="800" fontFamily="Inter, system-ui, sans-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {scoreLabel(score)}
      </text>
    </svg>
  );
};

const ThresholdStrip: React.FC<{ ind: Indicator; value: number }> = ({ ind, value }) => {
  const { extraordinary: ext, effort: eff, target: tgt, minimum: min, isInverse, formatValue } = ind;
  const segments = isInverse
    ? [
        { label: `≤${formatValue(ext)}`, bg: '#10b981' }, // 5 pts (Extraordinario)
        { label: `≤${formatValue(eff)}`, bg: '#34d399' }, // 4 pts
        { label: `≤${formatValue(tgt)}`, bg: '#f59e0b' }, // 3 pts
        { label: `≤${formatValue(min)}`, bg: '#f97316' }, // 2 pts
        { label: `>${formatValue(min)}`, bg: '#ef4444' }, // 1 pt (No Aceptable)
      ]
    : [
        { label: `<${formatValue(min)}`, bg: '#ef4444' }, // 1 pt (No Aceptable)
        { label: `≥${formatValue(min)}`, bg: '#f97316' }, // 2 pts
        { label: `≥${formatValue(tgt)}`, bg: '#f59e0b' }, // 3 pts
        { label: `≥${formatValue(eff)}`, bg: '#34d399' }, // 4 pts
        { label: `≥${formatValue(ext)}`, bg: '#10b981' }, // 5 pts (Extraordinario)
      ];
  const score = calcScore(value, ind);
  // Si es inverso, el score 5 es el primer segmento (Verde). Si es normal, el score 1 es el primero (Rojo).
  const activeIdx = isInverse ? (5 - score) : (score - 1);

  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            height: 8, width: '100%', borderRadius: 10,
            background: i === activeIdx ? s.bg : 'rgba(255,255,255,0.05)',
            border: i === activeIdx ? `1px solid ${s.bg}88` : '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.4s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {i === activeIdx && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                animation: 'bsc-shimmer 2s infinite ease-in-out'
              }} />
            )}
          </div>
          <span style={{ 
            fontSize: 8, 
            color: i === activeIdx ? 'white' : 'rgba(255,255,255,0.25)', 
            fontWeight: i === activeIdx ? 900 : 600, 
            textAlign: 'center', 
            lineHeight: 1.2 
          }}>
            {s.label}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes bsc-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const IndicatorRow: React.FC<{
  ind: Indicator; kpi: KPIs;
}> = ({ ind, kpi }) => {
  const value = ind.getValue(kpi, {});
  const score = calcScore(value, ind);
  const weighted = score * (ind.weight / 100);
  const color = scoreColor(score);

  return (
    <div className="bsc-indicator-row" style={{
      background: 'rgba(30,58,138,0.15)', borderRadius: 16, padding: '16px 20px',
      border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Name + weight */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.98)' }}>{ind.label}</span>
            <span style={{
              fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.5)',
              background: 'rgba(168,85,247,0.15)', borderRadius: 6, padding: '3px 8px',
              textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(168,85,247,0.2)'
            }}>{ind.weight}%</span>
          </div>
        </div>
        {/* Value */}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.85)', minWidth: 100, textAlign: 'right' }}>
          {ind.formatValue(value)}
        </span>
        {/* Score badge */}
        <div style={{
          background: `${color}22`, border: `1px solid ${color}55`,
          borderRadius: 10, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 14, fontWeight: 900, color }}>
            {score} pts
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>·</span>
          <span style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {scoreLabel(score)}
          </span>
        </div>
        {/* Weighted pts */}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', minWidth: 56, textAlign: 'right' }}>
          {weighted.toFixed(2)} pts pond.
        </span>
      </div>
      <ThresholdStrip ind={ind} value={value} />
    </div>
  );
};

const PerspectiveCard: React.FC<{
  perspective: Perspective; kpi: KPIs;
}> = ({ perspective, kpi }) => {
  const [collapsed, setCollapsed] = useState(false);

  const perspScore = useMemo(() => {
    const totalWeight = perspective.indicators.reduce((s, i) => s + i.weight, 0);
    if (totalWeight === 0) return 0;
    const weighted = perspective.indicators.reduce((s, ind) => {
      const v = ind.getValue(kpi, {});
      return s + calcScore(v, ind) * (ind.weight / totalWeight);
    }, 0);
    return weighted;
  }, [perspective.indicators, kpi]);

  const color = perspective.color;

  return (
    <div className="bsc-perspective-card" style={{
      background: `linear-gradient(135deg, rgba(15,23,42,0.9) 0%, ${color}0C 100%)`,
      backdropFilter: 'blur(16px)',
      border: `1px solid ${color}33`,
      borderRadius: 24, overflow: 'hidden', marginBottom: 20,
      boxShadow: '0 15px 45px -15px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 16,
          padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: `${color}15`,
          border: `1px solid ${color}33`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color,
          boxShadow: `0 0 15px ${color}22`
        }}>
          {perspective.icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 2 }}>
            Perspectiva
          </p>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
            {perspective.label}
          </p>
        </div>
        {/* Mini score */}
        <div style={{ textAlign: 'right', marginRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: scoreColor(perspScore), lineHeight: 1 }}>
              {perspScore.toFixed(2)}
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>/5</span>
          </div>
          <p style={{ fontSize: 10, color: scoreColor(perspScore), fontWeight: 800, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {scoreLabel(perspScore)}
          </p>
        </div>
        {/* Chevron */}
        <ChevronDown
          style={{
            width: 20, height: 20, color: 'rgba(255,255,255,0.35)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease', flexShrink: 0,
          }}
        />
      </button>

      {/* Indicators */}
      {!collapsed && (
        <div style={{ padding: '0 16px 16px' }}>
          {perspective.indicators.map(ind => (
            <IndicatorRow key={ind.id} ind={ind} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
};

//#endregion

//#region ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────

export const BalancedScorecardView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hrData, setHrData] = useState<HRData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const [invData, appData, settingsData] = await Promise.all([
        fetchAll('invoices', 'fecha'),
        fetchAll('appointments', 'fecha'),
        session ? supabase.from('user_settings').select('*').eq('user_id', session.user.id).single() : Promise.resolve({ data: null })
      ]);
      
      setInvoices((invData || []).map(transformRawInvoice));
      setAppointments((appData || []).map(transformRawAppointment));
      
      if (settingsData && settingsData.data) {
        const d = settingsData.data;
        setHrData({
          metaFacturacion: d.income_target || 1500000,
          totalEmployees: d.employees_count || 45,
          trainingHours: d.training_hours || 120,
          departures: d.turnover_target || 2,
          patientPromoters: d.nps_promoters || 85,
          patientPassives: d.nps_passives || 10,
          patientDetractors: d.nps_detractors || 5,
          employeePromoters: d.enps_promoters || 75,
          employeePassives: d.enps_passives || 15,
          employeeDetractors: d.enps_detractors || 10,
          trainingInvestment: d.training_cost || 50000,
          compliantProtocols: d.clinical_compliant || 45,
          auditedProtocols: d.clinical_audited || 50,
        });
      }
    } catch (e) {
      console.error('BSC: Error cargando datos', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Periods (year-month) from data
  const periods = useMemo(() => getPeriods(invoices, appointments), [invoices, appointments]);

  // Auto-select most recent period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) setSelectedPeriod(periods[0]);
  }, [periods, selectedPeriod]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    if (!selectedPeriod) return invoices;
    const [y, m] = selectedPeriod.split('-').map(Number);
    return invoices.filter(i => {
      const d = parseDate(i.fecha);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  }, [invoices, selectedPeriod]);

  const filteredAppointments = useMemo(() => {
    if (!selectedPeriod) return appointments;
    const [y, m] = selectedPeriod.split('-').map(Number);
    return appointments.filter(a => {
      const d = parseDate(a.fecha);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  }, [appointments, selectedPeriod]);

  // KPIs - Usar lógica unificada desde data-processor.ts
  const kpi: KPIs = useMemo(() => {
    if (!hrData) {
      return {
        facturacionTotal: 0, promedioFactura: 0, totalCitas: filteredAppointments.length,
        citasRealizadas: 0, eficienciaCitas: 0, tasaNoShow: 0,
        pacientesUnicos: 0, horasInstruccion: 0, indiceRotacion: 0,
        enps: 0, cumplimientoProtocolos: 0, costoCapacitacion: 0
      };
    }
    
    // Usar calculateKPIs con datos filtrados por período y todos los datos
    const result = calculateKPIs(filteredInvoices, filteredAppointments, hrData, invoices, appointments);
    
    return {
      facturacionTotal: result.facturacionTotal,
      promedioFactura: result.totalCitas > 0 ? result.facturacionTotal / result.totalCitas : 0,
      totalCitas: result.totalCitas,
      citasRealizadas: result.citasRealizadas,
      eficienciaCitas: result.eficienciaOperativa,
      tasaNoShow: 100 - result.eficienciaOperativa,
      pacientesUnicos: result.totalPacientesUnicos,
      horasInstruccion: result.horasInstruccion,
      indiceRotacion: result.indiceRotacion,
      enps: result.enps,
      cumplimientoProtocolos: result.cumplimientoProtocolos,
      costoCapacitacion: result.costoPorColaborador
    };
  }, [filteredInvoices, filteredAppointments, hrData, invoices, appointments]);

  // Global score
  const globalScore = useMemo(() => {
    const allIndicators = PERSPECTIVES.flatMap(p => p.indicators);
    const totalWeight = allIndicators.reduce((s, i) => s + i.weight, 0);
    if (totalWeight === 0) return 0;
    return allIndicators.reduce((s, ind) => {
      const v = ind.getValue(kpi, {});
      return s + calcScore(v, ind) * (ind.weight / totalWeight);
    }, 0);
  }, [kpi]);

  // ── Spinner ──
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'rgba(15,23,42,0)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'bsc-pulse 1.5s ease-in-out infinite',
        }}>
          <Target style={{ width: 28, height: 28, color: '#a855f7' }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Cargando evaluación estratégica...
        </p>
        <style>{`@keyframes bsc-pulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.08);opacity:1} }`}</style>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div style={{ 
      fontFamily: 'Inter, system-ui, sans-serif', color: 'white', padding: '24px 32px',
      background: 'linear-gradient(180deg, #0a0c10 0%, #111827 50%, #0a0c10 100%)',
      minHeight: '100vh',
      borderRadius: 12
    }}>
      <style>{bscStyles}</style>

      {/* ── Period Selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Balanced Scorecard
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Gestión Estratégica en Tiempo Real
            </p>
          </div>
        </div>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              background: 'rgba(30,58,138,0.3)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
              padding: '12px 20px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 12, minWidth: 240,
              boxShadow: '0 4px 25px rgba(0,0,0,0.3)', transition: 'all 0.2s',
            }}
          >
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2 }}>
                Periodo Analítico
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                {selectedPeriod ? getMonthName(selectedPeriod) : 'Seleccionar...'}
              </p>
            </div>
            <ChevronDown style={{
              width: 16, height: 16, color: 'rgba(255,255,255,0.4)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
              background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
              minWidth: 200, overflow: 'hidden',
              animation: 'bsc-dropIn 0.15s ease',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}>
              {periods.map(p => (
                <div
                  key={p}
                  className="bsc-dropdown-item"
                  onClick={() => { setSelectedPeriod(p); setDropdownOpen(false); }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 10,
                    background: p === selectedPeriod ? 'rgba(168,85,247,0.15)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {p === selectedPeriod && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: p === selectedPeriod ? '#a855f7' : 'rgba(255,255,255,0.75)',
                    marginLeft: p === selectedPeriod ? 0 : 22,
                  }}>
                    {getMonthName(p)}
                  </span>
                </div>
              ))}
              {periods.length === 0 && (
                <p style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  Sin periodos disponibles
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'INGRESOS TOTALES', value: fmt(kpi.facturacionTotal), color: '#00ff9d', icon: <TrendingUp size={14}/> },
          { label: 'Citas Totales', value: fmtN(kpi.totalCitas), color: '#00d2ff', icon: <Zap size={14}/> },
          { label: 'Asistencia Efectiva', value: fmtN(kpi.citasRealizadas), color: '#ffcc00', icon: <Target size={14}/> },
          { label: 'Pacientes Únicos', value: fmtN(kpi.pacientesUnicos), color: '#a855f7', icon: <Users size={14}/> },
        ].map(card => (
          <div key={card.label} style={{
            background: 'rgba(30,58,138,0.2)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '20px 22px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: 12, color: card.color, opacity: 0.35 }}>
              {card.icon}
            </div>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{card.value}</p>
            <div style={{ width: 24, height: 2, background: card.color, marginTop: 12, borderRadius: 2 }}></div>
          </div>
        ))}
      </div>

      {/* ── Global Score ── */}
      <div style={{
        background: `linear-gradient(225deg, #0f172a 0%, #1e293b 100%)`,
        border: `1px solid ${scoreColor(globalScore)}55`,
        borderRadius: 28, padding: '32px 36px', marginBottom: 36,
        display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
        boxShadow: `0 25px 60px -20px ${scoreColor(globalScore)}44`,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 250, height: 250, background: scoreColor(globalScore), opacity: 0.03, filter: 'blur(100px)', borderRadius: '50%' }} />
        <GaugeSVG score={globalScore} size={160} />
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
            Índice de Salud Estratégica
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <p style={{ fontSize: 56, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {globalScore.toFixed(2)}
            </p>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>/ 5.00</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <div style={{ background: scoreColor(globalScore), color: '#0f172a', padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
              {scoreLabel(globalScore)}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Cierre de periodo: <span style={{ color: 'white' }}>{selectedPeriod ? getMonthName(selectedPeriod) : '—'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Perspectives ── */}
      {PERSPECTIVES.map(p => (
        <PerspectiveCard
          key={p.id}
          perspective={p}
          kpi={kpi}
        />
      ))}

      {/* ── Refresh Button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={loadData}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: 12, padding: '12px 20px', cursor: 'pointer', color: '#a855f7',
            fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
          }}
        >
          <RefreshCw style={{ width: 15, height: 15 }} />
          Actualizar datos
        </button>
      </div>
    </div>
  );
};

//#endregion
