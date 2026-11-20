export const event = {
  demo: true,
  name: 'QuantumBeers',
  date: '3 DIC 2026',
  dateLong: 'Jueves, 3 de diciembre de 2026',
  time: '18:00 — 23:00',
  city: 'Vitoria-Gasteiz',
  venue: 'Estación orbital · Vitoria-Gasteiz',
  address: 'Espacio y dirección por confirmar',
  ticketUrl: null,
};

export const chapters = [
  { id: 'inicio', number: '01', name: 'El portal', label: 'Inicio', coordinate: '00.000 / 00.000', color: '#baffdb' },
  { id: 'evento', number: '02', name: 'El laboratorio', label: 'El evento', coordinate: '12.450 / −38.000', color: '#73eceb' },
  { id: 'ponentes', number: '03', name: 'Las mentes', label: 'Ponentes', coordinate: '−08.000 / −83.000', color: '#b19aff' },
  { id: 'programa', number: '04', name: 'El tiempo', label: 'Programa', coordinate: '08.000 / −128.000', color: '#73eceb' },
  { id: 'pub', number: '05', name: 'Quantum Pub', label: 'Experiencia', coordinate: '−03.000 / −178.000', color: '#f6a23a' },
  { id: 'entradas', number: '06', name: 'Tu próximo salto', label: 'Entradas', coordinate: '00.000 / −225.000', color: '#baffdb' },
];

// Todo el contenido de demostración se edita aquí. No son personas ni organizaciones reales.
export const speakers = [
  { id: 'vera', name: 'Vera Salvat', role: 'Investigadora en computación cuántica', field: 'QUANTUM COMPUTING', talk: 'El universo no usa bits.', time: '18:30', initials: 'VS', color: '#78efef', bio: 'Personaje ficticio para esta demostración. Vera investiga cómo llevar los algoritmos cuánticos del laboratorio al mundo real. Una conversación sin fórmulas imposibles sobre superposición, entrelazamiento y lo que viene después.', description: 'Un viaje de los bits a los qubits, sin necesidad de traer una pizarra.' },
  { id: 'leo', name: 'Leo Nakamura', role: 'Diseñador de sistemas de inteligencia artificial', field: 'ARTIFICIAL INTELLIGENCE', talk: '¿Sueñan las IA con pintas eléctricas?', time: '19:15', initials: 'LN', color: '#b19aff', bio: 'Personaje ficticio para esta demostración. Leo explora la relación entre creatividad humana y sistemas generativos. Su charla abre preguntas sobre la inteligencia, la imaginación y nuestro papel en un futuro compartido.', description: 'Creatividad, modelos generativos y el extraño futuro que estamos construyendo.' },
  { id: 'ines', name: 'Inés Vega', role: 'Ingeniera de tecnologías emergentes', field: 'FUTURE SYSTEMS', talk: 'El futuro ya está en la barra.', time: '20:15', initials: 'IV', color: '#f6a23a', bio: 'Personaje ficticio para esta demostración. Inés conecta robótica, interfaces espaciales y nuevas formas de interacción. Experimentos reales, preguntas incómodas y tecnología que empieza a salir de la pantalla.', description: 'Interfaces espaciales, robótica y otras ideas que parecen ciencia ficción.' },
];

export const schedule = [
  { time: '18:00', title: 'Apertura del portal', type: 'BIENVENIDA', who: 'Check-in · Primera cerveza · Primeras conexiones' },
  { time: '18:30', title: speakers[0].talk, type: 'CHARLA / 30 MIN', who: speakers[0].name },
  { time: '19:15', title: speakers[1].talk, type: 'CHARLA / 30 MIN', who: speakers[1].name },
  { time: '19:45', title: 'Entrelazamiento social', type: 'BEER BREAK', who: 'Networking y Quantum Balance Challenge' },
  { time: '20:15', title: speakers[2].talk, type: 'CHARLA / 30 MIN', who: speakers[2].name },
  { time: '21:00', title: 'The Quantum Pub is open', type: 'AFTERPARTY', who: 'Conversaciones sin límite de qubits · Hasta las 23:00' },
];

export const sponsors = [
  { name: 'Qubit Labs', mark: 'Q:', description: 'Partner cuántico', url: null },
  { name: 'NEURAL', mark: 'N↗', description: 'Partner de inteligencia artificial', url: null },
  { name: 'Planck Brewing', mark: 'pℏ', description: 'Cerveza de otra dimensión', url: null },
];
