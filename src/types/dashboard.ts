export interface Invoice {
  id: string;
  citaId: string;
  pacienteId: string;
  sucursal: string;
  paciente: string;
  fecha: Date;
  totalFacturado: number;
  estatus: string;
  procedimiento: string;
}

export interface Appointment {
  id: string;
  facturaId: string;
  pacienteId: string;
  sucursal: string;
  paciente: string;
  fechaCita: Date;
  duracion: number;
  estatus: string;
  doctor: string;
  procedimiento: string;
}

export interface HRData {
  metaFacturacion: number;
  totalEmployees: number;
  trainingHours: number;
  departures: number;
  patientPromoters: number;
  patientPassives: number;
  patientDetractors: number;
  employeePromoters: number;
  employeePassives: number;
  employeeDetractors: number;
  trainingInvestment: number;
  compliantProtocols: number;
  auditedProtocols: number;
}

export interface KPIStats {
  facturacionTotal: number;
  cumplimientoMeta: number;
  npsPacientes: number;
  eficienciaOperativa: number;
  enps: number;
  horasInstruccion: number;
  indiceRotacion: number;
  totalPacientesUnicos: number;
  totalCitas: number;
  sucursalesActivas: number;
  citasRealizadas: number;
  costoPorColaborador: number;
  cumplimientoProtocolos: number;
}
