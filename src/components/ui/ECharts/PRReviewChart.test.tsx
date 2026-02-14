import React from 'react';
import { render } from '@testing-library/react';
import { PRReviewChart } from './PRReviewChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockPR } from '@/test/fixtures';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('PRReviewChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <PRReviewChart prs={[]} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockPR(),
      createMockPR({ number: 2 })
    ];
    const { container } = renderWithProviders(
      <PRReviewChart prs={mockData} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
