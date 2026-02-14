/** @jsx React.createElement */
import React from 'react';
import { render } from '@testing-library/react';
import { CompletionChart } from './CompletionChart';
import { ProjectKeysProvider } from '@/context/ProjectKeysContext';

jest.mock('./LiquidFillGuage', () => ({
  LiquidFillGauge: () => <div data-testid="liquid-fill-mock" />
}));

jest.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ProjectKeysProvider>{ui}</ProjectKeysProvider>);
};

describe('CompletionChart', () => {
  it('renders without crashing with data', () => {
    const { container } = renderWithProviders(
      <CompletionChart title="Test Completion" data={0.75} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with zero data', () => {
    const { container } = renderWithProviders(
      <CompletionChart title="Test Completion" data={0} styleOptions={{ width: '100%', height: '400px' }} />
    );
    expect(container).toBeTruthy();
  });
});
