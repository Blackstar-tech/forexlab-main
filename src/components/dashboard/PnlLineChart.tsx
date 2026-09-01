"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Trade } from "@/utils/types";
import { cumulativePnlSeries } from "@/utils/calculations";
import { currency } from "@/utils/formatters";

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  trades: Trade[];
}

export default function PnlLineChart({ trades }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      setTheme(isLight ? "light" : "dark");
    };
    updateTheme();
    window.addEventListener("themechange", updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("themechange", updateTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const isLight = theme === "light";
    const gridColor = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.05)";
    const tickColor = isLight ? "#55606b" : "#8b978f";
    const tooltipBg = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(17, 23, 20, 0.95)";
    const tooltipTextColor = isLight ? "#0f172a" : "#f4f7f5";

    const series = cumulativePnlSeries(trades);
    const labels = series.map((s) => s.date.slice(5));
    const data = series.map((s) => s.cumulative);

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Cumulative P&L",
            data,
            borderColor: "#22e08f",
            backgroundColor: isLight ? "rgba(34, 224, 143, 0.18)" : "rgba(34, 224, 143, 0.12)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#22e08f",
            pointBorderColor: isLight ? "#0f172a" : "#ffffff",
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { family: "'JetBrains Mono', monospace", size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) => currency(Number(val))
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: "rgba(34, 224, 143, 0.4)",
            borderWidth: 1,
            titleColor: tooltipTextColor,
            bodyColor: tooltipTextColor,
            titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            callbacks: {
              label: (ctx) => ` Cumulative: ${currency(Number(ctx.raw))}`
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [trades, theme]);

  return (
    <article className="panel dashboard-pnl-panel">
      <div className="panel-title">
        <h2>Daily net cumulative P&amp;L</h2>
        <p>Running total of P&amp;L by day.</p>
      </div>
      <div className="dashboard-pnl-body">
        <canvas ref={canvasRef} />
      </div>
    </article>
  );
}
