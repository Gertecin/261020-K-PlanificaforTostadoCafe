import {
  AppState, DetalleSemana, Frecuencia, InstantaneaSemana,
  Microlote, ResultadoInventario, Suscripcion
} from './types';

// ---------- FECHAS (días calendario, sin zonas horarias) ----------

export function obtenerLunes(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().split('T')[0];
}

export function sumarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().split('T')[0];
}

export function sumarMeses(fechaStr: string, meses: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const target = m - 1 + meses;
  const date = new Date(Date.UTC(y, target, d));
  const mesEsperado = ((target % 12) + 12) % 12;
  if (date.getUTCMonth() !== mesEsperado) date.setUTCDate(0);
  return date.toISOString().split('T')[0];
}

export function calcularProximoEnvio(fechaStr: string, frecuencia: Frecuencia): string {
  if (frecuencia === 'semanal') return sumarDias(fechaStr, 7);
  if (frecuencia === 'quincenal') return sumarDias(fechaStr, 14);
  return sumarMeses(fechaStr, 1);
}

export function lunesActual(): string {
  return obtenerLunes(new Date().toISOString().split('T')[0]);
}

export function lunesInicial(): string {
  const hoy = new Date().toISOString().split('T')[0];
  const lunes = obtenerLunes(hoy);
  return new Date(hoy + 'T12:00:00Z').getUTCDay() === 0 ? sumarDias(lunes, 7) : lunes;
}

export function esDiaDespacho(fechaStr: string): boolean {
  const dia = new Date(fechaStr + 'T12:00:00Z').getUTCDay();
  return dia === 4 || dia === 5;
}

export function ajustarAlProximoDiaDespacho(fechaStr: string, desde?: string): string {
  let f = desde && desde > fechaStr ? desde : fechaStr;
  for (let i = 0; i < 7; i++) {
    if (esDiaDespacho(f)) return f;
    f = sumarDias(f, 1);
  }
  return f;
}

export function estaAtrasada(s: Suscripcion, referencia: string = lunesActual()): boolean {
  return s.activa && s.proximoEnvio < referencia;
}

function proyectarHastaSemana(fecha: string, frecuencia: Frecuencia, lunes: string): string {
  let f = fecha;
  for (let i = 0; i < 200 && f < lunes; i++) f = calcularProximoEnvio(f, frecuencia);
  return f;
}

// ---------- VERDE Y TANDAS (enteros: gramos y décimas de %) ----------

export function calcularVerdeNecesario(gramosTostados: number, mermaPct: number): number {
  if (gramosTostados <= 0) return 0;
  const mermaDecimas = Math.round(mermaPct * 10);
  const denominador = 1000 - mermaDecimas;
  if (denominador <= 0) return gramosTostados;
  return Math.ceil((gramosTostados * 1000) / (denominador * 500)) * 500;
}

export function generarTandas(verdeTotalGramos: number, capacidadTandaKg: number): number[] {
  if (verdeTotalGramos <= 0 || capacidadTandaKg <= 0) return [];
  const cap = Math.floor(capacidadTandaKg * 1000);
  const tandas: number[] = [];
  let restante = verdeTotalGramos;
  while (restante > 0) {
    const t = Math.min(restante, cap);
    tandas.push(t);
    restante -= t;
  }
  return tandas;
}

// ---------- DEMANDA ----------

export function resolverCafe(
  s: Suscripcion, lunes: string,
  sorpresaPorSemana: Record<string, string>, sorpresaPorDefecto: string
): string {
  return s.cafeId === 'sorpresa'
    ? (sorpresaPorSemana[lunes] || sorpresaPorDefecto)
    : s.cafeId;
}

export function enviosDeSemana(
  suscripciones: Suscripcion[], lunes: string,
  referencia: string = lunesActual()
): Suscripcion[] {
  const domingo = sumarDias(lunes, 6);
  return suscripciones.filter(s => {
    if (!s.activa) return false;
    if (estaAtrasada(s, referencia)) return false;
    if (lunes < referencia) {
      return s.proximoEnvio >= lunes && s.proximoEnvio <= domingo;
    }
    const f = proyectarHastaSemana(s.proximoEnvio, s.frecuencia, lunes);
    return f >= lunes && f <= domingo;
  });
}

export function calcularDemandaSemana(
  suscripciones: Suscripcion[], lunes: string,
  sorpresaPorSemana: Record<string, string>, sorpresaPorDefecto: string
): Record<string, number> {
  const demanda: Record<string, number> = {};
  enviosDeSemana(suscripciones, lunes).forEach(s => {
    const id = resolverCafe(s, lunes, sorpresaPorSemana, sorpresaPorDefecto);
    demanda[id] = (demanda[id] || 0) + (s.plan === '1kg' ? 1000 : 340);
  });
  return demanda;
}

export function calcularDetalleSemana(
  suscripciones: Suscripcion[], lunes: string,
  sorpresaPorSemana: Record<string, string>, sorpresaPorDefecto: string,
  microlotes: Microlote[], capacidadTandaKg: number
): DetalleSemana[] {
  const envios = enviosDeSemana(suscripciones, lunes);
  return microlotes.map(m => {
    const delMic = envios.filter(s => resolverCafe(s, lunes, sorpresaPorSemana, sorpresaPorDefecto) === m.id);
    const bolsas340 = delMic.filter(s => s.plan === '340g').length;
    const bolsas1kg = delMic.filter(s => s.plan === '1kg').length;
    const tostadoG = bolsas340 * 340 + bolsas1kg * 1000;
    const verdeG = calcularVerdeNecesario(tostadoG, m.mermaPct);
    return {
      microloteId: m.id, bolsas340, bolsas1kg, tostadoG, verdeG,
      tandas: generarTandas(verdeG, capacidadTandaKg).length
    };
  });
}

// ---------- ASIGNACIÓN A DÍAS ----------

export function asignarTandas(
  planSemana: { microloteId: string; tandas: number[] }[],
  diasTueste: string[], maxTandasPorDia: number
): {
  asignadas: Record<string, { microloteId: string; verdeG: number }[]>;
  sinAsignar: { microloteId: string; verdeG: number }[];
} {
  const asignadas: Record<string, { microloteId: string; verdeG: number }[]> = {};
  const contadores: Record<string, number> = {};
  diasTueste.forEach(d => { asignadas[d] = []; contadores[d] = 0; });
  const sinAsignar: { microloteId: string; verdeG: number }[] = [];

  planSemana.forEach(item => {
    item.tandas.forEach(verdeG => {
      let colocado = false;
      for (const dia of diasTueste) {
        if ((contadores[dia] || 0) < maxTandasPorDia) {
          asignadas[dia].push({ microloteId: item.microloteId, verdeG });
          contadores[dia]++;
          colocado = true;
          break;
        }
      }
      if (!colocado) sinAsignar.push({ microloteId: item.microloteId, verdeG });
    });
  });
  return { asignadas, sinAsignar };
}

// ---------- INVENTARIO A N SEMANAS ----------

export function evaluarInventario(
  microloteId: string, mermaPct: number, verdeDisponibleKg: number,
  demandasSemanas: Record<string, number>[], lunesSemanas: string[],
  semanasExcluidas: string[]
): ResultadoInventario {
  let acumuladoG = 0;
  let primeraSemanaFaltante: string | null = null;
  const disponibleG = Math.round(verdeDisponibleKg * 1000);
  const porSemana: { lunes: string; verdeG: number; acumuladoG: number }[] = [];

  for (let i = 0; i < lunesSemanas.length; i++) {
    const lunes = lunesSemanas[i];
    if (semanasExcluidas.includes(lunes)) continue;
    const verdeG = calcularVerdeNecesario(demandasSemanas[i]?.[microloteId] || 0, mermaPct);
    acumuladoG += verdeG;
    porSemana.push({ lunes, verdeG, acumuladoG });
    if (acumuladoG > disponibleG && primeraSemanaFaltante === null) primeraSemanaFaltante = lunes;
  }

  const alerta = acumuladoG > disponibleG;
  return {
    alerta,
    deficitKg: alerta ? (acumuladoG - disponibleG) / 1000 : 0,
    primeraSemanaFaltante,
    verdeAcumuladoKg: acumuladoG / 1000,
    porSemana
  };
}

export function sugerirSorpresa(state: AppState): { microloteId: string; holguraKg: number } {
  const inicio = lunesInicial();
  const semanas = Array.from({ length: state.config.horizonteSemanas }, (_, i) => sumarDias(inicio, i * 7));
  const demandas = semanas.map(l => calcularDemandaSemana(state.suscripciones, l, state.sorpresaPorSemana, state.sorpresaPorDefecto));
  const excluidas = state.semanasEnviadas.map(s => s.lunes);
  let mejor = { microloteId: state.microlotes[0]?.id || '', holguraKg: -Infinity };

  state.microlotes.forEach(m => {
    const r = evaluarInventario(m.id, m.mermaPct, m.verdeDisponibleKg, demandas, semanas, excluidas);
    const holgura = m.verdeDisponibleKg - r.verdeAcumuladoKg;
    if (holgura > mejor.holguraKg) mejor = { microloteId: m.id, holguraKg: holgura };
  });
  return mejor;
}

// ---------- CIERRE DE SEMANA Y DESHACER (puros) ----------

export function cerrarSemana(state: AppState, lunes: string): AppState {
  if (state.semanasEnviadas.some(s => s.lunes === lunes)) return state;

  const envios = enviosDeSemana(state.suscripciones, lunes);
  const detalle = calcularDetalleSemana(
    state.suscripciones, lunes, state.sorpresaPorSemana,
    state.sorpresaPorDefecto, state.microlotes, state.config.capacidadTandaKg
  );

  const avance = envios.map(s => ({
    suscripcionId: s.id,
    anterior: s.proximoEnvio,
    nuevo: calcularProximoEnvio(s.proximoEnvio, s.frecuencia)
  }));

  const descuento = detalle
    .filter(d => d.verdeG > 0)
    .map(d => ({ microloteId: d.microloteId, verdeG: d.verdeG }));

  const suscripciones = state.suscripciones.map(s => {
    const a = avance.find(x => x.suscripcionId === s.id);
    return a ? { ...s, proximoEnvio: a.nuevo } : s;
  });

  const microlotes = state.microlotes.map(m => {
    const d = descuento.find(x => x.microloteId === m.id);
    if (!d) return m;
    return {
      ...m,
      verdeDisponibleKg: Math.max(0, Math.round(m.verdeDisponibleKg * 1000) - d.verdeG) / 1000
    };
  });

  const instantanea: InstantaneaSemana = {
    lunes,
    cerradaEn: new Date().toISOString().split('T')[0],
    envios: envios.length,
    enviosJueves: envios.filter(s => esDiaDespacho(s.proximoEnvio) && new Date(s.proximoEnvio + 'T12:00:00Z').getUTCDay() === 4).length,
    enviosViernes: envios.filter(s => new Date(s.proximoEnvio + 'T12:00:00Z').getUTCDay() === 5).length,
    tostadoG: detalle.reduce((a, d) => a + d.tostadoG, 0),
    verdeG: detalle.reduce((a, d) => a + d.verdeG, 0),
    tandas: detalle.reduce((a, d) => a + d.tandas, 0),
    ingresoCs: envios.reduce((a, s) => a + (s.plan === '1kg' ? 24000 : 9500), 0),
    detalle,
    avance,
    descuento
  };

  return {
    ...state, suscripciones, microlotes,
    semanasEnviadas: [...state.semanasEnviadas, instantanea]
  };
}

export function deshacerUltimaSemana(state: AppState): AppState {
  if (state.semanasEnviadas.length === 0) return state;
  const ultima = state.semanasEnviadas[state.semanasEnviadas.length - 1];

  const suscripciones = state.suscripciones.map(s => {
    const a = ultima.avance.find(x => x.suscripcionId === s.id);
    return a ? { ...s, proximoEnvio: a.anterior } : s;
  });

  const microlotes = state.microlotes.map(m => {
    const d = ultima.descuento.find(x => x.microloteId === m.id);
    if (!d) return m;
    return { ...m, verdeDisponibleKg: (Math.round(m.verdeDisponibleKg * 1000) + d.verdeG) / 1000 };
  });

  return {
    ...state, suscripciones, microlotes,
    semanasEnviadas: state.semanasEnviadas.slice(0, -1)
  };
}

// ---------- FORMATO ----------

export function formatearFecha(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatearKg(kg: number, decimales = 1): string {
  return kg.toFixed(decimales).replace('.', ',') + ' kg';
}

export function formatearColones(monto: number): string {
  return '₡' + monto.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
