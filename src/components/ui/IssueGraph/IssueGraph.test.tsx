import React from 'react';
import { render } from '@testing-library/react';
import { IssueGraph } from './IssueGraph';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockPR } from '@/test/fixtures';

jest.mock('@/components/ui/ECharts/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

jest.mock('./graphCreator', () => ({
  createGraphData: jest.fn(() => ({ nodes: [], links: [] }))
}));

jest.mock('./graph', () => ({
  createGraph: jest.fn()
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('IssueGraph', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <IssueGraph issues={[]} prs={[]} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockIssues = [
      {
        id: 'issue-1',
        title: 'Test issue',
        number: 1,
        body: 'Test body',
        state: 'open',
        html_url: 'https://github.com/test/1',
        labels: [{ name: 'bug', color: '#ff0000' }],
        links: []
      }
    ];
    const mockPRs = [createMockPR()];
    const { container } = renderWithProviders(
      <IssueGraph issues={mockIssues} prs={mockPRs} />
    );
    expect(container).toBeTruthy();
  });
});
