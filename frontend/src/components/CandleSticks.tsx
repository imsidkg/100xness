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
    backgroundColor = "white",
    textColor = "black",
    upColor = "#26a69a",
    downColor = "#ef5350",
    borderUpColor = "#26a69a",
    borderDownColor = "#ef5350",
    wickUpColor = "#26a69a",
    wickDownColor = "#ef5350",
  } = colors;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ chart: IChartApi; series: ISeriesApi<"Candlestick"> } | null>(
    null
  );

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDarkTheme = backgroundColor === "#131722" || backgroundColor === "#1e222d";
    const gridColor = isDarkTheme ? 'rgba(42, 46, 57, 0.5)' : 'rgba(197, 203, 206, 0.3)';
    const crosshairColor = isDarkTheme ? 'rgba(120, 123, 134, 0.8)' : 'rgba(32, 38, 46, 0.6)';
    const borderColor = isDarkTheme ? 'rgba(42, 46, 57, 0.9)' : 'rgba(197, 203, 206, 0.5)';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: {
          color: gridColor,
          style: 0,
          visible: true,
        },
        horzLines: {
          color: gridColor,
          style: 0,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
          labelBackgroundColor: upColor,
        },
        horzLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
          labelBackgroundColor: upColor,
        },
      },
      rightPriceScale: {
        borderColor: borderColor,
        visible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: borderColor,
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
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth ?? 0,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
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
    <div ref={chartContainerRef} style={{ width: "100%", height: "500px" }} />
  );
};
