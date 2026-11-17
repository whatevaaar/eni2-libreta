/*
 * ENI-2 · Motor de cálculo (lógica pura, sin DOM).
 *
 * Flujo:
 *  1) Por prueba: bruto -> escalar (tabla de la banda de edad) + percentil/T
 *     (tabla compartida). Reglas de borde según especificación.
 *  2) Por subdominio (nodo de agregación): suma de escalares de sus pruebas,
 *     EXCLUYENDO las marcadas con asterisco; esa suma -> Apéndice D ->
 *     Puntuación estándar + percentil (+ T).
 *
 * Las CORRECCIONES del usuario (ENI2.store) tienen prioridad sobre lo
 * auto-extraído, y son persistentes.
 */
(function () {
  "use strict";
  window.ENI2 = window.ENI2 || {};
  var E = window.ENI2;

  // ---------- Edad / banda ----------
  function edadValida(anios, meses) {
    if (anios == null || meses == null || isNaN(anios) || isNaN(meses)) return false;
    if (meses < 0 || meses > 11) return false;
    var min = E.meta.edadMin, max = E.meta.edadMax;
    var total = anios * 12 + meses;
    return total >= (min.anios * 12 + min.meses) && total <= (max.anios * 12 + max.meses);
  }
  // Banda = año cumplido (5..16). "5" cubre 5;0 a 5;11.
  function bandaDeEdad(anios, meses) {
    if (!edadValida(anios, meses)) return null;
    return String(anios);
  }

  // ---------- Tabla compartida escalar -> percentil/T ----------
  function compartida(escalar) {
    var ov = E.store && E.store.getCompartida(escalar);
    if (ov) return { percentil: ov.percentil, t: ov.t, fuente: "correccion" };
    var base = E.compartida && E.compartida[String(escalar)];
    if (base) return { percentil: base.percentil, t: base.t, fuente: "auto" };
    return { percentil: null, t: null, fuente: "pendiente" };
  }

  // ---------- Normaliza filas de una columna bruto->escalar ----------
  // Cada fila: { e: escalar, min: brutoMin, max: brutoMax }. Devuelve ordenadas asc por min.
  function filasPrueba(banda, pruebaId) {
    var t = E.tablas && E.tablas[banda] && E.tablas[banda].pruebas && E.tablas[banda].pruebas[pruebaId];
    if (!t || !t.escalares || !t.escalares.length) return null;
    var filas = t.escalares.map(function (r) {
      var mn = (r.min != null ? r.min : r.max);
      var mx = (r.max != null ? r.max : r.min);
      return { e: r.e, min: Math.min(mn, mx), max: Math.max(mn, mx) };
    }).filter(function (r) { return r.min != null && !isNaN(r.min); });
    filas.sort(function (a, b) { return a.min - b.min; });
    return filas.length ? filas : null;
  }

  /*
   * bruto -> escalar con reglas de borde:
   *  - R por debajo del mínimo de la tabla  -> escalar mínimo (primera fila).
   *  - R en o por encima del máximo         -> última fila.
   *  - R entre dos valores (hueco)          -> fila inmediatamente inferior.
   * Devuelve { escalar, filaMin, filaMax, borde } o null si no hay tabla.
   */
  function brutoAEscalar(banda, pruebaId, bruto) {
    var filas = filasPrueba(banda, pruebaId);
    if (!filas) return null;
    var R = Number(bruto);
    var minTabla = filas[0].min;
    var ultima = filas[filas.length - 1];
    if (R < minTabla) {
      return { escalar: filas[0].e, filaMin: filas[0].min, filaMax: filas[0].max, borde: "bajo_minimo" };
    }
    // última fila cuyo min <= R
    var elegida = filas[0];
    for (var i = 0; i < filas.length; i++) {
      if (filas[i].min <= R) elegida = filas[i]; else break;
    }
    var borde = null;
    if (R > ultima.max && elegida === ultima) borde = "sobre_maximo";
    else if (R > elegida.max) borde = "hueco_inferior"; // cae en hueco: se usó fila inferior
    return { escalar: elegida.e, filaMin: elegida.min, filaMax: elegida.max, borde: borde };
  }

  // Rango bruto válido de una prueba en una banda (para validación).
  function rangoBruto(banda, pruebaId) {
    var filas = filasPrueba(banda, pruebaId);
    if (!filas) return null;
    return { min: filas[0].min, max: filas[filas.length - 1].max };
  }

  /*
   * Resultado por prueba. `bruto` puede ser "" (vacío).
   * Devuelve un objeto con escalar/percentil/T y metadatos de fuente/validación.
   */
  function calcularPrueba(banda, pruebaId, bruto) {
    var out = {
      pruebaId: pruebaId, bruto: bruto,
      escalar: null, percentil: null, t: null,
      fuente: "pendiente",   // correccion | auto | pendiente
      borde: null, error: null, aviso: null
    };
    if (bruto === "" || bruto == null) { out.error = "vacio"; return out; }
    var R = Number(bruto);
    if (isNaN(R) || R < 0) { out.error = "bruto_invalido"; return out; }

    // 1) corrección persistente tiene prioridad
    var ov = E.store && E.store.getEscalar(banda, pruebaId, String(bruto));
    if (ov && ov.escalar != null) {
      out.escalar = ov.escalar;
      out.fuente = "correccion";
    } else {
      // 2) auto-extraído
      var auto = brutoAEscalar(banda, pruebaId, R);
      if (auto) {
        out.escalar = auto.escalar;
        out.borde = auto.borde;
        out.fuente = "auto";
        // validación de rango: fuera de [min,max] de la tabla
        var rg = rangoBruto(banda, pruebaId);
        if (rg && (R < rg.min || R > rg.max)) {
          out.aviso = "bruto_fuera_rango"; // se aplicó regla de borde
        }
      } else {
        out.fuente = "pendiente"; // no hay tabla extraída para esta prueba/banda
      }
    }

    // percentil/T desde escalar (corrección puntual de escalar puede traer percentil propio)
    if (ov && ov.percentil != null) {
      out.percentil = ov.percentil;
      out.t = (ov.t != null) ? ov.t : (compartida(out.escalar).t);
    } else if (out.escalar != null) {
      var c = compartida(out.escalar);
      out.percentil = c.percentil;
      out.t = c.t;
    }
    return out;
  }

  // ---------- Agregación por subdominio ----------
  // Recorre la estructura y devuelve los nodos de agregación con sus pruebas.
  function nodosAgregacion() {
    var res = [];
    E.dominios.forEach(function (dom) {
      dom.subdominios.forEach(function (sub) {
        if (sub.agregacion) {
          res.push({ dominio: dom, sub: sub, dcol: sub.dcol });
        }
      });
    });
    return res;
  }

  /*
   * Suma de escalares de un subdominio: suma las pruebas con escalar numérico,
   * excluyendo asterisco y no-norma. Devuelve { suma, incluidas:[ids], excluidas:[ids], faltantes:[ids] }.
   * `resultadosPorPrueba`: mapa pruebaId -> resultado de calcularPrueba.
   */
  function sumaSubdominio(sub, resultadosPorPrueba) {
    var suma = 0, incluidas = [], excluidas = [], faltantes = [];
    sub.pruebas.forEach(function (p) {
      var r = resultadosPorPrueba[p.id];
      if (p.asterisco || p.norma === false) {
        if (r && r.escalar != null) excluidas.push(p.id);
        return;
      }
      if (r && r.escalar != null) { suma += Number(r.escalar); incluidas.push(p.id); }
      else if (r && (r.bruto !== "" && r.bruto != null)) faltantes.push(p.id); // tiene bruto pero sin escalar
    });
    return { suma: suma, incluidas: incluidas, excluidas: excluidas, faltantes: faltantes };
  }

  // ---------- Apéndice D: suma de escalares -> estándar + percentil ----------
  // Filas: { s: suma, estandar, percentil, t }. Mismo criterio de borde que escalar.
  function apendiceD(dcol, suma) {
    var out = { estandar: null, percentil: null, t: null, fuente: "pendiente", borde: null };
    var ov = E.store && E.store.getApendiceD(dcol, String(suma));
    if (ov && ov.estandar != null) {
      out.estandar = ov.estandar; out.percentil = ov.percentil; out.t = ov.t; out.fuente = "correccion";
      return out;
    }
    var tabla = E.apendiceD && E.apendiceD[dcol];
    if (!tabla || !tabla.length) return out;
    var filas = tabla.map(function (r) { return { s: Number(r.s), estandar: r.estandar, percentil: r.percentil, t: r.t }; })
                     .sort(function (a, b) { return a.s - b.s; });
    var S = Number(suma);
    var elegida;
    if (S < filas[0].s) { elegida = filas[0]; out.borde = "bajo_minimo"; }
    else {
      elegida = filas[0];
      for (var i = 0; i < filas.length; i++) { if (filas[i].s <= S) elegida = filas[i]; else break; }
      if (S > filas[filas.length - 1].s && elegida === filas[filas.length - 1]) out.borde = "sobre_maximo";
    }
    out.estandar = elegida.estandar; out.percentil = elegida.percentil; out.t = elegida.t; out.fuente = "auto";
    return out;
  }

  E.engine = {
    edadValida: edadValida,
    bandaDeEdad: bandaDeEdad,
    compartida: compartida,
    brutoAEscalar: brutoAEscalar,
    rangoBruto: rangoBruto,
    calcularPrueba: calcularPrueba,
    nodosAgregacion: nodosAgregacion,
    sumaSubdominio: sumaSubdominio,
    apendiceD: apendiceD,
    filasPrueba: filasPrueba
  };
})();
