import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../state/useLocalStorage';
import { seedData } from '../../data/seed';
import { AppState } from '../../lib/types';

beforeEach(() => { localStorage.clear(); });

describe('useLocalStorage', () => {
  it('inicializa con seedData', () => {
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current.state.microlotes.length).toBe(seedData.microlotes.length);
  });

  it('persiste cambios', () => {
    const { result } = renderHook(() => useLocalStorage());
    act(() => {
      result.current.updateState((prev: AppState) => ({
        ...prev,
        microlotes: prev.microlotes.map((m) => m.id === 'm1' ? { ...m, verdeDisponibleKg: 999 } : m)
      }));
    });
    const s = JSON.parse(localStorage.getItem('tostado-cafe:v1') || '{}');
    expect(s.microlotes.find((m: any) => m.id === 'm1').verdeDisponibleKg).toBe(999);
  });

  it('restaura seed con datos corruptos', () => {
    localStorage.setItem('tostado-cafe:v1', 'corrupto');
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current.isCorrupted).toBe(true);
  });

  it('restaura seed con estructura inválida', () => {
    localStorage.setItem('tostado-cafe:v1', JSON.stringify({ microlotes: [] }));
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current.isCorrupted).toBe(true);
  });

  it('resetData restaura el seed', () => {
    const { result } = renderHook(() => useLocalStorage());
    act(() => result.current.updateState((prev: AppState) => ({ ...prev, microlotes: [] })));
    act(() => result.current.resetData());
    expect(result.current.state.microlotes.length).toBe(seedData.microlotes.length);
  });
});
