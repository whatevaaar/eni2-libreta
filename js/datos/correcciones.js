/*
 * ENI-2 · Correcciones incorporadas al baremo (capa base).
 * Verificadas por el usuario contra el Manual. Prioridad en el motor:
 *   correcciones locales del usuario (localStorage) > ESTAS (base) > dato auto.
 * Así valen para cualquier navegador sin rehacer los rangos del Apéndice B.
 *
 * Formato (igual que el export de correcciones):
 *   escalar:   "<banda>|<pruebaId>|<bruto>" -> { escalar, percentil, t }
 *   apendiceD: "<dcol>|<suma>"              -> { estandar, percentil, t? }
 *   compartida:"<escalar>"                  -> { percentil, t }
 * Los valores pueden ser números o notación de piso del Manual (p.ej. "<51", "<0.1").
 */
window.ENI2 = window.ENI2 || {};
window.ENI2.correccionesBase = {
  escalar: {
    "15|5.3.2|8": { escalar: 4, percentil: 2, t: 30 },
    "15|5.3.3|3": { escalar: 4, percentil: 2, t: 30 }
  },
  apendiceD: {
    "arit_conteo|8": { estandar: 93, percentil: 26 },
    "arit_calculo|8": { estandar: 55, percentil: 0.1 }
  },
  compartida: {}
};
