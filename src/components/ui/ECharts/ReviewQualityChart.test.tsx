import React from 'react';
import { render } from '@testing-library/react';
import { ReviewQualityChart } from './ReviewQualityChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockPR } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
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

describe('ReviewQualityChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <ReviewQualityChart prs={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR(),
      createMockPR({ number: 2 })
    ];
    const { container } = renderWithProviders(
      <ReviewQualityChart prs={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
