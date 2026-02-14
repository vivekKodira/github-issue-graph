import React from 'react';
import { render } from '@testing-library/react';
import { SprintChart } from './SprintChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockTask } from '@/test/fixtures';

jest.mock('./ECharts', () => ({ ECharts: () => <div data-testid="echarts-mock" /> }));
jest.mock('./ErrorBoundary', () => ({ ErrorBoundary: ({ children }: any) => <>{children}</> }));
jest.mock('./DateRangeFilterStrip', () => ({ DateRangeFilterStrip: () => <div /> }));
jest.mock('./createGraphData.js', () => ({
  processBarChartData: jest.fn(() => ({ series: [], xAxis: {} }))
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('SprintChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <SprintChart flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [createMockTask({ Sprint: 'Sprint-1' })];
    const { container } = renderWithProviders(
      <SprintChart flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
