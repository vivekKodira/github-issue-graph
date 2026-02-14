import React from 'react';
import { render } from '@testing-library/react';
import { LiquidFillGauge } from './LiquidFillGuage';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';

jest.mock('./ECharts', () => ({
  ECharts: () => <div data-testid="echarts-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('LiquidFillGauge', () => {
  it('renders without crashing with empty option', () => {
    const { container } = renderWithProviders(
      <LiquidFillGauge option={{ series: [] }} style={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with liquid fill option', () => {
    const option = {
      series: [{
        type: 'liquidFill',
        data: [0.6]
      }]
    };
    const { container } = renderWithProviders(
      <LiquidFillGauge option={option} style={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
