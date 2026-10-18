import { useState } from 'react';
import { AppState, Suscripcion } from '../lib/types';
import {
  ajustarAlProximoDiaDespacho, esDiaDespacho, formatearFecha, lunesActual, sumarDias
} from '../lib/calculations';

interface Props {
  state: AppState;
  updateState: (u: AppState | ((p: AppState) => AppState)) => void;
}

const provincias = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

export default function SuscripcionesView({ state, updateState }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [fMic, setFMic] = useState('todos');
  const [fFreq, setFFreq] = useState('todas');
  const [fEstado, setFEstado] = useState('todos');
  const [editando, setEditando] = useState<Suscripcion | null>(null);
  const [error, setError] = useState('');

  const nuevo = (): Suscripcion => ({
    id: 's-' + Date.now(),
    nombre: '', provincia: 'San José', plan: '340g', frecuencia: 'semanal',
    cafeId: state.microlotes[0]?.id || 'sorpresa',
    diaEnvio: 'jueves', proximoEnvio: sumarDias(lunesActual(), 3), activa: true
  });

  const filtradas = state.suscripciones.filter(s => {
    const q = busqueda.trim().toLowerCase();
    return (!q || s.nombre.toLowerCase().includes(q) || s.provincia.toLowerCase().includes(q))
      && (fMic === 'todos' || s.cafeId === fMic)
      && (fFreq === 'todas' || s.frecuencia === fFreq)
      && (fEstado === 'todos' || (fEstado === 'activas' ? s.activa : !s.activa));
  });

  const guardar = () => {
    if (!editando) return;
    if (editando.nombre.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editando.proximoEnvio) || Number.isNaN(Date.parse(editando.proximoEnvio))) {
      setError('La fecha debe ser válida (AAAA-MM-DD).'); return;
    }
    const existe = state.suscripciones.some(s => s.id === editando.id);
    const limpio = { ...editando, nombre: editando.nombre.trim() };
    updateState(prev => ({
      ...prev,
      suscripciones: existe
        ? prev.suscripciones.map(s => s.id === limpio.id ? limpio : s)
        : [...prev.suscripciones, limpio]
    }));
    setEditando(null); setError('');
  };

  const eliminar = (s: Suscripcion) => {
    if (!window.confirm(`¿Eliminar la suscripción de ${s.nombre}? Esta acción no se puede deshacer.`)) return;
    updateState(prev => ({ ...prev, suscripciones: prev.suscripciones.filter(x => x.id !== s.id) }));
  };

  const ajustarDia = (s: Suscripcion) => {
    const nueva = ajustarAlProximoDiaDespacho(s.proximoEnvio);
    updateState(prev => ({
      ...prev,
      suscripciones: prev.suscripciones.map(x => x.id === s.id ? { ...x, proximoEnvio: nueva } : x)
    }));
  };

  const campo = "w-full p-3 rounded-lg border border-cafe/20 bg-white text-sm min-h-[44px]";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-2xl text-cafe">Suscripciones</h2>
        <button onClick={() => { setEditando(nuevo()); setError(''); }} className="min-h-[44px] px-4 rounded-lg bg-cafetal text-white text-sm font-bold active:scale-95">
          + Alta
        </button>
      </div>

      {/* Formulario de alta / edición */}
      {editando && (
        <section className="bg-white rounded-xl border border-cafe/20 p-4 space-y-3">
          <h3 className="font-display font-bold text-cafe">
            {state.suscripciones.some(s => s.id === editando.id) ? 'Editar suscripción' : 'Nueva suscripción'}
          </h3>

          <label className="block">
            <span className="text-xs text-cafe-dark/70">Nombre y apellido</span>
            <input className={campo} value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} placeholder="Ej. Ana Lucía Jiménez" />
          </label>

          <label className="block">
            <span className="text-xs text-cafe-dark/70">Provincia</span>
            <select className={campo} value={editando.provincia} onChange={e => setEditando({ ...editando, provincia: e.target.value })}>
              {provincias.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-cafe-dark/70">Microlote</span>
            <select className={campo} value={editando.cafeId} onChange={e => setEditando({ ...editando, cafeId: e.target.value })}>
              {state.microlotes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              <option value="sorpresa">Sorpresa del tostador</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-cafe-dark/70">Plan</span>
              <select className={campo} value={editando.plan} onChange={e => setEditando({ ...editando, plan: e.target.value as '340g' | '1kg' })}>
                <option value="340g">340 g · ₡9.500</option>
                <option value="1kg">1 kg · ₡24.000</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-cafe-dark/70">Frecuencia</span>
              <select className={campo} value={editando.frecuencia} onChange={e => setEditando({ ...editando, frecuencia: e.target.value as Suscripcion['frecuencia'] })}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-cafe-dark/70">Día de envío</span>
              <select className={campo} value={editando.diaEnvio} onChange={e => setEditando({ ...editando, diaEnvio: e.target.value as 'jueves' | 'viernes' })}>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-cafe-dark/70">Próximo envío</span>
              <input type="date" className={campo} value={editando.proximoEnvio} onChange={e => setEditando({ ...editando, proximoEnvio: e.target.value })} />
            </label>
          </div>

          {!esDiaDespacho(editando.proximoEnvio) && (
            <div className="bg-alerta/10 border border-alerta rounded-lg p-3 text-xs text-alerta space-y-2">
              <p>⚠️ Esa fecha no cae en jueves ni viernes.</p>
              <button onClick={() => setEditando({ ...editando, proximoEnvio: ajustarAlProximoDiaDespacho(editando.proximoEnvio) })} className="min-h-[44px] w-full rounded-lg bg-alerta text-white font-bold">
                Ajustar al próximo día de despacho
              </button>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={editando.activa} onChange={e => setEditando({ ...editando, activa: e.target.checked })} className="w-5 h-5 accent-[#2F4A3A]" />
            Suscripción activa
          </label>

          {error && <p role="alert" className="text-sm text-alerta font-medium">⚠️ {error}</p>}

          <div className="flex gap-2">
            <button onClick={guardar} className="flex-1 min-h-[44px] rounded-lg bg-cafetal text-white font-bold text-sm">Guardar</button>
            <button onClick={() => { setEditando(null); setError(''); }} className="flex-1 min-h-[44px] rounded-lg border border-cafe/20 text-cafe text-sm font-bold">Cancelar</button>
          </div>
        </section>
      )}

      {/* Búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-cafe/10 p-3 space-y-2">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o provincia…" aria-label="Buscar suscripción" className={campo} />
        <div className="grid grid-cols-2 gap-2">
          <select value={fMic} onChange={e => setFMic(e.target.value)} aria-label="Filtrar por microlote" className="p-2 rounded-lg border border-cafe/20 text-xs min-h-[44px]">
            <option value="todos">Todos los cafés</option>
            {state.microlotes.map(m => <option key={m.id} value={m.id}>{m.sigla}</option>)}
            <option value="sorpresa">Sorpresa</option>
          </select>
          <select value={fFreq} onChange={e => setFFreq(e.target.value)} aria-label="Filtrar por frecuencia" className="p-2 rounded-lg border border-cafe/20 text-xs min-h-[44px]">
            <option value="todas">Toda frecuencia</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} aria-label="Filtrar por estado" className="w-full p-2 rounded-lg border border-cafe/20 text-xs min-h-[44px]">
          <option value="todos">Todas las estados</option>
          <option value="activas">Solo activas</option>
          <option value="pausadas">Solo pausadas</option>
        </select>
      </div>

      <p className="text-xs text-cafe-dark/60 tabular-nums">{filtradas.length} de {state.suscripciones.length} suscripciones</p>

      {/* Listado */}
      <div className="space-y-2">
        {filtradas.length === 0 && (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-cafe-dark/60 border border-cafe/10">
            No hay suscripciones con esos filtros.
          </div>
        )}
        {filtradas.map(s => {
          const m = state.microlotes.find(x => x.id === s.cafeId);
          const diaInvalido = !esDiaDespacho(s.proximoEnvio);
          return (
            <article key={s.id} className={`bg-white rounded-xl border p-3 shadow-sm ${s.activa ? 'border-cafe/10' : 'border-cafe/10 opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-cafe text-sm truncate">{s.nombre}</h3>
                  <p className="text-[11px] text-cafe-dark/55">{s.provincia} · {s.plan === '1kg' ? '1 kg' : '340 g'} · {s.frecuencia}</p>
                  <p className="text-[11px] text-cafetal mt-1 tabular-nums">
                    {m ? m.sigla : s.cafeId === 'sorpresa' ? 'Sorpresa' : s.cafeId} · {formatearFecha(s.proximoEnvio)}
                  </p>
                </div>
                <button
                  onClick={() => updateState(prev => ({ ...prev, suscripciones: prev.suscripciones.map(x => x.id === s.id ? { ...x, activa: !x.activa } : x) }))}
                  className={`shrink-0 min-h-[44px] px-3 rounded-full text-[11px] font-bold ${s.activa ? 'bg-cafetal/10 text-cafetal' : 'bg-cafe/10 text-cafe-dark/60'}`}
                >
                  {s.activa ? 'Activa' : 'Pausada'}
                </button>
              </div>

              {diaInvalido && (
                <div className="mt-2 bg-alerta/10 rounded-lg p-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-alerta">⚠️ Fuera de día de despacho</span>
                  <button onClick={() => ajustarDia(s)} className="min-h-[44px] px-2 text-[11px] font-bold text-alerta underline">Ajustar</button>
                </div>
              )}

              <div className="flex gap-2 mt-2 pt-2 border-t border-cafe/10">
                <button onClick={() => { setEditando({ ...s }); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 min-h-[44px] rounded-lg border border-cafe/20 text-cafe text-xs font-bold">Editar</button>
                <button onClick={() => eliminar(s)} className="flex-1 min-h-[44px] rounded-lg border border-alerta/40 text-alerta text-xs font-bold">Eliminar</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
