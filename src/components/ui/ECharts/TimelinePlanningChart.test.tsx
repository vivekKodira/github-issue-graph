import React from 'react';
import { render } from '@testing-library/react';
import { TimelinePlanningChart } from './TimelinePlanningChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockTask } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('TimelinePlanningChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <TimelinePlanningChart
        filteredData={[]}
        filterableFields={{}}
        styleOptions={{ width: '100%', height: '400px' }}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask(),
      createMockTask()
    ];
    const filterableFields = {
      'Estimate (days)': ['1', '2', '3']
    };
    const { container } = renderWithProviders(
      <TimelinePlanningChart
        filteredData={mockData}
        filterableFields={filterableFields}
        styleOptions={{ width: '100%', height: '400px' }}
      />
    );
    expect(container).toBeTruthy();
  });
});
