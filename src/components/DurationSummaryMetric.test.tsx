import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityDurationAverage, DurationComparison } from './DurationSummaryMetric';

describe('duration summary UI', () => {
  it('renders real versus estimated duration in decimal hours', () => {
    const markup = renderToStaticMarkup(
      <DurationComparison actualHours={0.5} estimatedHours={0.5} />,
    );

    expect(markup).toContain('<output');
    expect(markup).toContain('Real 0.50 h / Est. 0.50 h');
    expect(markup).toContain('font-mono');
    expect(markup).toContain('text-[10px]');
    expect(markup).toContain('leading-5');
    expect(markup).toContain('text-text-dim');
    expect(markup).toContain('tabular-nums');
  });

  it('renders the historical average on the last-activity line', () => {
    const markup = renderToStaticMarkup(
      <ActivityDurationAverage
        lastActivity="Última actividad: 24 jul"
        averageHours={0.42}
        count={3}
      />,
    );

    expect(markup).toContain('Última actividad: 24 jul');
    expect(markup).toContain('Promedio/ciclo: 0.42 h (3 ciclos)');
    expect(markup).toContain('<small class="text-[1em]"');
    expect(markup).toContain('font-mono');
    expect(markup).toContain('text-[10px]');
  });

  it('uses semantic markup without div or span', () => {
    const markup = renderToStaticMarkup(
      <section>
        <DurationComparison actualHours={0.25} estimatedHours={0} />
        <ActivityDurationAverage averageHours={null} count={0} />
      </section>,
    );

    expect(markup).not.toContain('<div');
    expect(markup).not.toContain('<span');
    expect(markup).toContain('Sin estimación');
    expect(markup).toContain('Sin ciclos completos');
  });
});
