import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  CalendarCheck, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { HRData, Invoice, Appointment } from '../types/dashboard';
import { processInvoices, processAppointments } from '../lib/data-processor';

interface DataUploadProps {
  hrData: HRData;
  setHrData: (data: HRData) => void;
  setInvoices: (invoices: Invoice[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setDataLoaded: (loaded: boolean) => void;
  clearData: () => void;
  saveToSupabase: (invoices: Invoice[], appointments: Appointment[]) => Promise<void>;
  onSuccess: () => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({
  hrData,
  setHrData,
  setInvoices,
  setAppointments,
  setDataLoaded,
  clearData,
  saveToSupabase,
  onSuccess
}) => {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [appointmentFile, setAppointmentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [invoiceValidation, setInvoiceValidation] = useState<{ count: number, columns: string[], isValid: boolean, missing: string[] } | null>(null);
  const [appointmentValidation, setAppointmentValidation] = useState<{ count: number, columns: string[], isValid: boolean, missing: string[] } | null>(null);

  const REQUIRED_COLUMNS = {
    invoice: ['id factura', 'monto', 'sucursal', 'fecha', 'cliente'],
    appointment: ['id cita', 'paciente', 'sucursal', 'médico', 'estatus']
  };


  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          
          // Convertimos toda la hoja a arreglo de arreglos
          const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          // Buscar el índice real de las cabeceras (saltando la posible fecha inicial de MedicalCore)
          let headerIndex = aoa.findIndex(row => {
            const rowStr = row.join('').toLowerCase();
            return rowStr.includes('id cita') || 
                   rowStr.includes('id paciente') || 
                   rowStr.includes('sucursal') ||
                   row.includes('#') ||
                   rowStr.includes('factura');
          });
          
          if (headerIndex === -1) headerIndex = 0;
          
          const dataRows = aoa.slice(headerIndex);
          if (dataRows.length === 0) return resolve([]);
          
          // La primera fila recortada son nuestros encabezados
          const headers = dataRows[0].map((h: any) => 
            String(h || '').replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '').trim()
          );
          const records = [];
          
          for (let i = 1; i < dataRows.length; i++) {
            const row = dataRows[i];
            // Saltar filas en blanco
            if (row.every((cell: any) => cell === '' || cell == null)) continue;
            
            const record: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (header) { // Ignorar columnas sin encabezado
                 record[header] = row[index];
              }
            });
            records.push(record);
          }
          
          console.log(`[Parse] ${file.name}: ${records.length} registros cargados. Columnas:`, headers.filter(Boolean));
          resolve(records);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleProcessData = async () => {
    setIsProcessing(true);
    setLastError(null);
    
    try {
      let hasData = false;
      let invoicesProcessed: Invoice[] = [];
      let appointmentsProcessed: Appointment[] = [];

      if (invoiceFile) {
        const data = await parseFile(invoiceFile);
        invoicesProcessed = processInvoices(data, 0);
        console.log(`[Upload] Facturas procesadas: ${invoicesProcessed.length}`);
        hasData = true;
      }

      if (appointmentFile) {
        const data = await parseFile(appointmentFile);
        appointmentsProcessed = processAppointments(data);
        console.log(`[Upload] Citas procesadas: ${appointmentsProcessed.length}`);
        hasData = true;
      }

      if (!hasData) {
        setLastError("No se han seleccionado archivos para procesar.");
        setIsProcessing(false);
        return;
      }

      // Limpieza y actualización atómica para evitar saltos en la UI
      clearData(); 
      
      // Guardar en Supabase ANTES de actualizar el estado local para asegurar persistencia
      await saveToSupabase(invoicesProcessed, appointmentsProcessed);

      // Actualizar estado local
      setInvoices(invoicesProcessed);
      setAppointments(appointmentsProcessed);
      
      // Activar el dashboard SOLO si hay al menos un dato
      if (invoicesProcessed.length > 0 || appointmentsProcessed.length > 0) {
        setDataLoaded(true);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
      }, 2000);
    } catch (error: any) {
      console.error("Error en procesamiento:", error);
      setLastError(`Error al procesar: ${error.message || 'Formato no reconocido'}`);
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (file: File | null, type: 'invoice' | 'appointment') => {
    if (!file) {
      if (type === 'invoice') {
        setInvoiceFile(null);
        setInvoiceValidation(null);
      } else {
        setAppointmentFile(null);
        setAppointmentValidation(null);
      }
      return;
    }

    try {
      const data = await parseFile(file);
      const columns = data.length > 0 ? Object.keys(data[0]).map(c => c.toLowerCase()) : [];
      
      const required = type === 'invoice' ? REQUIRED_COLUMNS.invoice : REQUIRED_COLUMNS.appointment;
      const missing = required.filter(req => !columns.some(col => col.includes(req)));
      const isValid = missing.length === 0;

      if (type === 'invoice') {
        setInvoiceFile(file);
        setInvoiceValidation({ 
          count: data.length, 
          columns: Object.keys(data[0] || {}), 
          isValid, 
          missing 
        });
      } else {
        setAppointmentFile(file);
        setAppointmentValidation({ 
          count: data.length, 
          columns: Object.keys(data[0] || {}), 
          isValid, 
          missing 
        });
      }
      
      if (!isValid) {
        setLastError(`El reporte de ${type === 'invoice' ? 'facturación' : 'citas'} no parece válido. Faltan: ${missing.join(', ')}`);
      } else {
        setLastError(null);
      }
    } catch (err: any) {
      setLastError("Archivo no válido o corrupto");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="glass-card p-12 text-center max-w-sm bg-white shadow-2xl">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">¡Carga Exitosa!</h3>
              <p className="text-slate-500 font-medium">Los datos han sido validados y publicados. Redirigiendo al tablero...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with process button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-10 bg-brand-600/5 overflow-visible">
        <div className="max-w-xl">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Gestión de Fuentes de Datos</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Actualiza el tablero estratégico cargando los reportes operativos de MedicalCore. 
            El sistema detectará automáticamente el formato y limpiará los datos.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleProcessData}
            disabled={(!invoiceFile && !appointmentFile) || isProcessing || (invoiceFile && !invoiceValidation?.isValid) || (appointmentFile && !appointmentValidation?.isValid)}
            className={cn(
              "group relative px-10 py-4 rounded-2xl font-black text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3 overflow-hidden",
              ((!invoiceFile && !appointmentFile) || isProcessing || (invoiceFile && !invoiceValidation?.isValid) || (appointmentFile && !appointmentValidation?.isValid))
                ? "bg-slate-300 cursor-not-allowed opacity-70"
                : "bg-brand-600 hover:bg-brand-700 shadow-brand-500/30 hover:shadow-brand-500/40"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="relative z-10 uppercase tracking-widest text-xs">Sincronizando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 relative z-10" />
                <span className="relative z-10 uppercase tracking-widest text-xs">Procesar y Publicar</span>
              </>
            )}
          </button>
          {lastError && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-600 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {lastError}
            </motion.span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload boxes with improved visual feedback */}
        <div className="space-y-4">
           <div className="flex items-center justify-between mb-2">
             <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Facturación Mensual</label>
             <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">CSV / XLSX</span>
           </div>
           <div className="relative group">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                title="Cargar reporte de facturas" 
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'invoice')} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className={cn(
                "glass-card p-12 text-center transition-all duration-500 border-2 border-dashed",
                invoiceFile ? "border-emerald-500/30 bg-emerald-50/20" : "border-slate-200 group-hover:border-brand-400 group-hover:bg-brand-50/10"
              )}>
                <div className={cn(
                  "w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-500",
                  invoiceFile ? "bg-emerald-500 text-white rotate-12" : "bg-slate-100 text-slate-400 group-hover:bg-brand-600 group-hover:text-white"
                )}>
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-base font-black text-slate-700 mb-2">
                  {invoiceFile ? invoiceFile.name : "Soltar reporte de facturas aquí"}
                </p>
                {invoiceValidation ? (
                   <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                     <div className={cn(
                       "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                       invoiceValidation.isValid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                     )}>
                       {invoiceValidation.isValid ? (
                         <>
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           {invoiceValidation.count} Registros válidos
                         </>
                       ) : (
                         <>
                           <AlertCircle className="w-3.5 h-3.5" />
                           Formato Incorrecto
                         </>
                       )}
                     </div>
                     {!invoiceValidation.isValid && (
                       <p className="text-[10px] text-rose-500 font-bold max-w-[200px]">
                         Faltan: {invoiceValidation.missing.join(', ')}
                       </p>
                     )}
                     {invoiceValidation.isValid && (
                        <p className="text-[10px] text-slate-400 font-medium max-w-[200px] truncate">
                          Columnas: {invoiceValidation.columns.join(', ')}
                        </p>
                     )}
                   </motion.div>
                 ) : (
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">O haz clic para explorar archivos</p>
                 )}
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between mb-2">
             <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Citas y Visitas</label>
             <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">CSV / XLSX</span>
           </div>
           <div className="relative group">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                title="Cargar reporte de citas" 
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'appointment')} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className={cn(
                "glass-card p-12 text-center transition-all duration-500 border-2 border-dashed",
                appointmentFile ? "border-emerald-500/30 bg-emerald-50/20" : "border-slate-200 group-hover:border-brand-400 group-hover:bg-brand-50/10"
              )}>
                <div className={cn(
                  "w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-500",
                  appointmentFile ? "bg-emerald-500 text-white rotate-12" : "bg-slate-100 text-slate-400 group-hover:bg-brand-600 group-hover:text-white"
                )}>
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <p className="text-base font-black text-slate-700 mb-2">
                  {appointmentFile ? appointmentFile.name : "Soltar reporte de citas aquí"}
                </p>
                {appointmentValidation ? (
                   <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        appointmentValidation.isValid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {appointmentValidation.isValid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {appointmentValidation.count} Citas válidas
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            Formato Incorrecto
                          </>
                        )}
                      </div>
                      {!appointmentValidation.isValid && (
                        <p className="text-[10px] text-rose-500 font-bold max-w-[200px]">
                          Faltan: {appointmentValidation.missing.join(', ')}
                        </p>
                      )}
                      {appointmentValidation.isValid && (
                        <p className="text-[10px] text-slate-400 font-medium max-w-[200px] truncate">
                          Columnas: {appointmentValidation.columns.join(', ')}
                        </p>
                      )}
                   </motion.div>
                 ) : (
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">O haz clic para explorar archivos</p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

