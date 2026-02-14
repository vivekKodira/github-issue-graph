import React from 'react';
import { render } from '@testing-library/react';
import { Insights } from './Insights';

describe('Insights', () => {
  it('renders without crashing with empty insights', () => {
    const { container } = render(<Insights insights={[]} />);
    expect(container).toBeTruthy();
  });

  it('renders without crashing with insights', () => {
    const mockInsights = [
      { title: 'Test Insight', message: 'Test message', type: 'info' as const },
    ];
    const { container } = render(<Insights insights={mockInsights} />);
    expect(container).toBeTruthy();
  });
});
