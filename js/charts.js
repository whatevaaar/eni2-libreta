/* ENI-2 · Gráficas de perfil (SVG, sin dependencias).
 * Eje X = subdominios (unidades de agregación), agrupados por dominio (franja + nombre).
 * Eje Y = Puntuación estándar (media 100, DE 15): percentil a la izquierda, estándar a la
 * derecha. Fondo = rangos cualitativos por percentil (pág. 161 del Manual). En cada punto
 * se muestran estándar y percentil. 3 perfiles de la Libreta + 1 unificada. */
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
  // CDF normal (Zelen & Severo, |error| < 7.5e-8), para ETIQUETAR el eje de forma continua.
  // (El percentil de cada punto es el real del Apéndice D, no este; esto es solo la regla.)
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

  // ---------- Rangos cualitativos por percentil (pág. 161 del Manual) ----------
  // Expresados en puntuación estándar vía la correspondencia del Manual
  // (p2↔70, p9↔80, p26↔90, p75↔110, p84↔115). Cortes elegidos por clínica
  // ("rellenar hacia la categoría superior").
  var RANGOS = [
    { clasif: "Muy bajo",          min: -Infinity, max: 70,       fill: "#f3d7d7" },
    { clasif: "Límite",            min: 70,        max: 80,       fill: "#f7e2cf" },
    { clasif: "Promedio bajo",     min: 80,        max: 90,       fill: "#f8f2cf" },
    { clasif: "Normal o promedio", min: 90,        max: 110,      fill: "#e5f1dd" },
    { clasif: "Promedio alto",     min: 110,       max: 115,      fill: "#dce8f4" },
    { clasif: "Superior",          min: 115,       max: Infinity, fill: "#cfddef" }
  ];
  var CORTES = [70, 80, 90, 110, 115];

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

  function anchoAprox(s) { return (s ? s.length : 0) * 5.2; } // px aprox a font ~9px

  function svgPerfil(perfil, valores, ejeY) {
    var subs = perfil.subs;
    var ns = "http://www.w3.org/2000/svg";
    var grupos = gruposDominio(subs);

    var padL = 56, padR = 60, padT = 20;
    var pasoX = 54, franjaH = 18, bandGap = 3, rotGrados = 72;
    var srad = Math.sin(rotGrados * Math.PI / 180);
    // Alto de cada tier de etiquetas rotadas = ancho del texto más largo * sin(rot).
    // Así el texto completo cabe sin recortes (lo pide la clínica para pegar en reportes).
    var maxSub = 0, maxDom = 0;
    subs.forEach(function (sid) { maxSub = Math.max(maxSub, anchoAprox((infoSub[sid] || {}).nombre || sid)); });
    grupos.forEach(function (g) { maxDom = Math.max(maxDom, anchoAprox(g.dom + (g.nombre ? " · " + g.nombre : ""))); });
    var subTierH = maxSub * srad + 10, domTierH = maxDom * srad + 12;
    var padB = bandGap + franjaH + 10 + subTierH + 14 + domTierH + 8;

    var plotH = 300;
    var W = padL + padR + Math.max(subs.length, 1) * pasoX;
    var H = padT + plotH + padB;
    var plotW = W - padL - padR;
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "perfil");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);

    var axisY = padT + plotH;
    var bandY0 = axisY + bandGap, bandY1 = bandY0 + franjaH;
    var subLblY = bandY1 + 10;                  // ancla etiquetas subdominio (tier 1)
    var domLblY = subLblY + subTierH + 14;      // ancla etiquetas dominio (tier 2)

    function yDe(v) { return padT + plotH * (1 - (v - ejeY.min) / (ejeY.max - ejeY.min)); }
    function xDe(i) { return padL + pasoX * (i + 0.5); }
    function clampY(y) { return Math.max(padT, Math.min(axisY, y)); }

    function add(tag, attrs, txt) {
      var n = document.createElementNS(ns, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (txt != null) n.textContent = txt;
      svg.appendChild(n); return n;
    }
    function fmtPct(x) {
      if (x == null) return null;
      if (typeof x === "string") return x;        // notación de piso del Manual ("<0.1")
      return (x < 1 ? x : Math.round(x)).toString();
    }

    // ---------- Rangos cualitativos (franjas horizontales + etiqueta de clasificación) ----------
    RANGOS.forEach(function (r) {
      var lo = Math.max(ejeY.min, r.min), hi = Math.min(ejeY.max, r.max);
      if (hi <= lo) return;
      var yTop = clampY(yDe(hi)), yBot = clampY(yDe(lo));
      add("rect", { x: padL, y: yTop, width: plotW, height: Math.max(0, yBot - yTop), class: "rango", fill: r.fill });
      add("text", { x: W - padR - 5, y: (yTop + yBot) / 2 + 3, "text-anchor": "end", class: "rango-lbl" }, r.clasif);
    });
    // Líneas de corte entre rangos (puntos de corte de los percentiles).
    CORTES.forEach(function (c) {
      if (c <= ejeY.min || c >= ejeY.max) return;
      add("line", { x1: padL, y1: yDe(c), x2: W - padR, y2: yDe(c), class: "corte" });
    });

    // ---------- Grid horizontal + etiquetas dobles (percentil / estándar) ----------
    var labeled = {};
    function etiquetaY(v) {
      var y = yDe(v);
      var esMedia = (v === E.meta.estandar.media);
      add("text", { x: padL - 7, y: y + 3, "text-anchor": "end", class: "ylbl-pc" + (esMedia ? " ylbl-media" : "") }, percentilDeEstandar(v));
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
        if (!labeled[rv]) etiquetaY(rv);
      });
    }

    // ---------- Ejes + títulos ----------
    add("line", { x1: padL, y1: padT, x2: padL, y2: axisY, class: "eje" });
    add("line", { x1: padL, y1: axisY, x2: W - padR, y2: axisY, class: "eje" });
    var cy = padT + plotH / 2;
    add("text", { x: 13, y: cy, transform: "rotate(-90 13 " + cy + ")", "text-anchor": "middle", class: "axis-title" }, "Percentil");
    add("text", { x: W - 13, y: cy, transform: "rotate(90 " + (W - 13) + " " + cy + ")", "text-anchor": "middle", class: "axis-title" }, "Puntuación estándar");

    // ---------- Franja de dominios (número) + separadores + nombre completo rotado ----------
    grupos.forEach(function (g, gi) {
      var x0 = xDe(g.i) - pasoX / 2, x1 = xDe(g.j) + pasoX / 2, cxG = (x0 + x1) / 2;
      add("rect", { x: x0, y: bandY0, width: (x1 - x0), height: franjaH, class: "dom-band " + (gi % 2 ? "dom-band-b" : "dom-band-a") });
      if (gi > 0) add("line", { x1: x0, y1: padT, x2: x0, y2: domLblY - 4, class: "dom-sep" });
      // número de dominio (siempre cabe, horizontal)
      add("text", { x: cxG, y: bandY0 + franjaH / 2 + 3.5, "text-anchor": "middle", class: "dom-band-lbl" }, g.dom);
      // nombre de dominio COMPLETO, rotado (tier 2)
      add("text", { x: cxG, y: domLblY, transform: "rotate(" + rotGrados + " " + cxG + " " + domLblY + ")", "text-anchor": "start", class: "dom-name" }, g.dom + (g.nombre ? " · " + g.nombre : ""));
    });
    if (grupos.length) add("line", { x1: W - padR, y1: padT, x2: W - padR, y2: domLblY - 4, class: "dom-sep" });

    // ---------- Etiquetas de subdominio COMPLETAS, rotadas (tier 1) ----------
    subs.forEach(function (sid, i) {
      var info = infoSub[sid] || { nombre: sid };
      var tx = xDe(i);
      add("text", { x: tx, y: subLblY, transform: "rotate(" + rotGrados + " " + tx + " " + subLblY + ")", "text-anchor": "start", class: "xlbl" }, info.nombre);
    });

    // ---------- Puntos (estándar + percentil) ----------
    var puntos = [];
    subs.forEach(function (sid, i) {
      var val = valores[sid], est, pct;
      if (val && typeof val === "object") { est = val.estandar; pct = val.percentil; }
      else { est = val; pct = null; } // compat: valor suelto = estándar
      var num = (typeof est === "string") ? parseFloat(est.replace(/[^0-9.\-]/g, "")) : est;
      var tx = xDe(i);
      if (num != null && !isNaN(num) && num >= ejeY.min - 50) {
        puntos.push({ x: tx, y: clampY(yDe(num)), est: est, pct: pct });
      } else {
        puntos.push(null);
      }
    });
    for (var i = 0; i < puntos.length - 1; i++) {
      if (puntos[i] && puntos[i + 1]) {
        add("line", { x1: puntos[i].x, y1: puntos[i].y, x2: puntos[i + 1].x, y2: puntos[i + 1].y, class: "serie" });
      }
    }
    puntos.forEach(function (pt) {
      if (!pt) return;
      add("circle", { cx: pt.x, cy: pt.y, r: 3.5, class: "punto" });
      add("text", { x: pt.x, y: pt.y - 7, "text-anchor": "middle", class: "pt-est" }, pt.est);
      var pc = fmtPct(pt.pct);
      if (pc != null) add("text", { x: pt.x, y: pt.y + 14, "text-anchor": "middle", class: "pt-pct" }, pc);
    });

    if (!puntos.some(Boolean)) {
      add("text", { x: W / 2, y: padT + plotH / 2, "text-anchor": "middle", fill: "#54616e" }, "Sin datos aún: captura brutos y suma por subdominio.");
    }
    return svg;
  }

  E.charts = { init: init, actualizar: actualizar };
})();
