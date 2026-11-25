// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Select, { computeSelectPosition, normalizeSearchText, SelectOption } from './Select';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mountSelect(ui: React.ReactElement) {
  container = document.createElement('div');
  container.style.overflow = 'hidden';
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  document.body.innerHTML = '';
});

describe('ui/Select helpers', () => {
  it('normaliza mayúsculas, tildes (NFD) y emojis iniciales', () => {
    expect(normalizeSearchText('🧹 Planta Baja')).toBe('planta baja');
    expect(normalizeSearchText('NUTRICIÓN')).toBe('nutricion');
    expect(normalizeSearchText('🌱 Hábito Diario')).toBe('habito diario');
    expect(normalizeSearchText('🧹 Planta Baja').includes(normalizeSearchText('planta'))).toBe(true);
  });

  it('calcula auto-flip hacia arriba cuando no hay espacio abajo', () => {
    const pos = computeSelectPosition(
      { top: 520, bottom: 560, left: 20, right: 220, width: 200 },
      { width: 390, height: 600 },
      240,
      'left',
    );
    expect(pos.placement).toBe('top');
    expect(pos.top).toBe(516);
    expect(pos.left).toBe(20);
  });

  it('limita el eje horizontal dentro del viewport', () => {
    const pos = computeSelectPosition(
      { top: 40, bottom: 80, left: 310, right: 380, width: 70 },
      { width: 390, height: 800 },
      200,
      'left',
      220,
    );
    expect(pos.left).toBe(162);
  });
});

describe('ui/Select component', () => {
  const shortOptions: SelectOption[] = [
    { value: 'a', label: 'Opción A' },
    { value: 'b', label: 'Opción B' },
    { value: 'c', label: 'Opción C' },
  ];

  const longOptions: SelectOption[] = [
    { value: '1', label: '🧹 Planta Baja' },
    { value: '2', label: '🌿 Jardín' },
    { value: '3', label: 'NUTRICIÓN' },
    { value: '4', label: 'Finanzas' },
    { value: '5', label: 'Lectura' },
    { value: '6', label: 'Descanso' },
    { value: '7', label: 'Proyecto Alfa' },
  ];

  it('renderiza el panel en document.body mediante portal fuera de contenedores overflow-hidden', () => {
    const host = mountSelect(
      <Select value="a" onChange={vi.fn()} options={shortOptions} ariaLabel="Selector de prueba" />,
    );

    const trigger = host.querySelector('button[role="combobox"]') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-ciclica-select-portal="true"]')).toBeNull();

    act(() => {
      trigger.click();
    });

    const portal = document.querySelector('[data-ciclica-select-portal="true"]');
    expect(portal).toBeTruthy();
    expect(portal?.parentElement).toBe(document.body);
    expect(host.contains(portal)).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('activa búsqueda automáticamente con >= 7 opciones y filtra sin tildes ni emojis', () => {
    mountSelect(
      <Select value="1" onChange={vi.fn()} options={longOptions} ariaLabel="Espacios" />,
    );

    const trigger = document.querySelector('button[role="combobox"]') as HTMLButtonElement;
    act(() => {
      trigger.click();
    });

    const searchInput = document.querySelector('input[aria-label="Filtrar opciones"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(searchInput, 'planta');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    let options = Array.from(document.querySelectorAll('[role="option"]')).map(el => el.textContent);
    expect(options).toEqual(['🧹 Planta Baja']);

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(searchInput, 'nutricion');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    options = Array.from(document.querySelectorAll('[role="option"]')).map(el => el.textContent);
    expect(options).toEqual(['NUTRICIÓN']);
  });

  it('oculta buscador con < 7 opciones en searchable="auto" y lo muestra si searchable={true}', () => {
    mountSelect(
      <Select value="a" onChange={vi.fn()} options={shortOptions} ariaLabel="Corto" />,
    );

    act(() => {
      (document.querySelector('button[role="combobox"]') as HTMLButtonElement).click();
    });
    expect(document.querySelector('input[aria-label="Filtrar opciones"]')).toBeNull();

    act(() => {
      root!.render(
        <Select value="a" onChange={vi.fn()} options={shortOptions} searchable={true} ariaLabel="Forzado" />,
      );
    });
    expect(document.querySelector('input[aria-label="Filtrar opciones"]')).toBeTruthy();
  });

  it('soporta navegación completa por teclado (ArrowDown, ArrowUp, Enter, Escape) sin propagar Esc al padre', () => {
    const onChange = vi.fn();
    const parentEscSpy = vi.fn();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') parentEscSpy();
    });

    mountSelect(
      <Select value="a" onChange={onChange} options={shortOptions} ariaLabel="Teclado" />,
    );

    const trigger = document.querySelector('button[role="combobox"]') as HTMLButtonElement;
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(document.querySelector('[role="listbox"]')).toBeTruthy();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });

    expect(onChange).toHaveBeenCalledWith('b');
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    // Reopen and press Escape -> should close Select and NOT reach parent listener
    act(() => {
      trigger.click();
    });
    expect(document.querySelector('[role="listbox"]')).toBeTruthy();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(parentEscSpy).not.toHaveBeenCalled();
  });

  it('renderiza encabezados de grupo cuando options incluye group', () => {
    const grouped: SelectOption[] = [
      { value: 'r1', label: 'Rutina AM', group: 'Rutinas' },
      { value: 'h1', label: 'Meditar', group: 'Hábitos' },
    ];
    mountSelect(<Select value="r1" onChange={vi.fn()} options={grouped} ariaLabel="Grupos" />);

    act(() => {
      (document.querySelector('button[role="combobox"]') as HTMLButtonElement).click();
    });

    const portalText = document.querySelector('[data-ciclica-select-portal="true"]')?.textContent || '';
    expect(portalText).toContain('Rutinas');
    expect(portalText).toContain('Hábitos');
  });
});
