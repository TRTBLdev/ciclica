import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CommitmentProgressPanel from './CommitmentProgressPanel';
import { CommitmentPeriodSummary } from '../domain/commitmentProgress';

describe('CommitmentProgressPanel', () => {
  it('exposes accessible progress and navigation without duplicate completion controls', () => {
    const task = { id: 'task-1', text: 'Leer', type: 'Tarea' } as CommitmentPeriodSummary['actions'][number]['task'];
    const summary = {
      id: 'int-1:item-1',
      period: 'day',
      title: 'Leer 20 paginas',
      targetType: 'counter',
      actions: [{ task, completed: false, actualHours: 0, plannedHours: 0, plannedOccurrences: 1, completedOccurrences: 0 }],
      actualHours: 0,
      plannedHours: 0,
      completedActions: 0,
      plannedOccurrences: 1,
      completedOccurrences: 0,
      counterDelta: 12,
      percent: 0,
      displayValue: '+12 paginas',
      intention: {} as CommitmentPeriodSummary['intention'],
      item: {} as CommitmentPeriodSummary['item'],
    } satisfies CommitmentPeriodSummary;
    const onSelectAction = vi.fn();
    const markup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[summary]} title="Compromisos de hoy" collapsible onSelectAction={onSelectAction} />,
    );

    expect(markup).toContain('Compromisos de hoy');
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-label="Ir a Leer. Estado: Pendiente"');
    expect(markup).toContain('0% de hoy');
    expect(markup).not.toContain('Completar');
    expect(markup).not.toContain('checkbox');
    expect(onSelectAction).not.toHaveBeenCalled();

    const weeklyMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[{ ...summary, period: 'week' }]} title="Compromisos de la semana" collapsible />,
    );
    expect(weeklyMarkup).toContain('0% de la semana');
    expect(weeklyMarkup).toContain('aria-label="Avance semanal de Leer 20 paginas"');
  });
});
