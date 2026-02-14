import React from 'react';
import { render } from '@testing-library/react';
import { DimensionPanel } from './DimensionPanel';

describe('DimensionPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DimensionPanel
        filterableFields={{ Status: ['Done', 'In Progress'], Priority: ['High', 'Medium'] }}
        selectedDimensionField="Status"
        dimensionValues={['Done', 'In Progress']}
        selectedDimensionValues={['Done']}
        onDimensionFieldChange={() => {}}
        onDimensionToggle={() => {}}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders with multiple selected values', () => {
    const { container } = render(
      <DimensionPanel
        filterableFields={{ Status: ['Done', 'In Progress', 'Todo'], Priority: ['High', 'Medium'] }}
        selectedDimensionField="Status"
        dimensionValues={['Done', 'In Progress', 'Todo']}
        selectedDimensionValues={['Done', 'In Progress']}
        onDimensionFieldChange={() => {}}
        onDimensionToggle={() => {}}
      />
    );
    expect(container).toBeTruthy();
  });
});
