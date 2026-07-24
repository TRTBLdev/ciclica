import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HistorySearchControls from './HistorySearchControls';

describe('history search controls', () => {
  it('uses semantic controls without div or span wrappers', () => {
    const markup = renderToStaticMarkup(
      <HistorySearchControls
        period="7dias"
        query="proyecto"
        selectedScope={{
          key: 'context:project',
          kind: 'context',
          id: 'project',
          text: 'Proyecto editorial',
          type: 'Proyecto',
        }}
        suggestions={[{
          key: 'context:other',
          kind: 'context',
          id: 'other',
          text: 'Proyecto alterno',
          type: 'Proyecto',
        }]}
        onPeriodChange={() => undefined}
        onQueryChange={() => undefined}
        onSelectScope={() => undefined}
        onClearScope={() => undefined}
        onOpenRegistration={() => undefined}
      />,
    );

    expect(markup).toContain('<header');
    expect(markup).toContain('<form');
    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<nav');
    expect(markup).toContain('<ul');
    expect(markup).toContain('<output');
    expect(markup).not.toContain('<div');
    expect(markup).not.toContain('<span');
  });
});
