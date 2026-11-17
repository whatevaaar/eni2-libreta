/*
 * ENI-2 · Apéndice B — Conversión bruto -> escalar por banda de edad y prueba.
 *
 * Estructura:
 *   ENI2.tablas["<banda>"].pruebas["<pruebaId>"].escalares = [ { e, min, max }, ... ]
 *   donde `e` = Puntuación escolar (escalar) y [min,max] = rango de puntaje bruto
 *   (natural) que corresponde a esa fila. (El percentil/T se derivan del escalar
 *   vía ENI2.compartida.)
 *
 * Este archivo se llena incrementalmente con la extracción verificada de las 71
 * tablas (PDF 115-185). Mientras una (banda,prueba) no esté aquí, la app muestra
 * el recorte-fuente y permite capturar el escalar (que se guarda como corrección
 * persistente). Las correcciones del usuario (ENI2.store) siempre tienen prioridad.
 */
window.ENI2 = window.ENI2 || {};
window.ENI2.tablas = window.ENI2.tablas || {
  // "5": { pruebas: { "1.1": { escalares: [ {e:1,min:0,max:0}, ... ] } } },
};
