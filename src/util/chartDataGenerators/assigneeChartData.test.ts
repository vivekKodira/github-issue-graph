import { createChartData } from './assigneeChartData';
import { createMockTask, DEFAULT_PROJECT_KEYS } from '@/test/fixtures';

describe('createChartData', () => {
  it('returns empty categories and series for empty array', () => {
    const result = createChartData([], DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.categories).toEqual([]);
    expect(result.stackedBySize.series).toEqual([]);
  });

  it('skips non-Done tasks', () => {
    const tasks = [createMockTask({ Status: 'In Progress' })];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.categories).toEqual([]);
  });

  it('processes a single Done task', () => {
    const tasks = [createMockTask()];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.categories).toContain('user1');
    expect(result.stackedBySize.series.length).toBeGreaterThan(0);
  });

  it('stacks by size when multiple sizes exist', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Size: 'S' }),
      createMockTask({ assignees: ['alice'], Size: 'M' }),
    ];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.series.length).toBe(2);
    expect(result.stackedBySize.series[0].stack).toBe('sizes');
  });

  it('does not stack when only one size type exists', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Size: 'M' }),
      createMockTask({ assignees: ['bob'], Size: 'M' }),
    ];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.series.length).toBe(1);
    expect(result.stackedBySize.series[0].stack).toBeUndefined();
  });

  it('assigns "Unassigned" for tasks with no assignees', () => {
    const tasks = [createMockTask({ assignees: [] })];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.stackedBySize.categories).toContain('Unassigned');
  });

  it('uses "No Size" when size field is missing', () => {
    const tasks = [createMockTask({ Size: null })];
    const result = createChartData(tasks, DEFAULT_PROJECT_KEYS);
    const sizeNames = result.stackedBySize.series.map(s => s.name);
    expect(sizeNames).toContain('No Size');
  });
});
