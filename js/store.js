/*
 * ENI-2 · Persistencia de CORRECCIONES a los baremos (no datos personales).
 *
 * Qué se persiste (localStorage, sobrevive a refresh / cierre del navegador):
 *   - Correcciones de bruto->escalar por (banda de edad, prueba, bruto).
 *   - Correcciones de suma->(estándar, percentil) del Apéndice D por (dcol, suma).
 *   - Correcciones de la tabla compartida escalar->(percentil, T).
 *   - Ajustes de preferencia no personales (p.ej. rango del eje Y).
 *
 * Qué NO se persiste aquí: edad del evaluado ni puntajes brutos capturados
 * (datos personales) — esos viven solo en memoria durante la sesión.
 *
 * Respaldo: exportarJSON()/importarJSON() permiten guardar/restaurar las
 * correcciones en un archivo, porque localStorage es por-navegador.
 */
(function () {
  "use strict";
  window.ENI2 = window.ENI2 || {};

  var KEY = "eni2.correcciones.v1";

  function cargar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return estructuraVacia();
      var obj = JSON.parse(raw);
      return normaliza(obj);
    } catch (e) {
      console.warn("No se pudieron leer las correcciones:", e);
      return estructuraVacia();
    }
  }

  function estructuraVacia() {
    return {
      version: 1,
      actualizado: null,
      escalar: {},   // clave: `${banda}|${pruebaId}|${bruto}` -> { escalar, percentil, nota }
      apendiceD: {}, // clave: `${dcol}|${suma}`             -> { estandar, percentil, nota }
      compartida: {},// clave: `${escalar}`                  -> { percentil, t, nota }
      prefs: {}      // preferencias no personales (p.ej. ejeY)
    };
  }

  function normaliza(obj) {
    var base = estructuraVacia();
    if (obj && typeof obj === "object") {
      ["escalar", "apendiceD", "compartida", "prefs"].forEach(function (k) {
        if (obj[k] && typeof obj[k] === "object") base[k] = obj[k];
      });
      if (obj.version) base.version = obj.version;
      if (obj.actualizado) base.actualizado = obj.actualizado;
    }
    return base;
  }

  var estado = cargar();
  var suscriptores = [];

  function guardar() {
    estado.actualizado = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(estado));
    } catch (e) {
      console.error("No se pudieron guardar las correcciones (¿localStorage lleno o bloqueado?):", e);
      notificarError(e);
    }
    suscriptores.forEach(function (fn) { try { fn(estado); } catch (_) {} });
  }

  function notificarError(e) {
    if (typeof window.ENI2.onStoreError === "function") window.ENI2.onStoreError(e);
  }

  // --- API de correcciones ---

  function claveEscalar(banda, pruebaId, bruto) {
    return banda + "|" + pruebaId + "|" + bruto;
  }

  var store = {
    estado: function () { return estado; },

    onCambio: function (fn) { suscriptores.push(fn); },

    // bruto -> escalar (corrección puntual)
    getEscalar: function (banda, pruebaId, bruto) {
      return estado.escalar[claveEscalar(banda, pruebaId, bruto)] || null;
    },
    setEscalar: function (banda, pruebaId, bruto, valor) {
      var k = claveEscalar(banda, pruebaId, bruto);
      if (valor == null) delete estado.escalar[k];
      else estado.escalar[k] = valor;
      guardar();
    },

    // suma de escalares -> estándar/percentil (Apéndice D)
    getApendiceD: function (dcol, suma) {
      return estado.apendiceD[dcol + "|" + suma] || null;
    },
    setApendiceD: function (dcol, suma, valor) {
      var k = dcol + "|" + suma;
      if (valor == null) delete estado.apendiceD[k];
      else estado.apendiceD[k] = valor;
      guardar();
    },

    // escalar -> percentil/T (tabla compartida)
    getCompartida: function (escalar) {
      return estado.compartida[String(escalar)] || null;
    },
    setCompartida: function (escalar, valor) {
      var k = String(escalar);
      if (valor == null) delete estado.compartida[k];
      else estado.compartida[k] = valor;
      guardar();
    },

    // preferencias no personales
    getPref: function (k, def) {
      return Object.prototype.hasOwnProperty.call(estado.prefs, k) ? estado.prefs[k] : def;
    },
    setPref: function (k, v) { estado.prefs[k] = v; guardar(); },

    // conteo de correcciones (para indicador en UI)
    conteo: function () {
      return Object.keys(estado.escalar).length +
             Object.keys(estado.apendiceD).length +
             Object.keys(estado.compartida).length;
    },

    // --- Respaldo ---
    exportarJSON: function () {
      return JSON.stringify(estado, null, 2);
    },
    importarJSON: function (texto, modo) {
      // modo: "reemplazar" (default) | "fusionar"
      var obj = normaliza(JSON.parse(texto));
      if (modo === "fusionar") {
        ["escalar", "apendiceD", "compartida", "prefs"].forEach(function (k) {
          Object.keys(obj[k]).forEach(function (kk) { estado[k][kk] = obj[k][kk]; });
        });
      } else {
        estado = obj;
      }
      guardar();
      return store.conteo();
    },
    limpiar: function () { estado = estructuraVacia(); guardar(); }
  };

  window.ENI2.store = store;
})();
