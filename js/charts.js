/* ENI-2 · Gráficas de perfil (SVG, sin dependencias).
 * Eje X = subdominios (unidades de agregación). Eje Y = Puntuación estándar.
 * 3 perfiles de la Libreta + 1 unificada. Eje Y editable + líneas de referencia. */
(function () {
  "use strict";
  var E = window.ENI2;

  // Mapa subId -> { nombre, domNum } para etiquetas.
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

  function svgPerfil(perfil, valores, ejeY) {
    var subs = perfil.subs;
    var padL = 44, padR = 16, padT = 18, padB = 120;
    var pasoX = 54;
    var W = padL + padR + Math.max(subs.length, 1) * pasoX;
    var H = 420, plotH = H - padT - padB, plotW = W - padL - padR;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "perfil");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);

    function yDe(v) { return padT + plotH * (1 - (v - ejeY.min) / (ejeY.max - ejeY.min)); }
    function xDe(i) { return padL + pasoX * (i + 0.5); }

    function add(tag, attrs, txt) {
      var n = document.createElementNS(ns, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (txt != null) n.textContent = txt;
      svg.appendChild(n); return n;
    }

    // Grid horizontal cada 5 puntos + etiquetas Y
    var paso = (ejeY.max - ejeY.min) > 60 ? 10 : 5;
    for (var v = Math.ceil(ejeY.min / paso) * paso; v <= ejeY.max; v += paso) {
      add("line", { x1: padL, y1: yDe(v), x2: W - padR, y2: yDe(v), class: "grid" });
      add("text", { x: padL - 6, y: yDe(v) + 3, "text-anchor": "end", fill: "#54616e" }, v);
    }
    // Líneas de referencia (media y ±DE)
    if (ejeY.lineas && ejeY.ref) {
      ejeY.ref.forEach(function (rv) {
        if (rv < ejeY.min || rv > ejeY.max) return;
        var esMedia = (rv === E.meta.estandar.media);
        add("line", { x1: padL, y1: yDe(rv), x2: W - padR, y2: yDe(rv), class: esMedia ? "ref ref-media" : "ref" });
        add("text", { x: W - padR - 2, y: yDe(rv) - 2, "text-anchor": "end", fill: esMedia ? "#1a7f4b" : "#6b7b8c", "font-size": "10" }, rv);
      });
    }
    // Ejes
    add("line", { x1: padL, y1: padT, x2: padL, y2: padT + plotH, class: "eje" });
    add("line", { x1: padL, y1: padT + plotH, x2: W - padR, y2: padT + plotH, class: "eje" });

    // Puntos + línea (solo donde hay valor)
    var puntos = [];
    subs.forEach(function (sid, i) {
      var val = valores[sid];
      // etiqueta X (nombre corto) rotada
      var info = infoSub[sid] || { nombre: sid, dom: "" };
      var lbl = info.nombre.length > 22 ? info.nombre.slice(0, 21) + "…" : info.nombre;
      var tx = xDe(i), ty = padT + plotH + 10;
      add("text", { x: tx, y: ty, transform: "rotate(60 " + tx + " " + ty + ")", "text-anchor": "start", class: "xlbl", "font-size": "10" }, (info.dom ? info.dom + "· " : "") + lbl);
      if (val != null && val >= ejeY.min - 50) {
        var yy = Math.max(padT, Math.min(padT + plotH, yDe(val)));
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
      add("text", { x: W / 2, y: H / 2, "text-anchor": "middle", fill: "#54616e" }, "Sin datos aún: captura brutos y suma por subdominio.");
    }
    return svg;
  }

  E.charts = { init: init, actualizar: actualizar };
})();
