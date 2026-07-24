import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import DurationEstimateField from './DurationEstimateField';
import UniversalItemForm from './UniversalItemForm';

const legacyTask: AppTask = {
  id: 'legacy-task',
  userId: 'local_user',
  text: 'Tarea heredada',
  type: 'Tarea',
  completed: false,
  createdAt: '2026-07-24T12:00:00.000Z',
  duracion: 1.234,
};

describe('duration estimate forms', () => {
  it('uses only fieldset, legend, label and input elements in the shared field', () => {
    const markup = renderToStaticMarkup(
      <DurationEstimateField
        idPrefix="estimate"
        value={1.234}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<legend');
    expect(markup).toContain('<label');
    expect(markup).toContain('value="1"');
    expect(markup).toContain('value="14"');
    expect(markup).toContain('max="59"');
    expect(markup).not.toContain('<div');
    expect(markup).not.toContain('<span');
  });

  it('renders the shared hours and minutes field while editing in UniversalItemForm', () => {
    const markup = renderToStaticMarkup(
      <UniversalItemForm
        initialData={legacyTask}
        config={null}
        allTasks={[legacyTask]}
        onSave={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('id="duration-legacy-task-hours"');
    expect(markup).toContain('id="duration-legacy-task-minutes"');
    expect(markup).not.toContain('step="0.25"');
  });

  it('integrates the shared field into both requested forms', () => {
    const universalFormSource = readFileSync(new URL('./UniversalItemForm.tsx', import.meta.url), 'utf8');
    const projectsViewSource = readFileSync(new URL('./ProyectosView.tsx', import.meta.url), 'utf8');

    expect(universalFormSource).toContain('<DurationEstimateField');
    expect(projectsViewSource).toContain('<DurationEstimateField');
    expect(projectsViewSource).toContain('idPrefix="quick-task-duration"');
  });
});
