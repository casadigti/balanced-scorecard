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
  
  // Normalizar una cadena: minúsculas, sin BOM, espacios colapsados
  const normalize = (s: string) => 
    s.toLowerCase()
     .replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '')
     .replace(/\s+/g, ' ')
     .trim();

  const normalizedTargets = keys.map(normalize);

  for (const target of normalizedTargets) {
    // 1. Intento directo con el target normalizado
    if (row[target] !== undefined) return row[target];
    
    // 2. Búsqueda por normalización de llaves existentes
    const foundKey = rowKeys.find(k => normalize(k) === target);
    if (foundKey) return row[foundKey];

    // 3. Fallback: búsqueda parcial (si la columna contiene el nombre)
    const partialKey = rowKeys.find(k => {
      const nk = normalize(k);
      return nk.includes(target) || target.includes(nk);
    });
    if (partialKey) return row[partialKey];
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
      
      const iSucursal = normalizeSucursal(findValueInRow(row, ['Sucursal', 'Clinica', 'Sede', 'Centro']));
      const iPaciente = cleanString(findValueInRow(row, ['Paciente', 'Nombre Paciente', 'Nombre', 'Paciente/Cliente']));
      const iFecha = parseDate(findValueInRow(row, ['Fecha', 'Fecha Factura', 'Fecha Creacion', 'Emisión']));
      const iProcedimiento = cleanString(findValueInRow(row, ['Servicios', 'Procedimiento', 'Servicio', 'Procedimientos', 'Producto']));

      // Solo descartar si no tiene ni ID ni Precio Total
      if (!id && totalFacturadoRaw === 0) return null;
      
      // Si llegó aquí sin ID, usamos un ID sintético basado en el contenido para que sea estable
      if (!id) {
        const dateStr = iFecha instanceof Date ? iFecha.toISOString().split('T')[0] : String(iFecha);
        const contentStr = `${iSucursal}_${iPaciente}_${dateStr}_${totalFacturadoRaw}_${iProcedimiento}`.toLowerCase();
        id = `gen_${contentStr.replace(/[^a-z0-9]/g, '_')}`;
      }

      const tipoDoc = cleanString(findValueInRow(row, ['Tipo de Documento', 'Tipo'])).toLowerCase();
      
      // SUMA BRUTA
      let totalFacturado = totalFacturadoRaw;
      
      if (tipoDoc.includes('nota de cr') || tipoDoc.includes('nc')) {
        totalFacturado = -Math.abs(totalFacturado);
      }

      return {
        id,
        citaId: cleanString(findValueInRow(row, ['Cita ID', 'ID Cita', 'Cita', 'No. Cita', 'Referencia'])),
        pacienteId: cleanString(findValueInRow(row, ['Paciente ID', 'ID paciente', 'No. Record', 'ID Paciente', 'Record'])),
        sucursal: iSucursal,
        paciente: iPaciente,
        fecha: iFecha,
        totalFacturado,
        estatus: cleanString(findValueInRow(row, ['Estatus', 'Estado', 'Status'])),
        procedimiento: iProcedimiento,
        ars: 'Sin Datos' 
      };
    })
    .filter((i): i is Invoice => i !== null);
};

export const processAppointments = (data: any[]): Appointment[] => {
  return data
    .map(row => {
      // Priorizar 'ID Cita' que es lo que viene de MedicalCore
      let id = cleanString(findValueInRow(row, ['ID Cita', 'ID Citas', 'ID', 'Codigo', 'No. Cita']));
      
      const aSucursal = normalizeSucursal(findValueInRow(row, ['Sucursal', 'Clinica', 'Sede']));
      const aPaciente = cleanString(findValueInRow(row, ['Paciente', 'Nombre Paciente', 'Nombre', 'Paciente/Cliente']));
      const aFecha = parseDate(findValueInRow(row, ['Fecha Cita', 'Fecha de Cita', 'Fecha', 'Cita']));
      const aMedico = cleanString(findValueInRow(row, ['Doctor', 'Médico', 'Medico', 'Doctor Tratante', 'Profesional']));

      if (!id) {
        // Generar ID estable para citas sin ID
        const dateStr = aFecha instanceof Date ? aFecha.toISOString().split('T')[0] : String(aFecha);
        const contentStr = `${aSucursal}_${aPaciente}_${dateStr}_${aMedico}`.toLowerCase();
        id = `gen_app_${contentStr.replace(/[^a-z0-9]/g, '_')}`;
      }

      return {
        id,
        facturaId: cleanString(findValueInRow(row, ['No Factura', 'Factura', 'ID Factura', 'No. Factura'])),
        pacienteId: cleanString(findValueInRow(row, ['ID paciente', 'ID Paciente', 'Paciente ID', 'No. Record'])),
        sucursal: aSucursal,
        paciente: aPaciente,
        fechaCita: aFecha,
        duracion: parseInt(cleanString(findValueInRow(row, ['Duracion de Cita', 'Duración', 'Minutos']))) || 15,
        estatus: cleanString(findValueInRow(row, ['Estatus', 'Estado', 'Estatus Cita', 'Estado Cita', 'Status'])),
        doctor: aMedico,
        procedimiento: cleanString(findValueInRow(row, ['Procedimientos', 'Procedimiento', 'Servicio Solicitado', 'Servicio', 'Especialidad', 'Producto'])),
        ars: cleanString(findValueInRow(row, ['Aseguradora ARS del paciente', 'Aseguradora ARS', 'ARS', 'Aseguradora', 'Seguro', 'Entidad'])) || 'N/A',
        facturada: cleanString(findValueInRow(row, ['Facturada'])) // columna Si/No separada
      };
    })
    .filter((a): a is Appointment => a !== null);
};

export const calculateKPIs = (
  invoices: Invoice[], 
  appointments: Appointment[], 
  hrData: HRData,
  allInvoices: Invoice[] = [],
  allAppointments: Appointment[] = []
): KPIStats => {
  const canceledStatuses = ['cancelada', 'eliminada', 'no asistió', 'no asistio', 'ausente'];
  
  const validInvoices = invoices.filter(inv => {
    if (!inv.citaId) return true;
    const linkedAppointment = appointments.find(a => 
      a.id === inv.citaId || a.id === String(inv.citaId)
    );
    if (!linkedAppointment) return true;
    // REGLA: Solo excluir si la cita está explícitamente cancelada/eliminada
    const status = (linkedAppointment.estatus || '').toLowerCase();
    const isCancelledOrDeleted = status === 'cancelada' || status === 'eliminada' ||
                                  status.startsWith('cancelad') || status.startsWith('eliminad');
    return !isCancelledOrDeleted;
  });
  
  const facturacionTotal = validInvoices.reduce((sum, inv) => sum + inv.totalFacturado, 0);
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
  
// Función para verificar si una cita es "realizada"
  const isCitaRealizada = (a: Appointment): boolean => {
    const s = a.estatus.toLowerCase();
    const isPositiveStatus = 
      s.includes('realizada') || s.includes('facturada') || 
      s.includes('confirmada') || s.includes('finalizada') || 
      s.includes('atendido') || s.includes('asistio') || 
      s.includes('asistió') || s.includes('completad') ||
      s.includes('ejecutad') || s.includes('cobrad') || s.includes('pagad') ||
      s.includes('efectiva') || s.includes('hecha');
    
    // Si tiene factura y NO está cancelada NI pendiente, cuenta como realizada
    const hasInvoiceAndNotCancelled = a.facturaId && 
                                      !s.includes('cancelada') && 
                                      !s.includes('eliminada') && 
                                      !s.includes('no asisti') &&
                                      !s.includes('ausente') &&
                                      !s.includes('pendiente');
    
    return isPositiveStatus || hasInvoiceAndNotCancelled;
  };
  
// Pacientes únicos: desde citasrealizadas (nombre con mínimo 3 caracteres, excluir anonimo)
  const citasRealizadasList = appointments.filter(isCitaRealizada);
  
  const totalPacientesUnicos = new Set(
    citasRealizadasList
      .map(a => (a.paciente || '').toLowerCase().trim())
      .filter(p => p.length >= 3 && !p.includes('anonimo'))
  ).size;
  
  // Citas Realizadas - usar la lista ya calculada
  const citasRealizadas = citasRealizadasList.length;

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
    totalCitas: appointments.length,
    sucursalesActivas,
    citasRealizadas,
    costoPorColaborador: hrData.totalEmployees > 0 ? hrData.trainingInvestment / hrData.totalEmployees : 0,
    cumplimientoProtocolos: hrData.auditedProtocols > 0 ? (hrData.compliantProtocols / hrData.auditedProtocols) * 100 : 0,
    ...calculatePatientAcquisition(invoices, appointments, allInvoices, allAppointments)
  };
};

const calculatePatientAcquisition = (
  filteredInvoices: Invoice[],
  filteredAppointments: Appointment[],
  allInvoices: Invoice[],
  allAppointments: Appointment[]
) => {
  const currentPatients = new Set([
    ...filteredInvoices.map(i => i.pacienteId),
    ...filteredAppointments.map(a => a.pacienteId)
  ]);

  if (currentPatients.size === 0) return { newPatients: 0, recurringPatients: 0 };

  // Crear un mapa de la primera fecha de cada paciente en TODA la historia
  const firstVisitMap = new Map<string, number>();

  const processHistory = (record: { pacienteId: string, fecha?: Date, fechaCita?: Date }) => {
    const pId = record.pacienteId;
    if (!pId) return;
    const date = record.fecha || record.fechaCita;
    if (!date) return;
    
    const time = date.getTime();
    if (!firstVisitMap.has(pId) || time < firstVisitMap.get(pId)!) {
      firstVisitMap.set(pId, time);
    }
  };

  allInvoices.forEach(i => processHistory({ pacienteId: i.pacienteId, fecha: i.fecha }));
  allAppointments.forEach(a => processHistory({ pacienteId: a.pacienteId, fechaCita: a.fechaCita }));

  // Encontrar el inicio del periodo filtrado (la fecha más antigua en los datos filtrados)
  const filteredDates = [
    ...filteredInvoices.map(i => i.fecha.getTime()),
    ...filteredAppointments.map(a => a.fechaCita.getTime())
  ];
  
  const periodStart = filteredDates.length > 0 ? Math.min(...filteredDates) : 0;
  const periodEnd = filteredDates.length > 0 ? Math.max(...filteredDates) : Infinity;

  let newPatientsCount = 0;
  let recurringPatientsCount = 0;

  currentPatients.forEach(pId => {
    const firstVisit = firstVisitMap.get(pId);
    // Un paciente es NUEVO si su primera visita está dentro del periodo actual
    // Y no tiene nada antes del periodo actual.
    if (firstVisit && firstVisit >= periodStart && firstVisit <= periodEnd) {
      newPatientsCount++;
    } else {
      recurringPatientsCount++;
    }
  });

  return {
    newPatients: newPatientsCount,
    recurringPatients: recurringPatientsCount
  };
};

export const getPatientAcquisitionDistribution = (stats: KPIStats) => {
  return [
    { name: 'Nuevos', value: stats.newPatients, color: '#10b981' },
    { name: 'Recurrentes', value: stats.recurringPatients, color: '#3b82f6' }
  ];
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
  const canceledStatuses = ['cancelada', 'eliminada', 'no asistió', 'no asistio', 'ausente'];
  
  // Filtrar citas realizadas (misma lógica que calculateKPIs)
  const citasRealizadas = appointments.filter(a => {
    const s = a.estatus.toLowerCase();
    const isPositiveStatus = 
      s.includes('realizada') || s.includes('facturada') || 
      s.includes('confirmada') || s.includes('finalizada') || 
      s.includes('atendido') || s.includes('asistio') || 
      s.includes('asistió') || s.includes('completad') ||
      s.includes('ejecutad') || s.includes('cobrad') || s.includes('pagad') ||
      s.includes('efectiva') || s.includes('hecha');
    // Si tiene factura y NO está cancelada NI pendiente, cuenta como realizada
    const hasInvoiceAndNotCancelled = a.facturaId && 
                                      !s.includes('cancelada') && 
                                      !s.includes('eliminada') && 
                                      !s.includes('no asisti') &&
                                      !s.includes('ausente') &&
                                      !s.includes('pendiente');
    return isPositiveStatus || hasInvoiceAndNotCancelled;
  });
  
const processRecord = (record: { sucursal: string, paciente: string }) => {
    const branch = record.sucursal || 'Principal';
    const nombre = (record.paciente || '').toLowerCase().trim();
    // Solo incluir pacientes con nombre >= 3 caracteres
    if (nombre.length >= 3) {
      if (!map.has(branch)) map.set(branch, new Set());
      map.get(branch)?.add(nombre);
    }
  };

  // Usar solo facturas válidas y citas realizadas
  const validInvoices = invoices.filter(inv => {
    if (!inv.citaId) return true;
    const linkedAppointment = appointments.find(a => a.id === inv.citaId || a.id === String(inv.citaId));
    if (!linkedAppointment) return true;
    const appStatus = (linkedAppointment.estatus || '').toLowerCase();
    return !canceledStatuses.some(s => appStatus.includes(s));
  });
  
  // Solo desde citasrealizadas (no desde facturas)
  validInvoices.forEach(inv => processRecord({ sucursal: inv.sucursal, paciente: inv.paciente }));
  citasRealizadas.forEach(app => processRecord({ sucursal: app.sucursal, paciente: app.paciente }));
  
  return Array.from(map.entries())
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value);
};

export const transformRawInvoice = (raw: any): Invoice => ({
  id: raw.numero || raw.id,
  citaId: raw.cita_id || '',
  pacienteId: raw.paciente_id || '',
  sucursal: normalizeSucursal(raw.sucursal || ''),
  paciente: raw.cliente || 'Desconocido',
  fecha: parseDate(raw.fecha),
  totalFacturado: Number(raw.monto) || 0,
  estatus: raw.estatus || 'Pagada',
  procedimiento: raw.procedimiento || 'General',
  ars: 'Sin Datos'
});

export const transformRawAppointment = (raw: any): Appointment => ({
  id: raw.cita_id || raw.id,
  facturaId: raw.factura_id || '',
  pacienteId: raw.paciente_id || '',
  sucursal: normalizeSucursal(raw.sucursal || ''),
  paciente: raw.paciente || 'Desconocido',
  fechaCita: parseDate(raw.fecha),
  duracion: 15,
  estatus: raw.status || raw.estatus || 'Programada',
  doctor: raw.medico || 'Desconocido',
  procedimiento: raw.especialidad || 'General',
  ars: raw.ars || 'Privado',
  facturada: raw.facturada || 'No'
});

export const getPeriods = (invoices: Invoice[], appointments: Appointment[]): string[] => {
  const s = new Set<string>();
  invoices.forEach(i => {
    if (i.fecha) {
      const d = new Date(i.fecha);
      if (!isNaN(d.getTime()))
        s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  });
  appointments.forEach(a => {
    if (a.fechaCita) {
      const d = new Date(a.fechaCita);
      if (!isNaN(d.getTime()))
        s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  });
  return Array.from(s).sort().reverse();
};

export const filterByPeriod = (invoices: Invoice[], appointments: Appointment[], period: string): { invoices: Invoice[], appointments: Appointment[] } => {
  if (!period) return { invoices, appointments };
  const [y, m] = period.split('-').map(Number);
  return {
    invoices: invoices.filter(i => {
      const d = new Date(i.fecha);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    }),
    appointments: appointments.filter(a => {
      const d = new Date(a.fechaCita);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    })
  };
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

export const getSalesByARS = (invoices: Invoice[], appointments: Appointment[]) => {
  const map = new Map<string, number>();
  const appByCitaId = new Map<string, string>();
  const appByFacturaId = new Map<string, string>();
  const appByPatientDate = new Map<string, string>();
  // Normalizar ID: quitar BOM (﻿), decimales .0, y pasar a minúsculas
  const normalizeId = (id: any) => String(id || '')
    .replace(/[\uFEFF\u200B\u200C\u200D\u200E\u200F]/g, '')
    .replace(/\.0$/, '')
    .trim();

  // El mapa de ARS es solo una tabla de referencia: asocia cada Cita ID
  // con la aseguradora del paciente. NO filtramos por estatus aquí porque
  // las facturas son las que determinan si hubo ingreso real.
  appointments.forEach(app => {
    const rawArs = app.ars || '';
    const ars = (!rawArs || rawArs === 'N/A' || rawArs === 'N/D') ? 'Privado' : rawArs;
    
    if (app.id) appByCitaId.set(normalizeId(app.id), ars);
    if (app.facturaId) appByFacturaId.set(normalizeId(app.facturaId), ars);
    
    if (app.paciente && app.fechaCita) {
      const key = `${app.paciente.trim().toLowerCase()}_${app.fechaCita.toISOString().split('T')[0]}`;
      appByPatientDate.set(key, ars);
    }
  });

  invoices.forEach(inv => {
    const normCitaId = normalizeId(inv.citaId);
    const normInvId = normalizeId(inv.id);
    const patientDateKey = inv.paciente && inv.fecha 
      ? `${normalizeId(inv.paciente)}_${inv.fecha.toISOString().split('T')[0]}`
      : null;
    
    let ars = appByCitaId.get(normCitaId) || 
              appByFacturaId.get(normInvId) || 
              (patientDateKey ? appByPatientDate.get(patientDateKey) : null);
    
    if (!ars || ars === 'N/A' || ars === 'undefined') ars = 'Privado';
    
    map.set(ars, (map.get(ars) || 0) + (inv.totalFacturado || 0));
  });
  
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};
