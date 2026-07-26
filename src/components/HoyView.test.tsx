import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import HoyView from './HoyView';

describe('HoyView', () => {
  it('identifica y etiqueta el selector manual de fase', () => {
    const markup = renderToStaticMarkup(
      <HoyView
        config={null}
        tasks={[]}
        history={[]}
        progressSnapshots={[]}
        onToggleTask={vi.fn()}
        onAddEvent={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onTogglePulseSafeDay={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(markup).toContain(
      '<label for="manual-cycle-phase" class="sr-only">Ajustar fase actual manualmente</label>',
    );
    expect(markup).toMatch(
      /<select id="manual-cycle-phase" name="manualCyclePhase"[^>]*title="Ajustar fase actual manualmente"/,
    );
  });
});

describe('PWA metadata', () => {
  it('mantiene las capacidades web estándar y de Apple', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  });
});
