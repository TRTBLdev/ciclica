import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { getTypeIcon } from './TaskItem';
import TaskItem from './TaskItem';

describe('TaskItem type icons', () => {
  it('uses the historical document and sprout icons for tasks and habits', () => {
    const taskMarkup = renderToStaticMarkup(getTypeIcon('Tarea'));
    const habitMarkup = renderToStaticMarkup(getTypeIcon('Hábito'));

    expect(taskMarkup).toContain('M9 12h6');
    expect(habitMarkup).toContain('M12 19V6');
    expect(taskMarkup).not.toBe(habitMarkup);
  });

  it('keeps square and circular checks for completed action states', () => {
    const task: AppTask = {
      id: 'completed-task', userId: 'local_user', text: 'Tarea', type: 'Tarea', completed: true,
      createdAt: '2026-07-01T12:00:00.000Z',
    };
    const habit: AppTask = {
      id: 'completed-habit', userId: 'local_user', text: 'Hábito', type: 'Hábito', completed: true,
      createdAt: '2026-07-01T12:00:00.000Z',
    };
    const render = (item: AppTask) => renderToStaticMarkup(
      <TaskItem
        task={item}
        config={null}
        allTasks={[item]}
        history={[]}
        onToggle={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(render(task)).toContain('lucide-square-check-big');
    expect(render(habit)).toContain('lucide-circle-check');
  });
});
