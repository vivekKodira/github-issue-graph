import React from 'react';
import { render } from '@testing-library/react';
import { AverageByPersonTable } from './AverageByPersonTable';

describe('AverageByPersonTable', () => {
  it('renders without crashing with empty data', () => {
    const { container } = render(
      <AverageByPersonTable
        personLabel="Person"
        valueLabel="Average"
        averages={{}}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with data', () => {
    const mockData = {
      'User 1': 5.5,
      'User 2': 3.2,
    };
    const { container } = render(
      <AverageByPersonTable
        personLabel="Person"
        valueLabel="Average"
        averages={mockData}
      />
    );
    expect(container).toBeTruthy();
  });
});
