/*
 * ENI-2 · Mapa de ubicación de tablas del Apéndice B.
 * Verificado leyendo los títulos de las 71 tablas (B-1..B-71), PDF 115-185.
 *
 * 12 bandas de edad (5..16). 6 grupos de dominios por tabla; la edad 5 no tiene
 * tabla de velocidad (G6). Permite: (a) localizar el recorte-fuente para la
 * verificación en el punto de uso, y (b) guiar la extracción de números.
 *
 * Imagen fuente de un (banda, prueba): assets/tablas/pdf{paginas[banda][grupo]}.jpg
 */
window.ENI2 = window.ENI2 || {};

// Grupos y las pruebas (por id de estructura) que contiene cada uno.
window.ENI2.grupos = {
  G1: { // construccionales + memoria (cod + diferida) + perceptuales
    nombre: "Construccionales · Memoria · Perceptuales",
    pruebas: ["1.1","1.2.1","1.2.2","1.2.3","2.1.1","2.1.2","2.2.1",
              "4.1.1","4.1.2","4.1.3","4.1.4","4.2.1","4.2.2","4.2.3","4.2.4",
              "3.1.1","3.1.2","3.2.1","3.2.2","3.2.3","3.2.4","3.2.5","3.3.1","3.3.2","3.3.3"]
  },
  G2: { // lenguaje + metalingüísticas + lectura (precisión/comprensión)
    nombre: "Lenguaje · Metalingüísticas · Lectura",
    pruebas: ["5.1.1","5.1.2","5.1.3","5.1.4","5.2.1","5.2.2","5.2.3","5.3.1","5.3.2","5.3.3",
              "6.1","6.2","6.3","6.4",
              "7.1.1","7.1.2","7.1.3","7.1.4","7.1.5","7.2.1","7.2.2","7.2.3"]
  },
  G3: { // escritura (precisión + composición)
    nombre: "Escritura",
    pruebas: ["8.1.1","8.1.2","8.1.3","8.1.4","8.1.5","8.1.6","8.1.7","8.2.1","8.2.2"]
  },
  G4: { // aritmética + habilidades espaciales
    nombre: "Aritmética · Habilidades espaciales",
    pruebas: ["9.1","9.2.1","9.2.2","9.2.3","9.2.4","9.3.1","9.3.2","9.3.3","9.3.4",
              "10.1","10.2","10.3","10.4","10.5"]
  },
  G5: { // atención + conceptuales + funciones ejecutivas
    nombre: "Atención · Conceptuales · Funciones ejecutivas",
    pruebas: ["11.1.1","11.1.2","11.2.1","11.2.2","12.1","12.2","12.3",
              "13.1.1a","13.1.1b","13.1.2","13.2.1","13.2.2",
              "13.3.1","13.3.2","13.3.3","13.3.4","13.3.5","13.3.6","13.3.7","13.3.8","13.3.9",
              "13.4.1","13.4.2","13.4.3"]
  },
  G6: { // velocidad (palabras por minuto): velocidad de lectura y de escritura
    nombre: "Velocidad (palabras por minuto)",
    pruebas: ["7.3.1","7.3.2","8.3.1","8.3.2"]
  }
};

// prueba -> grupo (derivado)
window.ENI2.pruebaGrupo = (function () {
  var m = {};
  Object.keys(window.ENI2.grupos).forEach(function (g) {
    window.ENI2.grupos[g].pruebas.forEach(function (pid) { m[pid] = g; });
  });
  return m;
})();

// (banda de edad) -> (grupo -> página PDF). Edad 5 sin G6 (no se evalúa velocidad).
window.ENI2.paginasTabla = {
  "5":  { G1:115, G2:116, G3:117, G4:118, G5:119 },
  "6":  { G1:120, G2:121, G3:122, G4:123, G5:124, G6:125 },
  "7":  { G1:126, G2:127, G3:128, G4:129, G5:130, G6:131 },
  "8":  { G1:132, G2:133, G3:134, G4:135, G5:136, G6:137 },
  "9":  { G1:138, G2:139, G3:140, G4:141, G5:142, G6:143 },
  "10": { G1:144, G2:145, G3:146, G4:147, G5:148, G6:149 },
  "11": { G1:150, G2:151, G3:152, G4:153, G5:154, G6:155 },
  "12": { G1:156, G2:157, G3:158, G4:159, G5:160, G6:161 },
  "13": { G1:162, G2:163, G3:164, G4:165, G5:166, G6:167 },
  "14": { G1:168, G2:169, G3:170, G4:171, G5:172, G6:173 },
  "15": { G1:174, G2:175, G3:176, G4:177, G5:178, G6:179 },
  "16": { G1:180, G2:181, G3:182, G4:183, G5:184, G6:185 }
};

// Apéndice D (suma de escalares -> estándar): página PDF (doble página 194-195).
window.ENI2.paginasApendiceD = [194, 195];

/* Devuelve la ruta de imagen-fuente para (banda, pruebaId), o null si esa
 * prueba no se evalúa/normó a esa edad (p.ej. velocidad a los 5 años). */
window.ENI2.cropDe = function (banda, pruebaId) {
  var g = window.ENI2.pruebaGrupo[pruebaId];
  if (!g) return null;
  var pag = window.ENI2.paginasTabla[banda] && window.ENI2.paginasTabla[banda][g];
  if (!pag) return null;
  return { grupo: g, grupoNombre: window.ENI2.grupos[g].nombre, pdfPage: pag,
           src: "assets/tablas/pdf" + pag + ".jpg" };
};
