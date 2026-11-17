/*
 * ENI-2 · Tabla compartida: Puntuación escolar (escalar) -> Percentil + T.
 * Es constante en todas las tablas del Apéndice B (columnas fijas Percentil a la
 * izquierda y Puntuación escolar/T a la derecha). Verificada en Tabla B-2
 * (5 años, PDF 116). El percentil de una prueba se deriva de su escalar vía esta
 * tabla; T se incluye por completitud.
 *
 * Fuente (PDF 116, bordes izquierdo/derecho alineados por fila).
 */
window.ENI2 = window.ENI2 || {};
window.ENI2.compartida = {
  // escalar: { percentil, t }
  "19": { percentil: 99,  t: 80 },
  "18": { percentil: 99,  t: 77 },
  "17": { percentil: 99,  t: 73 },
  "16": { percentil: 98,  t: 70 },
  "15": { percentil: 95,  t: 67 },
  "14": { percentil: 91,  t: 63 },
  "13": { percentil: 84,  t: 60 },
  "12": { percentil: 75,  t: 57 },
  "11": { percentil: 63,  t: 53 },
  "10": { percentil: 50,  t: 50 },
  "9":  { percentil: 37,  t: 47 },
  "8":  { percentil: 26,  t: 43 },
  "7":  { percentil: 16,  t: 40 },
  "6":  { percentil: 9,   t: 37 },
  "5":  { percentil: 5,   t: 33 },
  "4":  { percentil: 2,   t: 30 },
  "3":  { percentil: 1,   t: 27 },
  "2":  { percentil: 0.4, t: 23 },
  "1":  { percentil: 0.1, t: 20 }
};
