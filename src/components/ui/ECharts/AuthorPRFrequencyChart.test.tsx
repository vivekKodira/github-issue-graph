import React from 'react';
import { render } from '@testing-library/react';
import { AuthorPRFrequencyChart } from './AuthorPRFrequencyChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockPR } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

jest.mock('./ChartDropdown', () => ({
  ChartDropdown: () => <div data-testid="chart-dropdown-mock" />
}));

jest.mock('./AverageByPersonTable', () => ({
  AverageByPersonTable: () => <div data-testid="average-table-mock" />
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('AuthorPRFrequencyChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <AuthorPRFrequencyChart prs={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR({ author: 'author1' }),
      createMockPR({ number: 2, author: 'author2' })
    ];
    const { container } = renderWithProviders(
      <AuthorPRFrequencyChart prs={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
