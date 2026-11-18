/* ENI-2 · UI — Hoja de registro reactiva + verificación en el punto de uso. */
(function () {
  "use strict";
  var E = window.ENI2, eng = E.engine, store = E.store;

  // Estado del evaluado: SOLO en memoria (datos personales, no se persisten).
  var estado = { anios: null, meses: null, brutos: {} };
  var cell = {}; // referencias a celdas por id para actualizar sin rebuild

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }

  function banda() { return eng.bandaDeEdad(estado.anios, estado.meses); }

  // ---------- Construcción de la hoja (una sola vez) ----------
  function construirHoja() {
    var cont = $("hoja");
    cont.innerHTML = "";
    E.dominios.forEach(function (dom) {
      var box = el("div", "dom");
      var tbl = el("table", "sheet");
      var thead = el("thead");
      thead.appendChild(filaEncabezado());
      tbl.appendChild(thead);
      var tb = el("tbody");

      var dominioEsAgg = (dom.subdominios.length === 1 && dom.subdominios[0].id === dom.num);
      if (!dominioEsAgg) {
        var dr = el("tr", "dom-row");
        var td = el("td", "col-nombre"); td.colSpan = 8;
        td.textContent = dom.num + ". " + dom.nombre;
        dr.appendChild(td); tb.appendChild(dr);
      }

      dom.subdominios.forEach(function (sub) {
        var single = sub.agregacion && sub.pruebas.length === 1 && sub.pruebas[0].id === sub.id;
        if (single) { tb.appendChild(filaCombinada(sub)); return; }
        var etiqueta = dominioEsAgg ? (dom.num + ". " + dom.nombre) : (sub.id + ". " + sub.nombre);
        tb.appendChild(filaSubdominio(sub, etiqueta, sub.agregacion));
        sub.pruebas.forEach(function (p) { tb.appendChild(filaPrueba(p)); });
      });

      tbl.appendChild(tb);
      box.appendChild(tbl);
      cont.appendChild(box);
    });
  }

  function filaEncabezado() {
    var tr = el("tr");
    [["Dominios · subdominios · pruebas","col-nombre"],["Bruto","col-bruto"],["Escalar","col-escalar"],
     ["Percentil","col-pct"],["Suma esc.","col-suma"],["P. estándar","col-estandar"],["Percentil","col-pctsub"],["Fuente","col-fuente"]]
     .forEach(function (c) { var th = el("th", c[1], c[0]); tr.appendChild(th); });
    return tr;
  }

  function filaSubdominio(sub, etiqueta, esAgg) {
    var tr = el("tr", "sub-row" + (esAgg ? " agg" : ""));
    var nom = el("td", "col-nombre"); nom.textContent = etiqueta; tr.appendChild(nom);
    tr.appendChild(el("td", "col-bruto"));
    tr.appendChild(el("td", "col-escalar"));
    tr.appendChild(el("td", "col-pct"));
    if (esAgg) {
      var suma = el("td", "col-suma celda-agg"); suma.id = "suma-" + sub.id; suma.innerHTML = '<span class="suma">—</span>';
      var est = el("td", "col-estandar celda-agg"); est.id = "est-" + sub.id; est.innerHTML = '<span class="estandar">—</span>';
      est.style.cursor = "pointer"; est.title = "Ver/corregir en Apéndice D";
      est.addEventListener("click", function () { abrirApendiceD(sub); });
      var pct = el("td", "col-pctsub celda-agg"); pct.id = "pctsub-" + sub.id; pct.textContent = "—";
      var fte = el("td", "col-fuente celda-agg");
      var b = el("button", "fuente-btn", "ver D"); b.title = "Apéndice D (suma→estándar)";
      b.addEventListener("click", function () { abrirApendiceD(sub); });
      fte.appendChild(b);
      tr.appendChild(suma); tr.appendChild(est); tr.appendChild(pct); tr.appendChild(fte);
      cell["est-" + sub.id] = est; cell["suma-" + sub.id] = suma; cell["pctsub-" + sub.id] = pct;
    } else {
      for (var i = 0; i < 4; i++) tr.appendChild(el("td"));
    }
    return tr;
  }

  // Subdominio de UNA sola prueba (p.ej. 1.1, 9.1): fila combinada bruto→escalar y suma→estándar.
  function filaCombinada(sub) {
    var p = sub.pruebas[0];
    var tr = el("tr", "prueba-row sub-row agg"); tr.dataset.pid = p.id;
    var nom = el("td", "col-nombre");
    nom.appendChild(el("span", "pid", p.id));
    nom.appendChild(document.createTextNode(sub.nombre));
    if (p.max) nom.appendChild(el("span", "maxb", "(máx " + p.max + ")"));
    tr.appendChild(nom);

    var tdB = el("td", "col-bruto");
    var inp = el("input"); inp.type = "number"; inp.min = "0"; inp.inputMode = "numeric";
    inp.id = "bruto-" + p.id; inp.value = estado.brutos[p.id] || "";
    inp.addEventListener("input", function () { estado.brutos[p.id] = inp.value; recompute(); });
    tdB.appendChild(inp); tr.appendChild(tdB);

    var tdE = el("td", "col-escalar"); tdE.id = "esc-" + p.id; tdE.innerHTML = '<span class="val-pendiente">—</span>'; tr.appendChild(tdE);
    var tdP = el("td", "col-pct"); tdP.id = "pct-" + p.id; tdP.textContent = "—"; tr.appendChild(tdP);

    var suma = el("td", "col-suma celda-agg"); suma.id = "suma-" + sub.id; suma.innerHTML = '<span class="suma">—</span>';
    var est = el("td", "col-estandar celda-agg"); est.id = "est-" + sub.id; est.innerHTML = '<span class="estandar">—</span>';
    est.style.cursor = "pointer"; est.title = "Ver/corregir en Apéndice D";
    est.addEventListener("click", function () { abrirApendiceD(sub); });
    var pctsub = el("td", "col-pctsub celda-agg"); pctsub.id = "pctsub-" + sub.id; pctsub.textContent = "—";
    tr.appendChild(suma); tr.appendChild(est); tr.appendChild(pctsub);

    var tdF = el("td", "col-fuente celda-agg");
    var fb = el("button", "fuente-btn", "ver"); fb.title = "Ver tabla fuente";
    fb.addEventListener("click", function () { abrirFuentePrueba(p); });
    tdF.appendChild(fb); tr.appendChild(tdF);

    cell["esc-" + p.id] = tdE; cell["pct-" + p.id] = tdP;
    cell["suma-" + sub.id] = suma; cell["est-" + sub.id] = est; cell["pctsub-" + sub.id] = pctsub;
    return tr;
  }

  function filaPrueba(p) {
    var tr = el("tr", "prueba-row"); tr.dataset.pid = p.id;
    var nom = el("td", "col-nombre");
    var pid = el("span", "pid", p.id); nom.appendChild(pid);
    nom.appendChild(document.createTextNode(p.nombre));
    if (p.asterisco) { var a = el("span", "asterisco", "∗"); a.title = "No se incluye en la suma de escalares"; nom.appendChild(a); }
    if (p.max) { var mx = el("span", "maxb", "(máx " + p.max + ")"); nom.appendChild(mx); }
    tr.appendChild(nom);

    // Bruto
    var tdB = el("td", "col-bruto");
    var inp = el("input"); inp.type = "number"; inp.min = "0"; inp.inputMode = "numeric";
    inp.id = "bruto-" + p.id; inp.value = estado.brutos[p.id] || "";
    inp.addEventListener("input", function () { estado.brutos[p.id] = inp.value; recompute(); });
    tdB.appendChild(inp); tr.appendChild(tdB);

    // Escalar (auto / corrección / pendiente) con edición
    var tdE = el("td", "col-escalar"); tdE.id = "esc-" + p.id;
    tdE.innerHTML = '<span class="val-pendiente">—</span>';
    tr.appendChild(tdE);

    // Percentil (de la prueba)
    var tdP = el("td", "col-pct"); tdP.id = "pct-" + p.id; tdP.textContent = "—"; tr.appendChild(tdP);

    // columnas de subdominio vacías en filas de prueba
    tr.appendChild(el("td", "col-suma")); tr.appendChild(el("td", "col-estandar")); tr.appendChild(el("td", "col-pctsub"));

    // Fuente
    var tdF = el("td", "col-fuente");
    var fb = el("button", "fuente-btn", "ver"); fb.title = "Ver tabla fuente de esta prueba";
    fb.addEventListener("click", function () { abrirFuentePrueba(p); });
    tdF.appendChild(fb); tr.appendChild(tdF);

    cell["esc-" + p.id] = tdE; cell["pct-" + p.id] = tdP;
    return tr;
  }

  // ---------- Recompute ----------
  function recompute() {
    var b = banda();
    var finEdad = $("edad-error"), bandaLbl = $("edad-banda"), aviso = $("aviso-sin-edad");
    if (estado.anios == null && estado.meses == null) { finEdad.textContent = ""; }
    if (!b) {
      bandaLbl.textContent = "";
      if (estado.anios != null || estado.meses != null) finEdad.textContent = "Edad fuera del rango normado (5;0 a 16;11) o inválida.";
      aviso.style.display = "";
    } else {
      finEdad.textContent = ""; bandaLbl.textContent = "Banda " + b + " años";
      aviso.style.display = "none";
    }

    // Resultados por prueba
    var resultados = {};
    E.dominios.forEach(function (dom) {
      dom.subdominios.forEach(function (sub) {
        sub.pruebas.forEach(function (p) {
          var bruto = estado.brutos[p.id];
          var r = b ? eng.calcularPrueba(b, p.id, (bruto == null ? "" : bruto)) : { escalar: null, percentil: null, fuente: "pendiente", error: (bruto ? null : "vacio") };
          resultados[p.id] = r;
          pintarPrueba(p, r, b);
        });
      });
    });

    // Agregaciones (subdominios) + Apéndice D
    var valoresPerfil = {}; // subId -> { estandar, percentil } (para los puntos de la gráfica)
    E.dominios.forEach(function (dom) {
      dom.subdominios.forEach(function (sub) {
        if (!sub.agregacion) return;
        var s = eng.sumaSubdominio(sub, resultados);
        var tieneAlgo = s.incluidas.length > 0;
        var sumaCell = cell["suma-" + sub.id], estCell = cell["est-" + sub.id], pctCell = cell["pctsub-" + sub.id];
        if (!tieneAlgo) {
          sumaCell.innerHTML = '<span class="suma">—</span>';
          estCell.innerHTML = '<span class="estandar">—</span>';
          pctCell.textContent = "—";
          return;
        }
        sumaCell.innerHTML = '<span class="suma">' + s.suma + (s.faltantes.length ? " ⚠" : "") + '</span>';
        sumaCell.title = s.faltantes.length ? ("Faltan escalares: " + s.faltantes.join(", ")) : "";
        estCell.dataset.suma = s.suma;
        var d = eng.apendiceD(sub.dcol, s.suma);
        var btnEdit = ' <button class="fuente-btn" data-edit-d="1" title="Corregir puntuación estándar">✎</button>';
        if (d.estandar != null) {
          var corr = d.fuente === "correccion";
          var avisoD = (d.borde === "sobre_maximo" || d.borde === "bajo_minimo")
            ? '<span class="aviso-borde" title="Suma fuera del rango de la tabla; se tomó el valor tope/piso del Apéndice D"> ⚠</span>' : "";
          estCell.innerHTML = '<span class="estandar' + (corr ? ' val-correccion' : '') + '">' + d.estandar + '</span>' +
            (corr ? '<span class="chip chip-corr">corr</span>' : '') + avisoD + btnEdit;
          pctCell.textContent = fmt(d.percentil);
          valoresPerfil[sub.id] = { estandar: d.estandar, percentil: d.percentil };
        } else {
          estCell.innerHTML = '<span class="val-pendiente">captúralo</span>' + btnEdit;
          pctCell.textContent = "—";
        }
        estCell.querySelector('[data-edit-d]').addEventListener("click", function (ev) { ev.stopPropagation(); editarEstandar(sub); });
      });
    });

    if (E.charts) E.charts.actualizar(valoresPerfil, leerEjeY());
    actualizarBadge();
  }

  function pintarPrueba(p, r, b) {
    var tdE = cell["esc-" + p.id], tdP = cell["pct-" + p.id];
    if (!tdE) return;
    if (!b || !r || (r.error === "vacio")) { tdE.innerHTML = '<span class="val-pendiente">—</span>'; tdP.textContent = "—"; return; }
    if (r.error === "bruto_invalido") { tdE.innerHTML = '<span class="val-pendiente">dato inválido</span>'; tdP.textContent = "—"; return; }
    var clase = r.fuente === "correccion" ? "val-correccion" : (r.fuente === "auto" ? "val-auto" : "val-pendiente");
    var chip = r.fuente === "correccion" ? '<span class="chip chip-corr">corr</span>' :
               (r.fuente === "auto" ? '<span class="chip chip-auto">auto</span>' :
                '<span class="chip chip-pend">captúralo</span>');
    var txt = (r.escalar != null) ? r.escalar : "—";
    var avisoBorde = "";
    if (r.aviso === "bruto_fuera_rango" || r.borde === "sobre_maximo" || r.borde === "bajo_minimo")
      avisoBorde = '<span class="aviso-borde" title="Bruto fuera del rango de la tabla; se aplicó regla de borde"> ⚠</span>';
    tdE.innerHTML = '<span class="' + clase + '">' + txt + '</span>' + chip + avisoBorde +
                    ' <button class="fuente-btn" data-edit="1">✎</button>';
    tdE.querySelector('[data-edit]').addEventListener("click", function () { editarEscalar(p); });
    tdP.textContent = (r.percentil != null) ? fmt(r.percentil) : "—";
  }

  function fmt(x) {
    if (x == null) return "—";
    if (typeof x === "string") return x;           // notación de piso del Manual, p.ej. "<0.1"
    return (x < 1 ? x : Math.round(x)).toString();
  }

  // Acepta número (70, 0.1) o notación de piso del Manual (<51, <0.1, >99). Devuelve
  // { empty } | { invalido } | { valor } donde valor es Number o la cadena con "<"/">".
  function parseValorBaremo(s) {
    s = String(s).trim().replace(/\s+/g, "");
    if (s === "") return { empty: true };
    if (/^[<>]?-?\d+(\.\d+)?$/.test(s)) return { valor: /[<>]/.test(s) ? s : Number(s) };
    return { invalido: true };
  }

  // ---------- Edición de correcciones ----------
  function editarEscalar(p) {
    var b = banda(); if (!b) { alert("Primero ingresa una edad válida."); return; }
    var bruto = estado.brutos[p.id];
    if (bruto == null || bruto === "") { alert("Captura primero el puntaje bruto de esta prueba; la corrección se guarda para (edad, prueba, bruto)."); return; }
    var actual = eng.calcularPrueba(b, p.id, bruto);
    var v = prompt("Escalar correcto para «" + p.nombre + "» (edad " + b + ", bruto " + bruto + "):\nDéjalo vacío para quitar la corrección.", actual.escalar != null ? actual.escalar : "");
    if (v === null) return;
    if (v.trim() === "") { store.setEscalar(b, p.id, String(bruto), null); }
    else {
      var esc = parseInt(v, 10);
      if (isNaN(esc) || esc < 1 || esc > 19) { alert("El escalar debe ser un entero 1–19."); return; }
      var c = eng.compartida(esc);
      store.setEscalar(b, p.id, String(bruto), { escalar: esc, percentil: c.percentil, t: c.t });
    }
    recompute();
  }

  // Corrige la Puntuación estándar (Apéndice D) de un subdominio, persistente por (dcol, suma).
  function editarEstandar(sub) {
    var b = banda(); if (!b) { alert("Primero ingresa una edad válida."); return; }
    var estCell = cell["est-" + sub.id];
    var suma = estCell ? estCell.dataset.suma : null;
    if (suma == null) { alert("Captura primero los brutos de este subdominio para obtener la suma de escalares."); return; }
    var cur = eng.apendiceD(sub.dcol, suma);
    var ve = prompt("Puntuación estándar correcta para «" + sub.nombre + "» (suma de escalares = " + suma + "):\nUsa un número (p.ej. 70) o la notación del Manual (p.ej. <51). Vacío = quitar la corrección.\nEl percentil se calcula automáticamente a partir de la estándar.", cur.estandar != null ? cur.estandar : "");
    if (ve === null) return;
    var pe = parseValorBaremo(ve);
    if (pe.empty) { store.setApendiceD(sub.dcol, String(suma), null); recompute(); return; }
    if (pe.invalido) { alert("Valor inválido. Usa un número (70) o la notación del Manual (<51)."); return; }
    // El percentil se deriva de la estándar (correspondencia del Manual): quedan siempre coherentes.
    var percentil = eng.percentilDeEstandar(pe.valor);
    store.setApendiceD(sub.dcol, String(suma), { estandar: pe.valor, percentil: percentil, t: cur.t });
    recompute();
  }

  function abrirApendiceD(sub) {
    var estCell = cell["est-" + sub.id];
    var suma = estCell ? estCell.dataset.suma : null;
    mostrarModal({
      titulo: "Apéndice D — " + sub.nombre,
      hint: "Lee la columna «" + sub.nombre + "»" + (suma != null ? ", fila suma = " + suma : "") + ". Verifica estándar y percentil contra esta imagen; corrige con el botón ✎ Corregir.",
      src: "assets/tablas/pdf195.jpg",
      edit: function () { editarEstandar(sub); }
    });
  }

  function abrirFuentePrueba(p) {
    var b = banda();
    if (!b) { alert("Ingresa una edad válida para ubicar la tabla correspondiente."); return; }
    var crop = E.cropDe(b, p.id);
    if (!crop) {
      mostrarModal({ titulo: p.nombre, hint: "Esta prueba no tiene tabla normativa para la edad " + b + " (p.ej. velocidad lecto-escritora no se normó a esta edad).", src: null });
      return;
    }
    var bruto = estado.brutos[p.id];
    mostrarModal({
      titulo: "Tabla " + crop.grupoNombre + " · " + b + " años",
      hint: "Busca la columna «" + p.nombre + "»" + (bruto ? " y el bruto " + bruto : "") + "; lee su Puntuación escolar (escalar). Fuente: Apéndice B, PDF p." + crop.pdfPage + ". Si el valor auto difiere, corrígelo con ✎ (se guarda).",
      src: crop.src,
      edit: function () { editarEscalar(p); }
    });
  }

  // ---------- Modal ----------
  function mostrarModal(o) {
    $("modal-titulo").textContent = o.titulo || "Tabla fuente";
    $("modal-hint").textContent = o.hint || "";
    var img = $("modal-img"), abrir = $("modal-abrir");
    if (o.src) { img.src = o.src; img.style.display = ""; abrir.href = o.src; abrir.style.display = ""; }
    else { img.removeAttribute("src"); img.style.display = "none"; abrir.style.display = "none"; }
    var m = $("modal-fuente"); m.hidden = false;
    m._edit = o.edit || null;
    var be = $("modal-editar");
    if (o.edit) { be.hidden = false; be.onclick = function () { o.edit(); }; }
    else { be.hidden = true; be.onclick = null; }
  }
  function cerrarModal() { $("modal-fuente").hidden = true; }

  // ---------- Eje Y ----------
  function leerEjeY() {
    var min = parseFloat($("ejeY-min").value), max = parseFloat($("ejeY-max").value);
    var lineas = $("ejeY-lineas").checked;
    if (isNaN(min) || isNaN(max) || min >= max) { min = E.meta.ejeY.min; max = E.meta.ejeY.max; }
    return { min: min, max: max, lineas: lineas, ref: E.meta.ejeY.lineasRef };
  }
  function initEjeY() {
    var pref = store.getPref("ejeY", null);
    var ey = pref || E.meta.ejeY;
    $("ejeY-min").value = ey.min; $("ejeY-max").value = ey.max;
    ["ejeY-min","ejeY-max","ejeY-lineas"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        store.setPref("ejeY", { min: parseFloat($("ejeY-min").value), max: parseFloat($("ejeY-max").value) });
        recompute();
      });
    });
    $("ejeY-reset").addEventListener("click", function () {
      $("ejeY-min").value = E.meta.ejeY.min; $("ejeY-max").value = E.meta.ejeY.max; $("ejeY-lineas").checked = true;
      store.setPref("ejeY", null); recompute();
    });
  }

  // ---------- Badge / export / import ----------
  function actualizarBadge() { $("correcciones-badge").textContent = store.conteo() + " correcciones"; }

  function initAcciones() {
    $("btn-exportar").addEventListener("click", function () {
      var blob = new Blob([store.exportarJSON()], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "eni2-correcciones.json"; a.click(); URL.revokeObjectURL(a.href);
    });
    $("file-importar").addEventListener("change", function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var modo = confirm("¿Fusionar con tus correcciones actuales?\nAceptar = fusionar · Cancelar = reemplazar") ? "fusionar" : "reemplazar";
          var n = store.importarJSON(fr.result, modo);
          alert("Importado. Ahora hay " + n + " correcciones.");
          recompute();
        } catch (e) { alert("Archivo inválido: " + e.message); }
      };
      fr.readAsText(f); ev.target.value = "";
    });
    $("btn-limpiar-evaluado").addEventListener("click", function () {
      if (!confirm("¿Borrar edad y todos los brutos capturados en esta sesión? (No afecta tus correcciones de baremos.)")) return;
      estado = { anios: null, meses: null, brutos: {} };
      $("edad-anios").value = ""; $("edad-meses").value = "";
      document.querySelectorAll('input[id^="bruto-"]').forEach(function (i) { i.value = ""; });
      recompute();
    });
    $("btn-imprimir").addEventListener("click", function () { window.print(); });

    document.querySelectorAll("[data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarModal(); });
  }

  // ---------- Init ----------
  function init() {
    E.onStoreError = function () {
      $("estado-datos").textContent = "⚠ No se pudieron guardar correcciones (almacenamiento del navegador bloqueado o lleno). Usa Exportar para respaldar.";
    };
    construirHoja();
    initAcciones();
    initEjeY();
    $("edad-anios").addEventListener("input", function () {
      estado.anios = this.value === "" ? null : parseInt(this.value, 10); recompute();
    });
    $("edad-meses").addEventListener("input", function () {
      estado.meses = this.value === "" ? null : parseInt(this.value, 10); recompute();
    });
    if (E.charts) E.charts.init($("grafica-tabs"), $("grafica-cont"));
    recompute();
    var est = store.estado();
    $("estado-datos").textContent = store.conteo() + " correcciones guardadas en este navegador" +
      (est.actualizado ? " · última: " + new Date(est.actualizado).toLocaleString() : "") + ".";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
