import React from 'react';
import { render } from '@testing-library/react';
import { ECharts } from './ECharts';

// Mock echarts
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
};

jest.mock('echarts', () => ({
  init: jest.fn(() => mockChartInstance),
  getInstanceByDom: jest.fn(() => mockChartInstance),
}));

describe('ECharts', () => {
  const mockOption = {
    title: { text: 'Test Chart' },
    series: [{ type: 'bar', data: [1, 2, 3] }],
  };

  it('renders without crashing', () => {
    const { container } = render(
      <ECharts option={mockOption} style={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders with custom style', () => {
    const { container } = render(
      <ECharts option={mockOption} style={{ width: '500px', height: '300px' }} />
    );
    const chartDiv = container.querySelector('div');
    expect(chartDiv).toBeTruthy();
  });
});
