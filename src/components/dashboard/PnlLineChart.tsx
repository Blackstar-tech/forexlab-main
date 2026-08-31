"use client";

import React, { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

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
            backgroundColor: "rgba(34, 224, 143, 0.12)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#22e08f",
            pointBorderColor: "#ffffff",
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
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#8b978f", font: { family: "'JetBrains Mono', monospace", size: 11 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#8b978f",
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) => currency(Number(val))
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(17, 23, 20, 0.95)",
            borderColor: "rgba(34, 224, 143, 0.4)",
            borderWidth: 1,
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
  }, [trades]);

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
