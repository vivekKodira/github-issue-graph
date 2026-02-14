import React from 'react';
import { render } from '@testing-library/react';
import { StatusChart } from './StatusChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockTask } from '@/test/fixtures';

// Mock ECharts component
jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

// Mock ErrorBoundary
jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

// Mock DateRangeFilterStrip
jest.mock('./DateRangeFilterStrip', () => ({
  DateRangeFilterStrip: () => <div data-testid="date-filter-mock" />
}));

// Mock createGraphData
jest.mock('./createGraphData.js', () => ({
  processBarChartData: jest.fn(() => ({ series: [], xAxis: {} }))
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ProjectKeysProvider>{ui}</ProjectKeysProvider>
  );
};

describe('StatusChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <StatusChart flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ Status: 'Done' }),
      createMockTask({ Status: 'In Progress' })
    ];
    const { container } = renderWithProviders(
      <StatusChart flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
