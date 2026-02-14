import { createPieChartData, createAssigneesBySizePieData } from './assigneePieChartData';
import { createMockTask, DEFAULT_PROJECT_KEYS } from '@/test/fixtures';

describe('createPieChartData', () => {
  it('returns empty array for empty input', () => {
    const result = createPieChartData([], DEFAULT_PROJECT_KEYS);
    expect(result).toEqual([]);
  });

  it('skips non-Done tasks', () => {
    const tasks = [createMockTask({ Status: 'In Progress' })];
    const result = createPieChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result).toEqual([]);
  });

  it('skips tasks with no assignees', () => {
    const tasks = [createMockTask({ assignees: [] })];
    const result = createPieChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result).toEqual([]);
  });

  it('returns size distribution per assignee', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Size: 'M' }),
      createMockTask({ assignees: ['alice'], Size: 'S' }),
      createMockTask({ assignees: ['alice'], Size: 'M' }),
    ];
    const result = createPieChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.length).toBe(1);
    expect(result[0].assignee).toBe('alice');
    const mEntry = result[0].data.find(d => d.name === 'M');
    expect(mEntry?.value).toBe(2);
  });

  it('handles multiple assignees', () => {
    const tasks = [
      createMockTask({ assignees: ['alice', 'bob'], Size: 'M' }),
    ];
    const result = createPieChartData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result.length).toBe(2);
  });
});

describe('createAssigneesBySizePieData', () => {
  it('returns empty object for empty input', () => {
    const result = createAssigneesBySizePieData([], DEFAULT_PROJECT_KEYS);
    expect(result).toEqual({});
  });

  it('groups assignees by size', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Size: 'M' }),
      createMockTask({ assignees: ['bob'], Size: 'M' }),
    ];
    const result = createAssigneesBySizePieData(tasks, DEFAULT_PROJECT_KEYS);
    expect(result['M'].length).toBe(2);
    expect(result['M'].map(d => d.name).sort()).toEqual(['alice', 'bob']);
  });

  it('counts per assignee per size', () => {
    const tasks = [
      createMockTask({ assignees: ['alice'], Size: 'M' }),
      createMockTask({ assignees: ['alice'], Size: 'M' }),
      createMockTask({ assignees: ['alice'], Size: 'S' }),
    ];
    const result = createAssigneesBySizePieData(tasks, DEFAULT_PROJECT_KEYS);
    const aliceM = result['M'].find(d => d.name === 'alice');
    expect(aliceM?.value).toBe(2);
    const aliceS = result['S'].find(d => d.name === 'alice');
    expect(aliceS?.value).toBe(1);
  });
});
