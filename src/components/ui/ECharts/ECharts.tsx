//SOURCE: https://dev.to/manufac/using-apache-echarts-with-react-and-typescript-353k

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import type { CSSProperties } from "react";
import type { EChartsOption, SetOptionOpts } from "echarts";
import type { LiquidFillGaugeOption } from "./LiquidFillGaugeOption";
import "echarts-wordcloud";

interface EChartsProps {
  option: EChartsOption | LiquidFillGaugeOption;
  style?: CSSProperties;
  settings?: SetOptionOpts;
  loading?: boolean;
  theme?: "light" | "dark";
}

export const ECharts = forwardRef<
  { getEchartsInstance: () => echarts.ECharts | null },
  EChartsProps
>(function ECharts({
  option,
  style,
  settings,
  loading,
  theme,
}, ref) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  useImperativeHandle(ref, () => ({
    getEchartsInstance: () => chartInstance.current
  }), []);

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    // Force container size before initialization
    container.style.width = '100%';
    container.style.minWidth = '100%';

    // Get parent width
    const parentWidth = container.parentElement.offsetWidth;

    // Initialize with explicit dimensions
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(container, null, {
        width: parentWidth,
        height: style?.height || 500
      });
    }

    // Set options
    chartInstance.current.setOption(option, true);

    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance.current) {
        const newWidth = container.parentElement.offsetWidth;
        chartInstance.current.resize({ width: newWidth });
      }
    });

    resizeObserver.observe(container.parentElement);

    return () => {
      resizeObserver.disconnect();
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [option, style]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = echarts.getInstanceByDom(chartRef.current);
      chart.setOption(option, settings);
    }
  }, [option, settings, theme]); // Whenever theme changes we need to add option and setting due to it being deleted in cleanup function

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = echarts.getInstanceByDom(chartRef.current);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      loading === true ? chart.showLoading() : chart.hideLoading();
    }
  }, [loading, theme]);

  return <div ref={chartRef} style={{ width: "100%", height: "100px", ...style }} />;
});