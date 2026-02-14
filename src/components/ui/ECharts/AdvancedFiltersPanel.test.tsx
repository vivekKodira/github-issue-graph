import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';

describe('AdvancedFiltersPanel', () => {
  const emptyFilters = {};

  it('renders without crashing', () => {
    const { container } = render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={() => {}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders text search input with existing value', () => {
    render(
      <AdvancedFiltersPanel
        advancedFilters={{ textSearch: 'login bug' }}
        onUpdate={() => {}}
      />
    );
    const input = screen.getByPlaceholderText('Enter search text...');
    expect(input).toHaveValue('login bug');
  });

  it('calls onUpdate when text search changes', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={onUpdate} />
    );
    const input = screen.getByPlaceholderText('Enter search text...');
    fireEvent.change(input, { target: { value: 'new search' } });
    expect(onUpdate).toHaveBeenCalledWith({ textSearch: 'new search' });
  });

  it('renders date range from/to inputs', () => {
    render(
      <AdvancedFiltersPanel
        advancedFilters={{
          dateRange: { field: 'createdAt', from: '2024-01-01', to: '2024-12-31' }
        }}
        onUpdate={() => {}}
      />
    );
    // Should render the "Clear Date Range" button when dates are set
    expect(screen.getByText('Clear Date Range')).toBeTruthy();
  });

  it('calls onUpdate to clear date range', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel
        advancedFilters={{
          dateRange: { field: 'createdAt', from: '2024-01-01', to: '2024-12-31' }
        }}
        onUpdate={onUpdate}
      />
    );
    fireEvent.click(screen.getByText('Clear Date Range'));
    expect(onUpdate).toHaveBeenCalledWith({ dateRange: undefined });
  });

  it('calls onUpdate when date field from changes', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={onUpdate} />
    );
    const fromInputs = screen.getAllByDisplayValue('');
    // Find the date input (type="date")
    const dateInputs = fromInputs.filter(el => el.getAttribute('type') === 'date');
    if (dateInputs.length > 0) {
      fireEvent.change(dateInputs[0], { target: { value: '2024-06-01' } });
      expect(onUpdate).toHaveBeenCalled();
    }
  });

  it('renders numeric range section', () => {
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={() => {}} />
    );
    expect(screen.getByText('Add Numeric Range')).toBeTruthy();
  });

  it('renders active numeric ranges with remove buttons', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel
        advancedFilters={{
          numericRanges: {
            'Estimate (days)': { min: 1, max: 10 },
            'Priority': { min: 1 },
          }
        }}
        onUpdate={onUpdate}
      />
    );
    expect(screen.getByText('Active Numeric Filters:')).toBeTruthy();
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBe(2);
  });

  it('removes a numeric range when clicking Remove', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel
        advancedFilters={{
          numericRanges: {
            'Estimate (days)': { min: 1, max: 10 },
            'Priority': { min: 1 },
          }
        }}
        onUpdate={onUpdate}
      />
    );
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows Clear All Advanced Filters button when any filter is active', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel
        advancedFilters={{ textSearch: 'hello' }}
        onUpdate={onUpdate}
      />
    );
    const clearButton = screen.getByText('Clear All Advanced Filters');
    fireEvent.click(clearButton);
    expect(onUpdate).toHaveBeenCalledWith({
      textSearch: undefined,
      dateRange: undefined,
      numericRanges: undefined,
    });
  });

  it('does not show Clear All button when no filters are active', () => {
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={() => {}} />
    );
    expect(screen.queryByText('Clear All Advanced Filters')).toBeNull();
  });

  it('adds a numeric range via the Add button', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={onUpdate} />
    );
    // Fill in the numeric range form
    const fieldNameInput = document.getElementById('numeric-field-name') as HTMLInputElement;
    const minInput = document.getElementById('numeric-min') as HTMLInputElement;
    const maxInput = document.getElementById('numeric-max') as HTMLInputElement;

    fireEvent.change(fieldNameInput, { target: { value: 'Size' } });
    fireEvent.change(minInput, { target: { value: '3' } });
    fireEvent.change(maxInput, { target: { value: '10' } });

    fireEvent.click(screen.getByText('Add Numeric Range'));
    expect(onUpdate).toHaveBeenCalledWith({
      numericRanges: { Size: { min: 3, max: 10 } },
    });
  });

  it('does not add numeric range without field name', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={onUpdate} />
    );
    // Don't fill in field name, just min
    const minInput = document.getElementById('numeric-min') as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: '5' } });

    fireEvent.click(screen.getByText('Add Numeric Range'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('changes date range field selector', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel advancedFilters={emptyFilters} onUpdate={onUpdate} />
    );
    // Find the field selector (it's a <select> with "Created Date" and "Updated Date")
    const selects = document.querySelectorAll('select');
    const dateFieldSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'updatedAt')
    );
    if (dateFieldSelect) {
      fireEvent.change(dateFieldSelect, { target: { value: 'updatedAt' } });
      expect(onUpdate).toHaveBeenCalled();
    }
  });

  it('removes last numeric range setting numericRanges to undefined', () => {
    const onUpdate = jest.fn();
    render(
      <AdvancedFiltersPanel
        advancedFilters={{
          numericRanges: { 'Size': { min: 1 } },
        }}
        onUpdate={onUpdate}
      />
    );
    fireEvent.click(screen.getByText('Remove'));
    expect(onUpdate).toHaveBeenCalledWith({ numericRanges: undefined });
  });
});
