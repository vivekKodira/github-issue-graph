import React from 'react';
import { render } from '@testing-library/react';
import { SprintVelocityChart } from './SprintVelocityChart';
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

describe('SprintVelocityChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <SprintVelocityChart flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} onInsightsGenerated={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ Status: 'Done' }),
      createMockTask({ Status: 'Done' })
    ];
    const { container } = renderWithProviders(
      <SprintVelocityChart flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} onInsightsGenerated={() => {}} />
    );
    expect(container).toBeTruthy();
  });
});
