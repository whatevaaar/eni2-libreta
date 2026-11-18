/*
 * Motor de cálculo (engine.js): reglas de borde, prioridad de correcciones,
 * agregación por subdominio y Apéndice D. Datos sintéticos inyectados para que
 * los casos de borde sean deterministas (independientes del baremo auto-extraído).
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, FILES } = require("../harness.js");

// App de motor con una tabla bruto->escalar controlada (banda "7", prueba "X").
// Filas (escalar e, rango bruto [min,max]):
//   e1:[0,2]  e5:[3,5]  e10:[6,8]  e15:[12,15]
// Hueco deliberado 9..11 (entre 8 y 12) para probar "hueco_inferior".
function appEngine() {
  const app = createApp(FILES.engine);
  app.E.tablas = { "7": { pruebas: { "X": { escalares: [
    { e: 10, min: 6, max: 8 },
    { e: 1, min: 0, max: 2 },
    { e: 15, min: 12, max: 15 },
    { e: 5, min: 3, max: 5 }
  ] } } } };
  return app;
}

test("edadValida / bandaDeEdad: límites y rangos inválidos", () => {
  const { E } = createApp(FILES.engine);
  assert.equal(E.engine.edadValida(5, 0), true);
  assert.equal(E.engine.edadValida(16, 11), true);
  assert.equal(E.engine.edadValida(4, 11), false, "por debajo del mínimo");
  assert.equal(E.engine.edadValida(17, 0), false, "por encima del máximo");
  assert.equal(E.engine.edadValida(5, 12), false, "meses > 11");
  assert.equal(E.engine.edadValida(5, -1), false, "meses < 0");
  assert.equal(E.engine.edadValida(NaN, 0), false);
  assert.equal(E.engine.bandaDeEdad(9, 7), "9", "banda = año cumplido");
  assert.equal(E.engine.bandaDeEdad(16, 11), "16");
  assert.equal(E.engine.bandaDeEdad(4, 0), null, "edad inválida -> null");
});

test("filasPrueba: normaliza min/max intercambiados y ordena asc", () => {
  const app = createApp(FILES.engine);
  app.E.tablas = { "7": { pruebas: { "X": { escalares: [
    { e: 10, min: 8, max: 6 }, // invertido
    { e: 1, max: 2 }           // solo max
  ] } } } };
  const filas = app.E.engine.filasPrueba("7", "X");
  assert.deepEqual(filas.map((f) => f.e), [1, 10], "ordenadas por min asc");
  assert.deepEqual(filas[1], { e: 10, min: 6, max: 8 }, "min/max normalizados");
});

test("brutoAEscalar: bruto por debajo del mínimo -> escalar mínimo (bajo_minimo)", () => {
  const r = appEngine().E.engine.brutoAEscalar("7", "X", -3);
  assert.equal(r.escalar, 1);
  assert.equal(r.borde, "bajo_minimo");
});

test("brutoAEscalar: bruto en/por encima del máximo -> última fila (sobre_maximo)", () => {
  const E = appEngine().E;
  assert.equal(E.engine.brutoAEscalar("7", "X", 99).escalar, 15);
  assert.equal(E.engine.brutoAEscalar("7", "X", 99).borde, "sobre_maximo");
  const borde = E.engine.brutoAEscalar("7", "X", 15); // exacto en el máximo: sin borde
  assert.equal(borde.escalar, 15);
  assert.equal(borde.borde, null);
});

test("brutoAEscalar: bruto en hueco -> fila inmediatamente inferior (hueco_inferior)", () => {
  const r = appEngine().E.engine.brutoAEscalar("7", "X", 10); // 9..11 no existe
  assert.equal(r.escalar, 10, "usa la fila [6,8]");
  assert.equal(r.borde, "hueco_inferior");
});

test("brutoAEscalar: coincidencia exacta -> sin borde", () => {
  const E = appEngine().E;
  assert.deepEqual(
    [E.engine.brutoAEscalar("7", "X", 4).escalar, E.engine.brutoAEscalar("7", "X", 4).borde],
    [5, null]
  );
});

test("rangoBruto: min/max de la tabla", () => {
  assert.deepEqual(appEngine().E.engine.rangoBruto("7", "X"), { min: 0, max: 15 });
});

test("calcularPrueba: vacío y bruto inválido", () => {
  const E = appEngine().E;
  assert.equal(E.engine.calcularPrueba("7", "X", "").error, "vacio");
  assert.equal(E.engine.calcularPrueba("7", "X", null).error, "vacio");
  assert.equal(E.engine.calcularPrueba("7", "X", "-1").error, "bruto_invalido");
  assert.equal(E.engine.calcularPrueba("7", "X", "abc").error, "bruto_invalido");
});

test("calcularPrueba: escalar auto + percentil/T desde tabla compartida", () => {
  const r = appEngine().E.engine.calcularPrueba("7", "X", "7"); // bruto 7 -> escalar 10
  assert.equal(r.escalar, 10);
  assert.equal(r.fuente, "auto");
  assert.equal(r.percentil, 50, "escalar 10 -> percentil 50 (compartida real)");
  assert.equal(r.t, 50);
});

test("calcularPrueba: bruto fuera de rango levanta aviso pero aplica borde", () => {
  const r = appEngine().E.engine.calcularPrueba("7", "X", "99");
  assert.equal(r.escalar, 15);
  assert.equal(r.aviso, "bruto_fuera_rango");
});

test("calcularPrueba: prioridad correccionesBase > auto", () => {
  const app = appEngine();
  app.E.correccionesBase = { escalar: { "7|X|4": { escalar: 19, percentil: 99, t: 80 } } };
  const r = app.E.engine.calcularPrueba("7", "X", "4");
  assert.equal(r.escalar, 19);
  assert.equal(r.fuente, "correccion");
  assert.equal(r.percentil, 99);
});

test("calcularPrueba: notación de piso NO es válida como bruto de entrada", () => {
  // "<51" es válido como valor de baremo/etiqueta (gráfica), NO como bruto capturado.
  const r = appEngine().E.engine.calcularPrueba("7", "X", "<51");
  assert.equal(r.error, "bruto_invalido");
});

test("calcularPrueba: corrección parcial {percentil} sin escalar — contrato ACTUAL (latente)", () => {
  // Hallazgo: si la corrección trae percentil pero no escalar, el motor usa el escalar
  // AUTO (10) y sobrescribe el percentil con el de la corrección (99) -> queda mezcla
  // escalar-auto + percentil-corrección. Fijamos el comportamiento actual para detectar
  // cambios; está pendiente decidir si debería ser coherente.
  const app = appEngine();
  app.E.store = { getEscalar: () => ({ percentil: 99 }), getApendiceD: () => null, getCompartida: () => null };
  const r = app.E.engine.calcularPrueba("7", "X", "7"); // bruto 7 -> escalar auto 10
  assert.equal(r.escalar, 10);
  assert.equal(r.percentil, 99);
  assert.equal(r.fuente, "auto");
});

test("calcularPrueba: prioridad store (localStorage) > correccionesBase", () => {
  const app = appEngine();
  app.E.correccionesBase = { escalar: { "7|X|4": { escalar: 19, percentil: 99 } } };
  app.E.store = {
    getEscalar: (b, p, br) => (b === "7" && p === "X" && br === "4" ? { escalar: 7, percentil: 16 } : null),
    getApendiceD: () => null,
    getCompartida: () => null
  };
  const r = app.E.engine.calcularPrueba("7", "X", "4");
  assert.equal(r.escalar, 7, "gana la corrección del usuario");
  assert.equal(r.percentil, 16);
});

test("sumaSubdominio: excluye asterisco y norma=false; reporta faltantes", () => {
  const { E } = createApp(FILES.engine);
  const sub = { pruebas: [
    { id: "a" },
    { id: "b", asterisco: true },
    { id: "c", norma: false },
    { id: "d" },
    { id: "e" } // tiene bruto pero sin escalar -> faltante
  ] };
  const res = E.engine.sumaSubdominio(sub, {
    a: { escalar: 10 },
    b: { escalar: 9 },   // asterisco: se calcula pero no suma
    c: { escalar: 8 },   // norma false: no suma
    d: { escalar: 7 },
    e: { escalar: null, bruto: "5" }
  });
  assert.equal(res.suma, 17, "solo a + d");
  assert.deepEqual(res.incluidas.sort(), ["a", "d"]);
  assert.deepEqual(res.excluidas.sort(), ["b", "c"]);
  assert.deepEqual(res.faltantes, ["e"]);
});

test("apendiceD: reglas de borde (bajo/sobre/exacto/inferior)", () => {
  const { E } = createApp(FILES.engine);
  E.apendiceD = { tc: [
    { s: 5, estandar: 75, percentil: 5, t: 33 },
    { s: 10, estandar: 100, percentil: 50, t: 50 },
    { s: 19, estandar: 145, percentil: 99, t: 80 }
  ] };
  assert.equal(E.engine.apendiceD("tc", 3).estandar, 75); // bajo_minimo
  assert.equal(E.engine.apendiceD("tc", 3).borde, "bajo_minimo");
  assert.equal(E.engine.apendiceD("tc", 25).estandar, 145); // sobre_maximo
  assert.equal(E.engine.apendiceD("tc", 25).borde, "sobre_maximo");
  assert.equal(E.engine.apendiceD("tc", 10).estandar, 100); // exacto
  assert.equal(E.engine.apendiceD("tc", 7).estandar, 75, "cae entre 5 y 10 -> inferior");
  // Asimetría con Apéndice B: D selecciona la fila inferior pero NO etiqueta "hueco_inferior".
  assert.equal(E.engine.apendiceD("tc", 7).borde, null, "D no marca hueco_inferior");
});

test("apendiceD: prioridad correccionesBase > auto", () => {
  const { E } = createApp(FILES.engine);
  E.apendiceD = { tc: [{ s: 10, estandar: 100, percentil: 50, t: 50 }] };
  E.correccionesBase = { apendiceD: { "tc|10": { estandar: 111, percentil: 77 } } };
  const r = E.engine.apendiceD("tc", 10);
  assert.equal(r.estandar, 111);
  assert.equal(r.fuente, "correccion");
});
