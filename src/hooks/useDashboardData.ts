import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Invoice, Appointment, HRData } from '../types/dashboard';
import { supabase } from '../lib/supabase';
import { 
  processInvoices, 
  processAppointments, 
  calculateKPIs,
  getSalesByProcedure,
  getSalesByBranch,
  getAppointmentsByProcedure,
  getPatientsByBranch,
  getENPSDistribution,
  getPatientSatisfactionDistribution,
  getPatientAcquisitionDistribution,
  getSalesByARS,
  parseDate
} from '../lib/data-processor';


export const useDashboardData = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('Todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [hrData, setHrData] = useState<HRData>({
    metaFacturacion: 1500000,
    totalEmployees: 45,
    trainingHours: 120,
    departures: 2,
    patientPromoters: 85,
    patientPassives: 10,
    patientDetractors: 5,
    employeePromoters: 75,
    employeePassives: 15,
    employeeDetractors: 10,
    trainingInvestment: 50000,
    compliantProtocols: 45,
    auditedProtocols: 50,
  });

  const [savingSettings, setSavingSettings] = useState(false);

  const fetchUserSettings = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data && !error) {
        setHrData({
          totalEmployees: data.employees_count,
          metaFacturacion: data.income_target,
          trainingInvestment: data.training_cost,
          trainingHours: data.training_hours,
          departures: data.turnover_target,
          patientPromoters: data.nps_promoters,
          patientPassives: data.nps_passives,
          patientDetractors: data.nps_detractors,
          employeePromoters: data.enps_promoters,
          employeePassives: data.enps_passives,
          employeeDetractors: data.enps_detractors,
          compliantProtocols: data.clinical_compliant || 0,
          auditedProtocols: data.clinical_audited || 0
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const saveUserSettings = useCallback(async (newData: HRData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      
      setSavingSettings(true);
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          employees_count: newData.totalEmployees,
          income_target: newData.metaFacturacion,
          training_cost: newData.trainingInvestment,
          training_hours: newData.trainingHours,
          turnover_target: newData.departures,
          nps_promoters: newData.patientPromoters,
          nps_passives: newData.patientPassives,
          nps_detractors: newData.patientDetractors,
          enps_promoters: newData.employeePromoters,
          enps_passives: newData.employeePassives,
          enps_detractors: newData.employeeDetractors,
          clinical_compliant: newData.compliantProtocols,
          clinical_audited: newData.auditedProtocols,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setSavingSettings(false);
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      setSavingSettings(false);
      return false;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    console.log('BSC: Iniciando carga de datos...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('BSC: Sesión:', session ? 'activa' : 'no hay sesión');
      
      if (!session) {
        setLoading(false);
        return;
      }

      // Cargar objetivos del usuario
      await fetchUserSettings(session.user.id);

      // Función para descargar todos los registros superando el límite de 1000
      const fetchAllFromTable = async (table: string) => {
        let results: any[] = [];
        let from = 0;
        let to = 999;
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, to)
            .order('fecha', { ascending: false });
          
          if (error) {
            console.error(`BSC Error en ${table}:`, error);
            throw error;
          }
          if (!data || data.length === 0) break;
          
          results = [...results, ...data];
          if (data.length < 1000) break;
          from += 1000;
          to += 1000;
        }
        return results;
      };

      const invData = await fetchAllFromTable('invoices');
      const appData = await fetchAllFromTable('appointments');

      console.log(`BSC: Descargadas ${invData?.length || 0} facturas`);
      console.log(`BSC: Descargadas ${appData?.length || 0} citas`);

      if (invData && invData.length > 0) {
        const normalizeSucursalBD = (s: string) => {
          const n = (s || '').toLowerCase();
          if (n.includes('santo domingo')) return 'Santo Domingo';
          if (n.includes('san francisco')) return 'San Francisco de Macorís';
          if (n.includes('cotu')) return 'Cotuí';
          return s || 'Desconocida';
        };
        setInvoices(invData.map(i => {
          const d = parseDate(i.fecha);
          d.setHours(0, 0, 0, 0);
          return {
            id: i.numero || i.id,
            citaId: i.cita_id || '',
            pacienteId: i.paciente_id || '',
            sucursal: normalizeSucursalBD(i.sucursal),
            paciente: i.cliente || 'Desconocido',
            fecha: d,
            totalFacturado: Number(i.monto),
            estatus: i.estatus || 'Pagada',
            procedimiento: i.procedimiento || 'General',
            ars: i.ars || 'PRIVADO'
          };
        }));
      }

      if (appData && appData.length > 0) {
        const normalizeSucursalBD = (s: string) => {
          const n = (s || '').toLowerCase();
          if (n.includes('santo domingo')) return 'Santo Domingo';
          if (n.includes('san francisco')) return 'San Francisco de Macorís';
          if (n.includes('cotu')) return 'Cotuí';
          return s || 'Desconocida';
        };
        setAppointments(appData.map(a => {
          const d = parseDate(a.fecha);
          d.setHours(0, 0, 0, 0);
          return {
            id: a.cita_id || a.id,
            facturaId: a.factura_id || '',
            pacienteId: a.paciente_id || '',
            sucursal: normalizeSucursalBD(a.sucursal),
            paciente: a.paciente || 'Desconocido',
            fechaCita: d,
            duracion: 15,
            estatus: a.status || a.estatus || 'Programada',
            doctor: a.medico || 'Desconocido',
            procedimiento: a.especialidad || 'General',
            ars: a.ars || 'Privado',
            facturada: a.facturada || 'No'
          };
        }));
      }

      if ((invData && invData.length > 0) || (appData && appData.length > 0)) {
        setDataLoaded(true);
      }
    } catch (err) {
      console.error('BSC Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUserSettings]);

  const lastFetchedUserId = useRef<string | null>(null);

  // Cargar datos iniciales desde Supabase
  useEffect(() => {
    const checkAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.id !== lastFetchedUserId.current) {
        lastFetchedUserId.current = session.user.id;
        fetchData();
      } else if (!session) {
        lastFetchedUserId.current = null;
      }
    };

    if (invoices.length === 0 && appointments.length === 0) {
      checkAndFetch();
    }

    // Escuchar cambios de sesión para recargar datos cuando el usuario se loguee
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('BSC: Cambio de sesión:', event, session ? 'con sesión' : 'sin sesión');
      
      if (session) {
        if (session.user.id !== lastFetchedUserId.current) {
          console.log('BSC: Nuevo usuario detectado, cargando datos...');
          lastFetchedUserId.current = session.user.id;
          fetchData();
        }
      } else {
        console.log('BSC: Sesión cerrada, limpiando datos localmente');
        lastFetchedUserId.current = null;
        setInvoices([]);
        setAppointments([]);
        setDataLoaded(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData, invoices.length, appointments.length]);

  const saveToSupabase = useCallback(async (newInvoices: Invoice[], newAppointments: Appointment[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      if (newInvoices.length > 0) {
        const invToSave = newInvoices.map(i => ({
          id: i.id ? `inv_${i.id}` : `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          numero: i.id,
          cita_id: i.citaId,
          paciente_id: i.pacienteId,
          fecha: i.fecha instanceof Date ? i.fecha.toISOString().split('T')[0] : i.fecha,
          cliente: i.paciente,
          monto: i.totalFacturado,
          sucursal: i.sucursal,
          procedimiento: i.procedimiento,
          estatus: i.estatus
        }));

        const BATCH_SIZE = 200;
        for (let i = 0; i < invToSave.length; i += BATCH_SIZE) {
          const batch = invToSave.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('invoices').upsert(batch, { onConflict: 'id' });
          if (error) throw error;
        }
      }

      if (newAppointments.length > 0) {
        const appToSave = newAppointments.map(a => ({
          id: a.id ? `app_${a.id}` : `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          cita_id: a.id,
          fecha: a.fechaCita instanceof Date ? a.fechaCita.toISOString().split('T')[0] : a.fechaCita,
          paciente_id: a.pacienteId,
          paciente: a.paciente,
          medico: a.doctor,
          especialidad: a.procedimiento,
          sucursal: a.sucursal,
          status: a.estatus,
          ars: a.ars,
          facturada: (a as any).facturada || 'No'
        }));

        const BATCH_SIZE = 200;
        for (let i = 0; i < appToSave.length; i += BATCH_SIZE) {
          const batch = appToSave.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('appointments').upsert(batch, { onConflict: 'id' });
          if (error) throw error;
        }
      }
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
      throw err;
    }
  }, []);

  const filteredInvoices = useMemo(() => {
    let startTs = -Infinity;
    let endTs = Infinity;

    if (startDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      startTs = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    }
    
    if (endDate) {
      const [ey, em, ed] = endDate.split('-').map(Number);
      endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
    }

    return invoices.filter(inv => {
      const branchMatch = selectedSucursal === 'Todas' || inv.sucursal === selectedSucursal;
      const invTs = inv.fecha.getTime();
      const dateMatch = invTs >= startTs && invTs <= endTs;
      return branchMatch && dateMatch;
    });
  }, [invoices, selectedSucursal, startDate, endDate]);

  const filteredAppointments = useMemo(() => {
    let startTs = -Infinity;
    let endTs = Infinity;

    if (startDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      startTs = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    }
    
    if (endDate) {
      const [ey, em, ed] = endDate.split('-').map(Number);
      endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
    }

    return appointments.filter(app => {
      const branchMatch = selectedSucursal === 'Todas' || app.sucursal === selectedSucursal;
      const appTs = app.fechaCita.getTime();
      const dateMatch = appTs >= startTs && appTs <= endTs;
      return branchMatch && dateMatch;
    });
  }, [appointments, selectedSucursal, startDate, endDate]);

  const stats = useMemo(() => {
    return calculateKPIs(filteredInvoices, filteredAppointments, hrData, invoices, appointments);
  }, [filteredInvoices, filteredAppointments, hrData, invoices, appointments]);

  const salesByProcedure = useMemo(() => getSalesByProcedure(filteredInvoices), [filteredInvoices]);
  const appointmentsByProcedure = useMemo(() => getAppointmentsByProcedure(filteredAppointments), [filteredAppointments]);
  const salesByBranch = useMemo(() => getSalesByBranch(filteredInvoices), [filteredInvoices]);
  const patientsByBranch = useMemo(() => getPatientsByBranch(filteredInvoices, filteredAppointments), [filteredInvoices, filteredAppointments]);
  const enpsDistribution = useMemo(() => getENPSDistribution(hrData), [hrData]);
  const patientSatisfactionDistribution = useMemo(() => getPatientSatisfactionDistribution(hrData), [hrData]);
  const patientAcquisitionDistribution = useMemo(() => getPatientAcquisitionDistribution(stats), [stats]);
  const salesByARS = useMemo(() => getSalesByARS(filteredInvoices, appointments), [filteredInvoices, appointments]);


  const sucursales = useMemo(() => {
    const s = new Set([...invoices.map(i => i.sucursal), ...appointments.map(a => a.sucursal)]);
    return ['Todas', ...Array.from(s)];
  }, [invoices, appointments]);

  const clearData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('invoices').delete().eq('user_id', session.user.id);
        await supabase.from('appointments').delete().eq('user_id', session.user.id);
      }
      setInvoices([]);
      setAppointments([]);
      setDataLoaded(false);
      setSelectedSucursal('Todas');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      console.error('Error limpiando datos:', err);
    }
  };

  const clearFilters = useCallback(() => {
    setPendingStartDate('');
    setPendingEndDate('');
    setStartDate('');
    setEndDate('');
    setSelectedSucursal('Todas');
  }, [setSelectedSucursal]);

  const applyFilters = useCallback(() => {
    setIsUpdating(true);
    // Un pequeño delay para mostrar el estado de carga
    setTimeout(() => {
      setStartDate(pendingStartDate);
      setEndDate(pendingEndDate);
      setIsUpdating(false);
    }, 100);
  }, [pendingStartDate, pendingEndDate]);

  const cancelFilters = useCallback(() => {
    setPendingStartDate(startDate);
    setPendingEndDate(endDate);
    setIsUpdating(false);
  }, [startDate, endDate]);

  // ELIMINADO: El useEffect que auto-aplicaba filtros con delay de 800ms
  // ya que causaba lentitud y conflictos con la limpieza manual.

  return {
    invoices,
    setInvoices,
    appointments,
    setAppointments,
    filteredInvoices,
    filteredAppointments,
    selectedSucursal,
    setSelectedSucursal,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    pendingStartDate,
    setPendingStartDate,
    pendingEndDate,
    setPendingEndDate,
    applyFilters,
    cancelFilters,
    clearFilters,
    isUpdating,
    hrData,
    setHrData,
    stats,
    salesByProcedure,
    appointmentsByProcedure,
    salesByBranch,
    patientsByBranch,
    enpsDistribution,
    patientSatisfactionDistribution,
    patientAcquisitionDistribution,
    salesByARS,
    sucursales,
    dataLoaded,
    setDataLoaded,
    clearData,
    saveToSupabase,
    loading,
    refreshData: fetchData,
    processInvoices,
    processAppointments,
    saveUserSettings,
    savingSettings
  };
};
