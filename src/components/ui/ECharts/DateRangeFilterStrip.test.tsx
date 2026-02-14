import React from 'react';
import { render } from '@testing-library/react';
import { DateRangeFilterStrip } from './DateRangeFilterStrip';

describe('DateRangeFilterStrip', () => {
  const mockData = [
    { createdAt: '2024-01-01T00:00:00Z', value: 1 },
    { createdAt: '2024-01-15T00:00:00Z', value: 2 },
  ];

  it('renders without crashing with empty data', () => {
    const { container } = render(
      <DateRangeFilterStrip
        data={[]}
        dateField="createdAt"
        onFilteredData={() => {}}
        styleOptions={{}}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with data', () => {
    const { container } = render(
      <DateRangeFilterStrip
        data={mockData}
        dateField="createdAt"
        onFilteredData={() => {}}
        styleOptions={{}}
      />
    );
    expect(container).toBeTruthy();
  });
});
