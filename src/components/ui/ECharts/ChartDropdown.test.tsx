import React from 'react';
import { render } from '@testing-library/react';
import { ChartDropdown } from './ChartDropdown';

jest.mock('react-icons/lu', () => ({
  LuChevronDown: () => <span>▼</span>,
  LuX: () => <span>X</span>
}));

describe('ChartDropdown', () => {
  const mockOptions = ['Option 1', 'Option 2', 'Option 3'];

  it('renders with single selection', () => {
    const { container } = render(
      <ChartDropdown
        title="Test Dropdown"
        options={mockOptions}
        selectedValues={['Option 1']}
        onSelectionChange={() => {}}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders with multiple selection', () => {
    const { container } = render(
      <ChartDropdown
        title="Test Dropdown"
        options={mockOptions}
        selectedValues={['Option 1', 'Option 2']}
        onSelectionChange={() => {}}
        multiple={true}
      />
    );
    expect(container).toBeTruthy();
  });
});
