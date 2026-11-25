// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Omnibar from './Omnibar';
import { AppTask, Config, HistoryRecord } from '../types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  document.body.innerHTML = '';
});

describe('Omnibar quick launch alignment', () => {
  it('unifica cabeceras sin emoji, muestra CategoryBadge en Recientes y reserva ancho para alinear botones Play', () => {
    const config: Config = {
      userId: 'local_user',
      theme: 'muji',
      cycleConfig: { trackingType: 'none' },
      areas: { BODY: { color: 'teal', categories: ['NUTRICIÓN', 'HIGIENE'] } },
      separators: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const quickHabit: AppTask = {
      id: 'quick_1',
      userId: 'local_user',
      text: 'Té y preparar desayuno',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'NUTRICIÓN',
      quickTrack: true,
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const recentHabit: AppTask = {
      id: 'recent_1',
      userId: 'local_user',
      text: 'Brush Teeth + Skincare PM',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'HIGIENE',
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const history: HistoryRecord[] = [
      {
        id: 'hist_1',
        userId: 'local_user',
        taskId: recentHabit.id,
        date: '2026-11-21T20:00:00.000Z',
        duration: 0.25,
        createdAt: '2026-11-21T20:00:00.000Z',
      },
    ];

    const markup = renderToStaticMarkup(
      <Omnibar
        activeTimer={null}
        tasks={[quickHabit, recentHabit]}
        history={history}
        config={config}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onDiscard={vi.fn()}
        onStartTimer={vi.fn()}
        onToggleTask={vi.fn()}
        onUpdateStartTime={vi.fn()}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />,
    );

    expect(markup).toContain('Acceso rápido');
    expect(markup).toContain('Recientes');
    expect(markup).not.toContain('⚡');
    expect(markup).toContain('<span class="truncate font-medium">Brush Teeth + Skincare PM</span>');
    expect(markup).toContain('HIGIENE');
    expect(markup).toContain('<span class="w-5 h-5 shrink-0" aria-hidden="true"></span>');
  });
});

describe('Omnibar createTask scroll, sticky footer, and Esc regression', () => {
  it('mantiene min-h-0 con scrollbar visible, footer sticky y Esc en dos pasos preservando el texto buscado', () => {
    const config: Config = {
      userId: 'local_user',
      theme: 'muji',
      cycleConfig: { trackingType: 'none' },
      areas: { HOME: { color: 'teal', categories: ['🧹 Planta Baja'] } },
      separators: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root!.render(
        <Omnibar
          activeTimer={null}
          tasks={[]}
          history={[]}
          config={config}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onStop={vi.fn()}
          onDiscard={vi.fn()}
          onStartTimer={vi.fn()}
          onToggleTask={vi.fn()}
          onUpdateStartTime={vi.fn()}
          onAddTask={vi.fn()}
          onUpdateTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />,
      );
    });

    const searchInput = host.querySelector('input[placeholder="Buscar ítem o escribir para crear..."]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(searchInput, 'Comprar maceta');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const createBtn = host.querySelector('button[title="Crear nueva tarea"]') as HTMLButtonElement;
    expect(createBtn).toBeTruthy();

    act(() => {
      createBtn.click();
    });

    const scrollContainer = host.querySelector('.min-h-0.overflow-y-auto') as HTMLElement | null;
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer?.className).not.toContain('no-scrollbar');

    const footer = host.querySelector('form footer') as HTMLElement | null;
    expect(footer).toBeTruthy();
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
    expect(footer?.className).toContain('bg-base/95');
    expect(footer?.className).toContain('backdrop-blur-sm');

    // Open a Select inside UniversalItemForm (Tipo)
    const tipoCombo = host.querySelector('button[role="combobox"][aria-label="Tipo de elemento"]') as HTMLButtonElement;
    expect(tipoCombo).toBeTruthy();
    act(() => {
      tipoCombo.click();
    });
    expect(document.querySelector('[data-ciclica-select-open="true"]')).toBeTruthy();

    // First Esc closes only the Select and stays in createTask
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(document.querySelector('[data-ciclica-select-open="true"]')).toBeNull();
    expect(host.textContent).toContain('Crear Ítem');

    // Second Esc returns to search mode preserving typed search text
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.textContent).not.toContain('Crear Ítem');
    const restoredSearch = host.querySelector('input[placeholder="Buscar ítem o escribir para crear..."]') as HTMLInputElement;
    expect(restoredSearch).toBeTruthy();
    expect(restoredSearch.value).toBe('Comprar maceta');
  });
});
