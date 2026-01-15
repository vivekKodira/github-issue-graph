
import "echarts-liquidfill";
import type { CSSProperties, JSX } from "react";
import { ECharts } from "./ECharts";
import { ErrorBoundary } from "./ErrorBoundary";
import type { LiquidFillGaugeOption } from "./LiquidFillGaugeOption";

export interface LiquidFillGaugeProps {
  option: LiquidFillGaugeOption;
  style?: CSSProperties;
}

export function LiquidFillGauge({ option, style }: LiquidFillGaugeProps): JSX.Element {
  return (
    <ErrorBoundary chartName="Liquid Fill Gauge">
      <ECharts
        option={option}
        style={style}
      />
    </ErrorBoundary>
  );
}