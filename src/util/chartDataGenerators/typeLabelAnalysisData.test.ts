import { createChartData, createChartDataForField } from './typeLabelAnalysisData';

describe('createChartData', () => {
  it('returns empty result for no selected labels', () => {
    const result = createChartData([], []);
    expect(result.categories).toEqual([]);
    expect(result.series).toEqual([]);
  });

  it('counts issues by label', () => {
    const issues = [
      { labels: [{ name: 'bug' }, { name: 'urgent' }] },
      { labels: [{ name: 'bug' }] },
      { labels: [{ name: 'feature' }] },
    ];
    const result = createChartData(issues, ['bug', 'feature', 'urgent']);
    expect(result.categories).toEqual(['bug', 'feature', 'urgent']);
    expect(result.series[0].data).toEqual([2, 1, 1]);
  });

  it('counts zero for labels not present', () => {
    const issues = [{ labels: [{ name: 'bug' }] }];
    const result = createChartData(issues, ['bug', 'feature']);
    expect(result.series[0].data).toEqual([1, 0]);
  });

  it('handles issues without labels', () => {
    const issues = [{ labels: undefined }, { labels: [] }];
    const result = createChartData(issues, ['bug']);
    expect(result.series[0].data).toEqual([0]);
  });

  it('includes correct series metadata', () => {
    const result = createChartData([], ['bug']);
    expect(result.series[0]?.name).toBe('Issue Count');
    expect(result.series[0]?.type).toBe('bar');
    expect(result.series[0]?.emphasis.focus).toBe('self');
  });

  it('counts each label occurrence per issue', () => {
    const issues = [
      { labels: [{ name: 'bug' }, { name: 'feature' }] },
      { labels: [{ name: 'bug' }] },
    ];
    const result = createChartData(issues, ['bug']);
    expect(result.series[0].data).toEqual([2]);
  });
});

describe('createChartDataForField', () => {
  it('returns empty result for no selected values', () => {
    const result = createChartDataForField([], 'Status', []);
    expect(result.categories).toEqual([]);
    expect(result.series).toEqual([]);
  });

  it('counts issues by field value', () => {
    const issues = [
      { Status: 'Done' },
      { Status: 'Done' },
      { Status: 'Todo' },
    ];
    const result = createChartDataForField(issues, 'Status', ['Done', 'Todo']);
    expect(result.categories).toEqual(['Done', 'Todo']);
    expect(result.series[0].data).toEqual([2, 1]);
  });

  it('counts zero for values not present', () => {
    const issues = [{ Priority: 'High' }];
    const result = createChartDataForField(issues, 'Priority', ['High', 'Low']);
    expect(result.series[0].data).toEqual([1, 0]);
  });

  it('converts field value to string', () => {
    const issues = [{ Count: 5 }, { Count: 5 }];
    const result = createChartDataForField(issues, 'Count', ['5']);
    expect(result.series[0].data).toEqual([2]);
  });

  it('handles missing field as empty string', () => {
    const issues = [{ Status: undefined }, { Status: null }];
    const result = createChartDataForField(issues, 'Status', ['']);
    expect(result.series[0].data).toEqual([2]);
  });

  it('includes correct series metadata', () => {
    const result = createChartDataForField([], 'Status', ['Done']);
    expect(result.series[0]?.name).toBe('Issue Count');
    expect(result.series[0]?.type).toBe('bar');
    expect(result.series[0]?.emphasis.focus).toBe('self');
  });
});
