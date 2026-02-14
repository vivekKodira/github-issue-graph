import React from 'react';
import { render } from '@testing-library/react';
import { CodeChurnChart } from './CodeChurnChart';
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('CodeChurnChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <CodeChurnChart prs={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR({ additions: 50, deletions: 10, changedFiles: 3 }),
      createMockPR({ number: 2, additions: 100, deletions: 20, changedFiles: 5 })
    ];
    const { container } = renderWithProviders(
      <CodeChurnChart prs={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
