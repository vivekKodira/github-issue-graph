import React from 'react';
import { render } from '@testing-library/react';
import { EffortPredictionChart } from './EffortPredictionChart';
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

describe('EffortPredictionChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <EffortPredictionChart
        flattenedData={[]}
        styleOptions={{ width: '100%', height: '400px' }}
        onInsightsGenerated={() => {}}
        plannedEffortForProject={100}
        plannedEndDate="2024-12-31"
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ Status: 'Done' }),
      createMockTask({ Status: 'Done' })
    ];
    const { container } = renderWithProviders(
      <EffortPredictionChart
        flattenedData={mockData}
        styleOptions={{ width: '100%', height: '400px' }}
        onInsightsGenerated={() => {}}
        plannedEffortForProject={100}
        plannedEndDate="2024-12-31"
      />
    );
    expect(container).toBeTruthy();
  });
});
