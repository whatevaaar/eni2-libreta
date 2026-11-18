/*
 * Persistencia de correcciones (store.js): CRUD por tipo, conteo, export/import
 * (reemplazar/fusionar), limpieza y normalización de entrada corrupta.
 * Nunca persiste datos del evaluado: solo correcciones + prefs.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, FILES } = require("../harness.js");

test("escalar: set/get y borrado con null", () => {
  const { E } = createApp(FILES.store);
  assert.equal(E.store.getEscalar("7", "X", "4"), null);
  E.store.setEscalar("7", "X", "4", { escalar: 9, percentil: 37 });
  assert.deepEqual(E.store.getEscalar("7", "X", "4"), { escalar: 9, percentil: 37 });
  E.store.setEscalar("7", "X", "4", null);
  assert.equal(E.store.getEscalar("7", "X", "4"), null, "null elimina la clave");
});

test("apendiceD y compartida: set/get", () => {
  const { E } = createApp(FILES.store);
  E.store.setApendiceD("tc", "10", { estandar: 100, percentil: 50 });
  assert.deepEqual(E.store.getApendiceD("tc", "10"), { estandar: 100, percentil: 50 });
  E.store.setCompartida(10, { percentil: 50, t: 50 });
  assert.deepEqual(E.store.getCompartida(10), { percentil: 50, t: 50 });
  assert.deepEqual(E.store.getCompartida("10"), { percentil: 50, t: 50 }, "clave normaliza a String");
});

test("prefs: get con default y set", () => {
  const { E } = createApp(FILES.store);
  assert.equal(E.store.getPref("ejeY", "def"), "def");
  E.store.setPref("ejeY", { min: 55, max: 145 });
  assert.deepEqual(E.store.getPref("ejeY", null), { min: 55, max: 145 });
});

test("conteo: cuenta correcciones (no prefs)", () => {
  const { E } = createApp(FILES.store);
  E.store.setEscalar("7", "X", "4", { escalar: 9 });
  E.store.setApendiceD("tc", "10", { estandar: 100 });
  E.store.setCompartida(10, { percentil: 50 });
  E.store.setPref("ejeY", { min: 55 });
  assert.equal(E.store.conteo(), 3, "prefs no suma al conteo");
});

test("persistencia real en localStorage (mock) entre instancias", () => {
  const { E } = createApp(FILES.store);
  E.store.setEscalar("9", "Z", "3", { escalar: 12 });
  const raw = E.store.exportarJSON();
  const obj = JSON.parse(raw);
  assert.deepEqual(obj.escalar["9|Z|3"], { escalar: 12 });
  assert.ok(obj.actualizado, "marca de tiempo de actualización");
});

test("importarJSON: reemplazar (default) descarta lo previo", () => {
  const { E } = createApp(FILES.store);
  E.store.setEscalar("7", "X", "4", { escalar: 9 });
  const n = E.store.importarJSON(JSON.stringify({
    escalar: { "1|A|1": { escalar: 1 } }, apendiceD: {}, compartida: {}, prefs: {}
  }));
  assert.equal(n, 1);
  assert.equal(E.store.getEscalar("7", "X", "4"), null, "lo previo se reemplazó");
  assert.deepEqual(E.store.getEscalar("1", "A", "1"), { escalar: 1 });
});

test("importarJSON: fusionar conserva lo previo y agrega lo nuevo", () => {
  const { E } = createApp(FILES.store);
  E.store.setEscalar("7", "X", "4", { escalar: 9 });
  const n = E.store.importarJSON(JSON.stringify({
    escalar: { "1|A|1": { escalar: 1 } }, apendiceD: {}, compartida: {}, prefs: {}
  }), "fusionar");
  assert.equal(n, 2);
  assert.deepEqual(E.store.getEscalar("7", "X", "4"), { escalar: 9 });
  assert.deepEqual(E.store.getEscalar("1", "A", "1"), { escalar: 1 });
});

test("importarJSON: normaliza entrada corrupta (JSON válido, estructura mala)", () => {
  const { E } = createApp(FILES.store);
  const n = E.store.importarJSON(JSON.stringify({ escalar: "no-es-objeto", basura: 123 }));
  assert.equal(n, 0, "campos inválidos se descartan");
});

test("importarJSON: texto no-JSON lanza (contrato que la UI captura en ui.js)", () => {
  // store.importarJSON no atrapa el SyntaxError de JSON.parse a propósito: el handler
  // de importación en ui.js lo envuelve en try/catch y avisa "Archivo inválido".
  const { E } = createApp(FILES.store);
  assert.throws(() => E.store.importarJSON("{ roto"), SyntaxError);
});

test("limpiar: deja el estado vacío", () => {
  const { E } = createApp(FILES.store);
  E.store.setEscalar("7", "X", "4", { escalar: 9 });
  E.store.limpiar();
  assert.equal(E.store.conteo(), 0);
});
