import React from 'react';
import { render } from '@testing-library/react';
import { TimeRangeSelector } from './TimeRangeSelector';

describe('TimeRangeSelector', () => {
  it('renders null (no visible output)', () => {
    const { container } = render(
      <TimeRangeSelector onTimeRangeChange={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onTimeRangeChange when initialTimeRange has both values', () => {
    const onTimeRangeChange = jest.fn();
    render(
      <TimeRangeSelector
        onTimeRangeChange={onTimeRangeChange}
        initialTimeRange={[1000, 2000]}
      />
    );
    expect(onTimeRangeChange).toHaveBeenCalledWith([1000, 2000]);
  });

  it('does not call onTimeRangeChange when initialTimeRange has null values', () => {
    const onTimeRangeChange = jest.fn();
    render(
      <TimeRangeSelector
        onTimeRangeChange={onTimeRangeChange}
        initialTimeRange={[null as any, null as any]}
      />
    );
    expect(onTimeRangeChange).not.toHaveBeenCalled();
  });

  it('attaches datazoom handler when chartRef is provided', () => {
    const onFn = jest.fn();
    const offFn = jest.fn();
    const chartRef = {
      current: {
        getEchartsInstance: () => ({
          on: onFn,
          off: offFn,
        }),
      },
    };

    const { unmount } = render(
      <TimeRangeSelector
        onTimeRangeChange={() => {}}
        chartRef={chartRef as any}
      />
    );

    expect(onFn).toHaveBeenCalledWith('datazoom', expect.any(Function));

    // On unmount, should call off
    unmount();
    expect(offFn).toHaveBeenCalledWith('datazoom', expect.any(Function));
  });

  it('handles datazoom event with batch params', () => {
    const onTimeRangeChange = jest.fn();
    const onFn = jest.fn();
    const chartRef = {
      current: {
        getEchartsInstance: () => ({
          on: onFn,
          off: jest.fn(),
        }),
      },
    };

    render(
      <TimeRangeSelector
        onTimeRangeChange={onTimeRangeChange}
        chartRef={chartRef as any}
      />
    );

    // Get the handler that was registered
    const handler = onFn.mock.calls[0][1];

    // Simulate batch params
    handler({ batch: [{ startValue: 100, endValue: 500 }] });
    expect(onTimeRangeChange).toHaveBeenCalledWith([100, 500]);
  });

  it('handles datazoom event with direct params', () => {
    const onTimeRangeChange = jest.fn();
    const onFn = jest.fn();
    const chartRef = {
      current: {
        getEchartsInstance: () => ({
          on: onFn,
          off: jest.fn(),
        }),
      },
    };

    render(
      <TimeRangeSelector
        onTimeRangeChange={onTimeRangeChange}
        chartRef={chartRef as any}
      />
    );

    const handler = onFn.mock.calls[0][1];

    // Simulate direct params (no batch)
    handler({ startValue: 200, endValue: 600 });
    expect(onTimeRangeChange).toHaveBeenCalledWith([200, 600]);
  });

  it('does not attach handler when chartRef.current is null', () => {
    const chartRef = { current: null };
    const { container } = render(
      <TimeRangeSelector
        onTimeRangeChange={() => {}}
        chartRef={chartRef as any}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('does not attach handler when getEchartsInstance returns null', () => {
    const chartRef = {
      current: {
        getEchartsInstance: () => null,
      },
    };
    const { container } = render(
      <TimeRangeSelector
        onTimeRangeChange={() => {}}
        chartRef={chartRef as any}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
