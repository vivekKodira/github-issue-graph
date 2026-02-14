import React from 'react';
import { render } from '@testing-library/react';
import { AssigneeLineCharts } from './AssigneeLineCharts';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';
import { createMockTask } from '@/test/fixtures';

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

jest.mock('react-icons/lu', () => ({
  LuChevronDown: () => <span>▼</span>,
  LuX: () => <span>X</span>
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('AssigneeLineCharts', () => {
  it('renders without crashing with empty data', () => {
    const { container } = renderWithProviders(
      <AssigneeLineCharts flattenedData={[]} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" onInsightsGenerated={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with mock data', () => {
    const mockData = [
      createMockTask({ assignees: ['user1'], Status: 'Done' }),
      createMockTask({ assignees: ['user2'], Status: 'Done' })
    ];
    const { container } = renderWithProviders(
      <AssigneeLineCharts flattenedData={mockData} styleOptions={{ width: '100%', height: '400px' }} searchTerm="" onInsightsGenerated={() => {}} />
    );
    expect(container).toBeTruthy();
  });
});
