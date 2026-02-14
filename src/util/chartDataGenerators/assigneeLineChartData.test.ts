import { createLineChartData, createLineChartDataByCreationDate } from './assigneeLineChartData';
import { createMockTask, DEFAULT_PROJECT_KEYS } from '@/test/fixtures';

describe('createLineChartData', () => {
  it('returns empty series for empty array', () => {
    const result = createLineChartData([], DEFAULT_PROJECT_KEYS);
    expect(result.assigneeSeries).toEqual([]);
    expect(result.sprints).toEqual([]);
  });

  it('skips non-Done tasks', () => {
    const tasks = [createMockTask({ Status: 'In Progress' })];
    const result = createLineChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.assigneeSeries).toEqual([]);
  });

  it('buckets by sprint for Done tasks', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Sprint: 'Sprint-1' }),
      createMockTask({ assignees: ['alice'], Sprint: 'Sprint-2' }),
    ];
    const result = createLineChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.allSprints).toContain('Sprint-1');
    expect(result.allSprints).toContain('Sprint-2');
    expect(result.assigneeSeries.length).toBe(1);
    expect(result.assigneeSeries[0].name).toBe('alice');
  });

  it('skips tasks with no assignees', () => {
    const tasks = [createMockTask({ assignees: [] })];
    const result = createLineChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.assigneeSeries).toEqual([]);
  });

  it('uses task weight from actual/estimate days', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Sprint: 'Sprint-1', 'Actual (days)': 5, 'Estimate (days)': 3 }),
    ];
    const result = createLineChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.assigneeSeries[0].data[0]).toBe(5);
  });

  it('puts No Sprint label last', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Sprint: null }),
      createMockTask({ assignees: ['alice'], Sprint: 'Sprint-1' }),
    ];
    const result = createLineChartData(tasks, DEFAULT_PROJECT_KEYS);
    const lastSprint = result.allSprints[result.allSprints.length - 1];
    expect(lastSprint).toBe('No Sprint');
  });
});

describe('createLineChartDataByCreationDate', () => {
  it('returns empty series for empty array', () => {
    const result = createLineChartDataByCreationDate([], DEFAULT_PROJECT_KEYS);
    expect(result.assigneeSeries).toEqual([]);
  });

  it('buckets by creation month', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], createdAt: '2024-01-15T00:00:00Z' }),
      createMockTask({ assignees: ['alice'], createdAt: '2024-02-15T00:00:00Z' }),
    ];
    const result = createLineChartDataByCreationDate(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.allSprints).toContain('2024-01');
    expect(result.allSprints).toContain('2024-02');
  });

  it('sorts months chronologically', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], createdAt: '2024-03-01T00:00:00Z' }),
      createMockTask({ assignees: ['alice'], createdAt: '2024-01-01T00:00:00Z' }),
    ];
    const result = createLineChartDataByCreationDate(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.allSprints[0]).toBe('2024-01');
    expect(result.allSprints[1]).toBe('2024-03');
  });
});
