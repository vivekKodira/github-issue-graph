// Pure functions extracted from TypeLabelAnalysisChart

interface Issue {
  labels?: Array<{ name: string }>;
  [key: string]: unknown;
}

interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    type: string;
    data: number[];
    emphasis: { focus: string };
  }>;
}

/**
 * Create chart data for label-based dimension
 */
export const createChartData = (
  filteredIssues: Issue[],
  selectedLabels: string[]
): ChartData => {
  const result: ChartData = { categories: [], series: [] };

  if (selectedLabels.length === 0) return result;

  const labelCounts: Record<string, number> = {};
  selectedLabels.forEach((label) => {
    labelCounts[label] = 0;
  });

  filteredIssues.forEach((issue) => {
    const issueLabels = issue.labels?.map((l) => l.name) || [];
    selectedLabels.forEach((label) => {
      if (issueLabels.includes(label)) {
        labelCounts[label]++;
      }
    });
  });

  result.categories = selectedLabels;
  result.series = [
    {
      name: 'Issue Count',
      type: 'bar',
      data: selectedLabels.map((label) => labelCounts[label]),
      emphasis: { focus: 'self' },
    },
  ];

  return result;
};

/**
 * Create chart data for non-label field dimension
 */
export const createChartDataForField = (
  issues: Issue[],
  fieldName: string,
  selectedValues: string[]
): ChartData => {
  const result: ChartData = { categories: [], series: [] };

  if (selectedValues.length === 0) return result;

  const valueCounts: Record<string, number> = {};
  selectedValues.forEach((value) => {
    valueCounts[value] = 0;
  });

  issues.forEach((issue) => {
    const issueValue = String(issue[fieldName] || '');
    if (selectedValues.includes(issueValue)) {
      valueCounts[issueValue]++;
    }
  });

  result.categories = selectedValues;
  result.series = [
    {
      name: 'Issue Count',
      type: 'bar',
      data: selectedValues.map((value) => valueCounts[value]),
      emphasis: { focus: 'self' },
    },
  ];

  return result;
};
