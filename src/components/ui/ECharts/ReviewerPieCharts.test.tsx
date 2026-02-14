import React from 'react';
import { render } from '@testing-library/react';
import { ReviewerPieCharts } from './ReviewerPieCharts';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockPR } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

jest.mock('./DateRangeFilterStrip', () => ({
  DateRangeFilterStrip: () => <div data-testid="date-filter-mock" />
}));

jest.mock('./AverageByPersonTable', () => ({
  AverageByPersonTable: () => <div data-testid="average-table-mock" />
}));

jest.mock('./CustomCheckboxIndicator', () => ({
  CustomCheckboxIndicator: () => <div data-testid="checkbox-indicator-mock" />
}));

jest.mock('./templates/pieChartTemplate.js', () => ({
  default: { series: [], tooltip: {} }
}));

jest.mock('./DateRangeFilterStrip', () => ({
  DateRangeFilterStrip: ({ onFilteredData }: any) => {
    // Use useEffect with empty deps to call onFilteredData only once on mount
    React.useEffect(() => {
      if (onFilteredData) {
        onFilteredData([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="date-filter-mock" />;
  }
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('ReviewerPieCharts', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <ReviewerPieCharts flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR(),
      createMockPR({ number: 2 })
    ];
    const { container } = renderWithProviders(
      <ReviewerPieCharts flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" />
    );
    expect(container).toBeTruthy();
  });
});
