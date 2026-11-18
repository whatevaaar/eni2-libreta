/*
 * Gráficas de perfil (charts.js): eje Y doble (percentil izq / estándar der),
 * agrupación por dominio en el eje X, títulos de eje, notación de piso y
 * estado vacío. Se valida sobre el SVG realmente renderizado con datos reales.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, renderCharts, FILES } = require("../harness.js");

const EJE = { min: 55, max: 145, lineas: true, ref: [70, 85, 100, 115, 130] };
// Índices de pestañas en el orden de PERFILES: cognoscitivas, ejecutivas, academicas, unificada.
const TAB = { cognoscitivas: 0, ejecutivas: 1, academicas: 2, unificada: 3 };

function conValores() {
  const app = createApp(FILES.charts);
  const vals = {};
  app.E.dominios.forEach((d) => d.subdominios.forEach((s) => { if (s.agregacion) vals[s.id] = 100; }));
  return { app, vals };
}

const xOf = (n) => Number(n.getAttribute("x"));
const yKey = (n) => Math.round(Number(n.getAttribute("y")));
const anchorOf = (n) => n.getAttribute("text-anchor");

test("eje Y: percentil a la IZQUIERDA y estándar a la DERECHA (lado + emparejado por fila)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const svg = c.current();
  const W = Number(svg.getAttribute("width"));
  const pc = c.byClass(svg, "ylbl-pc");
  const pe = c.byClass(svg, "ylbl-pe");
  assert.ok(pc.length > 0 && pc.length === pe.length, "misma cantidad de etiquetas a cada lado");
  // Lado correcto por coordenada x (esencia del cambio), no solo por existir.
  pc.forEach((n) => {
    assert.ok(xOf(n) < W / 2, "percentil en la mitad izquierda");
    assert.equal(anchorOf(n), "end");
  });
  pe.forEach((n) => {
    assert.ok(xOf(n) > W / 2, "estándar en la mitad derecha");
    assert.equal(anchorOf(n), "start");
  });
  // Emparejar por FILA (misma y), no por índice (robusto ante reordenamientos).
  const filaPc = {}, filaPe = {};
  pc.forEach((n) => { filaPc[yKey(n)] = n.textContent; });
  pe.forEach((n) => { filaPe[yKey(n)] = n.textContent; });
  const mapa = {};
  Object.keys(filaPe).forEach((y) => { if (filaPc[y] != null) mapa[filaPe[y]] = filaPc[y]; });
  assert.equal(mapa["70"], "2", "estándar 70 -> percentil 2");
  assert.equal(mapa["85"], "16", "estándar 85 -> percentil 16");
  assert.equal(mapa["100"], "50", "media -> percentil 50");
  assert.equal(mapa["115"], "84", "estándar 115 -> percentil 84");
  assert.equal(mapa["130"], "98", "estándar 130 -> percentil 98");
});

test("eje Y: percentiles de piso en los extremos (<1 / >99)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const pc = c.byClass(c.current(), "ylbl-pc").map((n) => n.textContent);
  assert.ok(pc.includes("<1"), "debe aparecer el piso <1 (p.ej. estándar 60)");
  assert.ok(pc.includes(">99"), "debe aparecer el techo >99 (p.ej. estándar 140)");
});

test("eje Y: media resaltada a ambos lados (50 y 100)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const media = c.byClass(c.current(), "ylbl-media").map((n) => n.textContent).sort();
  assert.deepEqual(media, ["100", "50"].sort(), "percentil 50 y estándar 100 resaltados");
});

test("títulos de eje: Percentil a la izquierda, Puntuación estándar a la derecha", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const svg = c.current();
  const W = Number(svg.getAttribute("width"));
  const x = {};
  c.byClass(svg, "axis-title").forEach((n) => { x[n.textContent] = xOf(n); });
  assert.ok(x["Percentil"] != null && x["Puntuación estándar"] != null, "ambos títulos presentes");
  assert.ok(x["Percentil"] < W / 2, "Percentil a la izquierda");
  assert.ok(x["Puntuación estándar"] > W / 2, "Puntuación estándar a la derecha");
});

test("eje X: agrupación por dominio (conteos por perfil y cobertura total)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const casos = [
    { tab: TAB.cognoscitivas, grupos: 9 },
    { tab: TAB.ejecutivas, grupos: 1 },
    { tab: TAB.academicas, grupos: 3 },
    { tab: TAB.unificada, grupos: 13 }
  ];
  casos.forEach(({ tab, grupos }) => {
    c.selectTab(tab);
    const svg = c.current();
    const bandas = c.byClass(svg, "dom-band");
    const xlbls = c.byClass(svg, "xlbl");
    assert.equal(bandas.length, grupos, "grupos de dominio en pestaña " + tab);
    assert.ok(xlbls.length >= grupos, "hay al menos una etiqueta de subdominio por grupo");
  });
});

test("eje X: las bandas particionan el eje sin solapes ni fragmentación", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  [TAB.cognoscitivas, TAB.ejecutivas, TAB.academicas, TAB.unificada].forEach((tab) => {
    c.selectTab(tab);
    const svg = c.current();
    const W = Number(svg.getAttribute("width"));
    // Cajas de la franja de dominio = intervalos reales de cada grupo (teselan x..x+width).
    const bg = c.byClass(svg, "dom-band")
      .map((n) => ({ x: Number(n.getAttribute("x")), w: Number(n.getAttribute("width")) }))
      .sort((a, b) => a.x - b.x);
    assert.ok(bg.length > 0, "hay bandas en pestaña " + tab);
    // Teselan el área de forma contigua, sin huecos ni solapes.
    for (let i = 0; i < bg.length - 1; i++) {
      assert.ok(Math.abs((bg[i].x + bg[i].w) - bg[i + 1].x) < 0.01, "bandas contiguas (pestaña " + tab + ")");
    }
    // Cada subdominio cae dentro de EXACTAMENTE una banda (cobertura + partición).
    c.byClass(svg, "xlbl").map(xOf).forEach((x) => {
      const dentro = bg.filter((b) => x >= b.x - 0.01 && x <= b.x + b.w + 0.01).length;
      assert.equal(dentro, 1, "cada subdominio en exactamente una banda (pestaña " + tab + ")");
    });
    // Ningún número de dominio se repite => ningún dominio fragmentado en 2 bandas.
    const nums = c.byClass(svg, "dom-band-lbl").map((n) => n.textContent.split(" ")[0]);
    assert.equal(new Set(nums).size, nums.length, "ningún dominio fragmentado (pestaña " + tab + ")");
    assert.equal(nums.length, bg.length, "una etiqueta de dominio por banda");
  });
});

test("eje X: la unificada agrupa por dominio en el orden exacto de la estructura", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.unificada);
  const nums = c.byClass(c.current(), "dom-band-lbl").map((n) => n.textContent.split(" ")[0]);
  // Secuencia esperada = run-length-encode de los dominios de los subdominios de agregación.
  const doms = [];
  app.E.dominios.forEach((d) => d.subdominios.forEach((s) => { if (s.agregacion) doms.push(d.num); }));
  const esperado = [];
  doms.forEach((d) => { if (!esperado.length || esperado[esperado.length - 1] !== d) esperado.push(d); });
  assert.deepEqual(nums, esperado, "secuencia de dominios = RLE de la estructura");
});

test("eje X: nombres de dominio y subdominio COMPLETOS, sin truncar (para reportes)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.cognoscitivas);
  const svg = c.current();
  // Nombre de dominio completo (rotado), uno por grupo, sin elipsis.
  const domNames = c.byClass(svg, "dom-name").map((n) => n.textContent);
  assert.equal(domNames.length, 9, "un nombre de dominio por grupo");
  domNames.forEach((t) => assert.ok(!/…/.test(t), "dominio sin elipsis: " + t));
  assert.ok(domNames.includes("1 · Habilidades construccionales"), "nombre de dominio completo");
  // Nombres de subdominio completos, sin elipsis (antes se truncaban a 20).
  const xlbls = c.byClass(svg, "xlbl").map((n) => n.textContent);
  xlbls.forEach((t) => assert.ok(!/…/.test(t), "subdominio sin elipsis: " + t));
  assert.ok(xlbls.includes("Memoria verbal-auditiva"), "subdominio completo presente");
});

test("puntos: muestran estándar y percentil cuando el valor los trae", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  const sub = app.E.dominios[0].subdominios[0].id; // "1.1"
  app.E.charts.actualizar({ [sub]: { estandar: 115, percentil: 84 } }, EJE);
  const svg = c.current();
  assert.equal(c.byClass(svg, "punto").length, 1);
  assert.ok(c.byClass(svg, "pt-est").map((n) => n.textContent).includes("115"), "muestra la estándar");
  assert.ok(c.byClass(svg, "pt-pct").map((n) => n.textContent).includes("84"), "muestra el percentil");
});

test("fondo: rangos cualitativos (clasificaciones) + líneas de corte", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE); // eje 55..145 -> los 6 rangos y 5 cortes caen dentro
  const svg = c.current();
  const clasifs = c.byClass(svg, "rango-lbl").map((n) => n.textContent);
  ["Muy bajo", "Límite", "Promedio bajo", "Normal o promedio", "Promedio alto", "Superior"]
    .forEach((cl) => assert.ok(clasifs.includes(cl), "rango presente: " + cl));
  assert.equal(c.byClass(svg, "corte").length, 5, "cortes en estándar 70/80/90/110/115");
});

test("ancho del SVG escala con el número de subdominios", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const anchos = {};
  Object.entries(TAB).forEach(([nombre, i]) => {
    c.selectTab(i);
    anchos[nombre] = Number(c.current().getAttribute("width"));
  });
  assert.ok(anchos.ejecutivas < anchos.academicas, "4 subs < 9 subs");
  assert.ok(anchos.academicas < anchos.cognoscitivas, "9 subs < 17 subs");
  assert.ok(anchos.cognoscitivas < anchos.unificada, "la unificada es la más ancha");
});

test("todos los subdominios de agregación aparecen en la unificada", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.unificada);
  const xlbls = c.byClass(c.current(), "xlbl");
  const esperados = [];
  app.E.dominios.forEach((d) => d.subdominios.forEach((s) => { if (s.agregacion) esperados.push(s.id); }));
  assert.equal(xlbls.length, esperados.length, "una etiqueta por subdominio de agregación");
});

test("notación de piso del Manual (\"<51\") se grafica y conserva su etiqueta", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  // Un valor por debajo del mínimo del eje, en notación de piso.
  const sub = app.E.dominios[0].subdominios[0].id; // "1.1"
  app.E.charts.actualizar({ [sub]: "<51" }, EJE);
  const svg = c.current();
  const puntos = c.byClass(svg, "punto");
  assert.equal(puntos.length, 1, "se grafica el punto pese a estar bajo el mínimo");
  const etiquetas = c.texts(svg).map((n) => n.textContent);
  assert.ok(etiquetas.includes("<51"), "la etiqueta conserva la notación original");
});

test("notación de piso por debajo de (min-50) NO se grafica", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  const sub = app.E.dominios[0].subdominios[0].id; // "1.1"
  // Umbral de graficado: num >= ejeY.min - 50. Con eje 55..145 => 3 < 5 => omitido.
  app.E.charts.actualizar({ [sub]: "<3" }, EJE);
  assert.equal(c.byClass(c.current(), "punto").length, 0, "3 < min-50: no se grafica");
});

test("estado vacío cuando no hay datos", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  app.E.charts.actualizar({}, EJE);
  const svg = c.current();
  assert.equal(c.byClass(svg, "punto").length, 0, "sin puntos");
  const textos = c.texts(svg).map((n) => n.textContent);
  assert.ok(textos.some((t) => /Sin datos/.test(t)), "muestra el mensaje de estado vacío");
});

test("init es idempotente respecto al set de pestañas esperado", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  const titulos = c.tabs.children.map((b) => b.textContent);
  assert.deepEqual(titulos, [
    "Funciones cognoscitivas",
    "Funciones ejecutivas",
    "Habilidades de rendimiento académico",
    "Unificada (todos los subdominios)"
  ]);
});

/* ---------- Rediseño visual (marcado): título, etiquetas horizontales, compacidad ---------- */

test("título del perfil dentro del SVG (imagen autoexplicativa para reportes)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  const esperado = {
    [TAB.cognoscitivas]: "Funciones cognoscitivas",
    [TAB.ejecutivas]: "Funciones ejecutivas",
    [TAB.academicas]: "Habilidades de rendimiento académico",
    [TAB.unificada]: "Unificada (todos los subdominios)"
  };
  Object.keys(esperado).forEach((tab) => {
    c.selectTab(Number(tab));
    const tit = c.byClass(c.current(), "perfil-titulo").map((n) => n.textContent);
    assert.ok(tit.includes(esperado[tab]), "título presente: " + esperado[tab]);
  });
});

test("eje X: etiquetas de subdominio y dominio HORIZONTALES (sin rotar), centradas", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.cognoscitivas);
  const svg = c.current();
  const comprobar = (cls) => c.byClass(svg, cls).forEach((n) => {
    assert.equal(anchorOf(n), "middle", cls + " centrada");
    assert.ok(!n.getAttribute("transform"), cls + " sin rotación");
  });
  comprobar("xlbl");
  comprobar("dom-name");
});

test("etiquetas largas se envuelven en varias líneas conservando el texto exacto", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.ejecutivas);
  const svg = c.current();
  // "Planeación y organización" no cabe en una columna -> debe partirse en >1 <tspan>
  const larga = c.byClass(svg, "xlbl").find((n) => n.textContent === "Planeación y organización");
  assert.ok(larga, "subdominio largo presente con su texto íntegro");
  assert.ok(larga.children.length > 1, "se envolvió en varias líneas (tspans)");
  // Cada línea es una <tspan>; su concatenación reproduce el nombre original (sin recortes).
  assert.ok(larga.children.every((ts) => ts.tag === "tspan"));
});

test("eje X: ninguna línea de etiqueta desborda el ancho de columna (antisolape)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  // Incluye nombres con palabras muy largas ("metalingüísticas", "sobrepuestas"): el
  // corte duro debe mantener cada línea dentro del presupuesto de la columna (~9 chars).
  [TAB.cognoscitivas, TAB.academicas, TAB.unificada].forEach((tab) => {
    c.selectTab(tab);
    c.byClass(c.current(), "xlbl").forEach((n) => {
      n.children.forEach((ts) => {
        assert.ok(ts.textContent.length <= 12,
          "línea de subdominio acotada a la columna (pestaña " + tab + "): «" + ts.textContent + "»");
      });
    });
  });
});

test("exportarPNG: API presente y segura sin entorno de canvas (no lanza)", () => {
  const app = createApp(FILES.charts);
  const c = renderCharts(app);
  app.E.charts.actualizar({}, EJE);
  assert.equal(typeof app.E.charts.exportarPNG, "function");
  // En el harness no hay window.getComputedStyle -> no exporta, pero NO debe lanzar.
  assert.doesNotThrow(() => {
    assert.equal(app.E.charts.exportarPNG(), false, "sin canvas devuelve false");
  });
});

test("compacidad: pocas columnas NO generan hueco vertical excesivo (antirregresión)", () => {
  const { app, vals } = conValores();
  const c = renderCharts(app);
  app.E.charts.actualizar(vals, EJE);
  c.selectTab(TAB.ejecutivas);
  const h = Number(c.current().getAttribute("height"));
  // Antes del rediseño el doble tier rotado llevaba la altura a ~600+. Cota de guarda.
  assert.ok(h < 520, "altura de ejecutivas acotada (obtenida " + h + ")");
});
