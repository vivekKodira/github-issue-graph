import React from 'react';
import { render } from '@testing-library/react';
import { ReviewWordCloudChart } from './ReviewWordCloudChart';
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

jest.mock('@/util/chartDataGenerators/textProcessing', () => ({
  extractSentences: jest.fn(() => []),
  processSentencesWithAI: jest.fn(() => Promise.resolve({ normalizedSentences: [], filteredSentences: [] }))
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('ReviewWordCloudChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <ReviewWordCloudChart prs={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR(),
      createMockPR({ number: 2 })
    ];
    const { container } = renderWithProviders(
      <ReviewWordCloudChart prs={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
