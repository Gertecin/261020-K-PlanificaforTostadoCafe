import { useEffect, useState } from 'react';
import { useLocalStorage } from './state/useLocalStorage';
import SemanaView from './views/SemanaView';
import TuesteView from './views/TuesteView';
import InventarioView from './views/InventarioView';
import SuscripcionesView from './views/SuscripcionesView';
import MasView from './views/MasView';
import { ADMIN_PASSWORD } from './constants';

type Tab = 'semana' | 'tueste' | 'inventario' | 'suscripciones' | 'admin';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'semana', icon: '📅', label: 'Semana' },
  { id: 'tueste', icon: '🔥', label: 'Tueste' },
  { id: 'inventario', icon: '📦', label: 'Inventario' },
  { id: 'suscripciones', icon: '👥', label: 'Suscrip.' },
  { id: 'admin', icon: '⚙️', label: 'Más' }
];

function leerTab(): Tab {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.some(t => t.id === h) ? h : 'semana';
}

export default function App() {
  const { state, updateState, resetData, isCorrupted } = useLocalStorage();
  const [tab, setTab] = useState<Tab>(leerTab);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const onHash = () => {
      const newTab = leerTab();
      setTab(newTab);
      if (newTab !== 'admin') {
        setPasswordInput('');
        setPasswordError('');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const irA = (t: Tab) => {
    setTab(t);
    window.location.hash = t;
  };

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Clave incorrecta. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    irA('semana');
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
        
        {tab === 'admin' && !isAdminAuthenticated && (
          <div className="p-4 space-y-4 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 bg-cafe/10 rounded-full flex items-center justify-center text-3xl mb-2">🔒</div>
            <h2 className="font-display font-bold text-2xl text-cafe">Acceso Restringido</h2>
            <p className="text-sm text-cafe-dark/60 text-center px-4">
              Ingresa la clave de administrador para acceder a la configuración de la tostaduría.
            </p>
            <input
              type="password"
              inputMode="text"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
              placeholder="Clave de acceso"
              className="w-full max-w-xs p-3 rounded-lg border border-cafe/20 bg-white text-sm min-h-[44px] text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-cafetal"
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              autoFocus
            />
            {passwordError && <p className="text-sm text-alerta font-medium">{passwordError}</p>}
            <button
              onClick={handleLogin}
              className="w-full max-w-xs min-h-[44px] rounded-lg bg-cafetal text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Ingresar
            </button>
            <button
              onClick={() => irA('semana')}
              className="text-sm text-cafe-dark/50 underline mt-2"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {tab === 'admin' && isAdminAuthenticated && (
          <MasView state={state} updateState={updateState} resetData={resetData} onLogout={handleLogout} />
        )}
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
