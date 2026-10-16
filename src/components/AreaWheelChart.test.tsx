import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AreaWheelChart from './AreaWheelChart';
import { AreaWheelDatum } from '../domain/areaWheel';

const data: AreaWheelDatum[] = ['BODY', 'MIND', 'FINANCE', 'HOME'].map((area, index) => ({
  area,
  score: [100, 60, 20, 0][index],
  hasData: index < 3,
  valueLabel: `${[5, 3, 1, 0][index].toFixed(1)} h`,
  detailLabel: `${[50, 30, 10, 0][index].toFixed(1)}% del total`,
  count: index,
}));

describe('AreaWheelChart', () => {
  it('renders an accessible radar and a textual area legend', () => {
    const markup = renderToStaticMarkup(
      <AreaWheelChart
        title="Balance de dedicación"
        description="Horas reales del intervalo"
        scaleLabel="Escala relativa"
        data={data}
        highlightedArea="MIND"
      />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('Balance de dedicación');
    expect(markup).toContain('Horas reales del intervalo');
    expect(markup).toContain('BODY');
    expect(markup).toContain('MIND');
    expect(markup).toContain('points="');
  });

  it('uses compact bars when fewer than three areas exist', () => {
    const markup = renderToStaticMarkup(
      <AreaWheelChart
        title="Avance de áreas"
        description="Compromisos"
        scaleLabel="0–100"
        data={data.slice(0, 2)}
      />,
    );

    expect(markup).toContain('la rueda necesita al menos tres áreas');
    expect(markup).toContain('style="width:100%;opacity:1"');
    expect(markup).not.toContain('<svg');
  });

  it('explains the empty configuration state', () => {
    const markup = renderToStaticMarkup(
      <AreaWheelChart
        title="Avance de áreas"
        description="Compromisos"
        scaleLabel="0–100"
        data={[]}
      />,
    );

    expect(markup).toContain('No hay áreas configuradas para construir la rueda.');
  });
});
