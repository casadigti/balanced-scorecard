export interface InvoiceData {
    id: string; // No. Factura
    citaId: string;
    pacienteId: string;
    sucursal: string;
    paciente: string;
    fecha: string;
    totalFacturado: number;
    estatus: string;
    procedimiento?: string;
}

export interface AppointmentData {
    id: string; // ID Cita
    facturaId: string;
    pacienteId: string;
    sucursal: string;
    paciente: string;
    fechaCita: string;
    duracion: string; // e.g. "30m"
    estatus: string; // "Realizada", "Confirmada", "Cancelada"
    doctor: string;
    procedimiento: string;
}

export interface SurveyData {
    id: string;
    rating: number; // 0-10
    type: 'patient' | 'employee';
}

export interface HRData {
    totalEmployees: number;
    departures: number;
    trainingHours: number;
    metaFacturacion: number;
    // Encuestas Pacientes
    patientPromoters: number;
    patientPassives: number;
    patientDetractors: number;
    // Encuestas Empleados
    employeePromoters: number;
    employeePassives: number;
    employeeDetractors: number;
}

export interface KPISummary {
    indiceFacturacion: number;
    nps: number;
    pacientesAtendidos: number;
    citasRealizadas: number;
    tiempoPromedioAtencion: number;
    porcentajeCitasCumplidas: number;
    horasInstruccion: number;
    enps: number;
    indiceRotacion: number;
    totalFacturado: number;
}