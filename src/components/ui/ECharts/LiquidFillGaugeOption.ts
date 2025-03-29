import type { DefaultLabelFormatterCallbackParams, EChartsOption } from "echarts";

/**
 * interface for LiquidFillGauge series config
 */
interface LiquidFillGaugeSeries {
  name?: string;
  type: "liquidFill";
  data: (
    | number
    | {
        name?: string;
        value: number;
        direction?: "left" | "right";
        itemStyle?: {
          color?: string;
          opacity?: number;
        };
        emphasis?: {
          itemStyle?: {
            opacity?: number;
          };
        };
      }
  )[];
  silent?: boolean;

  color?: string[];
  center?: string[];
  radius?: string;
  amplitude?: number;
  waveLength?: string | number;
  phase?: number | "auto";
  period?: number | "auto" | ((value: number, index: number) => number);
  direction?: "right" | "left";
  shape?: "circle" | "rect" | "roundRect" | "triangle" | "diamond" | "pin" | "arrow" | string;

  waveAnimation?: boolean;
  animationEasing?: string;
  animationEasingUpdate?: string;
  animationDuration?: number;
  animationDurationUpdate?: number;

  outline?: {
    show?: boolean;
    borderDistance?: number;
    itemStyle?: {
      color?: string;
      borderColor?: string;
      borderWidth?: number;
      shadowBlur?: number;
      shadowColor?: string;
    };
  };

  backgroundStyle?: {
    color?: string;
    borderWidth?: string;
    borderColor?: string;
    itemStyle?: {
      shadowBlur?: number;
      shadowColor?: string;
      opacity?: number;
    };
  };

  itemStyle?: {
    opacity?: number;
    shadowBlur?: number;
    shadowColor?: string;
  };

  label?: {
    show?: true;
    color?: string;
    insideColor?: string;
    fontSize?: number;
    fontWeight?: string;
    formatter?: string | ((params: DefaultLabelFormatterCallbackParams) => string);

    align?: "left" | "center" | "right";
    baseline?: "top" | "middle" | "bottom";
    position?: "inside" | "left" | "right" | "top" | "bottom" | string[];
  };

  emphasis?: {
    itemStyle?: {
      opacity?: number;
    };
  };
}

export interface LiquidFillGaugeOption extends Omit<EChartsOption, "series"> {
  series: LiquidFillGaugeSeries;
}