import React from 'react';
import { render } from '@testing-library/react';
import { IssueAnalysisDashboard } from './IssueAnalysisDashboard';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';

jest.mock('react-icons/lu', () => ({
  LuFilter: () => <span>Filter</span>,
  LuRefreshCw: () => <span>Refresh</span>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('IssueAnalysisDashboard', () => {
  const mockData = [
    {
      id: '1',
      title: 'Test Issue',
      Status: 'Done',
      assignees: ['user1'],
      labels: ['bug'],
      createdAt: '2024-01-15T00:00:00Z',
    },
  ];

  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <IssueAnalysisDashboard data={[]} onFilteredDataChange={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with data', () => {
    const { container } = renderWithProviders(
      <IssueAnalysisDashboard data={mockData} onFilteredDataChange={() => {}} />
    );
    expect(container).toBeTruthy();
  });
});
