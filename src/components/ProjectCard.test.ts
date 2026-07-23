import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { ProjectPresentation } from '../domain/projectPresentation';
import ProjectCard, { formatProjectHours } from './ProjectCard';

describe('project card hours', () => {
  it('omits unnecessary decimals and keeps one meaningful fraction', () => {
    expect(formatProjectHours(20)).toBe('20 h');
    expect(formatProjectHours(1.5)).toBe('1,5 h');
  });

  it('indents expanded content without drawing an internal rail', () => {
    const project: AppTask = {
      id: 'project',
      userId: 'local_user',
      text: 'Proyecto editorial',
      type: 'Proyecto',
      createdAt: '2026-07-20T12:00:00.000Z',
      completed: false,
    };
    const presentation: ProjectPresentation = {
      descendants: [],
      pendingTasks: [],
      completedTasks: [],
      pendingCount: 0,
      completedCount: 0,
      totalCount: 0,
      progress: 0,
      openEstimate: 0,
      totalEstimate: 0,
      trackedHours: 0,
      energy: { support: 0, investment: 0, total: 0 },
      scheduleLabel: 'Sin programación',
    };
    const markup = renderToStaticMarkup(React.createElement(
      ProjectCard,
      {
        project,
        presentation,
        config: null,
        variant: 'backlog',
        expanded: true,
        onToggleExpanded: () => undefined,
        onToggleProject: () => undefined,
      },
      React.createElement('p', null, 'Contenido'),
    ));

    expect(markup).toContain('ml-9 mt-4');
    expect(markup).not.toContain('border-l border-border-line/70');
  });
});
