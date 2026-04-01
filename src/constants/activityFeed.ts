const ACTIVITIES = [
  "Juan completó un servicio de plomería en Palermo",
  "María terminó una limpieza profunda en Caballito",
  "Carlos arregló una puerta en Almagro",
  "Laura hizo una mudanza en Belgrano",
  "Pedro instaló un aire acondicionado en Recoleta",
  "Ana pintó una habitación en Villa Crespo",
  "Diego reparó un enchufe en San Telmo",
  "Sofía cortó el pasto en Flores",
  "Martín armó un mueble en Núñez",
  "Valentina cuidó mascotas en Colegiales",
  "Lucas destapar una pileta en Devoto",
  "Camila instaló una lámpara en Barracas",
  "Tomás podó un árbol en Liniers",
  "Florencia limpió una terraza en Boedo",
  "Nicolás cambió una cerradura en Once",
];

const PRICES = [8000, 12000, 15000, 18000, 20000, 25000, 30000, 35000, 40000, 50000];
const DISTANCES = [0.5, 1.2, 2.0, 3.5, 5.0, 7.0, 10.0, 15.0];

export function getRandomActivities(count: number = 8) {
  const shuffled = [...ACTIVITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((text) => ({
    text,
    price: PRICES[Math.floor(Math.random() * PRICES.length)],
    distance_km: DISTANCES[Math.floor(Math.random() * DISTANCES.length)],
  }));
}

export function getDailyCompletedCount(): number {
  return Math.floor(Math.random() * 30) + 15;
}
