export const categories = [
  { id: "clasicos", name: "Clásicos" },
  { id: "rellenos", name: "Rellenos" },
  { id: "compartir", name: "Para compartir" },
  { id: "bebidas", name: "Bebidas" },
];
export const seedProducts = [
  [
    "Churros de siempre",
    "Seis churros crujientes, recién hechos y con un toque de azúcar.",
    350,
    "clasicos",
    1,
    "clasicos",
    "6 unidades",
  ],
  [
    "Churros con canela",
    "Nuestra receta de siempre, abrazada por azúcar y canela.",
    390,
    "clasicos",
    1,
    "canela",
    "6 unidades",
  ],
  [
    "Dulce de leche",
    "Dos churros generosos con un corazón suave de dulce de leche.",
    420,
    "rellenos",
    1,
    "rellenos",
    "2 unidades",
  ],
  [
    "Corazón de chocolate",
    "Dos churros rellenos de crema de cacao. Para darse un gusto.",
    420,
    "rellenos",
    1,
    "chocolate",
    "2 unidades",
  ],
  [
    "La caja de los buenos ratos",
    "Dieciocho churros y dos chocolates para compartir sin prisa.",
    1290,
    "compartir",
    1,
    "compartir",
    "Para 3–4 personas",
  ],
  [
    "Chocolate a la taza",
    "Espeso, intenso y perfecto para mojar hasta el último churro.",
    280,
    "bebidas",
    1,
    "bebida",
    "200 ml",
  ],
  [
    "Café con leche",
    "Café recién preparado con leche cremosa. El compañero de siempre.",
    220,
    "bebidas",
    1,
    "cafe",
    "200 ml",
  ],
  [
    "Rellenos de temporada",
    "Una receta especial que volverá pronto a nuestro mostrador.",
    450,
    "rellenos",
    0,
    "rellenos",
    "2 unidades",
  ],
];
export const normalizeSearch = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
