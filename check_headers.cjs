const XLSX = require('xlsx');
const path = require('path');

const files = [
  'c:\\Users\\Jose Luis Marte\\Balanced Scorecard\\Carga de Ejemplo\\reporte_facturas_enero-Marzo.xlsx',
  'c:\\Users\\Jose Luis Marte\\Balanced Scorecard\\Carga de Ejemplo\\reporte_citas__enero-Marzo.xlsx'
];

files.forEach(file => {
  try {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Leer las primeras 10 filas para encontrar las cabeceras reales
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).slice(0, 10);
    console.log(`\nArchivo: ${path.basename(file)}`);
    data.forEach((row, i) => {
      if (row.length > 5) { // Solo mostrar filas que parezcan tener datos
        console.log(`Fila ${i + 1}: ${JSON.stringify(row.slice(0, 10))}...`);
      }
    });
  } catch (err) {
    console.error(`Error leyendo ${file}:`, err.message);
  }
});
