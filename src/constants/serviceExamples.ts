export const SERVICE_EXAMPLES = [
  { title: "Arreglar canilla de la cocina", description: "La canilla de la cocina pierde agua y necesito que alguien la revise y la arregle." },
  { title: "Cortar pasto del patio", description: "El pasto del patio está bastante alto y necesito alguien con máquina para cortarlo." },
  { title: "Ayuda para mudanza", description: "Necesito ayuda para bajar muebles y cajas porque estoy haciendo una mudanza." },
  { title: "Pintar una pared", description: "Quiero pintar una pared del living y necesito alguien que me ayude con el trabajo." },
  { title: "Limpiar patio", description: "El patio tiene hojas y suciedad acumulada. Busco alguien que lo limpie." },
  { title: "Instalar lámpara", description: "Compré una lámpara nueva y necesito que alguien la instale en el techo." },
  { title: "Cuidar perro por la noche", description: "Necesito que alguien cuide a mi perro desde la noche hasta la mañana." },
  { title: "Armar mueble nuevo", description: "Compré un mueble en caja y necesito ayuda para armarlo correctamente." },
  { title: "Reparar enchufe", description: "Un enchufe dejó de funcionar y necesito que alguien lo revise." },
  { title: "Pasear perro", description: "Necesito que alguien pasee a mi perro esta tarde durante una hora." },
  { title: "Destapar pileta de cocina", description: "La pileta de la cocina está tapada y el agua no baja." },
  { title: "Colgar televisor", description: "Necesito instalar un soporte y colgar el televisor en la pared." },
  { title: "Cambiar cuerda de persiana", description: "La persiana no sube bien y creo que hay que cambiarle la cuerda." },
  { title: "Limpieza profunda de cocina", description: "Necesito una limpieza profunda de la cocina." },
  { title: "Instalar ventilador de techo", description: "Necesito instalar un ventilador de techo en una habitación." },
  { title: "Revisar termotanque", description: "El termotanque no calienta bien y necesito que lo revisen." },
  { title: "Pintar reja", description: "Quiero pintar una reja del frente y necesito mano de obra." },
  { title: "Instalar cerradura", description: "Necesito instalar una cerradura nueva en una puerta." },
  { title: "Siliconar baño", description: "Hay que poner silicona en el baño porque entra agua por las juntas." },
  { title: "Colgar cuadros", description: "Quiero colgar varios cuadros y necesito alguien con herramientas." },
  { title: "Lavar auto", description: "Necesito alguien que lave mi auto en casa." },
  { title: "Podar plantas", description: "Necesito alguien que pode unas plantas del patio." },
  { title: "Armar biblioteca", description: "Compré una biblioteca desarmada y necesito que la armen." },
  { title: "Cambiar tabla de inodoro", description: "Necesito cambiar la tabla del inodoro." },
  { title: "Limpiar vidrios", description: "Necesito limpieza de vidrios en ventanas y puerta balcón." },
  { title: "Ajustar puerta que roza", description: "La puerta roza al abrir y cerrar. Necesito que la ajusten." },
  { title: "Reparar picaporte", description: "El picaporte de una puerta está flojo y no funciona bien." },
  { title: "Cambiar flexible de baño", description: "El flexible del baño pierde agua y necesito cambiarlo." },
  { title: "Sellar filtración", description: "Hay una filtración pequeña y necesito que alguien selle la zona." },
  { title: "Limpieza post obra", description: "Necesito limpieza general después de una pequeña obra." },
];

export function getRandomExamples(count: number = 8): typeof SERVICE_EXAMPLES {
  const shuffled = [...SERVICE_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
