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
  getPatientSatisfactionDistribution
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

  // Cargar datos iniciales desde Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Cargar Facturas
        const { data: invData, error: invError } = await supabase
          .from('invoices')
          .select('*')
          .order('fecha', { ascending: false });

        if (invError) throw invError;

        // Cargar Citas
        const { data: appData, error: appError } = await supabase
          .from('appointments')
          .select('*')
          .order('fecha', { ascending: false });

        if (appError) throw appError;

        if (invData && invData.length > 0) {
          setInvoices(invData.map(i => ({
            id: i.id,
            citaId: '',
            pacienteId: '',
            sucursal: i.sucursal || 'Desconocida',
            paciente: i.cliente || 'Desconocido',
            fecha: new Date(i.fecha),
            totalFacturado: Number(i.monto),
            estatus: 'Pagada',
            procedimiento: i.procedimiento || 'General'
          })));
        }

        if (appData && appData.length > 0) {
          setAppointments(appData.map(a => ({
            id: a.id,
            facturaId: '',
            pacienteId: a.paciente_id || '',
            sucursal: a.sucursal || 'Desconocida',
            paciente: '',
            fechaCita: new Date(a.fecha),
            duracion: 0,
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
  }, []);

  const saveToSupabase = useCallback(async (newInvoices: Invoice[], newAppointments: Appointment[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      if (newInvoices.length > 0) {
        const invToSave = newInvoices.map(i => ({
          id: i.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          numero: i.id,
          fecha: i.fecha.toISOString().split('T')[0],
          cliente: i.paciente,
          monto: i.totalFacturado,
          sucursal: i.sucursal,
          procedimiento: i.procedimiento
        }));

        const { error } = await supabase.from('invoices').upsert(invToSave);
        if (error) throw error;
      }

      if (newAppointments.length > 0) {
        const appToSave = newAppointments.map(a => ({
          id: a.id || `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          cita_id: a.id,
          fecha: a.fechaCita.toISOString().split('T')[0],
          paciente_id: a.pacienteId,
          medico: a.doctor,
          especialidad: a.procedimiento,
          sucursal: a.sucursal,
          status: a.estatus
        }));

        const { error } = await supabase.from('appointments').upsert(appToSave);
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
    processAppointments
  };
};
