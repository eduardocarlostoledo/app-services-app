const SERVICE_EXAMPLES = [
  { title: 'Arreglar canilla que gotea', description: 'Canilla de la cocina pierde agua, necesito que la arreglen.' },
  { title: 'Cortar el pasto del jardín', description: 'Jardín de 50m2, necesita corte y bordeado.' },
  { title: 'Pintar habitación', description: 'Habitación de 4x4m, paredes y techo, pintura incluida.' },
  { title: 'Instalación de aire acondicionado', description: 'Split de 3000 frigorías, ya tengo el equipo.' },
  { title: 'Arreglo de persiana', description: 'Persiana trabada, no sube ni baja.' },
  { title: 'Destapación de cañerías', description: 'Baño principal tapado, agua no drena.' },
  { title: 'Colocación de cerámica', description: 'Piso de baño 3x2m, tengo las cerámicas.' },
  { title: 'Poda de árboles', description: 'Árbol grande en el fondo, necesita poda de ramas.' },
  { title: 'Reparación de techo', description: 'Goteras en el techo del living cuando llueve.' },
  { title: 'Instalación eléctrica', description: 'Agregar 3 tomacorrientes nuevos en la cocina.' },
  { title: 'Mudanza pequeña', description: 'Mover muebles de un departamento a otro, mismo edificio.' },
  { title: 'Limpieza profunda', description: 'Limpieza completa de departamento 3 ambientes.' },
  { title: 'Armado de muebles', description: 'Armar placard y escritorio de melamina.' },
  { title: 'Reparación de lavarropas', description: 'Lavarropas no centrifuga, hace ruido.' },
  { title: 'Colocación de durlock', description: 'Pared divisoria de 3m de largo por 2.5m de alto.' },
];

export const getRandomExamples = (count = 3) => {
  const shuffled = [...SERVICE_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export default SERVICE_EXAMPLES;
