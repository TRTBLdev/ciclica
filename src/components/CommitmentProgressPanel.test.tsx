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
      tone: 'neutral',
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
    expect(markup).toContain('text-[10px]');
    expect(markup).toContain('tabular-nums');
    expect(markup).not.toContain('Completar');
    expect(markup).not.toContain('checkbox');
    expect(onSelectAction).not.toHaveBeenCalled();

    const weeklyMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[{ ...summary, period: 'week' }]} title="Compromisos de la semana" collapsible />,
    );
    expect(weeklyMarkup).toContain('0% de la semana');
    expect(weeklyMarkup).toContain('aria-label="Avance semanal de Leer 20 paginas"');
  });

  it('renders individual card collapsible toggle without text clutter and applies tone styles', () => {
    const task1 = { id: 't1', text: 'Tarea 1', type: 'Tarea' } as CommitmentPeriodSummary['actions'][number]['task'];
    const task2 = { id: 't2', text: 'Tarea 2', type: 'Tarea' } as CommitmentPeriodSummary['actions'][number]['task'];
    const summary = {
      id: 'int-1:item-1',
      period: 'day',
      title: 'Rutina Nocturna',
      targetType: 'consistency',
      actions: [
        { task: task1, completed: false, actualHours: 0, plannedHours: 0, plannedOccurrences: 1, completedOccurrences: 0 },
        { task: task2, completed: true, actualHours: 0.5, plannedHours: 0.5, plannedOccurrences: 1, completedOccurrences: 1 },
      ],
      actualHours: 0.5,
      plannedHours: 0.5,
      completedActions: 1,
      plannedOccurrences: 2,
      completedOccurrences: 1,
      counterDelta: 0,
      percent: 50,
      tone: 'in-progress',
      displayValue: '1 / 2 ocurrencias',
      intention: {} as CommitmentPeriodSummary['intention'],
      item: {} as CommitmentPeriodSummary['item'],
    } satisfies CommitmentPeriodSummary;

    // By default, folded and without redundant text badge
    const foldedMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[summary]} title="Compromisos de hoy" layout="single" onSelectAction={() => {}} />,
    );

    expect(foldedMarkup).not.toContain('2 acciones');
    expect(foldedMarkup).toContain('aria-label="Desplegar acciones de Rutina Nocturna"');
    expect(foldedMarkup).toContain('aria-expanded="false"');
    expect(foldedMarkup).toContain('hidden');
    expect(foldedMarkup).toContain('text-primary');

    // When defaultExpandedItems is true
    const expandedMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[summary]} title="Compromisos de hoy" layout="grid" defaultExpandedItems />,
    );
    expect(expandedMarkup).not.toContain('2 acciones');
    expect(expandedMarkup).toContain('aria-expanded="true"');
    expect(expandedMarkup).toContain('grid-cols-1 md:grid-cols-2 xl:grid-cols-3');

    // Danger tone styling
    const dangerMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[{ ...summary, tone: 'danger' }]} title="Compromisos" />,
    );
    expect(dangerMarkup).toContain('text-red-600');
    expect(dangerMarkup).toContain('bg-red-500/80');

    // Success tone styling
    const successMarkup = renderToStaticMarkup(
      <CommitmentProgressPanel summaries={[{ ...summary, tone: 'success', percent: 100 }]} title="Compromisos" />,
    );
    expect(successMarkup).toContain('text-emerald-600');
    expect(successMarkup).toContain('bg-emerald-600/80');
  });
});
