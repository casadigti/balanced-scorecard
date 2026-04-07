import { useState, useMemo, useEffect, useCallback } from 'react';
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
  parseDate
} from '../lib/data-processor';


export const useDashboardData = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('Todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
          employeeDetractors: data.enps_detractors
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

  // Cargar datos iniciales desde Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        // Cargar objetivos del usuario
        await fetchUserSettings(session.user.id);

        // Cargar Facturas (Intentar traer todas las facturas a las que el usuario tiene acceso por RLS)
        const { data: invData, error: invError } = await supabase
          .from('invoices')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(50000);

        if (invError) throw invError;

        const { data: appData, error: appError } = await supabase
          .from('appointments')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(50000);

        if (appError) throw appError;

        console.log(`BSC Debug: Descargadas ${invData?.length || 0} facturas`);
        console.log(`BSC Debug: Descargadas ${appData?.length || 0} citas`);

        if (invData && invData.length > 0) {
          setInvoices(invData.map(i => ({
            id: i.numero || i.id,
            citaId: i.cita_id || '',
            pacienteId: i.paciente_id || '',
            sucursal: i.sucursal || 'Desconocida',
            paciente: i.cliente || 'Desconocido',
            fecha: parseDate(i.fecha),
            totalFacturado: Number(i.monto),
            estatus: i.estatus || 'Pagada',
            procedimiento: i.procedimiento || 'General'
          })));
        }

        if (appData && appData.length > 0) {
          setAppointments(appData.map(a => ({
            id: a.cita_id || a.id,
            facturaId: a.factura_id || '',
            pacienteId: a.paciente_id || '',
            sucursal: a.sucursal || 'Desconocida',
            paciente: a.paciente || 'Desconocido',
            fechaCita: parseDate(a.fecha),
            duracion: 15,
            estatus: a.status || 'Programada',
            doctor: a.medico || 'Desconocido',
            procedimiento: a.especialidad || 'General'
          })));
        }

        if ((invData && invData.length > 0) || (appData && appData.length > 0)) {
          setDataLoaded(true);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchUserSettings]);

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

        const { error } = await supabase.from('invoices').upsert(invToSave, { onConflict: 'id' });
        if (error) throw error;
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
          status: a.estatus
        }));

        const { error } = await supabase.from('appointments').upsert(appToSave, { onConflict: 'id' });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
      throw err;
    }
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const branchMatch = selectedSucursal === 'Todas' || inv.sucursal === selectedSucursal;
      
      const invDate = new Date(inv.fecha);
      invDate.setHours(0, 0, 0, 0);
      
      let start = null;
      if (startDate) {
        const [sy, sm, sd] = startDate.split('-');
        start = new Date(Number(sy), Number(sm) - 1, Number(sd), 0, 0, 0, 0);
      }
      
      let end = null;
      if (endDate) {
        const [ey, em, ed] = endDate.split('-');
        end = new Date(Number(ey), Number(em) - 1, Number(ed), 23, 59, 59, 999);
      }

      const dateMatch = (!start || invDate.getTime() >= start.getTime()) && 
                        (!end || invDate.getTime() <= end.getTime());
      return branchMatch && dateMatch;
    });
  }, [invoices, selectedSucursal, startDate, endDate]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const branchMatch = selectedSucursal === 'Todas' || app.sucursal === selectedSucursal;
      
      const appDate = new Date(app.fechaCita);
      appDate.setHours(0, 0, 0, 0);

      let start = null;
      if (startDate) {
        const [sy, sm, sd] = startDate.split('-');
        start = new Date(Number(sy), Number(sm) - 1, Number(sd), 0, 0, 0, 0);
      }
      
      let end = null;
      if (endDate) {
        const [ey, em, ed] = endDate.split('-');
        end = new Date(Number(ey), Number(em) - 1, Number(ed), 23, 59, 59, 999);
      }

      const dateMatch = (!start || appDate.getTime() >= start.getTime()) && 
                        (!end || appDate.getTime() <= end.getTime());
      return branchMatch && dateMatch;
    });
  }, [appointments, selectedSucursal, startDate, endDate]);

  const stats = useMemo(() => {
    return calculateKPIs(filteredInvoices, filteredAppointments, hrData);
  }, [filteredInvoices, filteredAppointments, hrData]);

  const salesByProcedure = useMemo(() => getSalesByProcedure(filteredInvoices), [filteredInvoices]);
  const appointmentsByProcedure = useMemo(() => getAppointmentsByProcedure(filteredAppointments), [filteredAppointments]);
  const salesByBranch = useMemo(() => getSalesByBranch(filteredInvoices), [filteredInvoices]);
  const patientsByBranch = useMemo(() => getPatientsByBranch(filteredInvoices, filteredAppointments), [filteredInvoices, filteredAppointments]);
  const enpsDistribution = useMemo(() => getENPSDistribution(hrData), [hrData]);
  const patientSatisfactionDistribution = useMemo(() => getPatientSatisfactionDistribution(hrData), [hrData]);


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
    dataLoaded,
    setDataLoaded,
    clearData,
    saveToSupabase,
    loading,
    processInvoices,
    processAppointments,
    saveUserSettings,
    savingSettings
  };
};
