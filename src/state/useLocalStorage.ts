import { useEffect, useState } from 'react';
import { AppState } from '../lib/types';
import { seedData } from '../data/seed';

const STORAGE_KEY = 'tostado-cafe:v1';

function esValido(d: unknown): d is AppState {
  if (!d || typeof d !== 'object') return false;
  const s = d as AppState;
  if (!Array.isArray(s.microlotes) || s.microlotes.length === 0) return false;
  if (!Array.isArray(s.suscripciones)) return false;
  if (!s.config || typeof s.config.capacidadTandaKg !== 'number') return false;
  if (!Array.isArray(s.config.diasTueste) || s.config.diasTueste.length === 0) return false;
  if (typeof s.sorpresaPorDefecto !== 'string') return false;
  if (!s.sorpresaPorSemana || typeof s.sorpresaPorSemana !== 'object') return false;
  if (!Array.isArray(s.semanasEnviadas)) return false;
  if (!Array.isArray(s.historialCompras)) return false;
  // Migración/defensa: la v1 anterior guardaba strings en semanasEnviadas.
  for (const snap of s.semanasEnviadas) {
    if (!snap || typeof snap !== 'object' || typeof snap.lunes !== 'string') return false;
    if (!Array.isArray(snap.avance) || !Array.isArray(snap.descuento)) return false;
  }
  for (const m of s.microlotes) {
    if (typeof m.id !== 'string' || typeof m.mermaPct !== 'number') return false;
    if (m.mermaPct < 5 || m.mermaPct > 30) return false;
  }
  return true;
}

export function useLocalStorage() {
  const [state, setState] = useState<AppState>(seedData);
  const [isCorrupted, setIsCorrupted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!esValido(parsed)) throw new Error('Estructura inválida o versión anterior');
      setState(parsed);
    } catch {
      setIsCorrupted(true);
      setState(seedData);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData)); } catch { /* almacenamiento bloqueado */ }
    }
  }, []);

  const updateState = (updater: AppState | ((prev: AppState) => AppState)) => {
    setState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: AppState) => AppState)(prev) : updater;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* cuota excedida */ }
      return next;
    });
  };

  const resetData = () => {
    setState(seedData);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData)); } catch { /* noop */ }
    setIsCorrupted(false);
  };

  return { state, updateState, resetData, isCorrupted };
}
