import React from 'react';
import { render } from '@testing-library/react';
import { RCAWordCloudChart } from './RCAWordCloudChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

jest.mock('./DateRangeFilterStrip', () => ({
  DateRangeFilterStrip: () => <div data-testid="date-filter-mock" />
}));

jest.mock('@/util/chartDataGenerators/textProcessing', () => ({
  extractRCA: jest.fn(() => null),
  extractSentences: jest.fn(() => []),
  processSentencesWithAI: jest.fn(() => Promise.resolve({ normalizedSentences: [], filteredSentences: [] }))
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('RCAWordCloudChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <RCAWordCloudChart issues={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      {
        Type: 'Bug',
        body: 'Test issue body',
        title: 'Test issue',
        issue_number: 1,
        labels: [{ name: 'bug' }]
      }
    ];
    const { container } = renderWithProviders(
      <RCAWordCloudChart issues={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
