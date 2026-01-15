/**
 * Mango Query Builder Utilities for RxDB
 * Provides functions to build complex Mango queries from filter state
 */

export interface SimpleFilters {
  [fieldName: string]: string[]; // e.g., { Status: ['Todo', 'Done'], labels: ['bug', 'feature'] }
}

export interface AdvancedFilters {
  textSearch?: string;
  dateRange?: {
    field: 'createdAt' | 'updatedAt';
    from?: string;
    to?: string;
  };
  numericRanges?: {
    [fieldName: string]: {
      min?: number;
      max?: number;
    };
  };
}

export interface MangoQuery {
  selector: any;
}

/**
 * Top-level schema fields that can be queried directly
 * Fields not in this list are stored in customFields and must be queried via customFields.fieldName
 */
const TOP_LEVEL_SCHEMA_FIELDS = new Set([
  'id', 'title', 'issue_number', 'repository', 'repo_owner', 'body', 
  'state', 'Status', 'html_url', 'Type', 'labels', 'assignees', 'links', 
  'customFields', 'createdAt', 'updatedAt'
]);

/**
 * Build a Mango selector for simple checkbox filters
 */
export function buildSimpleFiltersSelector(
  filters: SimpleFilters,
  operator: 'AND' | 'OR' = 'AND'
): any {
  const conditions: any[] = [];

  Object.entries(filters).forEach(([fieldName, values]) => {
    if (values.length === 0) return;

    if (fieldName === 'labels') {
      // Labels is an array field - need to check if any label matches
      const labelConditions = values.map(labelName => ({
        labels: {
          $elemMatch: {
            name: labelName
          }
        }
      }));

      if (operator === 'AND') {
        // All selected labels must exist
        conditions.push(...labelConditions);
      } else {
        // At least one selected label must exist
        if (labelConditions.length > 1) {
          conditions.push({ $or: labelConditions });
        } else {
          conditions.push(...labelConditions);
        }
      }
    } else {
      // Determine if field is top-level or in customFields
      const queryField = TOP_LEVEL_SCHEMA_FIELDS.has(fieldName) 
        ? fieldName 
        : `customFields.${fieldName}`;
      
      // Regular field - check if value is in the selected values
      conditions.push({
        [queryField]: { $in: values }
      });
    }
  });

  if (conditions.length === 0) {
    return {}; // No filters - return all
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  // Multiple conditions - combine with operator
  return operator === 'AND' 
    ? { $and: conditions }
    : { $or: conditions };
}

/**
 * Build a Mango selector for advanced filters
 */
export function buildAdvancedFiltersSelector(advancedFilters: AdvancedFilters): any {
  const conditions: any[] = [];

  // Text search across title and body
  if (advancedFilters.textSearch && advancedFilters.textSearch.trim()) {
    const searchText = advancedFilters.textSearch.trim();
    conditions.push({
      $or: [
        { title: { $regex: `.*${searchText}.*`, $options: 'i' } },
        { body: { $regex: `.*${searchText}.*`, $options: 'i' } }
      ]
    });
  }

  // Date range filter
  if (advancedFilters.dateRange) {
    const { field, from, to } = advancedFilters.dateRange;
    const dateCondition: any = {};

    if (from) {
      dateCondition.$gte = from;
    }
    if (to) {
      dateCondition.$lte = to;
    }

    if (Object.keys(dateCondition).length > 0) {
      conditions.push({
        [field]: dateCondition
      });
    }
  }

  // Numeric range filters
  if (advancedFilters.numericRanges) {
    Object.entries(advancedFilters.numericRanges).forEach(([fieldName, range]) => {
      const numericCondition: any = {};

      if (range.min !== undefined) {
        numericCondition.$gte = range.min;
      }
      if (range.max !== undefined) {
        numericCondition.$lte = range.max;
      }

      if (Object.keys(numericCondition).length > 0) {
        // Access nested field in customFields
        conditions.push({
          [`customFields.${fieldName}`]: numericCondition
        });
      }
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

/**
 * Combine simple and advanced filters into a single Mango query
 */
export function buildCompleteQuery(
  simpleFilters: SimpleFilters,
  simpleOperator: 'AND' | 'OR',
  advancedFilters: AdvancedFilters,
  customQuery?: any
): MangoQuery {
  // If custom query is provided and valid, use it
  if (customQuery && Object.keys(customQuery).length > 0) {
    return { selector: customQuery };
  }

  const simpleSelector = buildSimpleFiltersSelector(simpleFilters, simpleOperator);
  const advancedSelector = buildAdvancedFiltersSelector(advancedFilters);

  // Combine both selectors
  const conditions: any[] = [];

  if (Object.keys(simpleSelector).length > 0) {
    conditions.push(simpleSelector);
  }

  if (Object.keys(advancedSelector).length > 0) {
    conditions.push(advancedSelector);
  }

  if (conditions.length === 0) {
    return { selector: {} }; // Return all documents
  }

  if (conditions.length === 1) {
    return { selector: conditions[0] };
  }

  return { selector: { $and: conditions } };
}

/**
 * Validate a Mango query selector
 */
export function validateMangoQuery(query: any): { valid: boolean; error?: string } {
  try {
    if (!query || typeof query !== 'object') {
      return { valid: false, error: 'Query must be an object' };
    }

    // Basic validation - check for common mistakes
    const queryStr = JSON.stringify(query);
    
    // Check for balanced braces
    const openBraces = (queryStr.match(/{/g) || []).length;
    const closeBraces = (queryStr.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: 'Unbalanced braces in query' };
    }

    // Check for valid operators (basic check)
    const validOperators = ['$and', '$or', '$not', '$nor', '$eq', '$ne', '$gt', '$gte', 
                           '$lt', '$lte', '$in', '$nin', '$exists', '$regex', '$elemMatch', 
                           '$size', '$mod', '$all'];
    
    const operators = queryStr.match(/"\$[a-z]+"/gi) || [];
    const invalidOps = operators.filter(op => !validOperators.includes(op.replace(/"/g, '')));
    
    if (invalidOps.length > 0) {
      return { valid: false, error: `Unknown operators: ${invalidOps.join(', ')}` };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Example query templates for users to learn from
 */
export const QUERY_EXAMPLES = {
  'High Priority Bugs': {
    $and: [
      { labels: { $elemMatch: { name: 'bug' } } },
      { customFields: { Priority: 'High' } }
    ]
  },
  'Unassigned Open Issues': {
    $and: [
      { Status: { $ne: 'Done' } },
      { $or: [
        { assignees: { $size: 0 } },
        { assignees: { $exists: false } }
      ]}
    ]
  },
  'Old Issues (>30 days)': {
    createdAt: {
      $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  'Large Estimates (>5 days)': {
    'customFields.Estimate (days)': { $gte: 5 }
  },
  'Recent High Priority': {
    $and: [
      { customFields: { Priority: 'High' } },
      { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } }
    ]
  }
};

