import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TimeEstimationWidget } from './TimeEstimationWidget';

describe('TimeEstimationWidget', () => {
  const numericData = [
    { id: '1', title: 'Task 1', 'Estimate (days)': 5, issue_number: 1 },
    { id: '2', title: 'Task 2', 'Estimate (days)': 10, issue_number: 2 },
    { id: '3', title: 'Task 3', 'Estimate (days)': 3, issue_number: 3 },
  ];

  const filterableFields = {
    Status: ['Done', 'Todo'],
    'Estimate (days)': ['3', '5', '10'],
  };

  it('renders without crashing with empty data', () => {
    const { container } = render(
      <TimeEstimationWidget filteredData={[]} filterableFields={{}} />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('Time Estimation')).toBeTruthy();
  });

  it('shows message when no estimation field is selected', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    expect(screen.getByText('Select an estimation field to calculate time estimate')).toBeTruthy();
  });

  it('shows message when no data and field selected', () => {
    render(
      <TimeEstimationWidget filteredData={[]} filterableFields={filterableFields} />
    );
    expect(screen.getByText(/Apply filters/)).toBeTruthy();
  });

  it('detects numeric fields from data', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toContain('Estimate (days)');
  });

  it('does not show non-numeric fields in selector', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).not.toContain('Status');
  });

  it('calculates estimate when field is selected', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    // Total = 5+10+3 = 18, with 1 developer = 18.00 days
    expect(screen.getByText('18.00 days')).toBeTruthy();
  });

  it('divides estimate by number of developers', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    // Change developers to 2
    const devInput = screen.getByPlaceholderText('Enter number of developers') as HTMLInputElement;
    fireEvent.change(devInput, { target: { value: '3' } });

    // Total = 18 / 3 = 6.00
    expect(screen.getByText('6.00 days')).toBeTruthy();
  });

  it('shows single ticket message for single item', () => {
    render(
      <TimeEstimationWidget
        filteredData={[numericData[0]]}
        filterableFields={filterableFields}
      />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    expect(screen.getByText('5.00 days')).toBeTruthy();
    expect(screen.getByText('Single ticket cannot be parallelized')).toBeTruthy();
  });

  it('shows multiple tickets message', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    expect(screen.getByText(/Based on 3 tickets with 1 developer$/)).toBeTruthy();
  });

  it('shows outliers when threshold is set', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    // Set outlier threshold to 4
    const thresholdInput = screen.getByPlaceholderText(/Enter threshold/) as HTMLInputElement;
    fireEvent.change(thresholdInput, { target: { value: '4' } });

    // Tasks with value > 4: Task 1 (5), Task 2 (10)
    expect(screen.getByText(/Outliers Detected/)).toBeTruthy();
  });

  it('detects unit from field name', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    // "days" should be shown as unit (from field name "Estimate (days)")
    expect(screen.getByText(/days/)).toBeTruthy();
  });

  it('shows no numeric fields message when none available', () => {
    render(
      <TimeEstimationWidget
        filteredData={[{ id: '1', title: 'T1', Status: 'Done' }]}
        filterableFields={{ Status: ['Done'] }}
      />
    );
    expect(screen.getByText(/No numeric fields available/)).toBeTruthy();
  });

  it('handles string numeric values in data', () => {
    const stringData = [
      { id: '1', title: 'T1', Hours: '8', issue_number: 1 },
      { id: '2', title: 'T2', Hours: '4', issue_number: 2 },
    ];
    render(
      <TimeEstimationWidget
        filteredData={stringData}
        filterableFields={{ Hours: ['4', '8'] }}
      />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Hours' } });

    expect(screen.getByText('12.00 hours')).toBeTruthy();
  });

  it('handles empty developer input by defaulting to 1', () => {
    render(
      <TimeEstimationWidget filteredData={numericData} filterableFields={filterableFields} />
    );
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Estimate (days)' } });

    const devInput = screen.getByPlaceholderText('Enter number of developers') as HTMLInputElement;
    fireEvent.change(devInput, { target: { value: '' } });

    // Should default to 1 developer
    expect(screen.getByText('18.00 days')).toBeTruthy();
  });
});
