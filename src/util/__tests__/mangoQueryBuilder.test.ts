import {
  buildSimpleFiltersSelector,
  buildAdvancedFiltersSelector,
  validateMangoQuery,
} from '../mangoQueryBuilder';

describe('buildSimpleFiltersSelector', () => {
  it('returns {} for empty filters', () => {
    expect(buildSimpleFiltersSelector({})).toEqual({});
  });

  it('returns {} when all filter arrays are empty', () => {
    expect(buildSimpleFiltersSelector({ Status: [] })).toEqual({});
  });

  it('handles a single field with one value', () => {
    expect(buildSimpleFiltersSelector({ Status: ['Done'] })).toEqual({
      Status: { $in: ['Done'] },
    });
  });

  it('handles a single field with multiple values using $in', () => {
    expect(buildSimpleFiltersSelector({ Status: ['Todo', 'Done'] })).toEqual({
      Status: { $in: ['Todo', 'Done'] },
    });
  });

  it('handles labels field with $elemMatch', () => {
    expect(buildSimpleFiltersSelector({ labels: ['bug'] })).toEqual({
      labels: { $elemMatch: { name: 'bug' } },
    });
  });

  it('handles labels with multiple values using AND operator', () => {
    const result = buildSimpleFiltersSelector({ labels: ['bug', 'feature'] }, 'AND');
    expect(result).toEqual({
      $and: [
        { labels: { $elemMatch: { name: 'bug' } } },
        { labels: { $elemMatch: { name: 'feature' } } },
      ],
    });
  });

  it('handles labels with multiple values using OR operator', () => {
    const result = buildSimpleFiltersSelector({ labels: ['bug', 'feature'] }, 'OR');
    expect(result).toEqual({
      $or: [
        { labels: { $elemMatch: { name: 'bug' } } },
        { labels: { $elemMatch: { name: 'feature' } } },
      ],
    });
  });

  it('combines multiple fields with AND operator', () => {
    const result = buildSimpleFiltersSelector(
      { Status: ['Done'], state: ['closed'] },
      'AND'
    );
    expect(result).toEqual({
      $and: [
        { Status: { $in: ['Done'] } },
        { state: { $in: ['closed'] } },
      ],
    });
  });

  it('combines multiple fields with OR operator', () => {
    const result = buildSimpleFiltersSelector(
      { Status: ['Done'], state: ['closed'] },
      'OR'
    );
    expect(result).toEqual({
      $or: [
        { Status: { $in: ['Done'] } },
        { state: { $in: ['closed'] } },
      ],
    });
  });

  it('prefixes custom (non-schema) fields with customFields.', () => {
    expect(buildSimpleFiltersSelector({ Priority: ['High'] })).toEqual({
      'customFields.Priority': { $in: ['High'] },
    });
  });
});

describe('buildAdvancedFiltersSelector', () => {
  it('returns {} for empty filters', () => {
    expect(buildAdvancedFiltersSelector({})).toEqual({});
  });

  it('builds $regex text search on title and body', () => {
    const result = buildAdvancedFiltersSelector({ textSearch: 'login' });
    expect(result).toEqual({
      $or: [
        { title: { $regex: '.*login.*', $options: 'i' } },
        { body: { $regex: '.*login.*', $options: 'i' } },
      ],
    });
  });

  it('trims whitespace from text search', () => {
    const result = buildAdvancedFiltersSelector({ textSearch: '  login  ' });
    expect(result).toEqual({
      $or: [
        { title: { $regex: '.*login.*', $options: 'i' } },
        { body: { $regex: '.*login.*', $options: 'i' } },
      ],
    });
  });

  it('ignores empty or whitespace-only text search', () => {
    expect(buildAdvancedFiltersSelector({ textSearch: '   ' })).toEqual({});
  });

  it('builds date range with from and to', () => {
    const result = buildAdvancedFiltersSelector({
      dateRange: { field: 'createdAt', from: '2024-01-01', to: '2024-12-31' },
    });
    expect(result).toEqual({
      createdAt: { $gte: '2024-01-01', $lte: '2024-12-31' },
    });
  });

  it('builds date range with only from', () => {
    const result = buildAdvancedFiltersSelector({
      dateRange: { field: 'updatedAt', from: '2024-06-01' },
    });
    expect(result).toEqual({
      updatedAt: { $gte: '2024-06-01' },
    });
  });
});

describe('validateMangoQuery', () => {
  it('returns valid for a correct query', () => {
    expect(validateMangoQuery({ Status: { $eq: 'Done' } })).toEqual({ valid: true });
  });

  it('returns error for null input', () => {
    expect(validateMangoQuery(null)).toEqual({
      valid: false,
      error: 'Query must be an object',
    });
  });

  it('returns error for non-object input', () => {
    expect(validateMangoQuery('not an object')).toEqual({
      valid: false,
      error: 'Query must be an object',
    });
  });

  it('returns error for unknown operators', () => {
    const result = validateMangoQuery({ field: { $invalid: true } });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown operators');
    expect(result.error).toContain('$invalid');
  });

  it('accepts all valid operators', () => {
    const query = {
      $and: [
        { field: { $in: ['a'] } },
        { field: { $regex: '.*test.*' } },
        { arr: { $elemMatch: { name: 'x' } } },
      ],
    };
    expect(validateMangoQuery(query)).toEqual({ valid: true });
  });
});
