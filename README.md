# ENI-2 · Asistente de la Libreta de Puntajes

Página estática (HTML/JS, **sin backend**) para acelerar el llenado y procesamiento de la
**Libreta de Puntajes del ENI‑2**. Todo el cálculo corre en el navegador. **No se almacenan
datos del evaluado**: la edad y los puntajes brutos viven solo en la sesión y se borran al
refrescar. Lo único que persiste son tus **correcciones a los baremos** (en `localStorage`,
con exportar/importar para respaldo).

## Qué hace

1. **Edad → banda** (5;0 a 16;11). Valida edad fuera de rango.
2. **Por prueba:** puntaje bruto → **escalar** (Apéndice B, tabla de la edad) y **percentil**
   (tabla compartida escalar↔percentil↔T). Reglas de borde:
   - bruto por debajo del mínimo de la tabla → escalar mínimo;
   - bruto en o por encima del máximo → última fila;
   - bruto entre dos valores (hueco) → valor inmediatamente inferior.
3. **Por subdominio:** suma de escalares de sus pruebas **excluyendo las marcadas con ∗**
   (se calculan y muestran, pero no suman) → **Apéndice D** → **puntuación estándar** +
   percentil del subdominio.
4. **Gráficas de perfil:** 3 de la Libreta (Funciones cognoscitivas, Funciones ejecutivas,
   Habilidades de rendimiento académico) + una **unificada**. Eje Y = puntuación estándar,
   **editable**, con líneas de referencia (media 100 y ±DE: 70/85/100/115/130).

## Verificación en el punto de uso (clave)

La fuente son escaneos del Manual (sin capa de texto), así que los valores **auto‑extraídos**
pueden tener ruido. Por eso, junto a cada resultado hay un botón **«ver»** que muestra el
**recorte de la tabla fuente** (Apéndice B para pruebas, Apéndice D para subdominios) para que
verifiques el valor contra la imagen. Si algo no coincide, lo corriges con **✎** y la
corrección **se guarda de forma persistente** por `(edad, prueba, bruto)` o `(subdominio, suma)`,
y se aplica en adelante. Nunca se inventan datos: si no hay valor auto, el campo dice
**«captúralo»** y lo lees de la imagen.

### Chips de origen
- `auto` — valor extraído del escaneo (verifícalo con la imagen).
- `corr` — valor corregido por ti (persistente).
- `captúralo` — sin valor auto aún; léelo de la tabla fuente y captúralo (se guarda).

## Estado de cobertura de datos

| Dato | Estado |
|---|---|
| Estructura (dominios/subdominios/pruebas, ∗, máximos) | ✔ Extraída (Libreta) |
| Tabla compartida escalar → percentil/T | ✔ Verificada |
| Apéndice D (suma → estándar/percentil), 29 subdominios | ✔ Auto; 1‑prueba exactos; resto verifica con imagen |
| Subdominios 13.3 Flexibilidad y 13.4 Planeación (Apéndice D) | Punto de uso (columnas de tiempo no mapeadas) |
| **Apéndice B (bruto → escalar), 71 tablas por edad** | **Punto de uso** (lee/captura desde la imagen; se guarda). Auto‑extracción incremental pendiente. |
| Mapa de ubicación de las 71 tablas (banda→grupo→página) | ✔ Verificado |

Las imágenes fuente están en `assets/tablas/` (una por tabla del Apéndice B + Apéndice D).

## Respaldo de correcciones

`localStorage` es por‑navegador. Usa **Exportar correcciones** para guardar un `.json` e
**Importar** para restaurarlo en otra máquina/navegador (fusionar o reemplazar).

## Estructura del proyecto

```
index.html
css/styles.css
js/
  datos/estructura.js   estructura Dominio→Subdominio→Prueba (∗, máximos, dcol)
  datos/compartida.js   escalar → percentil/T
  datos/mapa.js         banda→grupo→página PDF (ubicación de tablas y recortes)
  datos/tablas.js       Apéndice B: bruto→escalar por banda y prueba (incremental)
  datos/apendiceD.js    Apéndice D: suma→estándar/percentil por subdominio
  store.js              persistencia de correcciones (localStorage) + export/import
  engine.js             motor de cálculo (reglas de borde, sumas, lookups)
  charts.js             gráficas de perfil (SVG)
  ui.js                 hoja de registro reactiva + verificación en el punto de uso
assets/tablas/          recortes fuente (Apéndice B + D)
```

No requiere build ni dependencias. Para desarrollo local basta abrir `index.html` (o servirlo
con cualquier servidor estático).

## Aviso

Herramienta de apoyo; **no sustituye el Manual del ENI‑2** (Matute, Rosselli, Ardila, Ostrosky).
Los baremos e imágenes pertenecen a sus autores/editorial. Verifica cada valor con la
imagen‑fuente antes de informar.
