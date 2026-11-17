/* ENI-2 · Gráficas de perfil (SVG, sin dependencias).
 * Eje X = subdominios (unidades de agregación), agrupados visualmente por dominio.
 * Eje Y = Puntuación estándar (media 100, DE 15): percentil a la izquierda,
 * puntuación estándar a la derecha. 3 perfiles de la Libreta + 1 unificada.
 * Eje Y editable + líneas de referencia (±DE). */
(function () {
  "use strict";
  var E = window.ENI2;

  // Mapa subId -> { nombre, dom, domNombre } para etiquetas y agrupación.
  var infoSub = {};
  (E.dominios || []).forEach(function (dom) {
    dom.subdominios.forEach(function (s) { infoSub[s.id] = { nombre: s.nombre, dom: dom.num, domNombre: dom.nombre }; });
  });

  // Definición de los perfiles (orden de subdominios en X, según la Libreta).
  var PERFILES = {
    cognoscitivas: {
      titulo: "Funciones cognoscitivas",
      subs: ["1.1","1.2","2.1","2.2","4.1","4.2","3.1","3.2","3.3","5.1","5.2","5.3","6","10","11.1","11.2","12"]
    },
    ejecutivas: {
      titulo: "Funciones ejecutivas",
      subs: ["13.1","13.2","13.3","13.4"]
    },
    academicas: {
      titulo: "Habilidades de rendimiento académico",
      subs: ["7.1","7.2","7.3","8.1","8.2","8.3","9.1","9.2","9.3"]
    },
    unificada: {
      titulo: "Unificada (todos los subdominios)",
      subs: null // se llena con todos los de agregación
    }
  };
  // unificada = todos los subdominios de agregación en orden de estructura
  PERFILES.unificada.subs = (function () {
    var out = [];
    (E.dominios || []).forEach(function (dom) { dom.subdominios.forEach(function (s) { if (s.agregacion) out.push(s.id); }); });
    return out;
  })();

  // ---------- Puntuación estándar -> percentil (modelo normal, media 100 DE 15) ----------
  // CDF normal (Zelen & Severo, |error| < 7.5e-8). La correspondencia estándar<->percentil
  // es la canónica de la curva normal; en los cortes ±DE da 2/16/50/84/98.
  function cdfNormal(z) {
    var b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937,
        b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419, c = 0.39894228;
    var az = Math.abs(z);
    var t = 1 / (1 + p * az);
    var y = 1 - c * Math.exp(-az * az / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    return z >= 0 ? y : 1 - y;
  }
  function percentilDeEstandar(ss) {
    var m = E.meta.estandar.media, d = E.meta.estandar.de;
    var pc = cdfNormal((ss - m) / d) * 100;
    if (pc < 1) return "<1";
    if (pc > 99) return ">99";
    return String(Math.round(pc));
  }

  var tabsEl, contEl, activo = "cognoscitivas", ultimos = {}, ejeYActual = null;

  function init(tabs, cont) {
    tabsEl = tabs; contEl = cont;
    Object.keys(PERFILES).forEach(function (k) {
      var b = document.createElement("button");
      b.className = "tab" + (k === activo ? " activo" : "");
      b.textContent = PERFILES[k].titulo;
      b.addEventListener("click", function () {
        activo = k;
        Array.prototype.forEach.call(tabsEl.children, function (c) { c.classList.remove("activo"); });
        b.classList.add("activo");
        render();
      });
      tabsEl.appendChild(b);
    });
    render();
  }

  function actualizar(valores, ejeY) { ultimos = valores || {}; ejeYActual = ejeY; render(); }

  function render() {
    if (!contEl) return;
    var p = PERFILES[activo];
    var ejeY = ejeYActual || { min: E.meta.ejeY.min, max: E.meta.ejeY.max, lineas: true, ref: E.meta.ejeY.lineasRef };
    contEl.innerHTML = "";
    contEl.appendChild(svgPerfil(p, ultimos, ejeY));
  }

  // Runs contiguos de subdominios del mismo dominio (para agrupar el eje X).
  function gruposDominio(subs) {
    var grupos = [];
    subs.forEach(function (sid, i) {
      var info = infoSub[sid] || { dom: "", domNombre: "" };
      var ult = grupos[grupos.length - 1];
      if (ult && ult.dom === info.dom) ult.j = i;
      else grupos.push({ dom: info.dom, nombre: info.domNombre || "", i: i, j: i });
    });
    return grupos;
  }

  function truncar(txt, maxChars) {
    return txt.length > maxChars ? txt.slice(0, Math.max(1, maxChars - 1)) + "…" : txt;
  }

  function svgPerfil(perfil, valores, ejeY) {
    var subs = perfil.subs;
    var padL = 54, padR = 54, padT = 20, padB = 164;
    var pasoX = 54, bandH = 20, bandGap = 3;
    var W = padL + padR + Math.max(subs.length, 1) * pasoX;
    var H = 472, plotH = H - padT - padB, plotW = W - padL - padR;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "perfil");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);

    var axisY = padT + plotH;
    var bandY0 = axisY + bandGap, bandY1 = bandY0 + bandH;
    var lblY = bandY1 + 12; // ancla de las etiquetas de subdominio (rotadas)

    function yDe(v) { return padT + plotH * (1 - (v - ejeY.min) / (ejeY.max - ejeY.min)); }
    function xDe(i) { return padL + pasoX * (i + 0.5); }

    function add(tag, attrs, txt) {
      var n = document.createElementNS(ns, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (txt != null) n.textContent = txt;
      svg.appendChild(n); return n;
    }

    // ---------- Agrupación por dominio (eje X) ----------
    var grupos = gruposDominio(subs);
    // Bandas de fondo alternas por dominio (detrás de todo).
    grupos.forEach(function (g, gi) {
      var x0 = xDe(g.i) - pasoX / 2, x1 = xDe(g.j) + pasoX / 2;
      add("rect", { x: x0, y: padT, width: (x1 - x0), height: plotH, class: gi % 2 ? "dom-bg-b" : "dom-bg-a" });
    });

    // ---------- Grid horizontal + etiquetas dobles (percentil / estándar) ----------
    var labeled = {};
    function etiquetaY(v) {
      var y = yDe(v);
      var esMedia = (v === E.meta.estandar.media);
      // Izquierda: percentil
      add("text", { x: padL - 7, y: y + 3, "text-anchor": "end", class: "ylbl-pc" + (esMedia ? " ylbl-media" : "") }, percentilDeEstandar(v));
      // Derecha: puntuación estándar
      add("text", { x: W - padR + 7, y: y + 3, "text-anchor": "start", class: "ylbl-pe" + (esMedia ? " ylbl-media" : "") }, v);
      labeled[v] = true;
    }
    var paso = (ejeY.max - ejeY.min) > 60 ? 10 : 5;
    for (var v = Math.ceil(ejeY.min / paso) * paso; v <= ejeY.max; v += paso) {
      add("line", { x1: padL, y1: yDe(v), x2: W - padR, y2: yDe(v), class: "grid" });
      etiquetaY(v);
    }

    // ---------- Líneas de referencia (media y ±DE) + etiquetas fuera de rejilla ----------
    if (ejeY.lineas && ejeY.ref) {
      ejeY.ref.forEach(function (rv) {
        if (rv < ejeY.min || rv > ejeY.max) return;
        var esMedia = (rv === E.meta.estandar.media);
        add("line", { x1: padL, y1: yDe(rv), x2: W - padR, y2: yDe(rv), class: esMedia ? "ref ref-media" : "ref" });
        if (!labeled[rv]) etiquetaY(rv); // cortes ±DE (85/115) que no caen en la rejilla
      });
    }

    // ---------- Ejes ----------
    add("line", { x1: padL, y1: padT, x2: padL, y2: axisY, class: "eje" });
    add("line", { x1: padL, y1: axisY, x2: W - padR, y2: axisY, class: "eje" });
    // Títulos de eje (qué es cada lado)
    var cy = padT + plotH / 2;
    add("text", { x: 13, y: cy, transform: "rotate(-90 13 " + cy + ")", "text-anchor": "middle", class: "axis-title" }, "Percentil");
    add("text", { x: W - 13, y: cy, transform: "rotate(90 " + (W - 13) + " " + cy + ")", "text-anchor": "middle", class: "axis-title" }, "Puntuación estándar");

    // ---------- Franja de dominios (bajo el eje) + separadores + etiquetas de subdominio ----------
    grupos.forEach(function (g, gi) {
      var x0 = xDe(g.i) - pasoX / 2, x1 = xDe(g.j) + pasoX / 2, w = x1 - x0;
      // Caja de la franja de dominio
      add("rect", { x: x0 + 1.5, y: bandY0, width: Math.max(0, w - 3), height: bandH, rx: 3, class: "dom-band " + (gi % 2 ? "dom-band-b" : "dom-band-a") });
      // Separador entre grupos (del eje a la base de la franja)
      if (gi > 0) add("line", { x1: x0, y1: padT, x2: x0, y2: bandY1, class: "dom-sep" });
      // Etiqueta de dominio: número + nombre, truncado al ancho del grupo (tooltip con nombre completo)
      var full = g.dom + (g.nombre ? " · " + g.nombre : "");
      var maxChars = Math.max(1, Math.floor((w - 8) / 6.1));
      var shown;
      if (maxChars <= g.dom.length + 2) shown = g.dom; // muy angosto: sólo número
      else shown = g.nombre ? g.dom + " · " + truncar(g.nombre, maxChars - (g.dom.length + 3)) : g.dom;
      var t = add("text", { x: (x0 + x1) / 2, y: bandY0 + bandH / 2 + 3.5, "text-anchor": "middle", class: "dom-band-lbl" }, shown);
      var ttl = document.createElementNS(ns, "title"); ttl.textContent = full; t.appendChild(ttl);
    });
    // Separador final (borde derecho del último grupo) para cerrar la franja
    if (grupos.length) add("line", { x1: W - padR, y1: padT, x2: W - padR, y2: bandY1, class: "dom-sep" });

    // Etiquetas de subdominio (nombre corto, rotadas). El dominio ya se indica en la franja.
    subs.forEach(function (sid, i) {
      var info = infoSub[sid] || { nombre: sid };
      var lbl = info.nombre.length > 20 ? info.nombre.slice(0, 19) + "…" : info.nombre;
      var tx = xDe(i);
      var t = add("text", { x: tx, y: lblY, transform: "rotate(55 " + tx + " " + lblY + ")", "text-anchor": "start", class: "xlbl" }, lbl);
      var ttl = document.createElementNS(ns, "title"); ttl.textContent = info.nombre; t.appendChild(ttl);
    });

    // ---------- Puntos + línea (solo donde hay valor) ----------
    var puntos = [];
    subs.forEach(function (sid, i) {
      var val = valores[sid];
      // valor numérico para graficar (acepta notación "<51" -> 51); etiqueta = valor original
      var num = (typeof val === "string") ? parseFloat(val.replace(/[^0-9.\-]/g, "")) : val;
      var tx = xDe(i);
      if (num != null && !isNaN(num) && num >= ejeY.min - 50) {
        var yy = Math.max(padT, Math.min(axisY, yDe(num)));
        puntos.push({ x: tx, y: yy, v: val, sid: sid });
      } else {
        puntos.push(null);
      }
    });
    // segmentos entre puntos consecutivos existentes
    for (var i = 0; i < puntos.length - 1; i++) {
      if (puntos[i] && puntos[i + 1]) {
        add("line", { x1: puntos[i].x, y1: puntos[i].y, x2: puntos[i + 1].x, y2: puntos[i + 1].y, class: "serie" });
      }
    }
    puntos.forEach(function (pt) {
      if (!pt) return;
      add("circle", { cx: pt.x, cy: pt.y, r: 3.5, class: "punto" });
      add("text", { x: pt.x, y: pt.y - 7, "text-anchor": "middle", "font-size": "10", fill: "#1f6feb" }, pt.v);
    });

    if (!puntos.some(Boolean)) {
      add("text", { x: W / 2, y: padT + plotH / 2, "text-anchor": "middle", fill: "#54616e" }, "Sin datos aún: captura brutos y suma por subdominio.");
    }
    return svg;
  }

  E.charts = { init: init, actualizar: actualizar };
})();
