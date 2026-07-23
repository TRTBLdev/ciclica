import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ItemDetails from './ItemDetails';

const checklist = [
  { id: 'step-1', text: 'Primer paso', done: true },
  { id: 'step-2', text: 'Segundo paso', done: false },
];

describe('item details', () => {
  it('renders nothing without notes or checklist', () => {
    expect(renderToStaticMarkup(<ItemDetails />)).toBe('');
  });

  it('renders notes without an isolated divider', () => {
    const markup = renderToStaticMarkup(<ItemDetails notes="Contexto editorial" />);
    expect(markup).toContain('Notas');
    expect(markup).not.toContain('border-t');
    expect(markup).not.toContain('Checklist');
  });

  it('renders checklist progress without an isolated divider', () => {
    const markup = renderToStaticMarkup(<ItemDetails checklist={checklist} />);
    expect(markup).toContain('Guía de pasos (Checklist)');
    expect(markup).toContain('50%');
    expect(markup).not.toContain('border-t');
  });

  it('uses one divider between notes and checklist', () => {
    const markup = renderToStaticMarkup(
      <ItemDetails notes="Contexto editorial" checklist={checklist} onToggleChecklistItem={() => undefined} />,
    );
    expect(markup.match(/border-t/g)).toHaveLength(1);
    expect(markup).not.toContain('rounded-xl');
    expect(markup).not.toContain('bg-base-dim');
  });
});
