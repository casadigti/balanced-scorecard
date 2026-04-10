import Papa from 'papaparse';
import { Invoice, Appointment, HRData, KPIStats } from '../types/dashboard';

export const cleanString = (val: any): string => {
  if (val === null || val === undefined) return '';
  // Eliminar BOM, caracteres invisibles y no imprimibles (\x00-\x1F, \x7F-\x9F)
  return String(val)
    .replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '');
};

export const shortenLabel = (str: string, maxLen: number = 25): string => {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
};

export const parseCurrency = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const clean = String(val).replace(/[$,]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const parseDate = (val: any): Date => {
  if (!val) return new Date();

  // Si viene como número (Excel Serial Date)
  if (typeof val === 'number') {
    // 25569 = días de 1900 a 1970. Excel asume erróneamente 1900 como bisiesto, ajustamos - 1
    const jsDate = new Date((val - (25569 + 1)) * 86400 * 1000);
    // Ajustar a timezone local para no tener desfase de un día
    jsDate.setMinutes(jsDate.getMinutes() + jsDate.getTimezoneOffset());
    return jsDate;
  }

  const str = cleanString(val);
  
  // Si luego de limpiar quedó un número string (ej. "45355" de un posible casteo)
  if (/^\d{5}$/.test(str)) {
    const numVal = parseInt(str);
    const jsDate = new Date((numVal - (25569 + 1)) * 86400 * 1000);
    jsDate.setMinutes(jsDate.getMinutes() + jsDate.getTimezoneOffset());
    return jsDate;
  }
  
  // Formato fecha string
  const parts = str.split(/[/-]/);
  if (parts.length === 3) {
    let year, month, day;
    // Si viene como YYYY/MM/DD o YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
    } else {
      // Si viene como DD/MM/YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    }
    return new Date(year, month, day);
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const normalizeSucursal = (name: string): string => {
  const n = cleanString(name).toLowerCase();
  if (n.includes('santo domingo')) return 'Santo Domingo';
  if (n.includes('san francisco')) return 'San Francisco de Macorís';
  if (n.includes('cotu')) return 'Cotuí';
  return cleanString(name) || 'Principal';
};

export const findValueInRow = (row: any, keys: string[]): any => {
  if (!row) return undefined;
  const rowKeys = Object.keys(row);
  
  // Limpiamos los nombres de las columnas que buscamos para que sea robusto
  const targetKeys = keys.map(k => k.toLowerCase().replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '').trim());

  for (const targetKey of targetKeys) {
    // 1. Intento directo
    if (row[targetKey] !== undefined) return row[targetKey];
    
    // 2. Búsqueda insensible a mayúsculas y resistente a BOM en las llaves del objeto actual
    const foundKey = rowKeys.find(k => {
      const normalizedK = k.replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '').toLowerCase().trim();
      return normalizedK === targetKey;
    });
    
    if (foundKey) return row[foundKey];
  }
  
  return undefined;
};

export const processInvoices = (data: any[], fileIndex: number = 0): Invoice[] => {
  return data
    .map((row, rowIdx) => {
      // Generar ID de respaldo en caso de que el campo # esté vacío
      let id = cleanString(findValueInRow(row, ['#', 'ID', 'No.', 'ID Factura', 'No Factura']));
      
      const precioRaw = findValueInRow(row, ['Precio Total', 'Monto', 'Total', 'Subtotal']);
      const totalFacturadoRaw = parseCurrency(precioRaw);
      
      // Solo descartar si no tiene ni ID ni Precio Total
      if (!id && totalFacturadoRaw === 0) return null;
      
      // Si llegó aquí sin ID, usamos un ID sintético para no perder la fila
      if (!id) id = `row-${fileIndex}-${rowIdx}`;

      const tipoDoc = cleanString(findValueInRow(row, ['Tipo de Documento', 'Tipo'])).toLowerCase();
      
      // SUMA BRUTA
      let totalFacturado = totalFacturadoRaw;
      
      if (tipoDoc.includes('nota de cr') || tipoDoc.includes('nc')) {
        totalFacturado = -Math.abs(totalFacturado);
      }

      return {
        id,
        citaId: cleanString(findValueInRow(row, ['Cita ID', 'ID Cita', 'Cita', 'No. Cita'])),
        pacienteId: cleanString(findValueInRow(row, ['Paciente ID', 'ID paciente', 'No. Record', 'ID Paciente'])),
        sucursal: normalizeSucursal(findValueInRow(row, ['Sucursal', 'Clinica', 'Sede'])),
        paciente: cleanString(findValueInRow(row, ['Paciente', 'Nombre Paciente', 'Nombre'])),
        fecha: parseDate(findValueInRow(row, ['Fecha', 'Fecha Factura', 'Fecha Creacion'])),
        totalFacturado,
        estatus: cleanString(findValueInRow(row, ['Estatus', 'Estado'])),
        procedimiento: cleanString(findValueInRow(row, ['Servicios', 'Procedimiento', 'Servicio', 'Procedimientos']))
      };
    })
    .filter((i): i is Invoice => i !== null);
};

export const processAppointments = (data: any[]): Appointment[] => {
  return data
    .map(row => {
      // Priorizar 'ID Cita' que es lo que viene de MedicalCore
      const id = cleanString(findValueInRow(row, ['ID Cita', 'ID Citas', 'ID', 'Codigo', 'No. Cita']));
      if (!id) return null;

      return {
        id,
        facturaId: cleanString(findValueInRow(row, ['No Factura', 'Factura', 'ID Factura', 'No. Factura'])),
        pacienteId: cleanString(findValueInRow(row, ['ID paciente', 'ID Paciente', 'Paciente ID', 'No. Record'])),
        sucursal: normalizeSucursal(findValueInRow(row, ['Sucursal', 'Clinica', 'Sede'])),
        paciente: cleanString(findValueInRow(row, ['Paciente', 'Nombre Paciente', 'Nombre'])),
        fechaCita: parseDate(findValueInRow(row, ['Fecha Cita', 'Fecha de Cita', 'Fecha', 'Fecha Cita'])),
        duracion: parseInt(cleanString(findValueInRow(row, ['Duracion de Cita', 'Duración', 'Minutos']))) || 15,
        estatus: cleanString(findValueInRow(row, ['Estatus', 'Estado'])),
        doctor: cleanString(findValueInRow(row, ['Doctor', 'Médico', 'Medico', 'Doctor Tratante'])),
        procedimiento: cleanString(findValueInRow(row, ['Procedimientos', 'Procedimiento', 'Servicio Solicitado', 'Servicio']))
      };
    })
    .filter((a): a is Appointment => a !== null);
};

export const calculateKPIs = (
  invoices: Invoice[], 
  appointments: Appointment[], 
  hrData: HRData
): KPIStats => {
  const facturacionTotal = invoices.reduce((sum, inv) => sum + inv.totalFacturado, 0);
  const cumplimientoMeta = hrData.metaFacturacion > 0 
    ? (facturacionTotal / hrData.metaFacturacion) * 100 
    : 0;
  
  const calculateNPS = (promoters: number, passives: number, detractors: number) => {
    const total = promoters + passives + detractors;
    if (total === 0) return 0;
    return ((promoters - detractors) / total) * 100;
  };

  const npsPacientes = calculateNPS(hrData.patientPromoters, hrData.patientPassives, hrData.patientDetractors);
  const enps = calculateNPS(hrData.employeePromoters, hrData.employeePassives, hrData.employeeDetractors);
  
  const totalPacientesUnicos = new Set([
    ...invoices.map(i => i.pacienteId),
    ...appointments.map(a => a.pacienteId)
  ]).size;
  
  // Citas Realizadas (según requerimiento: Realizada + Facturada)
  const citasRealizadas = appointments.filter(a => {
    const s = a.estatus.toLowerCase();
    return s.includes('realizada') || s.includes('facturada');
  }).length;

  const eficienciaOperativa = appointments.length > 0 
    ? (citasRealizadas / appointments.length) * 100 
    : 0;

  const horasInstruccion = hrData.totalEmployees > 0 ? hrData.trainingHours / hrData.totalEmployees : 0;
  const indiceRotacion = hrData.totalEmployees > 0 ? (hrData.departures / hrData.totalEmployees) * 100 : 0;

  // Sucursales activas (unión de ambas fuentes)
  const sucursalesActivas = new Set([
    ...invoices.map(i => i.sucursal),
    ...appointments.map(a => a.sucursal)
  ]).size;

  return {
    facturacionTotal,
    cumplimientoMeta,
    npsPacientes,
    eficienciaOperativa,
    enps,
    horasInstruccion,
    indiceRotacion,
    totalPacientesUnicos,
    sucursalesActivas,
    citasRealizadas,
    costoPorColaborador: hrData.totalEmployees > 0 ? hrData.trainingInvestment / hrData.totalEmployees : 0,
    cumplimientoProtocolos: hrData.auditedProtocols > 0 ? (hrData.compliantProtocols / hrData.auditedProtocols) * 100 : 0
  };
};

export const getAppointmentsByProcedure = (appointments: Appointment[]) => {
  const map = new Map<string, number>();
  appointments.forEach(app => {
    // Normalizar nombre de procedimiento para agrupamiento correcto
    const proc = cleanString(app.procedimiento || 'Otros');
    map.set(proc, (map.get(proc) || 0) + 1);
  });
  
  return Array.from(map.entries())
    .map(([name, value]) => ({ 
      name: shortenLabel(name), 
      fullName: name,
      value 
    }))
    .sort((a, b) => b.value - a.value);
};

export const getSalesByProcedure = (invoices: Invoice[]) => {
  const map = new Map<string, number>();
  invoices.forEach(inv => {
    const proc = cleanString(inv.procedimiento || 'Otros');
    map.set(proc, (map.get(proc) || 0) + inv.totalFacturado);
  });
  
  return Array.from(map.entries())
    .map(([name, value]) => ({ 
      name: shortenLabel(name), 
      fullName: name,
      value 
    }))
    .sort((a, b) => b.value - a.value);
};

export const getSalesByBranch = (invoices: Invoice[]) => {
  const map = new Map<string, number>();
  invoices.forEach(inv => {
    const branch = inv.sucursal || 'Principal';
    map.set(branch, (map.get(branch) || 0) + inv.totalFacturado);
  });
  
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const getPatientsByBranch = (invoices: Invoice[], appointments: Appointment[] = []) => {
  const map = new Map<string, Set<string>>();
  
  const processRecord = (record: { sucursal: string, pacienteId: string }) => {
    const branch = record.sucursal || 'Principal';
    if (!map.has(branch)) map.set(branch, new Set());
    map.get(branch)?.add(record.pacienteId);
  };

  invoices.forEach(processRecord);
  appointments.forEach(processRecord);
  
  return Array.from(map.entries())
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value);
};

export const getENPSDistribution = (hrData: HRData) => {
  return [
    { name: 'Promotores', value: hrData.employeePromoters, color: '#10b981' },
    { name: 'Pasivos', value: hrData.employeePassives, color: '#f59e0b' },
    { name: 'Detractores', value: hrData.employeeDetractors, color: '#ef4444' }
  ];
};

export const getPatientSatisfactionDistribution = (hrData: HRData) => {
  return [
    { name: 'Promotores', value: hrData.patientPromoters, color: '#10b981' },
    { name: 'Pasivos', value: hrData.patientPassives, color: '#f59e0b' },
    { name: 'Detractores', value: hrData.patientDetractors, color: '#ef4444' }
  ];
};

