import { groupTasksBySprint, generateVelocityInsights } from './sprintVelocityData';

describe('groupTasksBySprint', () => {
  it('groups done tasks by sprint', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
      { Status: 'Todo', Sprint: 'S1' }, // excluded
    ];
    const { sprintData } = groupTasksBySprint(tasks, 'Sprint');
    expect(sprintData.S1.tasks).toHaveLength(2);
    expect(sprintData.S2.tasks).toHaveLength(1);
    expect(sprintData.S1.sprint).toBe('S1');
  });

  it('excludes non-Done tasks', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'In Progress', Sprint: 'S1' },
    ];
    const { sprintData } = groupTasksBySprint(tasks, 'Sprint');
    expect(sprintData.S1.tasks).toHaveLength(1);
  });

  it('uses NO_SPRINT_LABEL for missing sprint', () => {
    const tasks = [{ Status: 'Done', Sprint: undefined }];
    const { sprintData } = groupTasksBySprint(tasks, 'Sprint');
    expect(sprintData['No Sprint']).toBeDefined();
  });

  it('sorts sprints numerically', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'Sprint-10' },
      { Status: 'Done', Sprint: 'Sprint-2' },
      { Status: 'Done', Sprint: 'Sprint-1' },
    ];
    const { sortedSprints } = groupTasksBySprint(tasks, 'Sprint');
    expect(sortedSprints).toEqual(['Sprint-1', 'Sprint-2', 'Sprint-10']);
  });

  it('places NO_SPRINT_LABEL at end', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'Sprint-1' },
      { Status: 'Done', Sprint: undefined },
    ];
    const { sortedSprints } = groupTasksBySprint(tasks, 'Sprint');
    expect(sortedSprints[sortedSprints.length - 1]).toBe('No Sprint');
  });

  it('returns empty for no done tasks', () => {
    const { sprintData, sortedSprints } = groupTasksBySprint(
      [{ Status: 'Todo', Sprint: 'S1' }],
      'Sprint'
    );
    expect(sortedSprints).toEqual([]);
    expect(Object.keys(sprintData)).toHaveLength(0);
  });
});

describe('generateVelocityInsights', () => {
  it('returns empty for less than 2 sprints', () => {
    const tasks = [{ Status: 'Done', Sprint: 'S1' }];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights).toEqual([]);
  });

  it('generates task count decrease insight', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
      { Status: 'Done', Sprint: 'S2' },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toContain('decreased by 50.0%');
    expect(insights[0].text).toContain('S2');
    expect(insights[0].text).toContain('S1');
    expect(insights[0].text).toContain('2 vs 4 tasks');
    expect(insights[0].severity).toBeLessThan(0);
  });

  it('generates effort decrease insight', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1', ActualDays: 10 },
      { Status: 'Done', Sprint: 'S2', ActualDays: 5 },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights.some((i) => i.text.includes('effort decreased'))).toBe(true);
  });

  it('calculates severity based on decrease percentage', () => {
    // 50% decrease => severity = -2 (floor(50/20) = 2, clamped to max 5)
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights[0].severity).toBe(-2);
  });

  it('clamps severity between -1 and -5', () => {
    // 80% decrease => floor(80/20) = 4, 100% would give 5 but need more tasks for that
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights[0].severity).toBe(-4); // 80% decrease
  });

  it('does not generate insight when velocity increases', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
      { Status: 'Done', Sprint: 'S2' },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    expect(insights).toHaveLength(0);
  });

  it('handles missing ActualDays', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1', ActualDays: 10 },
      { Status: 'Done', Sprint: 'S2', ActualDays: undefined },
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    // Should not crash, effort for S2 = 0
    expect(insights.some((i) => i.text.includes('effort decreased'))).toBe(true);
  });

  it('ignores NO_SPRINT tasks for insights', () => {
    const tasks = [
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S1' },
      { Status: 'Done', Sprint: 'S2' },
      { Status: 'Done', Sprint: undefined }, // NO_SPRINT - ignored
    ];
    const insights = generateVelocityInsights(tasks, 'Sprint', 'ActualDays');
    // Should compare S2 vs S1, not include NO_SPRINT
    expect(insights[0].text).toContain('S2');
    expect(insights[0].text).toContain('S1');
  });
});
