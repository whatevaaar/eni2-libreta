/*
 * ENI-2 — Estructura de la Libreta de Puntajes (dato-maestro).
 * Fuente: Hoja de registro de puntajes, Libreta ENI-2 (págs. impresas 31-34).
 * Jerarquía Dominio -> Subdominio -> Prueba.
 *
 * Convenciones:
 *  - `max`: puntaje bruto máximo según la Libreta (entre paréntesis). Puede ser
 *    un rango (p.ej. "12-15") cuando varía por edad/forma; null si no aplica.
 *  - `asterisco`: la prueba se calcula y muestra, pero NO entra en la suma de
 *    escalares del subdominio ("* No se incluye en la sumatoria de puntajes escalares").
 *  - `norma`: true si la prueba tiene columna de conversión bruto->escalar en el
 *    Apéndice B (se le calcula escalar/percentil). Para medidas derivadas
 *    (porcentajes, totales, tiempos) se marca false de forma tentativa; se
 *    ajusta al extraer el Apéndice B. "verificar" = pendiente de confirmar.
 *  - `agregacion`: nodo (subdominio o dominio) cuyos escalares se suman y se
 *    convierten vía Apéndice D a Puntuación estándar + percentil. `dcol` es la
 *    clave de su columna en el Apéndice D (se cablea al extraer D).
 *
 * PENDIENTES DE VERIFICAR (marcados en comentarios):
 *  - Asteriscos: confirmados 8.1.1 y 8.1.6. Reconfirmar 8.1.7 (parece SIN
 *    asterisco pese a ser conteo de errores) y que no haya otros.
 *  - `norma`/`dcol` de medidas derivadas de Funciones ejecutivas y de las
 *    unidades de agregación: se fijan al extraer Apéndices B y D.
 */
window.ENI2 = window.ENI2 || {};

window.ENI2.meta = {
  nombre: "ENI-2 · Asistente de la Libreta de Puntajes",
  edadMin: { anios: 5, meses: 0 },
  edadMax: { anios: 16, meses: 11 },
  // Puntuación escolar (escalar): media 10, DE 3. Rango visto en tablas: 1..19.
  escalar: { media: 10, de: 3, min: 1, max: 19 }, // VERIFICAR max exacto
  // Puntuación estándar: media 100, DE 15 (pct 50->100, 84->115, 16->85).
  estandar: { media: 100, de: 15 },
  // Eje Y de las gráficas de perfil. Se inicializa aquí y es editable en la UI.
  ejeY: { min: 55, max: 145, lineasRef: [70, 85, 100, 115, 130] }, // VERIFICAR vs Manual
  notaAsterisco: "No se incluye en la sumatoria de puntajes escalares"
};

/* Cada dominio: { num, nombre, subdominios:[...] }.
 * Cada subdominio: { id, nombre, agregacion?, dcol?, pruebas:[...] }.
 * Dominios sin subdominios reales (6, 10, 12) usan un subdominio único cuyo
 * id == dominio y `agregacion:true` a ese nivel. */
window.ENI2.dominios = [
  { num: "1", nombre: "Habilidades construccionales", subdominios: [
    { id: "1.1", nombre: "Construcción con palillos", agregacion: true, dcol: "construccion_palillos", pruebas: [
      { id: "1.1", nombre: "Construcción con palillos", max: "8", asterisco: false, norma: true }
    ]},
    { id: "1.2", nombre: "Habilidades gráficas", agregacion: true, dcol: "habilidades_graficas", pruebas: [
      { id: "1.2.1", nombre: "Dibujo de la figura humana", max: "20", asterisco: false, norma: true },
      { id: "1.2.2", nombre: "Copia de figuras", max: "12", asterisco: false, norma: true },
      { id: "1.2.3", nombre: "Copia de la figura compleja", max: "12-15", asterisco: false, norma: true }
    ]}
  ]},

  { num: "2", nombre: "Memoria (codificación)", subdominios: [
    { id: "2.1", nombre: "Memoria verbal-auditiva", agregacion: true, dcol: "mem_cod_verbal", pruebas: [
      { id: "2.1.1", nombre: "Lista de palabras", max: "36-48", asterisco: false, norma: true },
      { id: "2.1.2", nombre: "Recuerdo de una historia", max: "15", asterisco: false, norma: true }
    ]},
    { id: "2.2", nombre: "Memoria visual", agregacion: true, dcol: "mem_cod_visual", pruebas: [
      { id: "2.2.1", nombre: "Lista de figuras", max: "36-48", asterisco: false, norma: true }
    ]}
  ]},

  { num: "3", nombre: "Habilidades perceptuales", subdominios: [
    { id: "3.1", nombre: "Percepción táctil", agregacion: true, dcol: "perc_tactil", pruebas: [
      { id: "3.1.1", nombre: "Mano derecha", max: "8", asterisco: false, norma: true },
      { id: "3.1.2", nombre: "Mano izquierda", max: "8", asterisco: false, norma: true }
    ]},
    { id: "3.2", nombre: "Percepción visual", agregacion: true, dcol: "perc_visual", pruebas: [
      { id: "3.2.1", nombre: "Imágenes sobrepuestas", max: "16", asterisco: false, norma: true },
      { id: "3.2.2", nombre: "Imágenes borrosas", max: "10", asterisco: false, norma: true },
      { id: "3.2.3", nombre: "Cierre visual", max: "8", asterisco: false, norma: true },
      { id: "3.2.4", nombre: "Reconocimiento de expresiones", max: "8", asterisco: false, norma: true },
      { id: "3.2.5", nombre: "Integración de objetos", max: "8", asterisco: false, norma: true }
    ]},
    { id: "3.3", nombre: "Percepción auditiva", agregacion: true, dcol: "perc_auditiva", pruebas: [
      { id: "3.3.1", nombre: "Notas musicales", max: "8", asterisco: false, norma: true },
      { id: "3.3.2", nombre: "Sonidos ambientales", max: "8", asterisco: false, norma: true },
      { id: "3.3.3", nombre: "Fonémica", max: "20", asterisco: false, norma: true }
    ]}
  ]},

  { num: "4", nombre: "Memoria (evocación diferida)", subdominios: [
    { id: "4.1", nombre: "Evocación de estímulos auditivos", agregacion: true, dcol: "mem_dif_auditiva", pruebas: [
      { id: "4.1.1", nombre: "Recobro espontáneo de la lista de palabras", max: "9-12", asterisco: false, norma: true },
      { id: "4.1.2", nombre: "Recobro por claves", max: "9-12", asterisco: false, norma: true },
      { id: "4.1.3", nombre: "Reconocimiento verbal-auditivo", max: "18-24", asterisco: false, norma: true },
      { id: "4.1.4", nombre: "Recuperación de una historia", max: "15", asterisco: false, norma: true }
    ]},
    { id: "4.2", nombre: "Evocación de estímulos visuales", agregacion: true, dcol: "mem_dif_visual", pruebas: [
      { id: "4.2.1", nombre: "Recobro de la figura compleja", max: "12-15", asterisco: false, norma: true },
      { id: "4.2.2", nombre: "Recobro espontáneo de la lista de figuras", max: "9-12", asterisco: false, norma: true },
      { id: "4.2.3", nombre: "Recobro por claves", max: "9-12", asterisco: false, norma: true },
      { id: "4.2.4", nombre: "Reconocimiento visual", max: "18-24", asterisco: false, norma: true }
    ]}
  ]},

  { num: "5", nombre: "Lenguaje", subdominios: [
    { id: "5.1", nombre: "Repetición", agregacion: true, dcol: "leng_repeticion", pruebas: [
      { id: "5.1.1", nombre: "Sílabas", max: "8", asterisco: false, norma: true },
      { id: "5.1.2", nombre: "Palabras", max: "8", asterisco: false, norma: true },
      { id: "5.1.3", nombre: "No palabras", max: "8", asterisco: false, norma: true },
      { id: "5.1.4", nombre: "Oraciones", max: "8", asterisco: false, norma: true }
    ]},
    { id: "5.2", nombre: "Expresión", agregacion: true, dcol: "leng_expresion", pruebas: [
      { id: "5.2.1", nombre: "Denominación de imágenes", max: "15", asterisco: false, norma: true },
      { id: "5.2.2", nombre: "Coherencia narrativa", max: "7", asterisco: false, norma: true },
      { id: "5.2.3", nombre: "Longitud de la expresión", max: "306", asterisco: false, norma: "verificar" }
    ]},
    { id: "5.3", nombre: "Comprensión", agregacion: true, dcol: "leng_comprension", pruebas: [
      { id: "5.3.1", nombre: "Designación de imágenes", max: "15", asterisco: false, norma: true },
      { id: "5.3.2", nombre: "Seguimiento de instrucciones", max: "10", asterisco: false, norma: true },
      { id: "5.3.3", nombre: "Comprensión del discurso", max: "8", asterisco: false, norma: true }
    ]}
  ]},

  { num: "6", nombre: "Habilidades metalingüísticas", subdominios: [
    { id: "6", nombre: "Habilidades metalingüísticas", agregacion: true, dcol: "metalinguisticas", pruebas: [
      { id: "6.1", nombre: "Síntesis fonémica", max: "8", asterisco: false, norma: true },
      { id: "6.2", nombre: "Conteo de sonidos", max: "8", asterisco: false, norma: true },
      { id: "6.3", nombre: "Deletreo", max: "8", asterisco: false, norma: true },
      { id: "6.4", nombre: "Conteo de palabras", max: "8", asterisco: false, norma: true }
    ]}
  ]},

  { num: "7", nombre: "Lectura", subdominios: [
    { id: "7.1", nombre: "Precisión", agregacion: true, dcol: "lectura_precision", pruebas: [
      { id: "7.1.1", nombre: "Lectura de sílabas", max: "8", asterisco: false, norma: true },
      { id: "7.1.2", nombre: "Lectura de palabras", max: "11", asterisco: false, norma: true },
      { id: "7.1.3", nombre: "Lectura de no palabras", max: "8", asterisco: false, norma: true },
      { id: "7.1.4", nombre: "Lectura de oraciones", max: "10", asterisco: false, norma: true },
      { id: "7.1.5", nombre: "Palabras con error en la lectura en voz alta", max: null, asterisco: false, norma: "verificar" }
    ]},
    { id: "7.2", nombre: "Comprensión", agregacion: true, dcol: "lectura_comprension", pruebas: [
      { id: "7.2.1", nombre: "Comprensión de oraciones", max: "10", asterisco: false, norma: true },
      { id: "7.2.2", nombre: "Comprensión en la lectura en voz alta", max: "8", asterisco: false, norma: true },
      { id: "7.2.3", nombre: "Comprensión en la lectura silenciosa", max: "8", asterisco: false, norma: true }
    ]},
    { id: "7.3", nombre: "Velocidad", agregacion: true, dcol: "lectura_velocidad", pruebas: [
      { id: "7.3.1", nombre: "Lectura en voz alta", max: null, asterisco: false, norma: "verificar" },
      { id: "7.3.2", nombre: "Lectura silenciosa", max: null, asterisco: false, norma: "verificar" }
    ]}
  ]},

  { num: "8", nombre: "Escritura", subdominios: [
    { id: "8.1", nombre: "Precisión", agregacion: true, dcol: "escritura_precision", pruebas: [
      { id: "8.1.1", nombre: "Escritura del nombre", max: "2", asterisco: true, norma: true },        // asterisco confirmado
      { id: "8.1.2", nombre: "Dictado de sílabas", max: "8", asterisco: false, norma: true },
      { id: "8.1.3", nombre: "Dictado de palabras", max: "8", asterisco: false, norma: true },
      { id: "8.1.4", nombre: "Dictado de no palabras", max: "8", asterisco: false, norma: true },
      { id: "8.1.5", nombre: "Dictado de oraciones", max: "20", asterisco: false, norma: true },
      { id: "8.1.6", nombre: "Palabras con errores en la copia", max: null, asterisco: true, norma: "verificar" }, // asterisco confirmado
      { id: "8.1.7", nombre: "Palabras con errores en la recuperación escrita", max: null, asterisco: false, norma: "verificar" } // VERIFICAR asterisco
    ]},
    { id: "8.2", nombre: "Composición narrativa", agregacion: true, dcol: "escritura_composicion", pruebas: [
      { id: "8.2.1", nombre: "Coherencia narrativa", max: "7", asterisco: false, norma: true },
      { id: "8.2.2", nombre: "Longitud de la producción narrativa", max: null, asterisco: false, norma: "verificar" }
    ]},
    { id: "8.3", nombre: "Velocidad", agregacion: true, dcol: "escritura_velocidad", pruebas: [
      { id: "8.3.1", nombre: "En la copia de un texto", max: null, asterisco: false, norma: "verificar" },
      { id: "8.3.2", nombre: "En la recuperación escrita", max: null, asterisco: false, norma: "verificar" }
    ]}
  ]},

  { num: "9", nombre: "Aritmética", subdominios: [
    { id: "9.1", nombre: "Conteo", agregacion: true, dcol: "arit_conteo", pruebas: [
      { id: "9.1", nombre: "Conteo", max: "8", asterisco: false, norma: true }
    ]},
    { id: "9.2", nombre: "Manejo numérico", agregacion: true, dcol: "arit_manejo", pruebas: [
      { id: "9.2.1", nombre: "Lectura de números", max: "8", asterisco: false, norma: true },
      { id: "9.2.2", nombre: "Dictado de números", max: "8", asterisco: false, norma: true },
      { id: "9.2.3", nombre: "Comparación de números escritos", max: "8", asterisco: false, norma: true },
      { id: "9.2.4", nombre: "Ordenamiento de cantidades", max: "8", asterisco: false, norma: true }
    ]},
    { id: "9.3", nombre: "Cálculo", agregacion: true, dcol: "arit_calculo", pruebas: [
      { id: "9.3.1", nombre: "Serie directa", max: "8", asterisco: false, norma: true },
      { id: "9.3.2", nombre: "Serie inversa", max: "8", asterisco: false, norma: true },
      { id: "9.3.3", nombre: "Cálculo mental", max: "12", asterisco: false, norma: true },
      { id: "9.3.4", nombre: "Cálculo escrito", max: "14", asterisco: false, norma: true }
    ]}
  ]},

  { num: "10", nombre: "Habilidades espaciales", subdominios: [
    { id: "10", nombre: "Habilidades espaciales", agregacion: true, dcol: "espaciales", pruebas: [
      { id: "10.1", nombre: "Comprensión derecha-izquierda", max: "8", asterisco: false, norma: true },
      { id: "10.2", nombre: "Expresión derecha-izquierda", max: "8", asterisco: false, norma: true },
      { id: "10.3", nombre: "Dibujos desde ángulos diferentes", max: "8", asterisco: false, norma: true },
      { id: "10.4", nombre: "Orientación de líneas", max: "8", asterisco: false, norma: true },
      { id: "10.5", nombre: "Ubicación de coordenadas", max: "8", asterisco: false, norma: true }
    ]}
  ]},

  { num: "11", nombre: "Atención", subdominios: [
    { id: "11.1", nombre: "Atención visual", agregacion: true, dcol: "atencion_visual", pruebas: [
      { id: "11.1.1", nombre: "Cancelación de dibujos", max: "44", asterisco: false, norma: true },
      { id: "11.1.2", nombre: "Cancelación de letras", max: "82", asterisco: false, norma: true }
    ]},
    { id: "11.2", nombre: "Atención auditiva", agregacion: true, dcol: "atencion_auditiva", pruebas: [
      { id: "11.2.1", nombre: "Dígitos en progresión", max: "8", asterisco: false, norma: true },
      { id: "11.2.2", nombre: "Dígitos en regresión", max: "7", asterisco: false, norma: true }
    ]}
  ]},

  { num: "12", nombre: "Habilidades conceptuales", subdominios: [
    { id: "12", nombre: "Habilidades conceptuales", agregacion: true, dcol: "conceptuales", pruebas: [
      { id: "12.1", nombre: "Similitudes", max: "16", asterisco: false, norma: true },
      { id: "12.2", nombre: "Matrices", max: "8", asterisco: false, norma: true },
      { id: "12.3", nombre: "Problemas aritméticos", max: "8", asterisco: false, norma: true }
    ]}
  ]},

  { num: "13", nombre: "Funciones ejecutivas", subdominios: [
    { id: "13.1", nombre: "Fluidez verbal", agregacion: true, dcol: "fluidez_verbal", pruebas: [
      { id: "13.1.1a", nombre: "Fluidez semántica · Frutas", max: null, asterisco: false, norma: "verificar" },
      { id: "13.1.1b", nombre: "Fluidez semántica · Animales", max: null, asterisco: false, norma: "verificar" },
      { id: "13.1.2", nombre: "Fluidez fonémica", max: null, asterisco: false, norma: "verificar" }
    ]},
    { id: "13.2", nombre: "Fluidez gráfica", agregacion: true, dcol: "fluidez_grafica", pruebas: [
      { id: "13.2.1", nombre: "Semántica", max: "35", asterisco: false, norma: true },
      { id: "13.2.2", nombre: "No semántica", max: "34", asterisco: false, norma: true }
    ]},
    { id: "13.3", nombre: "Flexibilidad cognoscitiva", agregacion: true, dcol: "flexibilidad", pruebas: [
      { id: "13.3.1", nombre: "Número de ensayos administrados", max: "54", asterisco: false, norma: "verificar" },
      { id: "13.3.2", nombre: "Total de respuestas correctas", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.3", nombre: "Porcentaje de respuestas correctas", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.4", nombre: "Total de errores", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.5", nombre: "Porcentaje de errores", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.6", nombre: "Número de categorías", max: "3", asterisco: false, norma: "verificar" },
      { id: "13.3.7", nombre: "Incapacidad para mantener la organización", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.8", nombre: "Número de respuestas perseverativas", max: null, asterisco: false, norma: "verificar" },
      { id: "13.3.9", nombre: "Porcentaje de respuestas perseverativas", max: null, asterisco: false, norma: "verificar" }
    ]},
    { id: "13.4", nombre: "Planeación y organización", agregacion: true, dcol: "planeacion", pruebas: [
      { id: "13.4.1", nombre: "Diseños correctos", max: "11", asterisco: false, norma: true },
      { id: "13.4.2", nombre: "Número de movimientos realizados", max: "55", asterisco: false, norma: "verificar" },
      { id: "13.4.3", nombre: "Diseños correctos con el mínimo de movimientos", max: "11", asterisco: false, norma: "verificar" }
    ]}
  ]}
];

/* Alias para el perfil académico: 12.3 Problemas aritméticos se reporta también
 * como "Razonamiento lógico-matemático" dentro de Aritmética. */
window.ENI2.aliases = [
  { aliasId: "razonamiento_logico_matematico", nombre: "Razonamiento lógico-matemático", refPruebaId: "12.3" }
];

/* Apéndice C — Relación aciertos/tiempo de ejecución. Combina bruto(aciertos)+
 * bruto(tiempo) -> puntaje natural -> escalar + percentil, para estas pruebas.
 * Caso especial, a confirmar alcance con el usuario. */
window.ENI2.aciertosTiempo = [
  { refId: "1.1",   nombre: "Construcción con palillos" },
  { refId: "1.2.2", nombre: "Copia de figuras" },
  { refId: "1.2.3", nombre: "Copia de la figura compleja" },
  { refId: "5.2.1", nombre: "Denominación" },
  { refId: "9.3.4", nombre: "Cálculo escrito" }
];
