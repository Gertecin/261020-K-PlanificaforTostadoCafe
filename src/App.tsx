import { useEffect, useState } from 'react';
import { useLocalStorage } from './state/useLocalStorage';
import SemanaView from './views/SemanaView';
import TuesteView from './views/TuesteView';
import InventarioView from './views/InventarioView';
import SuscripcionesView from './views/SuscripcionesView';
import MasView from './views/MasView';

type Tab = 'semana' | 'tueste' | 'inventario' | 'suscripciones' | 'mas';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'semana', icon: '📅', label: 'Semana' },
  { id: 'tueste', icon: '🔥', label: 'Tueste' },
  { id: 'inventario', icon: '📦', label: 'Inventario' },
  { id: 'suscripciones', icon: '👥', label: 'Suscrip.' },
  { id: 'mas', icon: '⚙️', label: 'Más' }
];

function leerTab(): Tab {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.some(t => t.id === h) ? h : 'semana';
}

export default function App() {
  const { state, updateState, resetData, isCorrupted } = useLocalStorage();
  const [tab, setTab] = useState<Tab>(leerTab);

  useEffect(() => {
    const onHash = () => setTab(leerTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const irA = (t: Tab) => {
    setTab(t);
    window.location.hash = t;
  };

  return (
    <div className="min-h-screen bg-fondo pb-24">
      <header className="bg-cafe text-white px-4 py-3">
        <div className="max-w-md mx-auto flex items-baseline justify-between">
          <h1 className="font-display font-bold text-lg tracking-tight">Libreta de Tueste</h1>
          <span className="text-[10px] uppercase tracking-widest opacity-70">Tostaduría · CR</span>
        </div>
      </header>

      {isCorrupted && (
        <div role="alert" className="bg-alerta/10 border-b border-alerta text-alerta px-4 py-3 text-sm font-medium flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>Los datos guardados estaban corruptos o eran de otra versión. Se restauraron los ejemplos.</span>
        </div>
      )}

      <main className="max-w-md mx-auto">
        {tab === 'semana' && <SemanaView state={state} updateState={updateState} />}
        {tab === 'tueste' && <TuesteView state={state} />}
        {tab === 'inventario' && <InventarioView state={state} updateState={updateState} />}
        {tab === 'suscripciones' && <SuscripcionesView state={state} updateState={updateState} />}
        {tab === 'mas' && <MasView state={state} updateState={updateState} resetData={resetData} />}
      </main>

      <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 bg-white border-t border-cafe/15 shadow-[0_-4px_12px_rgba(42,27,18,0.06)] z-50">
        <div className="max-w-md mx-auto flex justify-around">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => irA(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 p-2 flex-1 min-h-[56px] transition-colors ${tab === t.id ? 'text-cafe' : 'text-cafe-dark/40'}`}
            >
              <span className="text-xl leading-none" aria-hidden="true">{t.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
