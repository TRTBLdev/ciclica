import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DailyFocusLineChart from './DailyFocusLineChart';

describe('DailyFocusLineChart', () => {
  it('renders an accessible line with focusable daily points', () => {
    const markup = renderToStaticMarkup(
      <DailyFocusLineChart
        data={[
          { dateLabel: 'Lun 14', rawDate: new Date('2026-10-14'), hours: 2, count: 3 },
          { dateLabel: 'Mar 15', rawDate: new Date('2026-10-15'), hours: 4.5, count: 2 },
        ]}
      />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('Horas de enfoque registradas por día');
    expect(markup).toContain('<polyline');
    expect(markup).toContain('data-focus-point="0"');
    expect(markup).toContain('Lun 14: 2.0 h, 3 registros');
  });
});
