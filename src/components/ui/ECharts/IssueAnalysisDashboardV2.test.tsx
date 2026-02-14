import React from 'react';
import { render } from '@testing-library/react';
import { IssueAnalysisDashboardV2 } from './IssueAnalysisDashboardV2';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';

jest.mock('react-icons/lu', () => ({
  LuFilter: () => <span>Filter</span>,
  LuRefreshCw: () => <span>Refresh</span>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('IssueAnalysisDashboardV2', () => {
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
      <IssueAnalysisDashboardV2 data={[]} onFilteredDataChange={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with data', () => {
    const { container } = renderWithProviders(
      <IssueAnalysisDashboardV2 data={mockData} onFilteredDataChange={() => {}} />
    );
    expect(container).toBeTruthy();
  });
});
