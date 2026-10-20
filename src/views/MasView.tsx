import { useState } from 'react';
import { AppState, Microlote, TostadorConfig } from '../lib/types';
import { formatearFecha, formatearKg } from '../lib/calculations';

interface Props {
  state: AppState;
  updateState: (u: AppState | ((p: AppState) => AppState)) => void;
  resetData: () => void;
  onLogout: () => void;
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function EditorMicrolote({ m, onSave }: { m: Microlote; onSave: (merma: number, verde: number) => void }) {
  const [merma, setMerma] = useState(String(m.mermaPct));
  const [verde, setVerde] = useState(String(m.verdeDisponibleKg));
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    const me = Number(merma.replace(',', '.'));
    const ve = Number(verde.replace(',', '.'));
    if (!Number.isFinite(me) || me < 5 || me > 30) { setError('La merma debe estar entre 5 % y 30 %.'); setGuardado(false); return; }
    if (!Number.isFinite(ve) || ve < 0) { setError('El verde disponible no puede ser negativo.'); setGuardado(false); return; }
    setError(''); onSave(Math.round(me * 10) / 10, ve); setGuardado(true);
  };

  return (
    <div className="border border-cafe/10 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color }}>{m.sigla}</span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-cafe truncate">{m.nombre}</div>
          <div className="text-[10px] text-cafe-dark/55">{m.productor}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-cafe-dark/60">Merma (%)</span>
          <input inputMode="decimal" value={merma} onChange={e => { setMerma(e.target.value); setGuardado(false); }} className="w-full p-2 rounded-lg border border-cafe/20 text-sm tabular-nums min-h-[44px]" />
        </label>
        <label className="block">
          <span className="text-[10px] text-cafe-dark/60">Verde (kg)</span>
          <input inputMode="decimal" value={verde} onChange={e => { setVerde(e.target.value); setGuardado(false); }} className="w-full p-2 rounded-lg border border-cafe/20 text-sm tabular-nums min-h-[44px]" />
        </label>
      </div>
      {error && <p role="alert" className="text-xs text-alerta">⚠️ {error}</p>}
      {guardado && !error && <p className="text-xs text-cafetal">✓ Cambios guardados</p>}
      <button onClick={guardar} className="w-full min-h-[44px] rounded-lg bg-cafe text-white text-xs font-bold active:opacity-90">Guardar microlote</button>
    </div>
  );
}

function EditorTostador({ config, onSave }: { config: TostadorConfig; onSave: (c: TostadorConfig) => void }) {
  const [cap, setCap] = useState(String(config.capacidadTandaKg));
  const [max, setMax] = useState(String(config.maxTandasPorDia));
  const [hor, setHor] = useState(String(config.horizonteSemanas));
  const [dias, setDias] = useState<string[]>(config.diasTueste);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const guardar = () => {
    const c = Number(cap), mx = Number(max), h = Number(hor);
    if (!Number.isFinite(c) || c < 1 || c > 100) { setError('La capacidad debe estar entre 1 y 100 kg.'); setOk(false); return; }
    if (!Number.isInteger(mx) || mx < 1 || mx > 20) { setError('Las tandas por día deben ser un entero entre 1 y 20.'); setOk(false); return; }
    if (!Number.isInteger(h) || h < 1 || h > 8) { setError('El horizonte debe estar entre 1 y 8 semanas.'); setOk(false); return; }
    if (dias.length === 0) { setError('Seleccioná al menos un día de tueste.'); setOk(false); return; }
    setError('');
    onSave({ capacidadTandaKg: c, maxTandasPorDia: mx, horizonteSemanas: h, diasTueste: DIAS.filter(d => dias.includes(d)) });
    setOk(true);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-cafe-dark/60">Kg / tanda</span>
          <input inputMode="numeric" value={cap} onChange={e => { setCap(e.target.value); setOk(false); }} className="w-full p-2 rounded-lg border border-cafe/20 text-sm tabular-nums min-h-[44px]" />
        </label>
        <label className="block">
          <span className="text-[10px] text-cafe-dark/60">Tandas / día</span>
          <input inputMode="numeric" value={max} onChange={e => { setMax(e.target.value); setOk(false); }} className="w-full p-2 rounded-lg border border-cafe/20 text-sm tabular-nums min-h-[44px]" />
        </label>
        <label className="block">
          <span className="text-[10px] text-cafe-dark/60">Horizonte (sem)</span>
          <input inputMode="numeric" value={hor} onChange={e => { setHor(e.target.value); setOk(false); }} className="w-full p-2 rounded-lg border border-cafe/20 text-sm tabular-nums min-h-[44px]" />
        </label>
      </div>
      <div>
        <p className="text-[10px] text-cafe-dark/60 mb-2">Días de tueste (en orden)</p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map(d => (
            <button
              key={d}
              onClick={() => { setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); setOk(false); }}
              aria-pressed={dias.includes(d)}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-bold capitalize border ${dias.includes(d) ? 'bg-cafetal text-white border-cafetal' : 'bg-white text-cafe-dark/60 border-cafe/20'}`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-cafe-dark/50 mt-2">Orden actual: {dias.join(' → ') || 'ninguno'}</p>
      </div>
      {error && <p role="alert" className="text-xs text-alerta">⚠️ {error}</p>}
      {ok && !error && <p className="text-xs text-cafetal">✓ Configuración guardada</p>}
      <button onClick={guardar} className="w-full min-h-[44px] rounded-lg bg-cafe text-white text-sm font-bold active:opacity-90">Guardar tostador</button>
    </div>
  );
}

export default function MasView({ state, updateState, resetData, onLogout }: Props) {
  const [seccion, setSeccion] = useState<'microlotes' | 'tostador' | 'historial' | 'datos'>('microlotes');
  const secciones = [
    { id: 'microlotes' as const, label: 'Microlotes' },
    { id: 'tostador' as const, label: 'Tostador' },
    { id: 'historial' as const, label: 'Historial' },
    { id: 'datos' as const, label: 'Datos' }
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display font-bold text-2xl text-cafe">Ajustes de la tostaduría</h2>

      <div className="flex gap-1 bg-cafe/5 rounded-xl p-1">
        {secciones.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)} className={`flex-1 min-h-[44px] rounded-lg text-[11px] font-bold ${seccion === s.id ? 'bg-white text-cafe shadow-sm' : 'text-cafe-dark/50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {seccion === 'microlotes' && (
        <section className="space-y-3">
          <p className="text-xs text-cafe-dark/60">Editá la merma de tueste y el verde disponible de cada origen. Los cambios recalculan el plan.</p>
          {state.microlotes.map(m => (
            <EditorMicrolote
              key={m.id}
              m={m}
              onSave={(merma, verde) => updateState(prev => ({
                ...prev,
                microlotes: prev.microlotes.map(x => x.id === m.id ? { ...x, mermaPct: merma, verdeDisponibleKg: verde } : x)
              }))}
            />
          ))}
        </section>
      )}

      {seccion === 'tostador' && (
        <section className="bg-white rounded-xl border border-cafe/10 p-4">
          <h3 className="font-display font-bold text-cafe mb-3">Capacidad y calendario</h3>
          <EditorTostador config={state.config} onSave={config => updateState(prev => ({ ...prev, config }))} />
        </section>
      )}

      {seccion === 'historial' && (
        <section className="space-y-4">
          <div className="bg-white rounded-xl border border-cafe/10 p-4">
            <h3 className="font-display font-bold text-cafe mb-3">Compras de verde</h3>
            {state.historialCompras.length === 0
              ? <p className="text-sm text-cafe-dark/50">Sin compras registradas.</p>
              : <div className="space-y-2">
                  {[...state.historialCompras].reverse().map((c, i) => {
                    const m = state.microlotes.find(x => x.id === c.microloteId);
                    return (
                      <div key={i} className="flex justify-between text-sm tabular-nums border-b border-cafe/10 last:border-0 pb-2">
                        <span>{formatearFecha(c.fecha)} · {m?.sigla || c.microloteId}</span>
                        <strong className="text-cafetal">+{formatearKg(c.kg)}</strong>
                      </div>
                    );
                  })}
                </div>}
          </div>

          <div className="bg-white rounded-xl border border-cafe/10 p-4">
            <h3 className="font-display font-bold text-cafe mb-3">Semanas enviadas</h3>
            {state.semanasEnviadas.length === 0
              ? <p className="text-sm text-cafe-dark/50">Sin semanas cerradas.</p>
              : <div className="space-y-3">
                  {[...state.semanasEnviadas].reverse().map(s => (
                    <div key={s.lunes} className="border border-cafe/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <strong className="text-sm text-cafe tabular-nums">{formatearFecha(s.lunes)}</strong>
                        <span className="text-[10px] text-cafetal font-bold">ENVIADA</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-1 text-xs text-cafe-dark/70 tabular-nums">
                        <dt>Envíos</dt><dd className="text-right font-bold">{s.envios}</dd>
                        <dt>Tostado</dt><dd className="text-right font-bold">{formatearKg(s.tostadoG / 1000)}</dd>
                        <dt>Verde descontado</dt><dd className="text-right font-bold">{formatearKg(s.verdeG / 1000)}</dd>
                        <dt>Ingreso</dt><dd className="text-right font-bold">₡{s.ingresoCs.toLocaleString('es-CR')}</dd>
                      </dl>
                    </div>
                  ))}
                </div>}
          </div>
        </section>
      )}

      {seccion === 'datos' && (
        <section className="space-y-4">
          <div className="bg-white rounded-xl border border-cafe/10 p-4 space-y-3">
            <h3 className="font-display font-bold text-cafe">Persistencia local</h3>
            <p className="text-xs text-cafe-dark/60">
              Los datos viven en este navegador bajo la clave <code className="text-cafe font-bold">tostado-cafe:v1</code>.
              No se envía información a ningún servidor.
            </p>
            <dl className="text-sm space-y-1 tabular-nums">
              <div className="flex justify-between"><dt className="text-cafe-dark/60">Microlotes</dt><dd className="font-bold">{state.microlotes.length}</dd></div>
              <div className="flex justify-between"><dt className="text-cafe-dark/60">Suscripciones</dt><dd className="font-bold">{state.suscripciones.length}</dd></div>
              <div className="flex justify-between"><dt className="text-cafe-dark/60">Semanas cerradas</dt><dd className="font-bold">{state.semanasEnviadas.length}</dd></div>
              <div className="flex justify-between"><dt className="text-cafe-dark/60">Verde total en stock</dt><dd className="font-bold">{formatearKg(state.microlotes.reduce((a, m) => a + m.verdeDisponibleKg, 0))}</dd></div>
            </dl>
          </div>

          <div className="bg-alerta/10 border border-alerta rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-alerta">Restaurar datos de ejemplo</h3>
            <p className="text-xs text-alerta">
              Borra los cambios locales y vuelve a las 100 suscripciones y los 6 microlotes originales. Esta acción no se puede deshacer.
            </p>
            <button
              onClick={() => { if (window.confirm('¿Restaurar todos los datos de ejemplo? Se perderán los cambios realizados.')) resetData(); }}
              className="w-full min-h-[44px] rounded-lg bg-alerta text-white text-sm font-bold active:scale-[0.99]"
            >
              🔄 Restaurar datos de ejemplo
            </button>
          </div>

          <p className="text-[10px] text-cafe-dark/40 text-center">Libreta de Tueste · v1.0 · Hecho para tostadurías de especialidad</p>

          <button
            onClick={onLogout}
            className="w-full min-h-[44px] rounded-lg border border-cafe/20 text-cafe text-sm font-bold active:bg-cafe/5 mt-6"
          >
            Cerrar sesión de administrador
          </button>
        </section>
      )}
    </div>
  );
}
