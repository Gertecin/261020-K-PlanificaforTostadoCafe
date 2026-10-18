export type Frecuencia = 'semanal' | 'quincenal' | 'mensual';
export type DiaEnvio = 'jueves' | 'viernes';
export type Plan = '340g' | '1kg';

export interface Microlote {
  id: string;
  nombre: string;
  productor: string;
  proceso: string;
  mermaPct: number;
  verdeDisponibleKg: number;
  color: string;
  sigla: string;
}

export interface Suscripcion {
  id: string;
  nombre: string;
  provincia: string;
  plan: Plan;
  frecuencia: Frecuencia;
  cafeId: string;
  diaEnvio: DiaEnvio;
  proximoEnvio: string;
  activa: boolean;
}

export interface TostadorConfig {
  capacidadTandaKg: number;
  diasTueste: string[];
  maxTandasPorDia: number;
  horizonteSemanas: number;
}

export interface DetalleSemana {
  microloteId: string;
  bolsas340: number;
  bolsas1kg: number;
  tostadoG: number;
  verdeG: number;
  tandas: number;
}

export interface InstantaneaSemana {
  lunes: string;
  cerradaEn: string;
  envios: number;
  enviosJueves: number;
  enviosViernes: number;
  tostadoG: number;
  verdeG: number;
  tandas: number;
  ingresoCs: number;
  detalle: DetalleSemana[];
  avance: { suscripcionId: string; anterior: string; nuevo: string }[];
  descuento: { microloteId: string; verdeG: number }[];
}

export interface AppState {
  microlotes: Microlote[];
  suscripciones: Suscripcion[];
  config: TostadorConfig;
  sorpresaPorDefecto: string;
  sorpresaPorSemana: Record<string, string>;
  semanasEnviadas: InstantaneaSemana[];
  historialCompras: { fecha: string; microloteId: string; kg: number }[];
}

export interface ResultadoInventario {
  alerta: boolean;
  deficitKg: number;
  primeraSemanaFaltante: string | null;
  verdeAcumuladoKg: number;
  porSemana: { lunes: string; verdeG: number; acumuladoG: number }[];
}
