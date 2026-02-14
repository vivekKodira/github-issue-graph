import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';

describe('FilterPanel', () => {
  const defaultProps = {
    filterableFields: {
      Status: ['Done', 'Todo', 'In Progress'],
      Priority: ['High', 'Low'],
    },
    uniqueLabels: ['bug', 'feature'],
    selectedFilters: {},
    filterOperator: 'AND' as const,
    visibleFilters: {},
    showMetaFilter: false,
    onFilterToggle: jest.fn(),
    onOperatorChange: jest.fn(),
    onToggleMetaFilter: jest.fn(),
    onToggleFilterVisibility: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<FilterPanel {...defaultProps} />);
    expect(container).toBeTruthy();
    expect(screen.getByText('Filters')).toBeTruthy();
  });

  it('shows/hides filter options button', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Show Filter Options')).toBeTruthy();
  });

  it('toggles meta filter on button click', () => {
    const onToggleMetaFilter = jest.fn();
    render(<FilterPanel {...defaultProps} onToggleMetaFilter={onToggleMetaFilter} />);
    fireEvent.click(screen.getByText('Show Filter Options'));
    expect(onToggleMetaFilter).toHaveBeenCalled();
  });

  it('shows "Hide Filter Options" when showMetaFilter is true', () => {
    render(<FilterPanel {...defaultProps} showMetaFilter={true} />);
    expect(screen.getByText('Hide Filter Options')).toBeTruthy();
  });

  it('renders meta filter checkboxes when showMetaFilter is true', () => {
    render(<FilterPanel {...defaultProps} showMetaFilter={true} />);
    expect(screen.getByText('Select Filters to Display:')).toBeTruthy();
    expect(screen.getByLabelText('Status')).toBeTruthy();
    expect(screen.getByLabelText('Priority')).toBeTruthy();
    expect(screen.getByLabelText('Labels')).toBeTruthy();
  });

  it('calls onToggleFilterVisibility when meta checkbox is clicked', () => {
    const onToggleFilterVisibility = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        showMetaFilter={true}
        onToggleFilterVisibility={onToggleFilterVisibility}
      />
    );
    fireEvent.click(screen.getByLabelText('Status'));
    expect(onToggleFilterVisibility).toHaveBeenCalledWith('Status');
  });

  it('renders filter values when filter is visible', () => {
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ Status: true }}
      />
    );
    expect(screen.getByLabelText('Done')).toBeTruthy();
    expect(screen.getByLabelText('Todo')).toBeTruthy();
    expect(screen.getByLabelText('In Progress')).toBeTruthy();
  });

  it('does not render filter values when filter is not visible', () => {
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ Status: false }}
      />
    );
    expect(screen.queryByLabelText('Done')).toBeNull();
  });

  it('calls onFilterToggle when a filter checkbox is clicked', () => {
    const onFilterToggle = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ Status: true }}
        onFilterToggle={onFilterToggle}
      />
    );
    fireEvent.click(screen.getByLabelText('Done'));
    expect(onFilterToggle).toHaveBeenCalledWith('Status', 'Done');
  });

  it('shows checked state for selected filters', () => {
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ Status: true }}
        selectedFilters={{ Status: ['Done'] }}
      />
    );
    const checkbox = screen.getByLabelText('Done') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders labels filter when visible', () => {
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ labels: true }}
      />
    );
    expect(screen.getByLabelText('bug')).toBeTruthy();
    expect(screen.getByLabelText('feature')).toBeTruthy();
  });

  it('calls onFilterToggle for label filter', () => {
    const onFilterToggle = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        visibleFilters={{ labels: true }}
        onFilterToggle={onFilterToggle}
      />
    );
    fireEvent.click(screen.getByLabelText('bug'));
    expect(onFilterToggle).toHaveBeenCalledWith('labels', 'bug');
  });

  it('changes filter operator', () => {
    const onOperatorChange = jest.fn();
    render(<FilterPanel {...defaultProps} onOperatorChange={onOperatorChange} />);
    const selects = document.querySelectorAll('select');
    const operatorSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'OR')
    );
    expect(operatorSelect).toBeTruthy();
    fireEvent.change(operatorSelect!, { target: { value: 'OR' } });
    expect(onOperatorChange).toHaveBeenCalledWith('OR');
  });

  it('renders filter mode selector when onFilterModeChange is provided', () => {
    const onFilterModeChange = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        onFilterModeChange={onFilterModeChange}
      />
    );
    expect(screen.getByText('Filter Mode')).toBeTruthy();
  });

  it('does not render filter mode selector when onFilterModeChange is not provided', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.queryByText('Filter Mode')).toBeNull();
  });

  it('calls onFilterModeChange when filter mode changes', () => {
    const onFilterModeChange = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        onFilterModeChange={onFilterModeChange}
      />
    );
    const selects = document.querySelectorAll('select');
    const modeSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.value === 'advanced')
    );
    if (modeSelect) {
      fireEvent.change(modeSelect, { target: { value: 'advanced' } });
      expect(onFilterModeChange).toHaveBeenCalledWith('advanced');
    }
  });

  it('does not render labels in meta filter when uniqueLabels is empty', () => {
    render(
      <FilterPanel
        {...defaultProps}
        uniqueLabels={[]}
        showMetaFilter={true}
      />
    );
    // Labels checkbox should not appear in meta filter
    const metaCheckboxes = document.querySelectorAll('[id^="meta-filter-"]');
    const labelsMeta = Array.from(metaCheckboxes).find(cb => cb.id === 'meta-filter-labels');
    expect(labelsMeta).toBeUndefined();
  });
});
