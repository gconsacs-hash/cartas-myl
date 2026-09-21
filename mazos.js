// Mazos armados (se muestran en la pestaña Mazos y se pueden copiar a "Mis mazos").
// Cada línea: código de carta "ED-N" y cantidad. "ORO" = oro básico de cualquier edición.
window.MAZOS_PRESET = [
  {
    id: "heroes-3x",
    nombre: "Héroes agro-control (3 copias)",
    descripcion: "Aliados baratos e imbloqueables (Caminante, Cazador), remoción pegada a los aliados (Guardián Maya, Eztli), " +
      "anulaciones (Fe sin Límite, Aurora Esmerada), Bola de Fuego, y Termópilas + Templo de la Cazadora para cerrar. 17 oros.",
    lineas: [
      ["HL-229", 3], ["ORO", 14],
      ["GJ-90", 3], ["GJ-162", 3], ["GJ-16", 3], ["GJ-15", 3], ["GJ-161", 3], ["GJ-92", 3],
      ["ES-46", 3], ["GJ-42", 3], ["ES-44", 3], ["HL-55", 3],
      ["HL-145", 3]
    ]
  },
  {
    id: "heroes-singleton",
    nombre: "Héroes agro-control (aliados a 1 copia)",
    descripcion: "Misma base de talismanes, tótems y oros, pero con 18 aliados distintos: más variedad de respuestas " +
      "(Voltan, Temístocles, Belerofonte, Ptolomeo para el golpe final).",
    lineas: [
      ["HL-229", 3], ["ORO", 14],
      ["GJ-90", 1], ["GJ-162", 1], ["GJ-16", 1], ["GJ-15", 1], ["GJ-13", 1], ["HL-91", 1],
      ["GJ-161", 1], ["GJ-92", 1], ["GJ-166", 1], ["GJ-87", 1], ["GJ-89", 1], ["HL-88", 1],
      ["HL-87", 1], ["GJ-18", 1], ["HL-15", 1], ["HL-99", 1], ["HL-16", 1], ["HL-98", 1],
      ["ES-46", 3], ["GJ-42", 3], ["ES-44", 3], ["HL-55", 3],
      ["HL-145", 3]
    ]
  }
];
