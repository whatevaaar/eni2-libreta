# CLAUDE.md — ENI-2 · Asistente de la Libreta de Puntajes

Contexto para agentes que trabajen en este repo. Léelo antes de tocar cálculo,
gráficas o datos. Para el usuario final, el README es la referencia.

## Qué es

Página **estática** (HTML + JS vanilla, **sin backend, sin build, sin dependencias**)
que acelera el llenado y procesamiento de la **Libreta de Puntajes del ENI-2**
(Evaluación Neuropsicológica Infantil, 2ª ed.: Matute, Rosselli, Ardila, Ostrosky).
Todo el cálculo corre en el navegador.

**Privacidad (invariante dura):** NO se almacenan datos del evaluado. La edad y los
puntajes brutos viven solo en memoria de la sesión y se borran al refrescar. Lo único
que persiste (`localStorage`) son las **correcciones a los baremos** + preferencias no
personales (p.ej. rango del eje Y). Nunca persistas edad ni brutos.

## Arquitectura

Sin framework. Namespace global único `window.ENI2`. Los scripts se cargan en orden
en `index.html` y cada uno cuelga su parte de `ENI2`:

```
Datos (se cargan primero):
  js/datos/estructura.js   ENI2.meta, ENI2.dominios, ENI2.aliases, ENI2.aciertosTiempo
  js/datos/compartida.js   ENI2.compartida      escalar -> {percentil, t}
  js/datos/mapa.js         ENI2.mapa            banda->grupo->página PDF (recortes)
  js/datos/tablas.js       ENI2.tablas          Apéndice B: bruto->escalar por banda/prueba
  js/datos/apendiceD.js    ENI2.apendiceD       suma escalares -> {estandar, percentil, t}
  js/datos/correcciones.js ENI2.correccionesBase  capa base incorporada (verificada)
Lógica:
  js/store.js   ENI2.store    persistencia de correcciones (localStorage) + export/import
  js/engine.js  ENI2.engine   motor de cálculo puro (sin DOM)
  js/charts.js  ENI2.charts   gráficas de perfil (SVG, sin dependencias)
  js/ui.js      hoja de registro reactiva + verificación en punto de uso (toca el DOM)
```

Convención de cada módulo: IIFE `(function(){ "use strict"; var E = window.ENI2; ... })();`
Estilo JS conservador (ES5-friendly, `var`, sin módulos ES). Mantén ese estilo.

Idioma: **todo en español** (UI, dominios, nombres, comentarios). Respétalo.

## Modelo de datos

Jerarquía **Dominio → Subdominio → Prueba** (`ENI2.dominios`). Campos clave:

- **Prueba**: `{ id, nombre, max, asterisco, norma }`.
  - `asterisco: true` → se calcula y muestra, pero **NO** suma al escalar del subdominio.
  - `norma`: `true` tiene conversión bruto→escalar (Apéndice B); `false`/`"verificar"`
    = medida derivada (porcentajes, tiempos, totales) sin norma confirmada.
- **Subdominio de agregación** (`agregacion: true`): sus escalares se suman y se
  convierten vía Apéndice D a **Puntuación estándar + percentil**. `dcol` = clave de
  su columna en `ENI2.apendiceD`. Hay **30** nodos de agregación; **28** tienen tabla
  en el Apéndice D. `ENI2.apendiceD` tiene **29 columnas** = esos 28 `dcol` + 1 alias
  (`razonamiento_logico_matematico`). Los `dcol` `flexibilidad` y `planeacion` **no**
  tienen tabla D (columnas de tiempo no mapeadas) → verificación en punto de uso.
- Dominios sin subdominios reales (6, 10, 12) usan un subdominio único cuyo `id` == núm. de dominio.
- `ENI2.aliases`: columnas extra en Apéndice D que no son subdominios (p.ej.
  `razonamiento_logico_matematico` ← prueba 12.3).

## Escalas y flujo de cálculo

- **Puntuación escolar (escalar):** media 10, DE 3 (rango 1..19). Por prueba.
- **Puntuación estándar:** media 100, DE 15. Por subdominio.
- Estándar ↔ percentil = curva **normal** canónica (cortes ±DE → 2/16/50/84/98).

Flujo (`engine.js`):
1. **Por prueba:** `bruto → escalar` (tabla de la banda de edad, Apéndice B) y
   `escalar → percentil/T` (tabla compartida).
2. **Por subdominio:** suma de escalares (excluyendo `asterisco` y `norma:false`) →
   Apéndice D → estándar + percentil.

**Reglas de borde** (misma *selección* de fila en Apéndice B y D):
- bruto/suma < mínimo de la tabla → fila mínima (`borde: "bajo_minimo"`).
- bruto/suma ≥ máximo → última fila (`"sobre_maximo"`).
- valor en un hueco entre filas → fila inmediatamente inferior.
- **Asimetría:** Apéndice B etiqueta ese hueco como `borde: "hueco_inferior"`; el
  Apéndice D selecciona igual la fila inferior pero **no** etiqueta hueco (solo
  `bajo_minimo`/`sobre_maximo`).

**Prioridad de valores (capas):**
```
store (corrección local del usuario, localStorage)  >  correccionesBase (incorporada)  >  auto (extraído)
```
Al cambiar el motor, respeta ese orden. `fuente` en los resultados: `correccion | auto | pendiente`.

## Verificación en el punto de uso (clave del producto)

Las fuentes son **escaneos del Manual sin capa de texto**, así que los valores
auto-extraídos (`tablas.js`, `apendiceD.js`) **pueden tener ruido**. Por eso:
- Junto a cada resultado hay un botón que abre el **recorte de la tabla fuente**
  (modal) para verificar contra la imagen.
- Chips de origen: `auto` (verifícalo), `corr` (corregido, persistente),
  `captúralo` (sin valor auto; léelo de la imagen).
- Las correcciones se guardan por `(banda, prueba, bruto)` o `(dcol, suma)` y se
  aplican en adelante. **Nunca inventes valores de baremo.**

**Notación de piso del Manual:** valores como `"<51"`, `"<0.1"` son válidos como
**valor de baremo / etiqueta** (salida del Apéndice D, graficado), **no** como bruto de
entrada (el motor rechaza `"<51"` como bruto: `error: "bruto_invalido"`). En la gráfica
se trazan por su parte numérica, conservando la etiqueta original, **solo si** esa parte
numérica cumple el umbral de graficado `num ≥ ejeY.min − 50` (con el eje por defecto
55..145, `"<0.1"` queda por debajo y **no** se grafica; `"<51"` sí).

## Gráficas de perfil (`charts.js`)

3 perfiles de la Libreta (cognoscitivas, ejecutivas, académicas) + 1 unificada. SVG puro.

- **Eje Y = puntuación estándar**, editable, con líneas de referencia (media 100 y ±DE:
  70/85/100/115/130). **Doble escala:** percentil a la izquierda, estándar a la derecha
  (el percentil se deriva de la estándar por CDF normal; títulos de eje a cada lado).
- **Eje X = subdominios**, agrupados por dominio: bandas de fondo alternas, franja
  rotulada con número+nombre de dominio (tooltip con nombre completo) y separadores.
- Solo grafica donde hay valor; traza segmentos entre puntos consecutivos existentes.

Las funciones internas de `charts.js` no se exportan; se validan vía el SVG renderizado.

## Pruebas

Runner **nativo de Node** (`node --test`), **sin dependencias**. Requiere Node ≥ 18
(desarrollado con Node 24).

```
npm test        # o: node --test
```

- `harness.js` (raíz, no es archivo de test): `node --test` no lo auto-descubre porque
  no está en `test/` ni coincide con los patrones `*.test.js` / `test-*.js` (por eso se
  renombró desde `test-harness.js`, que **sí** se auto-descubría). Carga los archivos
  fuente reales en
  el **mismo realm** que las pruebas vía `new Function(window, document, localStorage, console, code)`,
  con mocks mínimos de DOM y `localStorage`. Así se ejercita el código tal cual corre en
  el navegador (sin reimplementar nada) y `assert.deepStrictEqual` no sufre problemas de
  realm cruzado. `createApp(files)` devuelve `{ E, window, document, localStorage }` con
  contexto nuevo por llamada (aislamiento). `renderCharts(app)` da helpers de consulta del SVG.
- `test/engine.test.js` — reglas de borde, prioridad de capas, agregación, Apéndice D,
  edad/banda. Usa **datos sintéticos inyectados** (`E.tablas`, `E.apendiceD`, ...) para
  que los casos de borde sean deterministas.
- `test/charts.test.js` — eje Y doble, agrupación por dominio, títulos, notación de piso,
  estado vacío. Valida sobre el SVG real con la estructura real.
- `test/store.test.js` — CRUD, conteo, export/import (reemplazar/fusionar), normalización.
- `test/data.test.js` — invariantes del dato-maestro (ids únicos, dcol único, columnas D
  válidas, compartida 1..19, subdominios de 1 prueba exactos).

**Al cambiar comportamiento, agrega/ajusta pruebas.** Si un test "revela" un supuesto
tuyo equivocado, corrige el test para codificar la realidad (no silencies el motor).

## Flujo de trabajo (git)

`master` está **protegido** por un hook `PreToolUse` del harness de Claude Code
(política Creai `push-guard.sh`) que bloquea `git push` directo a `master`/`main`/`develop`
(no es un hook de `.git/hooks`). Para publicar: rama `feat|fix|...<desc>` → push de la
rama → PR. No hagas push directo a `master`.

## Al tocar este repo

- Mantén el estilo IIFE/ES5 y el español.
- No rompas la privacidad (nada de persistir datos del evaluado).
- No inventes valores de baremo; respeta las capas store > base > auto.
- Corre `node --test` antes de dar por terminado un cambio de lógica/gráficas/datos.
- Verifica visualmente las gráficas abriendo `index.html` cuando cambies `charts.js`.
