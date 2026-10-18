import { AppState } from '../lib/types';
import {
  asignarTandas, calcularDetalleSemana, formatearFecha, formatearKg,
  generarTandas, lunesInicial
} from '../lib/calculations';

interface Props { state: AppState; }

export default function TuesteView({ state }: Props) {
  const lunes = lunesInicial();
  const snapshot = state.semanasEnviadas.find(s => s.lunes === lunes);

  const detalle = snapshot
    ? snapshot.detalle
    : calcularDetalleSemana(state.suscripciones, lunes, state.sorpresaPorSemana, state.sorpresaPorDefecto, state.microlotes, state.config.capacidadTandaKg);

  const plan = detalle.map(d => ({
    microloteId: d.microloteId,
    tandas: generarTandas(d.verdeG, state.config.capacidadTandaKg)
  }));

  const { asignadas, sinAsignar } = asignarTandas(plan, state.config.diasTueste, state.config.maxTandasPorDia);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-display font-bold text-2xl text-cafe">Libreta de tueste</h2>
        <p className="text-xs text-cafe-dark/60 mt-1 tabular-nums">Semana del {formatearFecha(lunes)} · {state.config.capacidadTandaKg} kg por tanda</p>
      </div>

      {snapshot && (
        <div role="status" className="bg-cafetal/10 border border-cafetal/30 rounded-xl p-3 text-sm text-cafetal">
          🔒 Semana enviada. Libreta histórica de solo lectura.
        </div>
      )}

      {state.config.diasTueste.map(dia => {
        const lista = asignadas[dia] || [];
        return (
          <section key={dia} className="bg-white rounded-xl border border-cafe/10 overflow-hidden shadow-sm">
            <header className="bg-cafe text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-display font-bold capitalize">{dia}</h3>
              <span className="text-xs bg-white/15 px-2 py-1 rounded-full tabular-nums">
                {lista.length} de {state.config.maxTandasPorDia} tandas
              </span>
            </header>
            <div className="divide-y divide-cafe/10">
              {lista.length === 0 && <p className="p-4 text-sm text-cafe-dark/50 text-center">Sin tandas asignadas.</p>}
              {lista.map((t, i) => {
                const m = state.microlotes.find(x => x.id === t.microloteId)!;
                const tostado = (t.verdeG / 1000) * (1 - m.mermaPct / 100);
                return (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <span className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: m.color }}>{m.sigla}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-cafe truncate">{m.nombre}</div>
                      <div className="text-[11px] text-cafe-dark/55 tabular-nums">Tanda {i + 1} · merma {m.mermaPct.toString().replace('.', ',')} %</div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-sm font-bold text-cafetal">{formatearKg(t.verdeG / 1000)}</div>
                      <div className="text-[11px] text-cafe-dark/55">→ {formatearKg(tostado, 2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {sinAsignar.length > 0 && (
        <section role="alert" className="bg-alerta/10 border border-alerta rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-alerta flex items-center gap-2"><span aria-hidden="true">⚠️</span> Sin asignar</h3>
          <p className="text-sm text-alerta tabular-nums">
            {sinAsignar.length} tandas · {formatearKg(sinAsignar.reduce((a, t) => a + t.verdeG, 0) / 1000)} de verde no entran esta semana.
          </p>
          <div className="space-y-1">
            {sinAsignar.map((t, i) => {
              const m = state.microlotes.find(x => x.id === t.microloteId)!;
              return (
                <div key={i} className="flex justify-between text-sm text-cafe-dark border-b border-alerta/20 last:border-0 py-1 tabular-nums">
                  <span className="truncate pr-2">{m.nombre}</span>
                  <strong className="shrink-0">{formatearKg(t.verdeG / 1000)}</strong>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-alerta">Ninguna tanda se descartó. Ajustá días o capacidad en Más → Tostador.</p>
        </section>
      )}
    </div>
  );
}
