import React from 'react';
import { render } from '@testing-library/react';
import { CustomCheckboxIndicator } from './CustomCheckboxIndicator';

describe('CustomCheckboxIndicator', () => {
  it('renders unchecked state', () => {
    const { container } = render(<CustomCheckboxIndicator checked={false} />);
    expect(container).toBeTruthy();
  });

  it('renders checked state', () => {
    const { container } = render(<CustomCheckboxIndicator checked={true} />);
    expect(container).toBeTruthy();
  });
});
