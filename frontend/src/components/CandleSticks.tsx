import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
} from "lightweight-charts";

interface ChartProps {
  data: CandlestickData[];
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
    borderUpColor?: string;
    borderDownColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
  };
}

export const ChartComponent: React.FC<ChartProps> = ({ data, colors = {} }) => {
  const {
    backgroundColor = "#131722",
    textColor = "#d1d4dc",
    upColor = "#26a69a",
    downColor = "#ef5350",
    borderUpColor = "#26a69a",
    borderDownColor = "#ef5350",
    wickUpColor = "#26a69a",
    wickDownColor = "#ef5350",
  } = colors;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi;
    series: ISeriesApi<"Candlestick">;
  } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const gridColor = "rgba(42, 46, 57, 0.5)";
    const crosshairColor = "rgba(120, 123, 134, 0.8)";
    const borderColor = "rgba(42, 46, 57, 0.9)";

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: container.clientWidth,
      height: container.clientHeight || 460,
      grid: {
        vertLines: { color: gridColor, style: 0, visible: true },
        horzLines: { color: gridColor, style: 0, visible: true },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
      },
      rightPriceScale: {
        borderColor,
        visible: true,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 10,
        minBarSpacing: 5,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor,
      borderDownColor,
      wickUpColor,
      wickDownColor,
      borderVisible: true,
      wickVisible: true,
    });

    chart.timeScale().fitContent();
    chartRef.current = { chart, series: candleSeries };

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 460,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    backgroundColor,
    textColor,
    upColor,
    downColor,
    borderUpColor,
    borderDownColor,
    wickUpColor,
    wickDownColor,
  ]);

  useEffect(() => {
    if (chartRef.current && data) {
      chartRef.current.series.setData(data);
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
};
