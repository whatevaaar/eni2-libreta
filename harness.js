/*
 * ENI-2 · Harness de pruebas (sin dependencias).
 *
 * La app corre en el navegador con globals (window.ENI2, document, localStorage).
 * Aquí cargamos los MISMOS archivos fuente ejecutándolos vía `new Function(...)` con
 * esos globals inyectados como parámetros (mismo realm que las pruebas, mocks mínimos
 * de DOM y localStorage), para ejercitar engine/charts/store tal cual corren en
 * producción (sin reimplementar nada). Mismo realm = assert.deepStrictEqual sin
 * problemas de prototipos cruzados.
 *
 * createApp(files) -> { E, window, document, localStorage } con window/document/
 * localStorage nuevos por llamada (estado aislado entre pruebas).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

// ---- Nodo DOM mock (lo justo para charts.js) ----
function makeNode(tag) {
  const node = {
    tag,
    attrs: {},
    children: [],
    _text: null,
    _cls: "",
    _listeners: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(n) { this.children.push(n); return n; },
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    dispatch(ev) { (this._listeners[ev] || []).forEach((fn) => fn.call(node, {})); }
  };
  Object.defineProperty(node, "textContent", {
    // Fiel al DOM real: un nodo hoja devuelve su texto; uno con hijos (p.ej. <text>
    // con varias <tspan>) agrega el texto de su descendencia.
    get() {
      if (node._text != null) return node._text;
      if (node.children.length) return node.children.map((c) => c.textContent || "").join("");
      return node._text;
    },
    set(v) { node._text = v == null ? v : String(v); node.children = []; }
  });
  Object.defineProperty(node, "innerHTML", {
    get() { return ""; },
    set(v) { if (v === "") node.children = []; }
  });
  Object.defineProperty(node, "className", {
    get() { return node._cls; },
    set(v) { node._cls = v; }
  });
  Object.defineProperty(node, "classList", {
    get() {
      return {
        add(c) { const s = new Set(node._cls.split(" ").filter(Boolean)); s.add(c); node._cls = [...s].join(" "); },
        remove(c) { const s = new Set(node._cls.split(" ").filter(Boolean)); s.delete(c); node._cls = [...s].join(" "); },
        contains(c) { return node._cls.split(" ").includes(c); }
      };
    }
  });
  return node;
}

function makeDocument() {
  return {
    createElementNS(ns, tag) { return makeNode(tag); },
    createElement(tag) { return makeNode(tag); }
  };
}

function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    _map: m
  };
}

function createApp(files) {
  const window = {};
  const document = makeDocument();
  const localStorage = makeLocalStorage();
  // Ejecutamos cada archivo en el MISMO realm que las pruebas (globals inyectados
  // como parámetros). Así los objetos que crea la app comparten Object/Array/Date
  // con el test y assert.deepStrictEqual funciona sin problemas de realm cruzado.
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8");
    const run = new Function("window", "document", "localStorage", "console", code + "\n//# sourceURL=" + f);
    run(window, document, localStorage, console);
  }
  return { E: window.ENI2, window, document, localStorage };
}

// ---- Utilidades para charts (render + consulta del SVG) ----
function renderCharts(app) {
  const { E, document } = app;
  const tabs = document.createElement("div");
  const cont = document.createElement("div");
  E.charts.init(tabs, cont);

  function current() { return cont.children[cont.children.length - 1]; }
  function selectTab(i) { tabs.children[i].dispatch("click"); }
  function walk(node, acc) {
    acc = acc || [];
    (node.children || []).forEach((c) => { acc.push(c); walk(c, acc); });
    return acc;
  }
  function byClass(root, cls) {
    return walk(root).filter((n) => (n.attrs.class || "").split(" ").includes(cls));
  }
  function texts(root) { return walk(root).filter((n) => n.tag === "text"); }

  return { tabs, cont, current, selectTab, walk, byClass, texts };
}

// Conjuntos de archivos reutilizables.
const FILES = {
  structure: ["js/datos/estructura.js"],
  shared: ["js/datos/compartida.js"],
  appendixD: ["js/datos/apendiceD.js"],
  corrections: ["js/datos/correcciones.js"],
  engine: ["js/datos/estructura.js", "js/datos/compartida.js", "js/engine.js"],
  charts: ["js/datos/estructura.js", "js/datos/compartida.js", "js/charts.js"],
  store: ["js/store.js"],
  data: ["js/datos/estructura.js", "js/datos/compartida.js", "js/datos/apendiceD.js", "js/datos/correcciones.js"]
};

module.exports = { createApp, renderCharts, makeNode, FILES, ROOT };
