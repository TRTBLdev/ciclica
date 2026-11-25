import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import HoyView from './HoyView';
import { AppTask, Config, HistoryRecord } from '../types';
import { formatDateOnly } from '../domain/recurrenceProgress';

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
      /<button[^>]*id="manual-cycle-phase"[^>]*data-name="manualCyclePhase"[^>]*role="combobox"[^>]*title="Ajustar fase actual manualmente"/,
    );
  });

  it('agrupa por Momentos, distingue hábitos opcionales sin tachar, fusiona Hecho hoy y enlaza al Backlog', () => {
    const today = formatDateOnly(new Date());
    const config: Config = {
      userId: 'local_user',
      theme: 'muji',
      cycleConfig: { trackingType: 'none' },
      areas: { BODY: { color: 'teal', categories: ['NUTRICIÓN'] } },
      separators: [
        { id: 'mom_wake', hora: '07:30', text: 'Al despertar', detalle: 'Inicio suave', kind: 'trigger', color: 'cyan' },
        { id: 'mom_night', hora: '20:30', text: 'Cierre', detalle: '', kind: 'time', color: 'purple' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    // Quota habit: 2 per week, already done earlier this cycle (1 day ago) -> optional today!
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateOnly(yesterday);
    const cycleStart = (() => {
      const d = new Date();
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      return formatDateOnly(d);
    })();

    const routine: AppTask = {
      id: 'rut_1',
      userId: 'local_user',
      text: 'Rutina Mañana',
      type: 'Rutina',
      hora: '06:30', // Earlier than first moment -> falls into 'Al despertar'
      appearanceMode: 'interval',
      appearanceFrequency: 1,
      appearanceFrequencyUnit: 'días',
      fechaAparicion: cycleStart,
      routineCycleFrequency: 1,
      routineCycleUnit: 'semanas',
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    const dueChild: AppTask = {
      id: 'hab_due',
      userId: 'local_user',
      text: 'Té tibio',
      type: 'Hábito',
      parentId: routine.id,
      objetivoPorCiclo: 7,
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    const standaloneOptional: AppTask = {
      id: 'hab_opt',
      userId: 'local_user',
      text: 'Mascarilla capilar',
      type: 'Hábito',
      momentId: 'mom_wake',
      appearanceMode: 'quota',
      quotaTarget: 2,
      quotaPeriodUnit: 'semanas',
      idealSpacingDays: 5,
      fechaAparicion: cycleStart,
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    const flexibleTask: AppTask = {
      id: 'task_flex',
      userId: 'local_user',
      text: 'Ordenar escritorio',
      type: 'Tarea',
      appearanceMode: 'persistent',
      fechaAparicion: today,
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    const backlogTask: AppTask = {
      id: 'task_backlog',
      userId: 'local_user',
      text: 'Leer archivo antiguo',
      type: 'Tarea',
      createdAt: '2026-10-01T08:00:00.000Z',
    };
    const nextWeekDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return formatDateOnly(d);
    })();
    const futureTask: AppTask = {
      id: 'task_future',
      userId: 'local_user',
      text: 'Planear próxima semana',
      type: 'Tarea',
      appearanceMode: 'once',
      fechaAparicion: nextWeekDate,
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const history: HistoryRecord[] = [
      {
        id: 'hist_prev',
        userId: 'local_user',
        taskId: standaloneOptional.id,
        date: `${yesterdayKey}T10:00:00`,
        isCompletion: true,
        createdAt: `${yesterdayKey}T10:00:00`,
      },
      {
        id: 'hist_today',
        userId: 'local_user',
        taskId: flexibleTask.id,
        date: `${today}T09:15:00`,
        duration: 0.5,
        isCompletion: false,
        createdAt: `${today}T09:15:00`,
      },
    ];

    const markup = renderToStaticMarkup(
      <HoyView
        config={config}
        tasks={[routine, dueChild, standaloneOptional, flexibleTask, backlogTask, futureTask]}
        history={history}
        progressSnapshots={[]}
        onToggleTask={vi.fn()}
        onAddEvent={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onTogglePulseSafeDay={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(markup).toContain('Timeline');
    expect(markup).toContain('Al despertar');
    expect(markup).toContain('Gatillo · 07:30');
    expect(markup).toContain('Rutina Mañana');
    expect(markup).toContain('Mascarilla capilar');
    expect(markup).toContain('Opcional');
    expect(markup).toContain('Flexible');
    expect(markup).toContain('Ordenar escritorio');
    expect(markup).toContain('Logs');
    expect(markup).toContain('Backlog (1) → Agenda');
    expect(markup).not.toContain('min libres');
    expect(markup).not.toContain('Leer archivo antiguo');
    expect(markup).not.toContain('Planear próxima semana');
  });
});

describe('PWA metadata', () => {
  it('mantiene las capacidades web estándar y de Apple', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  });
});
