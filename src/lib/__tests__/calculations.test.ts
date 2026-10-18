import { describe, it, expect } from 'vitest';
import {
  obtenerLunes, sumarDias, sumarMeses, calcularProximoEnvio,
  calcularVerdeNecesario, generarTandas, asignarTandas,
  calcularDemandaSemana, evaluarInventario, cerrarSemana,
  deshacerUltimaSemana, formatearFecha, formatearKg, formatearColones,
  lunesActual
} from '../calculations';
import { AppState, Suscripcion } from '../types';
import { seedData } from '../../data/seed';

describe('Fechas', () => {
  it('obtiene el lunes correcto', () => {
    expect(obtenerLunes('2023-10-25')).toBe('2023-10-23');
    expect(obtenerLunes('2023-10-22')).toBe('2023-10-16');
  });

  it('suma días correctamente', () => {
    expect(sumarDias('2023-10-25', 7)).toBe('2023-11-01');
  });

  it('suma meses con desborde (31/01 -> 28/02)', () => {
    expect(sumarMeses('2023-01-31', 1)).toBe('2023-02-28');
  });

  it('suma meses en año bisiesto (31/01/2024 -> 29/02/2024)', () => {
    expect(sumarMeses('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('calcula próximo envío según frecuencia', () => {
    expect(calcularProximoEnvio('2023-10-25', 'semanal')).toBe('2023-11-01');
    expect(calcularProximoEnvio('2023-10-25', 'quincenal')).toBe('2023-11-08');
    expect(calcularProximoEnvio('2023-01-31', 'mensual')).toBe('2023-02-28');
  });
});

describe('Verde y tandas', () => {
  it('caso de control: 10,2 kg al 15% = 12,0 kg verde', () => {
    expect(calcularVerdeNecesario(10200, 15)).toBe(12000);
  });

  it('maneja mermas con decimales', () => {
    const r = calcularVerdeNecesario(10000, 16.5);
    expect(r).toBeGreaterThan(0);
  });

  it('retorna 0 para 0 gramos', () => {
    expect(calcularVerdeNecesario(0, 15)).toBe(0);
  });

  it('ninguna tanda supera 12 kg', () => {
    const tandas = generarTandas(25000, 12);
    tandas.forEach(t => expect(t).toBeLessThanOrEqual(12000));
  });

  it('casos de borde en tandas', () => {
    expect(generarTandas(12000, 12)).toEqual([12000]);
    expect(generarTandas(12500, 12)).toEqual([12000, 500]);
    expect(generarTandas(24000, 12)).toEqual([12000, 12000]);
    expect(generarTandas(0, 12)).toEqual([]);
  });
});

describe('Asignación a días', () => {
  it('asigna primero al lunes, luego al miércoles', () => {
    const plan = [
      { microloteId: 'm1', tandas: [12000, 12000, 12000] },
      { microloteId: 'm2', tandas: [12000, 12000, 12000] }
    ];
    const { asignadas, sinAsignar } = asignarTandas(plan, ['lunes', 'miércoles'], 6);
    expect(asignadas['lunes'].length).toBe(6);
    expect(sinAsignar.length).toBe(0);
  });

  it('deja sin asignar el excedente', () => {
    const plan = [{ microloteId: 'm1', tandas: Array(13).fill(12000) }];
    const { asignadas, sinAsignar } = asignarTandas(plan, ['lunes', 'miércoles'], 6);
    expect(asignadas['lunes'].length).toBe(6);
    expect(asignadas['miércoles'].length).toBe(6);
    expect(sinAsignar.length).toBe(1);
  });
});

describe('Demanda de la semana', () => {
  const subs: Suscripcion[] = [
    { id: 's1', nombre: 'T1', provincia: 'SJ', plan: '1kg', frecuencia: 'semanal', cafeId: 'm1', diaEnvio: 'jueves', proximoEnvio: '2099-10-26', activa: true },
    { id: 's2', nombre: 'T2', provincia: 'SJ', plan: '340g', frecuencia: 'semanal', cafeId: 'm1', diaEnvio: 'viernes', proximoEnvio: '2099-10-27', activa: true },
    { id: 's3', nombre: 'T3', provincia: 'SJ', plan: '1kg', frecuencia: 'semanal', cafeId: 'm1', diaEnvio: 'lunes', proximoEnvio: '2099-10-23', activa: true }
  ];

  it('incluye lunes y domingo, no el lunes siguiente', () => {
    const d = calcularDemandaSemana(subs, '2099-10-23', {}, 'm1');
    expect(d['m1']).toBe(2340);
  });

  it('proyecta quincenal a semanas futuras', () => {
    const s: Suscripcion[] = [{ id: 's1', nombre: 'T', provincia: 'SJ', plan: '1kg', frecuencia: 'quincenal', cafeId: 'm1', diaEnvio: 'jueves', proximoEnvio: '2099-10-26', activa: true }];
    expect(calcularDemandaSemana(s, '2099-10-23', {}, 'm1')['m1']).toBe(1000);
    expect(calcularDemandaSemana(s, '2099-10-30', {}, 'm1')['m1']).toBeUndefined();
    expect(calcularDemandaSemana(s, '2099-11-06', {}, 'm1')['m1']).toBe(1000);
  });
});

describe('Alerta de inventario', () => {
  it('alerta cuando 4 semanas superan el disponible', () => {
    const d = [{ 'm1': 10000 }, { 'm1': 10000 }, { 'm1': 10000 }, { 'm1': 10000 }];
    const s = ['2099-10-23', '2099-10-30', '2099-11-06', '2099-11-13'];
    const r = evaluarInventario('m1', 15, 30, d, s, []);
    expect(r.alerta).toBe(true);
  });

  it('no alerta cuando el acumulado es igual o menor al disponible', () => {
    const d = [{ 'm1': 7500 }, { 'm1': 7500 }, { 'm1': 7500 }, { 'm1': 7500 }];
    const s = ['2099-10-23', '2099-10-30', '2099-11-06', '2099-11-13'];
    const r = evaluarInventario('m1', 15, 36, d, s, []);
    expect(r.alerta).toBe(false);
  });
});

describe('Cerrar y deshacer semana', () => {
  const stateBase: AppState = {
    ...seedData,
    suscripciones: [{ id: 's1', nombre: 'T', provincia: 'SJ', plan: '1kg', frecuencia: 'semanal', cafeId: 'm1', diaEnvio: 'jueves', proximoEnvio: '2099-10-26', activa: true }],
    microlotes: [{ ...seedData.microlotes[0], verdeDisponibleKg: 100 }]
  };

  it('avanza próximo envío y descuenta verde', () => {
    const c = cerrarSemana(stateBase, '2099-10-23');
    expect(c.suscripciones[0].proximoEnvio).toBe('2099-11-02');
    expect(c.microlotes[0].verdeDisponibleKg).toBeLessThan(100);
    expect(c.semanasEnviadas.length).toBe(1);
  });

  it('deshace el cierre', () => {
    const c = cerrarSemana(stateBase, '2099-10-23');
    const d = deshacerUltimaSemana(c);
    expect(d.suscripciones[0].proximoEnvio).toBe('2099-10-26');
    expect(d.microlotes[0].verdeDisponibleKg).toBe(100);
    expect(d.semanasEnviadas.length).toBe(0);
  });
});

describe('Seed', () => {
  it('tiene 100 suscripciones', () => {
    expect(seedData.suscripciones.length).toBe(100);
  });

  it('tiene 20% sorpresa', () => {
    const n = seedData.suscripciones.filter(s => s.cafeId === 'sorpresa').length;
    expect(n).toBe(20);
  });

  it('dispara alerta en West Valley y Orosi', () => {
    const inicio = lunesActual();
    const sems = [inicio, sumarDias(inicio, 7), sumarDias(inicio, 14), sumarDias(inicio, 21)];
    const d = sems.map(l => calcularDemandaSemana(seedData.suscripciones, l, {}, seedData.sorpresaPorDefecto));
    expect(evaluarInventario('m2', 16, 60, d, sems, []).alerta).toBe(true);
    expect(evaluarInventario('m5', 18, 25, d, sems, []).alerta).toBe(true);
  });

  it('cambiar sorpresa a Central Valley resuelve alerta de West Valley', () => {
    const inicio = lunesActual();
    const sems = [inicio, sumarDias(inicio, 7), sumarDias(inicio, 14), sumarDias(inicio, 21)];
    // Forzamos que la sorpresa sea Central Valley ('m4') en TODAS las semanas del horizonte
    const sorpresaPorSemana: Record<string, string> = {};
    sems.forEach(l => { sorpresaPorSemana[l] = 'm4'; });
    
    const d = sems.map(l => calcularDemandaSemana(seedData.suscripciones, l, sorpresaPorSemana, seedData.sorpresaPorDefecto));
    expect(evaluarInventario('m2', 16, 60, d, sems, []).alerta).toBe(false);
  });
});

describe('Formato', () => {
  it('formatea fechas', () => {
    expect(formatearFecha('2023-10-25')).toBe('25/10/2023');
  });
  it('formatea kilos con coma', () => {
    expect(formatearKg(12.5)).toBe('12,5 kg');
  });
  it('formatea colones', () => {
    expect(formatearColones(9500)).toBe('₡9.500');
  });
});
