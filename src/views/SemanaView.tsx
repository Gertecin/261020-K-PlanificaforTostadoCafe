import { useState } from 'react';
import { AppState } from '../lib/types';
import {
  ajustarAlProximoDiaDespacho, asignarTandas, calcularDetalleSemana,
  cerrarSemana, deshacerUltimaSemana, enviosDeSemana,
  estaAtrasada, formatearColones, formatearFecha,
  formatearKg, generarTandas, lunesActual, lunesInicial,
  sumarDias, sugerirSorpresa
} from '../lib/calculations';

interface Props {
  state: AppState;
  updateState: (u: AppState | ((p: AppState) => AppState)) => void;
}

export default function SemanaView({ state, updateState }: Props) {
  const [lunes, setLunes] = useState(lunesInicial);
  const domingo = sumarDias(lunes, 6);
  const snapshot = state.semanasEnviadas.find(s => s.lunes === lunes);
  const esUltima = state.semanasEnviadas[state.semanasEnviadas.length - 1]?.lunes === lunes;

  const atrasados = state.suscripciones.filter(s => estaAtrasada(s));
  const envios = snapshot ? [] : enviosDeSemana(state.suscripciones, lunes);

  const detalle = snapshot
    ? snapshot.detalle
    : calcularDetalleSemana(state.suscripciones, lunes, state.sorpresaPorSemana, state.sorpresaPorDefecto, state.microlotes, state.config.capacidadTandaKg);

  const totalEnvios = snapshot ? snapshot.envios : envios.length;
  const totalTostadoG = detalle.reduce((a, d) => a + d.tostadoG, 0);
  const totalVerdeG = detalle.reduce((a, d) => a + d.verdeG, 0);
  const totalTandas = detalle.reduce((a, d) => a + d.tandas, 0);
  const ingreso = snapshot ? snapshot.ingresoCs : envios.reduce((a, s) => a + (s.plan === '1kg' ? 24000 : 9500), 0);

  const sorpresaId = state.sorpresaPorSemana[lunes] || state.sorpresaPorDefecto;
  const sugerencia = sugerirSorpresa(state);
  const sugerida = state.microlotes.find(m => m.id === sugerencia.microloteId);
  const enviosSorpresa = envios.filter(s => s.cafeId === 'sorpresa').length;

  const demandaH = Array.from({ length: state.config.horizonteSemanas }, (_, i) =>
    calcularDetalleSemana(state.suscripciones, sumarDias(lunes, i * 7), state.sorpresaPorSemana, state.sorpresaPorDefecto, state.microlotes, state.config.capacidadTandaKg)
  );

  const planTandas = detalle.map(d => ({
    microloteId: d.microloteId,
    tandas: generarTandas(d.verdeG, state.config.capacidadTandaKg)
  }));
  const { sinAsignar } = asignarTandas(planTandas, state.config.diasTueste, state.config.maxTandasPorDia);

  const corregirAtrasados = () => {
    if (!atrasados.length) return;
    if (!window.confirm(`¿Ajustar ${atrasados.length} envío(s) atrasado(s) al próximo jueves o viernes?`)) return;
    const hoy = new Date().toISOString().split('T')[0];
    updateState(prev => ({
      ...prev,
      suscripciones: prev.suscripciones.map(s =>
        estaAtrasada(s) ? { ...s, proximoEnvio: ajustarAlProximoDiaDespacho(s.proximoEnvio, hoy) } : s
      )
    }));
  };

  const marcarEnviada = () => {
    if (!window.confirm(
      `Cerrar semana del ${formatearFecha(lunes)}\n\n` +
      `Envíos: ${totalEnvios}\nTostado: ${formatearKg(totalTostadoG / 1000)}\n` +
      `Verde a descontar: ${formatearKg(totalVerdeG / 1000)}\n\n` +
      `Se avanzará el próximo envío de cada suscripción según su frecuencia.`
    )) return;
    updateState(prev => cerrarSemana(prev, lunes));
  };

  const deshacer = () => {
    if (!window.confirm('¿Deshacer el cierre de esta semana? Se restauran los próximos envíos y el verde descontado.')) return;
    updateState(prev => deshacerUltimaSemana(prev));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Selector de semana */}
      <div className="bg-cafe text-white p-3 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior" className="min-w-[44px] min-h-[44px] rounded-lg active:bg-white/10 text-xl">◀</button>
          <div className="text-center flex-1">
            <div className="text-[10px] uppercase tracking-widest opacity-75">Semana del</div>
            <div className="font-display font-bold text-lg tabular-nums">{formatearFecha(lunes)}</div>
            <div className="text-xs opacity-75 tabular-nums">al {formatearFecha(domingo)}</div>
          </div>
          <button onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente" className="min-w-[44px] min-h-[44px] rounded-lg active:bg-white/10 text-xl">▶</button>
        </div>
        <button onClick={() => setLunes(lunesInicial())} className="w-full mt-2 min-h-[44px] rounded-lg bg-white/10 text-sm font-semibold active:bg-white/20">
          Hoy
        </button>
      </div>

      {/* Snapshot de solo lectura */}
      {snapshot && (
        <div role="status" className="bg-cafetal/10 border border-cafetal/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-cafetal text-sm">
            <span aria-hidden="true">🔒</span> Semana enviada · solo lectura
          </div>
          <p className="text-xs text-cafe-dark/70">
            Cerrada el {formatearFecha(snapshot.cerradaEn)}. Estos son los valores históricos; no se recalculan.
          </p>
          {esUltima && (
            <button onClick={deshacer} className="w-full min-h-[44px] rounded-lg border border-cafetal text-cafetal text-sm font-bold active:bg-cafetal/10">
              ↩ Deshacer última semana enviada
            </button>
          )}
        </div>
      )}

      {/* Envíos atrasados */}
      {atrasados.length > 0 && !snapshot && (
        <div role="alert" className="bg-alerta/10 border border-alerta rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-alerta text-sm">
            <span aria-hidden="true">⚠️</span> {atrasados.length} envío(s) atrasado(s)
          </div>
          <p className="text-xs text-alerta">
            Están fuera de fecha y no computan en ninguna semana. Corrígelos para incluirlos en el plan.
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {atrasados.slice(0, 5).map(s => (
              <div key={s.id} className="text-xs text-cafe-dark flex justify-between gap-2 tabular-nums">
                <span className="truncate">{s.nombre}</span>
                <span className="shrink-0">{formatearFecha(s.proximoEnvio)}</span>
              </div>
            ))}
          </div>
          <button onClick={corregirAtrasados} className="w-full min-h-[44px] rounded-lg bg-alerta text-white text-sm font-bold active:opacity-90">
            Ajustar envíos atrasados
          </button>
        </div>
      )}

      {/* Capacidad superada */}
      {sinAsignar.length > 0 && !snapshot && (
        <div role="alert" className="bg-alerta/10 border border-alerta rounded-xl p-3 text-sm text-alerta">
          <strong className="flex items-center gap-2 mb-1"><span aria-hidden="true">⚠️</span> Capacidad semanal superada</strong>
          {sinAsignar.length} tandas sin lugar · {formatearKg(sinAsignar.reduce((a, t) => a + t.verdeG, 0) / 1000)} de verde. Ver pestaña Tueste.
        </div>
      )}

      {/* Métricas grandes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-xl border border-cafe/10">
          <div className="text-[10px] uppercase tracking-wide text-cafe-dark/50">Envíos</div>
          <div className="text-3xl font-display font-bold text-cafe tabular-nums">{totalEnvios}</div>
          <div className="text-[11px] text-cafe-dark/60 tabular-nums">
            Jue {snapshot ? snapshot.enviosJueves : envios.filter(s => s.diaEnvio === 'jueves').length} · Vie {snapshot ? snapshot.enviosViernes : envios.filter(s => s.diaEnvio === 'viernes').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cafe/10">
          <div className="text-[10px] uppercase tracking-wide text-cafe-dark/50">Ingreso estimado</div>
          <div className="text-xl font-display font-bold text-cafetal tabular-nums">{formatearColones(ingreso)}</div>
          <div className="text-[11px] text-cafe-dark/60">por envíos de la semana</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cafe/10">
          <div className="text-[10px] uppercase tracking-wide text-cafe-dark/50">Café tostado</div>
          <div className="text-2xl font-display font-bold text-cafe tabular-nums">{formatearKg(totalTostadoG / 1000)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-cafe/10">
          <div className="text-[10px] uppercase tracking-wide text-cafe-dark/50">Café verde</div>
          <div className="text-2xl font-display font-bold text-cafe tabular-nums">{formatearKg(totalVerdeG / 1000)}</div>
          <div className="text-[11px] text-cafe-dark/60 tabular-nums">{totalTandas} tandas</div>
        </div>
      </div>

      {/* Sorpresa del tostador */}
      {!snapshot && (
        <div className="bg-cafe-light/10 border border-cafe-light/30 rounded-xl p-4 space-y-3">
          <h3 className="font-display font-bold text-cafe">Sorpresa del tostador</h3>
          <label className="block text-xs text-cafe-dark/70" htmlFor="sorpresa">Microlote para esta semana</label>
          <select
            id="sorpresa"
            value={sorpresaId}
            onChange={e => updateState(prev => ({
              ...prev,
              sorpresaPorSemana: { ...prev.sorpresaPorSemana, [lunes]: e.target.value }
            }))}
            className="w-full p-3 rounded-lg border border-cafe/20 bg-white text-sm min-h-[44px]"
          >
            {state.microlotes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <div className="flex justify-between text-sm tabular-nums">
            <span className="text-cafe-dark/70">Envíos sorpresa</span>
            <strong className="text-cafe">{enviosSorpresa}</strong>
          </div>
          <div className="flex justify-between text-sm tabular-nums">
            <span className="text-cafe-dark/70">Verde de ese microlote</span>
            <strong className="text-cafetal">{formatearKg((detalle.find(d => d.microloteId === sorpresaId)?.verdeG || 0) / 1000)}</strong>
          </div>
          {sugerida && sugerida.id !== sorpresaId && (
            <div className="border-t border-cafe-light/30 pt-3">
              <p className="text-xs text-cafe-dark/70 mb-2">
                Mayor holgura a {state.config.horizonteSemanas} semanas: <strong>{sugerida.nombre}</strong> ({formatearKg(sugerencia.holguraKg)} libres).
              </p>
              <button
                onClick={() => updateState(prev => ({ ...prev, sorpresaPorSemana: { ...prev.sorpresaPorSemana, [lunes]: sugerida.id } }))}
                className="w-full min-h-[44px] rounded-lg bg-cafetal text-white text-sm font-bold active:scale-[0.99]"
              >
                Usar {sugerida.sigla} como sorpresa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detalle por microlote */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-cafe">Plan por microlote</h3>
        {detalle.filter(d => d.tostadoG > 0).map(d => {
          const m = state.microlotes.find(x => x.id === d.microloteId)!;
          const verdeH = demandaH.reduce((a, semana) => a + (semana.find(x => x.microloteId === m.id)?.verdeG || 0), 0);
          const alerta = verdeH > m.verdeDisponibleKg * 1000;
          return (
            <article key={m.id} className="bg-white rounded-xl border-l-4 p-4 shadow-sm" style={{ borderLeftColor: m.color }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-bold text-cafe text-sm leading-snug">{m.nombre}</div>
                  <div className="text-[11px] text-cafe-dark/55">{m.sigla} · {m.proceso} · merma {m.mermaPct.toString().replace('.', ',')} %</div>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-1 rounded-full font-bold tabular-nums ${alerta ? 'bg-alerta/15 text-alerta' : 'bg-cafetal/10 text-cafetal'}`}>
                  {alerta ? '⚠️ Falta verde' : '✓ Con holgura'}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
                <div><dt className="text-[10px] text-cafe-dark/50">Bolsas</dt><dd className="font-bold">{d.bolsas340}×340 g<br />{d.bolsas1kg}×1 kg</dd></div>
                <div><dt className="text-[10px] text-cafe-dark/50">Tostado</dt><dd className="font-bold">{formatearKg(d.tostadoG / 1000, 2)}</dd></div>
                <div><dt className="text-[10px] text-cafe-dark/50">Verde</dt><dd className="font-bold">{formatearKg(d.verdeG / 1000)}</dd></div>
                <div><dt className="text-[10px] text-cafe-dark/50">Tandas</dt><dd className="font-bold">{d.tandas}</dd></div>
                <div><dt className="text-[10px] text-cafe-dark/50">Disponible</dt><dd className="font-bold">{formatearKg(m.verdeDisponibleKg)}</dd></div>
                <div><dt className="text-[10px] text-cafe-dark/50">Plan {state.config.horizonteSemanas} sem.</dt><dd className={`font-bold ${alerta ? 'text-alerta' : 'text-cafetal'}`}>{formatearKg(verdeH / 1000)}</dd></div>
              </dl>
            </article>
          );
        })}
        {detalle.every(d => d.tostadoG === 0) && (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-cafe-dark/60 border border-cafe/10">
            No hay envíos programados en esta semana.
          </div>
        )}
      </section>

      {!snapshot && (
        <button onClick={marcarEnviada} disabled={totalEnvios === 0} className="w-full min-h-[52px] bg-cafetal text-white font-bold rounded-xl shadow-md active:scale-[0.99] disabled:opacity-40">
          ✓ Marcar semana como enviada
        </button>
      )}

      <p className="text-[10px] text-cafe-dark/40 text-center tabular-nums">
        Referencia actual: semana del {formatearFecha(lunesActual())}
      </p>
    </div>
  );
}
