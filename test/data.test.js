/*
 * Integridad del dato-maestro: estructura (dominios/subdominios/pruebas),
 * tabla compartida, Apéndice D y correcciones base. Protege contra ediciones
 * manuales que rompan invariantes de las que depende el motor y las gráficas.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, FILES } = require("../harness.js");

function subsAgregacion(E) {
  const out = [];
  E.dominios.forEach((d) => d.subdominios.forEach((s) => { if (s.agregacion) out.push({ dom: d, sub: s }); }));
  return out;
}

test("estructura: ids de subdominio únicos", () => {
  const { E } = createApp(FILES.structure);
  const ids = [];
  E.dominios.forEach((d) => d.subdominios.forEach((s) => ids.push(s.id)));
  assert.equal(new Set(ids).size, ids.length, "sin ids de subdominio duplicados");
});

test("estructura: todo subdominio de agregación tiene dcol no vacío y único", () => {
  const { E } = createApp(FILES.structure);
  const dcols = subsAgregacion(E).map(({ sub }) => sub.dcol);
  dcols.forEach((d) => assert.ok(typeof d === "string" && d.length > 0, "dcol presente: " + d));
  assert.equal(new Set(dcols).size, dcols.length, "dcol únicos entre nodos de agregación");
});

test("estructura: toda prueba tiene id, nombre y flags booleanos coherentes", () => {
  const { E } = createApp(FILES.structure);
  E.dominios.forEach((d) => d.subdominios.forEach((s) => s.pruebas.forEach((p) => {
    assert.ok(p.id && p.nombre, "id y nombre: " + p.id);
    assert.equal(typeof p.asterisco, "boolean", "asterisco booleano en " + p.id);
    assert.ok(p.norma === true || p.norma === false || p.norma === "verificar", "norma válida en " + p.id);
  })));
});

test("estructura: 30 subdominios de agregación", () => {
  // Nodos con agregacion:true. De estos, 28 tienen tabla en el Apéndice D; flexibilidad
  // y planeacion no (columnas de tiempo no mapeadas — verificación en punto de uso).
  const { E } = createApp(FILES.structure);
  assert.equal(subsAgregacion(E).length, 30);
});

test("compartida: escalares 1..19 con percentil y T", () => {
  const { E } = createApp(FILES.shared);
  for (let e = 1; e <= 19; e++) {
    const row = E.compartida[String(e)];
    assert.ok(row, "existe escalar " + e);
    assert.equal(typeof row.percentil, "number");
    assert.equal(typeof row.t, "number");
  }
  assert.equal(E.compartida["10"].percentil, 50, "media escolar -> percentil 50");
  assert.equal(E.compartida["10"].t, 50);
});

test("apendiceD: subdominios de 1 prueba son exactos (estandar = 100 + (escalar-10)*5)", () => {
  const { E } = createApp(FILES.appendixD);
  const tabla = E.apendiceD["construccion_palillos"];
  const byS = {};
  tabla.forEach((r) => { byS[r.s] = r; });
  assert.equal(byS[10].estandar, 100);
  assert.equal(byS[19].estandar, 145);
  assert.equal(byS[1].estandar, 55);
  assert.equal(byS[13].estandar, 115);
});

test("apendiceD: cada columna tiene filas con s/estandar numéricos", () => {
  const { E } = createApp(FILES.appendixD);
  Object.entries(E.apendiceD).forEach(([dcol, filas]) => {
    assert.ok(Array.isArray(filas) && filas.length > 0, "columna no vacía: " + dcol);
    filas.forEach((r) => {
      assert.equal(typeof r.s, "number", "suma numérica en " + dcol);
      assert.ok(typeof r.estandar === "number" || typeof r.estandar === "string", "estandar presente en " + dcol);
    });
  });
});

test("apendiceD: cada columna corresponde a un dcol de agregación o a un alias", () => {
  const { E } = createApp(FILES.data);
  const validas = new Set(subsAgregacion(E).map(({ sub }) => sub.dcol));
  (E.aliases || []).forEach((a) => validas.add(a.aliasId)); // p.ej. razonamiento_logico_matematico
  Object.keys(E.apendiceD).forEach((col) => {
    assert.ok(validas.has(col), "columna D sin subdominio/alias: " + col);
  });
});

test("apendiceD: 29 columnas = 28 dcols de agregación + 1 alias; sin tabla solo flexibilidad/planeacion", () => {
  const { E } = createApp(FILES.data);
  const cols = new Set(Object.keys(E.apendiceD));
  const dcols = subsAgregacion(E).map(({ sub }) => sub.dcol);
  const conTabla = dcols.filter((d) => cols.has(d));
  const sinTabla = dcols.filter((d) => !cols.has(d));
  assert.equal(cols.size, 29, "29 columnas en Apéndice D");
  assert.equal(conTabla.length, 28, "28 subdominios de agregación con tabla D");
  assert.deepEqual(sinTabla.sort(), ["flexibilidad", "planeacion"], "solo estos dos sin tabla");
});

test("correccionesBase: claves bien formadas (escalar=3 campos, apendiceD=2)", () => {
  const { E } = createApp(FILES.data);
  Object.keys(E.correccionesBase.escalar).forEach((k) => {
    assert.equal(k.split("|").length, 3, "clave escalar <banda>|<prueba>|<bruto>: " + k);
  });
  Object.keys(E.correccionesBase.apendiceD).forEach((k) => {
    assert.equal(k.split("|").length, 2, "clave apendiceD <dcol>|<suma>: " + k);
    const dcol = k.split("|")[0];
    const dcols = new Set(subsAgregacion(E).map(({ sub }) => sub.dcol));
    assert.ok(dcols.has(dcol), "correccionesBase.apendiceD referencia dcol real: " + dcol);
  });
});
