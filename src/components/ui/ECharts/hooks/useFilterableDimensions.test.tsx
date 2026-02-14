import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useFilterableDimensions } from './useFilterableDimensions';

describe('useFilterableDimensions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleData = [
    {
      id: '1',
      title: 'Task 1',
      Status: 'Done',
      Priority: 'High',
      labels: [{ name: 'bug' }, { name: 'feature' }],
      assignees: ['user1'],
    },
    {
      id: '2',
      title: 'Task 2',
      Status: 'Todo',
      Priority: 'Low',
      labels: [{ name: 'bug' }],
      assignees: ['user2'],
    },
    {
      id: '3',
      title: 'Task 3',
      Status: 'Done',
      Priority: 'High',
      labels: [{ name: 'feature' }],
      assignees: [],
    },
  ];

  it('extracts filterable fields from data', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    expect(result.current.filterableFields).toHaveProperty('Status');
    expect(result.current.filterableFields).toHaveProperty('Priority');
    expect(result.current.filterableFields.Status).toEqual(['Done', 'Todo']);
    expect(result.current.filterableFields.Priority).toEqual(['High', 'Low']);
  });

  it('excludes default excluded fields', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    expect(result.current.filterableFields).not.toHaveProperty('id');
    expect(result.current.filterableFields).not.toHaveProperty('title');
    expect(result.current.filterableFields).not.toHaveProperty('state');
  });

  it('extracts unique labels', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    expect(result.current.uniqueLabels).toEqual(['bug', 'feature']);
  });

  it('returns empty filterableFields for empty data', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: [], storageKey: 'test-key' })
    );

    expect(result.current.filterableFields).toEqual({});
  });

  it('handles filter toggle', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.handleFilterToggle('Status', 'Done');
    });

    expect(result.current.selectedFilters.Status).toEqual(['Done']);

    // Toggle off
    act(() => {
      result.current.handleFilterToggle('Status', 'Done');
    });

    expect(result.current.selectedFilters.Status).toEqual([]);
  });

  it('filters data with AND operator', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.handleFilterToggle('Status', 'Done');
      result.current.handleFilterToggle('Priority', 'High');
    });

    // AND: both Status=Done AND Priority=High
    expect(result.current.filteredData).toHaveLength(2);
    expect(result.current.filteredData.every((d: any) => d.Status === 'Done' && d.Priority === 'High')).toBe(true);
  });

  it('filters data with OR operator', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.setFilterOperator('OR');
      result.current.handleFilterToggle('Status', 'Done');
      result.current.handleFilterToggle('Priority', 'Low');
    });

    // OR: Status=Done OR Priority=Low => all 3 items
    expect(result.current.filteredData).toHaveLength(3);
  });

  it('filters data by labels', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.handleFilterToggle('labels', 'bug');
    });

    expect(result.current.filteredData).toHaveLength(2);
  });

  it('handles dimension field change', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.setSelectedDimensionField('Status');
    });

    expect(result.current.selectedDimensionField).toBe('Status');
    expect(result.current.dimensionValues).toEqual(['Done', 'Todo']);
  });

  it('returns labels as dimension values when field is labels', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    expect(result.current.selectedDimensionField).toBe('labels');
    expect(result.current.dimensionValues).toEqual(['bug', 'feature']);
  });

  it('handles dimension toggle', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.handleDimensionToggle('bug');
    });

    expect(result.current.selectedDimensionValues).toEqual(['bug']);

    act(() => {
      result.current.handleDimensionToggle('bug');
    });

    expect(result.current.selectedDimensionValues).toEqual([]);
  });

  it('toggles filter visibility', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-key' })
    );

    act(() => {
      result.current.toggleFilterVisibility('Status');
    });

    expect(result.current.visibleFilters.Status).toBe(true);

    act(() => {
      result.current.toggleFilterVisibility('Status');
    });

    expect(result.current.visibleFilters.Status).toBe(false);
  });

  it('persists state to localStorage', () => {
    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-persist' })
    );

    act(() => {
      result.current.handleFilterToggle('Status', 'Done');
    });

    const stored = JSON.parse(localStorage.getItem('test-persist') || '{}');
    expect(stored.selectedFilters?.Status).toEqual(['Done']);
  });

  it('restores state from localStorage', () => {
    localStorage.setItem('test-restore', JSON.stringify({
      selectedFilters: { Status: ['Todo'] },
      selectedDimensionField: 'Status',
      selectedDimensionValues: ['Todo'],
      filterOperator: 'OR',
      visibleFilters: { Status: true },
    }));

    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-restore' })
    );

    expect(result.current.selectedFilters).toEqual({ Status: ['Todo'] });
    expect(result.current.selectedDimensionField).toBe('Status');
    expect(result.current.filterOperator).toBe('OR');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('test-corrupt', 'not-json');

    const { result } = renderHook(() =>
      useFilterableDimensions({ data: sampleData, storageKey: 'test-corrupt' })
    );

    // Should use defaults
    expect(result.current.selectedFilters).toEqual({});
    expect(result.current.selectedDimensionField).toBe('labels');
  });

  it('ignores fields with too many unique values (100+)', () => {
    const bigData = Array.from({ length: 101 }, (_, i) => ({
      id: String(i),
      title: `Task ${i}`,
      BigField: `value-${i}`,
    }));

    const { result } = renderHook(() =>
      useFilterableDimensions({ data: bigData, storageKey: 'test-big' })
    );

    expect(result.current.filterableFields).not.toHaveProperty('BigField');
  });

  it('handles numeric field values', () => {
    const numericData = [
      { id: '1', title: 'T1', Score: 5 },
      { id: '2', title: 'T2', Score: 10 },
    ];

    const { result } = renderHook(() =>
      useFilterableDimensions({ data: numericData, storageKey: 'test-numeric' })
    );

    expect(result.current.filterableFields).toHaveProperty('Score');
    expect(result.current.filterableFields.Score).toEqual(['10', '5']);
  });
});
