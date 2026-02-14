import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ExpertQueryPanel } from './ExpertQueryPanel';

describe('ExpertQueryPanel', () => {
  const defaultProps = {
    generatedQuery: {},
    customQuery: null,
    queryValidation: { valid: true },
    onApplyCustomQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ExpertQueryPanel {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders with custom query pre-filled', () => {
    render(
      <ExpertQueryPanel
        {...defaultProps}
        customQuery={{ Status: { $eq: 'Done' } }}
      />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(JSON.stringify({ Status: { $eq: 'Done' } }, null, 2));
  });

  it('toggles examples visibility on click', () => {
    render(<ExpertQueryPanel {...defaultProps} />);

    // Initially examples are hidden
    expect(screen.queryByText('Example Queries:')).toBeNull();

    // Click Show Examples
    fireEvent.click(screen.getByText('Show Examples'));

    // Now examples should be visible
    expect(screen.getByText('Example Queries:')).toBeTruthy();
    expect(screen.getByText('Hide Examples')).toBeTruthy();

    // Click Hide Examples
    fireEvent.click(screen.getByText('Hide Examples'));
    expect(screen.queryByText('Example Queries:')).toBeNull();
  });

  it('loads example query when clicking Load button', () => {
    render(<ExpertQueryPanel {...defaultProps} />);

    // Show examples
    fireEvent.click(screen.getByText('Show Examples'));

    // Click the first "Load" button
    const loadButtons = screen.getAllByText('Load');
    fireEvent.click(loadButtons[0]);

    // Examples should be hidden after loading
    expect(screen.queryByText('Example Queries:')).toBeNull();

    // The textarea should have been updated (non-empty)
    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).not.toBe('');
  });

  it('applies valid custom query', () => {
    const onApplyCustomQuery = jest.fn();
    render(
      <ExpertQueryPanel {...defaultProps} onApplyCustomQuery={onApplyCustomQuery} />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: '{"Status": {"$eq": "Done"}}' },
    });

    fireEvent.click(screen.getByText('Apply Custom Query'));
    expect(onApplyCustomQuery).toHaveBeenCalledWith({ Status: { $eq: 'Done' } });
  });

  it('handles invalid JSON in custom query', () => {
    const onApplyCustomQuery = jest.fn();
    render(
      <ExpertQueryPanel {...defaultProps} onApplyCustomQuery={onApplyCustomQuery} />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{invalid json}' } });

    fireEvent.click(screen.getByText('Apply Custom Query'));
    expect(onApplyCustomQuery).toHaveBeenCalledWith({ _error: 'Invalid JSON' });
  });

  it('clears custom query', () => {
    const onApplyCustomQuery = jest.fn();
    render(
      <ExpertQueryPanel
        {...defaultProps}
        customQuery={{ Status: 'Done' }}
        onApplyCustomQuery={onApplyCustomQuery}
      />
    );

    fireEvent.click(screen.getByText('Clear Custom Query'));
    expect(onApplyCustomQuery).toHaveBeenCalledWith(null);
  });

  it('copies generated query to editor', () => {
    const generatedQuery = { Status: { $in: ['Done', 'Todo'] } };
    render(
      <ExpertQueryPanel {...defaultProps} generatedQuery={generatedQuery} />
    );

    fireEvent.click(screen.getByText('Copy to Editor'));

    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).toBe(
      JSON.stringify(generatedQuery, null, 2)
    );
  });

  it('shows validation error when query is invalid', () => {
    render(
      <ExpertQueryPanel
        {...defaultProps}
        queryValidation={{ valid: false, error: 'Unknown operators: $bad' }}
      />
    );
    expect(screen.getByText(/Unknown operators/)).toBeTruthy();
  });

  it('displays empty generated query placeholder', () => {
    render(<ExpertQueryPanel {...defaultProps} generatedQuery={{}} />);
    expect(screen.getByText(/No filters applied/)).toBeTruthy();
  });

  it('displays formatted generated query', () => {
    const generatedQuery = { Status: 'Done' };
    render(<ExpertQueryPanel {...defaultProps} generatedQuery={generatedQuery} />);
    expect(screen.getByText(/"Status"/)).toBeTruthy();
  });
});
