import React from 'react';
import { render } from '@testing-library/react';
import { AssigneePieCharts } from './AssigneePieCharts';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockTask } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

jest.mock('./DateRangeFilterStrip', () => ({
  DateRangeFilterStrip: () => <div data-testid="date-filter-mock" />
}));

jest.mock('./ChartDropdown', () => ({
  ChartDropdown: () => <div data-testid="chart-dropdown-mock" />
}));

jest.mock('./AverageByPersonTable', () => ({
  AverageByPersonTable: () => <div data-testid="average-table-mock" />
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('AssigneePieCharts', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <AssigneePieCharts flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ assignees: ['user1'] }),
      createMockTask({ assignees: ['user2'] })
    ];
    const { container } = renderWithProviders(
      <AssigneePieCharts flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" />
    );
    expect(container).toBeTruthy();
  });
});
