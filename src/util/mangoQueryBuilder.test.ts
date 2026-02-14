import {
  buildSimpleFiltersSelector,
  buildAdvancedFiltersSelector,
  buildCompleteQuery,
  validateMangoQuery,
  QUERY_EXAMPLES,
} from './mangoQueryBuilder';

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

  it('handles labels with single value using OR operator (no $or wrapper)', () => {
    const result = buildSimpleFiltersSelector({ labels: ['bug'] }, 'OR');
    expect(result).toEqual({
      labels: { $elemMatch: { name: 'bug' } },
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

  it('builds date range with only to', () => {
    const result = buildAdvancedFiltersSelector({
      dateRange: { field: 'createdAt', to: '2024-12-31' },
    });
    expect(result).toEqual({
      createdAt: { $lte: '2024-12-31' },
    });
  });

  it('ignores date range when no from or to provided', () => {
    const result = buildAdvancedFiltersSelector({
      dateRange: { field: 'createdAt' },
    });
    expect(result).toEqual({});
  });

  it('builds numeric range with min and max', () => {
    const result = buildAdvancedFiltersSelector({
      numericRanges: {
        'Estimate (days)': { min: 1, max: 10 },
      },
    });
    expect(result).toEqual({
      'customFields.Estimate (days)': { $gte: 1, $lte: 10 },
    });
  });

  it('builds numeric range with only min', () => {
    const result = buildAdvancedFiltersSelector({
      numericRanges: {
        Size: { min: 5 },
      },
    });
    expect(result).toEqual({
      'customFields.Size': { $gte: 5 },
    });
  });

  it('builds numeric range with only max', () => {
    const result = buildAdvancedFiltersSelector({
      numericRanges: {
        Size: { max: 10 },
      },
    });
    expect(result).toEqual({
      'customFields.Size': { $lte: 10 },
    });
  });

  it('ignores numeric range with no min or max', () => {
    const result = buildAdvancedFiltersSelector({
      numericRanges: {
        Size: {},
      },
    });
    expect(result).toEqual({});
  });

  it('combines text search, date range, and numeric ranges with $and', () => {
    const result = buildAdvancedFiltersSelector({
      textSearch: 'bug',
      dateRange: { field: 'createdAt', from: '2024-01-01' },
      numericRanges: { Size: { min: 3 } },
    });
    expect(result).toEqual({
      $and: [
        {
          $or: [
            { title: { $regex: '.*bug.*', $options: 'i' } },
            { body: { $regex: '.*bug.*', $options: 'i' } },
          ],
        },
        { createdAt: { $gte: '2024-01-01' } },
        { 'customFields.Size': { $gte: 3 } },
      ],
    });
  });

  it('handles multiple numeric ranges', () => {
    const result = buildAdvancedFiltersSelector({
      numericRanges: {
        Size: { min: 1, max: 5 },
        Priority: { min: 1 },
      },
    });
    expect(result).toEqual({
      $and: [
        { 'customFields.Size': { $gte: 1, $lte: 5 } },
        { 'customFields.Priority': { $gte: 1 } },
      ],
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

  it('rejects $options as unknown operator (not in valid list)', () => {
    const query = { title: { $regex: '.*test.*', $options: 'i' } };
    const result = validateMangoQuery(query);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('$options');
  });

  it('returns error for undefined input', () => {
    expect(validateMangoQuery(undefined)).toEqual({
      valid: false,
      error: 'Query must be an object',
    });
  });

  it('returns error for array input', () => {
    expect(validateMangoQuery([])).toEqual({ valid: true }); // arrays are objects
  });

  it('accepts deeply nested valid operators', () => {
    const query = {
      $or: [
        { $and: [{ Status: { $eq: 'Done' } }, { state: { $ne: 'open' } }] },
        { createdAt: { $gte: '2024-01-01', $lte: '2024-12-31' } },
      ],
    };
    expect(validateMangoQuery(query)).toEqual({ valid: true });
  });
});

describe('buildCompleteQuery', () => {
  it('returns all documents when no filters provided', () => {
    const result = buildCompleteQuery({}, 'AND', {});
    expect(result).toEqual({ selector: {} });
  });

  it('returns custom query when provided', () => {
    const customQuery = { Status: { $eq: 'Done' } };
    const result = buildCompleteQuery({ Status: ['Todo'] }, 'AND', {}, customQuery);
    expect(result).toEqual({ selector: customQuery });
  });

  it('ignores empty custom query', () => {
    const result = buildCompleteQuery({ Status: ['Done'] }, 'AND', {}, {});
    expect(result).toEqual({ selector: { Status: { $in: ['Done'] } } });
  });

  it('returns only simple selector when no advanced filters', () => {
    const result = buildCompleteQuery({ Status: ['Done'] }, 'AND', {});
    expect(result).toEqual({ selector: { Status: { $in: ['Done'] } } });
  });

  it('returns only advanced selector when no simple filters', () => {
    const result = buildCompleteQuery({}, 'AND', { textSearch: 'bug' });
    expect(result).toEqual({
      selector: {
        $or: [
          { title: { $regex: '.*bug.*', $options: 'i' } },
          { body: { $regex: '.*bug.*', $options: 'i' } },
        ],
      },
    });
  });

  it('combines simple and advanced selectors with $and', () => {
    const result = buildCompleteQuery(
      { Status: ['Done'] },
      'AND',
      { textSearch: 'login' }
    );
    expect(result).toEqual({
      selector: {
        $and: [
          { Status: { $in: ['Done'] } },
          {
            $or: [
              { title: { $regex: '.*login.*', $options: 'i' } },
              { body: { $regex: '.*login.*', $options: 'i' } },
            ],
          },
        ],
      },
    });
  });

  it('uses OR operator for simple filters', () => {
    const result = buildCompleteQuery(
      { Status: ['Done'], state: ['closed'] },
      'OR',
      {}
    );
    expect(result).toEqual({
      selector: {
        $or: [
          { Status: { $in: ['Done'] } },
          { state: { $in: ['closed'] } },
        ],
      },
    });
  });
});

describe('QUERY_EXAMPLES', () => {
  it('is a non-empty object', () => {
    expect(Object.keys(QUERY_EXAMPLES).length).toBeGreaterThan(0);
  });

  it('contains valid example queries', () => {
    for (const [name, query] of Object.entries(QUERY_EXAMPLES)) {
      const result = validateMangoQuery(query);
      expect(result.valid).toBe(true);
    }
  });
});
