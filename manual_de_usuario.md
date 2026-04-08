# 📘 Manual de Usuario: BSC Health Core (CASADIG)

Bienvenido a la guía oficial del sistema **Dashboard Estratégico (Balanced Scorecard)** de CASADIG. Esta plataforma de inteligencia médica (BI) está diseñada para brindarte una vista gerencial unificada sobre el rendimiento de tu centro de salud en distintas áreas críticas.

Este manual te guiará a través de cada módulo, explicando paso a paso la usabilidad general, la lógica de los datos y el significado de los Indicadores Clave de Desempeño (KPIs).

---

## 🔐 1. Accesos y Seguridad
El sistema está protegido mediante un esquema de grado empresarial (**Medical Intelligence / SSL Encryption**).
*   **Inicio de Sesión**: Solo personal autorizado puede acceder ingresando su correo corporativo y contraseña.
*   **Recuperación**: Si olvidas tu contraseña, puedes usar la opción "¿Olvidaste tu contraseña?" para solicitar un enlace seguro de restablecimiento enviado a tu correo.

---

## 🧭 2. Navegación Principal

Al entrar, dispondrás de una **Barra Lateral (Sidebar)** a la izquierda para navegar entre tres pilares y un **Panel Superior (Header)** constante:

### Menú Lateral
1.  **Balanced Scorecard**: Tu tablero principal de indicadores e inteligencia de negocio.
2.  **Cargar Datos**: Área operativa para subir los archivos y sincronizar la base de datos de facturación y citas de MedicalCore.
3.  **Configuración**: Panel para actualizar las metas y variables estáticas que alimentan los gráficos (ej. metas de ingresos, datos de RH, resultados de encuestas).

### Panel Superior y Filtros Automáticos
En la barra superior siempre contarás con:
*   **Filtro por Sucursal**: Permite segmentar de inmediato todos los datos de la plataforma por una clínica específica.
*   **Rango de Fechas (Inicio / Fin)**: Para auditar y analizar períodos específicos (un mes, un trimestre, todo el año).
*   **Botón Limpiar**: Elimina inmediatamente los filtros aplicados y devuelve el panel a su visión global total.
*   **Botón 🗑 Limpiar Datos**: Te permite vaciar los datos cargados desde tu sesión local útil antes de cargar nuevos reportes masivos.

---

## 📊 3. Balanced Scorecard (El Dashboard Módulo por Módulo)

El modelo Balanced Scorecard (Cuadro de Mando Integral) divide la salud organizacional en 4 "Perspectivas". 

### 💰 A. Perspectiva Financiera
Se centra en el valor generado y el rendimiento económico del negocio.

*   **KPI - Facturación Total**: Ingreso bruto total sumado a partir del importe de todas las facturas procesadas en el periodo seleccionado.
*   **KPI - Cumplimiento de Meta**: Evalúa en qué porcentaje se ha completado la *Meta de Ingresos* (definida en el panel de Configuración). Fórmula: `(Facturación Total / Meta de Ingresos) * 100`.
*   **KPI - Promedio por Factura**: Indica cuánto gasta o genera un paciente en cada visita promediando las facturas totales. Fórmula: `Facturación Total / Cantidad de Facturas`.
*   **Gráfico - Ingresos por Sucursal**: Diagrama de barras que compara geográficamente dónde se genera el volumen de negocio.
*   **Función especial - Detalles de Ingresos**: Un botón interactivo abrirá un menú desglosado con el "Top of Sales". Esto es un ranking que ordena los servicios o consultas médicas con sus importes y qué peso porcentual (% del total) tienen sobre la facturación global.

### 👥 B. Perspectiva del Cliente (Paciente)
Evalúa el valor entregado y el flujo operacional de la demanda.

*   **KPI - Índice NPS (Net Promoter Score)**: Mide la lealtad de los pacientes (qué tanto recomendarían a CASADIG). Va del -100 al 100 y se calcula usando la cantidad de promotores vs detractores *(Valores actualizables en Configuración)*.
*   **KPI - Pacientes Únicos**: Conteo exacto de individuos distintos que han sido atendidos, sin duplicar a aquellos que fueron múltiples veces durante el período.
*   **KPI - Total Citas**: Volumen bruto de la agenda médica (incluyendo canceladas y ausencias).
*   **KPI - Citas Realizadas**: Citas únicamente marcadas en sistema con estado "Realizada" o "Facturada", omitiendo las ausencias. Representa el flujo real operado en la clínica.
*   **Gráfico - Pacientes por Sucursal**: Gráfico circular (Pie Chart) que visualiza qué tajada del número total de los pacientes le corresponde a cada consultorio/sede.
*   **Función especial - Barómetro de Satisfacción**: Una ventana emergente detallada para visualizar cuantitativamente las encuestas médicas subidas (Promotores, Detractores y Pasivos).

### ⚙️ C. Perspectiva de Procesos Internos
Analiza el núcleo operacional, optimizaciones y servicios más demandados.

*   **Gráfico - Ventas por Procedimiento (Top 10)**: Enumera visualmente cuáles fueron los 10 servicios, métodos diagnósticos o consultas de especialidad que aportaron más recursos económicos a la clínica.
*   **Gráfico - Citas por Procedimiento (Demanda)**: A diferencia del gráfico de ingresos, aquí medimos *volumen absoluto*. Nos dicta qué procedimientos atraen a más personas, indistintamente de si el servicio es muy barato o muy costoso. Funciona como un termómetro de la demanda social en la clínica.

### 📚 D. Perspectiva de Aprendizaje y Crecimiento
Capital humano, clima organizacional e innovación interna de la clínica.

*   **KPI - Instrucción Promedio**: Horas de capacitación y educación médica continua o general impartida por empleado. Regido en panel de Configuración.
*   **KPI - Índice eNPS (Employer NPS)**: Termómetro del clima laboral (Satisfacción y Retención de empleados).
*   **KPI - Rotación de Personal**: Estabilidad del talento interno. Qué porcentaje de nuestros empleados ha renunciado o ha sido desligado en el período.
*   **Gráfico - Distribución de Clima Laboral**: Barras cualitativas y cuantitativas sobre cómo se sienten los empleados según encuestas de RH y su semaforización.
*   **Función especial - Capital Humano**: Panel detallado en botón que permite analizar métricas cualitativas del personal.

---

## 🗂 4. Módulo de Carga de Datos (Data Upload)
Para que los KPIs anteriores se calculen mágicamente, la plataforma necesita los insumos y reportes directos del ERP/Sistema que ustedes utilizan en el día a día (MedicalCore).
*   Se manejan archivos en formato estándar **Excel / CSV**
*   Deben arrastrarse o seleccionarse el reporte de **Facturas** (cálculo financiero) y **Citas Reales** (cálculo analítico-clínico).
*   Una vez cargados, la plataforma normaliza los campos de texto, empata las variables de las sucursales, esquiva celdas vacías y sincroniza los KPI de la institución en base exclusiva a lo que contienen los reportes.

---

## 🎛 5. Configuración de Objetivos
En el diseño del Balanced Scorecard, la comparativa entre "Lo que hicimos" (Datos en Facturación) vs "Lo que queríamos hacer" (Metas) es fundamental.

Para ello, tienes la pestaña de **Configuración**. Aquí se administran las metas estratégicas estáticas.
1.  **Metas Variables Generales**: Meta anual o mensual de ingresos financieros y Cantidad de Colaboradores totales.
2.  **Resultados NPS Pacientes**: Alimentación manual de encuestas del paciente. (Cuantos encuestaron 9 y 10 "Promotores", 7-8 "Pasivos", 0-6 "Detractores"). El sistema hace sus restas automáticamente.
3.  **Capital Humano y RRHH**: Datos obtenidos por RH de sus encuestas de salida o clima para generar el pulso eNPS, nivel de rotación de empleados y tiempos formativos.

> 💡 **Tip Directivo:** Cualquier cambio validado y guardado en la página de Configuración actualizará inmediatamente el Dashboard e impactará las métricas de porcentaje o cumplimiento operacional del resto del equipo que este visualizando en ese momento.
