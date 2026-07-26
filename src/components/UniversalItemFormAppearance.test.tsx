import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import UniversalItemForm, { getAppearanceValidationError } from './UniversalItemForm';

const task = (id: string, text: string, overrides: Partial<AppTask> = {}): AppTask => ({
  id,
  userId: 'local_user',
  text,
  type: 'Tarea',
  completed: false,
  createdAt: '2026-07-25T12:00:00.000Z',
  ...overrides,
});

describe('inherited appearance in UniversalItemForm', () => {
  it('does not validate hidden date or weekday controls', () => {
    expect(getAppearanceValidationError(false, 'interval', '', [])).toBe('');
    expect(getAppearanceValidationError(false, 'weekdays', '', [])).toBe('');
    expect(getAppearanceValidationError(true, 'interval', '', []))
      .toBe('Indica la fecha inicial de la aparición.');
    expect(getAppearanceValidationError(true, 'weekdays', '2026-07-25', []))
      .toBe('Selecciona al menos un día específico.');
  });

  it('shows a child habit inherited schedule and keeps only its cycle objective editable', () => {
    const routine = task('routine', 'Rutina matinal', {
      type: 'Rutina',
      appearanceMode: 'interval',
      appearanceFrequency: 1,
      appearanceFrequencyUnit: 'días',
      fechaAparicion: '2026-07-01',
      hora: '07:30',
      routineCycleFrequency: 1,
      routineCycleUnit: 'meses',
    });
    const habit = task('habit', 'Tomar agua', {
      type: 'Hábito',
      parentId: routine.id,
      objetivoPorCiclo: 8,
    });

    const markup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={habit}
        config={null}
        allTasks={[routine, habit]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('Programación heredada de la rutina');
    expect(markup).toContain('Rutina matinal');
    expect(markup).toContain('Cada día');
    expect(markup).toContain('2026-07-01');
    expect(markup).toContain('07:30');
    expect(markup).toContain('Objetivo en el ciclo de la rutina');
    expect(markup).toContain('value="8"');
    expect(markup).toContain('Rutina asociada:');
    expect(markup).toContain(`id="parent-${habit.id}"`);
    expect(markup).toContain(`<option value="${routine.id}" selected="">${routine.text}</option>`);
    expect(markup).not.toContain('type="date"');

    const inheritedTextIndex = markup.indexOf('Programación heredada de la rutina');
    const inheritedSectionStart = markup.lastIndexOf('<section', inheritedTextIndex);
    const inheritedSectionEnd = markup.indexOf('</section>', inheritedTextIndex) + '</section>'.length;
    const inheritedSection = markup.slice(inheritedSectionStart, inheritedSectionEnd);
    expect(inheritedSection).not.toContain('<div');
    expect(inheritedSection).not.toContain('<span');
  });

  it('keeps date controls visible for a standalone habit', () => {
    const habit = task('standalone', 'Caminar', {
      type: 'Hábito',
      appearanceMode: 'interval',
    });
    const markup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={habit}
        config={null}
        allTasks={[habit]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('Aparición en Hoy');
    expect(markup).toContain('type="date"');
    expect(markup).toContain('required=""');
  });

  it('keeps date controls visible for routines with their own schedule', () => {
    const routine = task('routine', 'Rutina sin fecha', {
      type: 'Rutina',
      appearanceMode: 'interval',
    });
    const markup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={routine}
        config={null}
        allTasks={[routine]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('Aparición en Hoy');
    expect(markup).toContain('type="date"');
    expect(markup).toContain('required=""');
  });

  it('does not render hidden schedule controls for project tasks or legacy pulses', () => {
    const project = task('project', 'Proyecto editorial', { type: 'Proyecto' });
    const projectTask = task('project-task', 'Tarea heredada', {
      parentId: project.id,
      appearanceMode: 'weekdays',
      appearanceWeekdays: [],
    });
    const pulse = task('pulse', 'Pulso heredado', {
      type: 'Pulso',
      appearanceMode: 'interval',
    });

    const projectTaskMarkup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={projectTask}
        config={null}
        allTasks={[project, projectTask]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const pulseMarkup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={pulse}
        config={null}
        allTasks={[pulse]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(projectTaskMarkup).toContain('Contexto heredado del proyecto');
    expect(projectTaskMarkup).not.toContain('Aparición en Hoy');
    expect(pulseMarkup).not.toContain('Aparición en Hoy');
  });
});
