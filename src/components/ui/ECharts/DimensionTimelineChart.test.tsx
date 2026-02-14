import React from 'react';
import { render } from '@testing-library/react';
import { DimensionTimelineChart } from './DimensionTimelineChart';
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

describe('DimensionTimelineChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <DimensionTimelineChart
        filteredData={[]}
        selectedDimensionField="Status"
        selectedDimensionValues={[]}
        styleOptions={{ width: '100%', height: '400px' }}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ Status: 'Done', createdAt: '2024-01-15T00:00:00Z' }),
      createMockTask({ Status: 'In Progress', createdAt: '2024-01-16T00:00:00Z' })
    ];
    const { container } = renderWithProviders(
      <DimensionTimelineChart
        filteredData={mockData}
        selectedDimensionField="Status"
        selectedDimensionValues={['Done', 'In Progress']}
        styleOptions={{ width: '100%', height: '400px' }}
      />
    );
    expect(container).toBeTruthy();
  });
});
