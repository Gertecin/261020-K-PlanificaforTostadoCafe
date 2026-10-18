import { useState } from 'react';
import { AppState, Microlote } from '../lib/types';
import {
  calcularDemandaSemana, evaluarInventario, formatearFecha, formatearKg,
  lunesInicial, sumarDias
} from '../lib/calculations';

interface Props {
  state: AppState;
  updateState: (u: AppState | ((p: AppState) => AppState)) => void;
}

function CompraVerde({ onRegistrar }: { onRegistrar: (kg: number) => void }) {
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  
  return (
    <div className="flex gap-2">
      <input
        type="number"
        inputMode="decimal"
        min="0.5"
        step="0.5"
        value={valor}
        onChange={e => setValor(e.target.value)}
        placeholder="Kg comprados"
        aria-label="Kilos de verde comprados"
        className="w-full min-w-0 p-2 rounded-lg border border-cafe/20 bg-white text-sm tabular-nums min-h-[44px]"
      />
      <button
        onClick={() => {
          const kg = Number(valor);
          if (!valor || !Number.isFinite(kg) || kg <= 0) {
            setError('Ingresá una cantidad válida.');
            return;
          }
          setError('');
          setValor('');
          onRegistrar(kg);
        }}
        className="shrink-0 px-3 min-h-[44px] rounded-lg bg-cafetal text-white text-xs font-bold active:opacity-90"
      >
        + Registrar
      </button>
      {error && <p className="text-xs text-alerta mt-1">{error}</p>}
    </div>
  );
}

export default function InventarioView({ state, updateState }: Props) {
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const inicio = lunesInicial();
  const semanas = Array.from({ length: state.config.horizonteSemanas }, (_, i) => sumarDias(inicio, i * 7));

  const demandasPorSemana: Record<string, number>[] = semanas.map(lunes => {
    const snap = state.semanasEnviadas.find(s => s.lunes === lunes);
    if (snap) {
      const r: Record<string, number> = {};
      snap.detalle.forEach(d => { r[d.microloteId] = d.tostadoG; });
      return r;
    }
    return calcularDemandaSemana(
      state.suscripciones,
      lunes,
      state.sorpresaPorSemana,
      state.sorpresaPorDefecto
    );
  });

  const registrarCompra = (m: Microlote, kg: number) => {
    updateState(prev => ({
      ...prev,
      microlotes: prev.microlotes.map(x =>
        x.id === m.id ? { ...x, verdeDisponibleKg: x.verdeDisponibleKg + kg } : x
      ),
      historialCompras: [
        ...prev.historialCompras,
        { fecha: new Date().toISOString().split('T')[0], microloteId: m.id, kg }
      ]
    }));
  };

  const holguraDe = (m: Microlote): number => {
    const demandaActual = demandasPorSemana[0]?.[m.id] || 0;
    const verdeRequerido = demandaActual / (1 - m.mermaPct / 100);
    return m.verdeDisponibleKg - verdeRequerido / 1000;
  };

  const reasignar = (m: Microlote) => {
    const destinoId = destinos[m.id];
    const destino = state.microlotes.find(x => x.id === destinoId);
    if (!destino || destino.id === m.id) return;
    const afectadas = state.suscripciones.filter(s => s.cafeId === m.id);
    if (!afectadas.length) {
      window.alert('Este microlote no tiene suscripciones directas para mover.');
      return;
    }
    if (!window.confirm(
      `¿Mover ${afectadas.length} suscripciones de ${m.nombre} a ${destino.nombre}?\nHolgura estimada de destino: ${formatearKg(holguraDe(destino))}.`
    )) return;
    updateState(prev => ({
      ...prev,
      suscripciones: prev.suscripciones.map(s =>
        s.cafeId === m.id ? { ...s, cafeId: destinoId } : s
      )
    }));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-display font-bold text-2xl text-cafe">Inventario de verde</h2>
        <p className="text-xs text-cafe-dark/60 mt-1">
          Horizonte de {state.config.horizonteSemanas} semanas · acumulado sin contar semanas enviadas
        </p>
      </div>

      {state.microlotes.map(m => {
        const r = evaluarInventario(
          m.id,
          m.mermaPct,
          m.verdeDisponibleKg,
          demandasPorSemana,
          semanas,
          state.semanasEnviadas.map(s => s.lunes)
        );

        const maxBarra = Math.max(m.verdeDisponibleKg, r.verdeAcumuladoKg, 1);
        const pctDisp = Math.min(100, (m.verdeDisponibleKg / maxBarra) * 100);
        const pctPlan = Math.min(100, (r.verdeAcumuladoKg / maxBarra) * 100);

        return (
          <article key={m.id} className="bg-white rounded-xl border border-cafe/10 p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-cafe text-sm leading-snug">{m.nombre}</h3>
                <p className="text-[11px] text-cafe-dark/55">{m.productor} · {m.proceso}</p>
              </div>
              <span
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: m.color }}
              >
                {m.sigla}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs tabular-nums">
                <span className="text-cafetal font-bold">Disponible {formatearKg(m.verdeDisponibleKg)}</span>
                <span className="text-cafe-dark/60">Plan {formatearKg(r.verdeAcumuladoKg)}</span>
              </div>
              <div className="relative h-3 bg-cafe/10 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-cafetal/70 rounded-full"
                  style={{ width: `${pctDisp}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 border-r-2 border-cafe"
                  style={{ width: `${pctPlan}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cafe-dark/60">
                <span>
                  <span className="inline-block w-2 h-2 bg-cafetal/70 rounded-sm mr-1" />
                  Disponible
                </span>
                <span>
                  <span className="inline-block w-2 h-2 border-r-2 border-cafe mr-1" />
                  Planificado
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {r.porSemana.map((p, i) => (
                <div key={p.lunes} className="text-center bg-fondo rounded-lg p-2">
                  <div className="text-[9px] text-cafe-dark/50 uppercase">S{i + 1}</div>
                  <div className="text-[11px] font-bold text-cafe tabular-nums">
                    {formatearKg(p.verdeG / 1000)}
                  </div>
                  <div className="text-[9px] text-cafe-dark/45 tabular-nums">
                    Σ {formatearKg(p.acumuladoG / 1000)}
                  </div>
                </div>
              ))}
              {r.porSemana.length === 0 && (
                <div className="col-span-4 text-center text-xs text-cafe-dark/40 py-2">
                  Sin proyección disponible
                </div>
              )}
            </div>

            {r.alerta && (
              <div role="alert" className="bg-alerta/10 border border-alerta rounded-lg p-3 space-y-3">
                <div className="text-sm font-bold text-alerta flex items-center gap-2">
                  <span aria-hidden="true">⚠️</span> Falta verde: {formatearKg(r.deficitKg)}
                </div>
                {r.primeraSemanaFaltante && (
                  <p className="text-xs text-alerta tabular-nums">
                    El acumulado supera el stock en la semana del{' '}
                    {formatearFecha(r.primeraSemanaFaltante)}.
                  </p>
                )}
                <CompraVerde onRegistrar={kg => registrarCompra(m, kg)} />
                <div>
                  <label className="block text-[11px] text-alerta mb-1" htmlFor={`dest-${m.id}`}>
                    Cambiar suscriptores a un microlote con holgura
                  </label>
                  <div className="flex gap-2">
                    <select
                      id={`dest-${m.id}`}
                      value={destinos[m.id] || ''}
                      onChange={e => setDestinos(prev => ({ ...prev, [m.id]: e.target.value }))}
                      className="w-full min-w-0 p-2 rounded-lg border border-alerta/40 bg-white text-xs min-h-[44px]"
                    >
                      <option value="">Elegir destino…</option>
                      {state.microlotes
                        .filter(x => x.id !== m.id)
                        .map(x => (
                          <option key={x.id} value={x.id}>
                            {x.sigla} · holgura {formatearKg(holguraDe(x))}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => reasignar(m)}
                      disabled={!destinos[m.id]}
                      className="shrink-0 px-3 min-h-[44px] rounded-lg bg-alerta text-white text-xs font-bold disabled:opacity-40"
                    >
                      Mover
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
