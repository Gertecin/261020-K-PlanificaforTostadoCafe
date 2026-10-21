import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../state/useLocalStorage';
import { seedData } from '../../data/seed';
import { AppState } from '../../lib/types';

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('inicializa con seedData cuando no hay datos', () => {
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current.state.microlotes.length).toBe(seedData.microlotes.length);
    expect(result.current.isCorrupted).toBe(false);
  });

  it('persiste cambios en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage());
    
    act(() => {
      result.current.updateState((prev: AppState) => ({
        ...prev,
        microlotes: prev.microlotes.map(m => m.id === 'm1' ? { ...m, verdeDisponibleKg: 999 } : m)
      }));
    });

    const stored = localStorage.getItem('tostado-cafe:v1');
    expect(stored).not.toBeNull();
    
    const parsed = JSON.parse(stored!);
    const m1 = parsed.microlotes.find((m: any) => m.id === 'm1');
    expect(m1.verdeDisponibleKg).toBe(999);
  });

  it('restaura seed cuando los datos están corruptos', () => {
    localStorage.setItem('tostado-cafe:v1', 'datos corruptos no JSON');
    
    const { result } = renderHook(() => useLocalStorage());
    
    expect(result.current.isCorrupted).toBe(true);
    expect(result.current.state.microlotes.length).toBe(seedData.microlotes.length);
  });

  it('restaura seed cuando la estructura es inválida (falta microlotes)', () => {
    localStorage.setItem('tostado-cafe:v1', JSON.stringify({ suscripciones: [] }));
    
    const { result } = renderHook(() => useLocalStorage());
    
    expect(result.current.isCorrupted).toBe(true);
  });

  it('resetData restaura el seed original y limpia corrupción', () => {
    localStorage.setItem('tostado-cafe:v1', 'corrupto');
    
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current.isCorrupted).toBe(true);
    
    act(() => {
      result.current.resetData();
    });
    
    expect(result.current.state.microlotes.length).toBe(seedData.microlotes.length);
    expect(result.current.isCorrupted).toBe(false);
  });
});
