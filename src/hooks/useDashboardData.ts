import { useState, useMemo } from 'react';
import { Invoice, Appointment, HRData, KPIStats } from '../types/dashboard';
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

  const clearData = () => {
    setInvoices([]);
    setAppointments([]);
    setDataLoaded(false);
    setSelectedSucursal('Todas');
    setStartDate('');
    setEndDate('');
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
    processInvoices,
    processAppointments
  };
};
