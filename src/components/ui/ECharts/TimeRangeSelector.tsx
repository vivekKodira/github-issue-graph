import { useEffect } from "react";

interface TimeRangeSelectorProps {
  onTimeRangeChange: (timeRange: [number, number]) => void;
  initialTimeRange?: [number, number];
  chartRef?: React.RefObject<{ getEchartsInstance: () => { on: (event: string, handler: (params: any) => void) => void; off: (event: string, handler: (params: any) => void) => void } }>;
}

export const TimeRangeSelector = ({ 
  onTimeRangeChange, 
  initialTimeRange = [null, null],
  chartRef 
}: TimeRangeSelectorProps) => {
  // Listen for dataZoom event on chart instance
  useEffect(() => {
    if (!chartRef?.current) return;
    
    const echartsInstance = chartRef.current.getEchartsInstance ? chartRef.current.getEchartsInstance() : null;
    if (!echartsInstance) return;
    
    const handler = (params: { batch?: Array<{ startValue?: number; endValue?: number }>; startValue?: number; endValue?: number }) => {
      const chart = params?.batch ? params.batch[0] : params;
      if (chart && chart.startValue !== undefined && chart.endValue !== undefined) {
        const newTimeRange: [number, number] = [chart.startValue, chart.endValue];
        onTimeRangeChange(newTimeRange);
      }
    };
    
    echartsInstance.on('datazoom', handler);
    return () => {
      echartsInstance.off('datazoom', handler);
    };
  }, [chartRef, onTimeRangeChange]);

  // Update when initialTimeRange changes
  useEffect(() => {
    if (initialTimeRange[0] && initialTimeRange[1]) {
      onTimeRangeChange(initialTimeRange);
    }
  }, [initialTimeRange, onTimeRangeChange]);

  return null; // This component doesn't render anything, it just manages state
}; 