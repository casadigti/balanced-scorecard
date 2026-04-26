import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  CalendarCheck, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  Info,
  Check
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
  refreshData: () => Promise<void>;
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
  refreshData,
  onSuccess
}) => {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [appointmentFile, setAppointmentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [invoiceValidation, setInvoiceValidation] = useState<{ count: number, columns: string[], isValid: boolean } | null>(null);
  const [appointmentValidation, setAppointmentValidation] = useState<{ count: number, columns: string[], isValid: boolean } | null>(null);

  const REQUIRED_MAPPINGS = {
    invoice: ['sucursal', 'paciente', 'monto|total|precio'],
    appointment: ['sucursal', 'paciente', 'doctor|médico|medico', 'id cita|cita id']
  };

  const validateData = (columns: string[], type: 'invoice' | 'appointment'): boolean => {
    const required = REQUIRED_MAPPINGS[type];
    const colsLower = columns.map(c => c.toLowerCase());
    
    return required.every(req => {
      const options = req.split('|');
      return options.some(opt => colsLower.some(c => c.includes(opt)));
    });
  };

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          // Buscar la fila de cabeceras real (donde haya más de 5 columnas con texto)
          let headerRowIndex = aoa.findIndex(row => {
            const filledCount = row.filter(cell => String(cell || '').trim().length > 0).length;
            const rowStr = row.join('').toLowerCase();
            return filledCount > 5 && (rowStr.includes('id') || rowStr.includes('paciente') || rowStr.includes('sucursal'));
          });
          
          if (headerRowIndex === -1) headerRowIndex = 0;
          
          const dataRows = aoa.slice(headerRowIndex);
          if (dataRows.length === 0) return resolve([]);
          
          // Limpiar cabeceras
          const headers = dataRows[0].map((h: any) => 
            String(h || '').replace(/[\ufeff\u200b\u200c\u200d\u200e\u200f]/g, '').trim()
          );

          const records = [];
          for (let i = 1; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (row.every((cell: any) => String(cell || '').trim() === '')) continue;
            
            const record: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (header) record[header] = row[index];
            });
            records.push(record);
          }
          
          resolve(records);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (file: File | null, type: 'invoice' | 'appointment') => {
    if (!file) {
      if (type === 'invoice') { setInvoiceFile(null); setInvoiceValidation(null); }
      else { setAppointmentFile(null); setAppointmentValidation(null); }
      return;
    }

    try {
      const data = await parseFile(file);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      const isValid = validateData(columns, type);
      
      if (type === 'invoice') {
        setInvoiceFile(file);
        setInvoiceValidation({ count: data.length, columns, isValid });
      } else {
        setAppointmentFile(file);
        setAppointmentValidation({ count: data.length, columns, isValid });
      }
      setLastError(null);
    } catch (err) {
      setLastError("Error al leer el archivo");
    }
  };

  const handleProcessData = async () => {
    setIsProcessing(true);
    setLastError(null);
    
    try {
      let invoicesProcessed: Invoice[] = [];
      let appointmentsProcessed: Appointment[] = [];

      if (invoiceFile) {
        const data = await parseFile(invoiceFile);
        invoicesProcessed = processInvoices(data, 0);
      }

      if (appointmentFile) {
        const data = await parseFile(appointmentFile);
        appointmentsProcessed = processAppointments(data);
      }

      if (invoicesProcessed.length === 0 && appointmentsProcessed.length === 0) {
        throw new Error("No se encontraron datos válidos en los archivos seleccionados.");
      }

      // clearData(); // ELIMINADO para cumplir con el requerimiento de no quitar registros viejos
      await saveToSupabase(invoicesProcessed, appointmentsProcessed);
      
      // En lugar de solo setear lo procesado, refrescamos TODO desde la base de datos
      await refreshData();
      
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
      }, 2000);
    } catch (error: any) {
      setLastError(error.message || "Error al procesar los datos");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="glass-card p-12 text-center bg-white shadow-2xl rounded-3xl">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">¡Datos Publicados!</h3>
              <p className="text-slate-500">La información ha sido guardada en la nube y actualizada.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-10 bg-brand-600/5">
        <div className="max-w-xl">
          <h2 className="text-3xl font-black text-slate-900 mb-3">Gestión de Datos MedicalCore</h2>
          <p className="text-slate-500 font-medium">Carga tus reportes de Excel. El sistema detectará automáticamente las columnas de Facturas, Pacientes y Doctores.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleProcessData}
            disabled={(!invoiceFile && !appointmentFile) || isProcessing}
            className={cn(
              "px-10 py-4 rounded-2xl font-black text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3",
              (!invoiceFile && !appointmentFile) || isProcessing ? "bg-slate-300" : "bg-brand-600 hover:bg-brand-700"
            )}
          >
            {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-6 h-6" />}
            <span className="uppercase tracking-widest text-xs">{isProcessing ? 'Procesando...' : 'Procesar y Publicar'}</span>
          </button>
          {lastError && <span className="text-xs text-rose-600 font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{lastError}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UploadCard 
          title="Facturación Mensual" 
          file={invoiceFile} 
          validation={invoiceValidation} 
          onFileChange={(f) => handleFileChange(f, 'invoice')} 
          icon={<FileText className="w-8 h-8" />}
        />
        <UploadCard 
          title="Citas y Visitas" 
          file={appointmentFile} 
          validation={appointmentValidation} 
          onFileChange={(f) => handleFileChange(f, 'appointment')} 
          icon={<CalendarCheck className="w-8 h-8" />}
        />
      </div>
    </div>
  );
};

const UploadCard = ({ title, file, validation, onFileChange, icon }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</label>
      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-emerald-600">XLSX / CSV</span>
    </div>
    <div className="relative group">
      <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => onFileChange(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
      <div className={cn("glass-card p-12 text-center transition-all border-2 border-dashed", file ? "border-emerald-500/30 bg-emerald-50/20" : "border-slate-200 group-hover:border-brand-400")}>
        <div className={cn("w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center", file ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>{icon}</div>
        <p className="text-base font-black text-slate-700 mb-2">{file ? file.name : `Soltar ${title.toLowerCase()} aquí`}</p>
        {validation && (
          <div className="flex flex-col items-center gap-2">
            <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest", validation.isValid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
              {validation.isValid ? `${validation.count} Registros Válidos` : "Formato no estándar"}
            </span>
            <p className="text-[10px] text-slate-400 max-w-[200px] truncate">Columnas: {validation.columns.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
