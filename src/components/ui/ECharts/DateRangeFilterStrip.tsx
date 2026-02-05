import { ECharts } from "./ECharts";
import { useState, useEffect, useRef } from "react";
import { Box, VStack } from "@chakra-ui/react";
import type { EChartsOption } from "echarts";

function getDateValue(item: Record<string, unknown>, dateField: string): number | null {
  const raw = dateField.split(".").reduce((obj: unknown, key) => {
    if (obj != null && typeof obj === "object" && key in obj) return (obj as Record<string, unknown>)[key];
    return undefined;
  }, item as unknown);
  if (raw == null) return null;
  const d = typeof raw === "string" || typeof raw === "number" ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : null;
}

export interface DateRangeFilterStripProps<T> {
  data: T[];
  dateField: string;
  onFilteredData: (filtered: T[]) => void;
  styleOptions?: Record<string, unknown>;
}

export function DateRangeFilterStrip<T extends Record<string, unknown>>({
  data,
  dateField,
  onFilteredData,
  styleOptions,
}: DateRangeFilterStripProps<T>) {
  const [chartOptions, setChartOptions] = useState<EChartsOption | null>(null);
  const chartRef = useRef<{ getEchartsInstance: () => unknown }>(null);
  const dataRef = useRef(data);

  dataRef.current = data;

  useEffect(() => {
    if (!data?.length) {
      setChartOptions(null);
      onFilteredData([]);
      return;
    }

    const countByMonth: Record<number, number> = {};
    data.forEach((item) => {
      const t = getDateValue(item, dateField);
      if (t == null) return;
      const d = new Date(t);
      const key = Date.UTC(d.getFullYear(), d.getMonth(), 1);
      countByMonth[key] = (countByMonth[key] || 0) + 1;
    });
    const sortedMonths = Object.keys(countByMonth)
      .map(Number)
      .sort((a, b) => a - b);
    const seriesData = sortedMonths.map((ts) => [ts, countByMonth[ts]] as [number, number]);

    const minTime = sortedMonths[0] ?? 0;
    const maxTime = sortedMonths[sortedMonths.length - 1] ?? minTime;

    setChartOptions({
      grid: { left: "8%", right: "4%", top: "8%", bottom: "25%", containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "time",
        min: minTime,
        max: maxTime,
        axisLabel: { color: "#ffffff", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        show: true,
        axisLabel: { color: "#ffffff", fontSize: 10 },
      },
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          show: true,
          start: 0,
          end: 100,
          bottom: "2%",
          height: 18,
          borderColor: "#ccc",
          textStyle: { color: "#ffffff", fontSize: 10 },
          handleStyle: { color: "#999" },
        },
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
      ],
      series: [
        {
          type: "bar",
          data: seriesData,
          itemStyle: { color: "#4a5568" },
        },
      ],
    });
    onFilteredData(data);
  }, [data, dateField, onFilteredData]);

  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;
    const handler = (params: { batch?: Array<{ startValue?: number; endValue?: number }> }) => {
      const batch = params?.batch;
      const zoom = batch?.[0];
      const startValue = zoom?.startValue;
      const endValue = zoom?.endValue;
      if (startValue == null || endValue == null) return;
      const items = dataRef.current;
      const filtered = items.filter((item) => {
        const t = getDateValue(item, dateField);
        if (t == null) return false;
        return t >= startValue && t <= endValue;
      });
      onFilteredData(filtered);
    };
    instance.on("datazoom", handler);
    return () => {
      instance.off("datazoom", handler);
    };
  }, [chartOptions, dateField, onFilteredData]);

  if (!data?.length || !chartOptions) return null;

  const stripHeight = 80;
  return (
    <VStack align="stretch" gap={0} mb={4} width="100%" flexShrink={0}>
      <Box fontSize="xs" color="gray.400" mb={1}>
        Date range (drag to filter)
      </Box>
      <Box width="100%" height={`${stripHeight}px`} minHeight={`${stripHeight}px`} overflow="hidden" flexShrink={0}>
        <ECharts ref={chartRef} option={chartOptions} style={{ width: "100%", height: stripHeight }} />
      </Box>
    </VStack>
  );
}
