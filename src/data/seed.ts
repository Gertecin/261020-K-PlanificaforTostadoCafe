import { AppState, Frecuencia, Plan, Suscripcion } from '../lib/types';
import { ajustarAlProximoDiaDespacho, lunesActual, sumarDias, sumarMeses } from '../lib/calculations';

const base = lunesActual();

const nombres = [
  'María Fernanda Rodríguez','José Luis Vargas','Ana Lucía Jiménez','Carlos Alberto Mora',
  'Sofía Ramírez','Diego Hernández','Valeria Castro','Andrés Mora',
  'Isabella Rojas','Fernando Salazar','Paula Méndez','Ricardo Solano',
  'Gabriela Fernández','Marco Antonio Vega','Laura Chinchilla','Roberto Brenes',
  'Camila Araya','Sebastián Quesada','Daniela Calvo','Alejandro Jiménez',
  'Natalia Vargas','Jorge Luis Araya','Patricia Mora','Miguel Ángel Solano',
  'Carolina Herrera','Víctor Manuel Rojas','Adriana Fernández','Francisco José Calvo',
  'Mónica Vargas','Luis Alberto Méndez','Silvia Chaves','Rodrigo Ramírez',
  'Andrea Solano','Esteban Quesada','Claudia Jiménez','Óscar Arias',
  'María José Castro','Pablo Herrera','Lucía Mora','Javier Salazar',
  'Renata Vargas','Tomás Gutiérrez','Isabel Muñoz','Felipe Sánchez',
  'Carmen Rosa Aguilar','Manuel de la Cruz','Elena Villalobos','Raúl Fonseca',
  'Teresa Obregón','Guillermo Trejos','Rosa María Bolaños','Hernán Córdoba',
  'Angélica Soto','Bernardo Esquivel','Dolores Madrigal','Emiliano Navarro',
  'Florencia Segura','Gonzalo Picado','Herminia Ulloa','Ignacio Valverde',
  'Julia Zamora','Kevin Montero','Lorena Barrios','Mauricio Coto',
  'Nuria Delgado','Octavio Espinoza','Paloma Fajardo','Quirino Granados',
  'Rafaela Hidalgo','Salvador Ibáñez','Ursula Jáuregui','Víctor Llobret',
  'Wendy Marín','Xavier Núñez','Yolanda Ocampo','Zacarías Padilla',
  'Amanda Quirós','Bautista Roldán','Cecilia Salinas','Demetrio Tovar',
  'Elisa Ureña','Fabio Velásquez','Griselda Wang','Humberto Xavier',
  'Irene Yáñez','Jacinto Zúñiga','Katia Arrieta','Leopoldo Blandón',
  'Micaela Cordero','Néstor Dávila','Olga Elizondo','Pedro Flórez',
  'Quintina Guevara','Román Henríquez','Susana Irías','Teodoro Jiménez',
  'Úrsula Kopper','Valentín Leiva','Wendy Solís','Álvaro Brenes'
];

const provincias = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

// [cantidad 1kg, cantidad 340g] por frecuencia
const grupos: {
  cafeId: string;
  sem: [number, number];
  quin: [number, number];
  mens: [number, number];
}[] = [
  { cafeId: 'm1',       sem: [6, 4], quin: [3, 2], mens: [2, 1] }, // 18
  { cafeId: 'm2',       sem: [4, 5], quin: [2, 2], mens: [1, 1] }, // 15
  { cafeId: 'm3',       sem: [3, 4], quin: [2, 1], mens: [1, 1] }, // 12
  { cafeId: 'm4',       sem: [4, 5], quin: [2, 2], mens: [1, 1] }, // 15
  { cafeId: 'm5',       sem: [3, 3], quin: [2, 2], mens: [1, 1] }, // 12
  { cafeId: 'm6',       sem: [3, 3], quin: [1, 1], mens: [0, 0] }, //  8
  { cafeId: 'sorpresa', sem: [6, 6], quin: [3, 3], mens: [1, 1] }  // 20
];

function construirSuscripciones(): Suscripcion[] {
  const out: Suscripcion[] = [];
  let idx = 0;

  const agregar = (cafeId: string, frecuencia: Frecuencia, plan: Plan, cantidad: number) => {
    for (let i = 0; i < cantidad; i++) {
      const jueves = idx % 2 === 0;
      let fecha = sumarDias(base, jueves ? 3 : 4);

      // Media docena de mensuales ya vencen el mes que viene:
      // permite demostrar el avance de frecuencia al cerrar la semana.
      if (frecuencia === 'mensual' && i % 2 === 1) {
        fecha = ajustarAlProximoDiaDespacho(sumarMeses(sumarDias(base, 3), 1));
      }

      out.push({
        id: 's' + String(idx + 1).padStart(3, '0'),
        nombre: nombres[idx % nombres.length],
        provincia: provincias[idx % provincias.length],
        plan,
        frecuencia,
        cafeId,
        diaEnvio: jueves ? 'jueves' : 'viernes',
        proximoEnvio: fecha,
        activa: true
      });
      idx++;
    }
  };

  grupos.forEach(g => {
    agregar(g.cafeId, 'semanal', '1kg', g.sem[0]);
    agregar(g.cafeId, 'semanal', '340g', g.sem[1]);
    agregar(g.cafeId, 'quincenal', '1kg', g.quin[0]);
    agregar(g.cafeId, 'quincenal', '340g', g.quin[1]);
    agregar(g.cafeId, 'mensual', '1kg', g.mens[0]);
    agregar(g.cafeId, 'mensual', '340g', g.mens[1]);
  });

  // Caso real de demostración 1: envío atrasado (jueves de la semana anterior).
  // No computa en ninguna semana hasta que el tostador lo corrija.
  out[17].proximoEnvio = sumarDias(base, -4);

  // Caso real de demostración 2: próximo envío cae en lunes.
  // La UI lo etiqueta y ofrece ajustarlo al próximo jueves/viernes.
  // Sigue dentro de la semana, por lo que NO altera la demanda proyectada.
  out[50].proximoEnvio = base;

  return out;
}

export const seedData: AppState = {
  microlotes: [
    { id: 'm1', nombre: 'Tarrazú lavado La Pastora', productor: 'Finca La Pastora', proceso: 'Lavado', mermaPct: 15, verdeDisponibleKg: 180, color: '#8B5E3C', sigla: 'TAR' },
    { id: 'm2', nombre: 'West Valley Naranjo honey', productor: 'Finca Naranjo', proceso: 'Honey', mermaPct: 16, verdeDisponibleKg: 60, color: '#D4A373', sigla: 'WV' },
    { id: 'm3', nombre: 'Brunca natural Pérez Zeledón', productor: 'Finca Brunca', proceso: 'Natural', mermaPct: 17, verdeDisponibleKg: 45, color: '#A98467', sigla: 'BRU' },
    { id: 'm4', nombre: 'Central Valley Poás lavado', productor: 'Finca Poás', proceso: 'Lavado', mermaPct: 14, verdeDisponibleKg: 120, color: '#6B8E23', sigla: 'CV' },
    { id: 'm5', nombre: 'Orosi anaeróbico', productor: 'Finca Orosi', proceso: 'Anaeróbico', mermaPct: 18, verdeDisponibleKg: 25, color: '#556B2F', sigla: 'ORO' },
    { id: 'm6', nombre: 'Guanacaste peaberry', productor: 'Finca Guanacaste', proceso: 'Lavado', mermaPct: 15, verdeDisponibleKg: 40, color: '#CD853F', sigla: 'GUA' }
  ],
  suscripciones: construirSuscripciones(),
  config: {
    capacidadTandaKg: 12,
    diasTueste: ['lunes', 'miércoles'],
    maxTandasPorDia: 6,
    horizonteSemanas: 4
  },
  sorpresaPorDefecto: 'm2',
  sorpresaPorSemana: {},
  semanasEnviadas: [],
  historialCompras: []
};
