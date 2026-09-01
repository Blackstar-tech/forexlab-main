"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";
import { ForexLabScoreBreakdown } from "@/utils/types";

ChartJS.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props {
  score: ForexLabScoreBreakdown;
}

export default function ForexLabScoreCard({ score }: Props) {
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
    const gridColor = isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.1)";
    const angleLineColor = isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.12)";
    const pointLabelColor = isLight ? "rgba(15, 23, 42, 0.85)" : "rgba(226, 232, 240, 0.8)";
    const tooltipBg = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(15, 23, 42, 0.95)";
    const tooltipTextColor = isLight ? "#0f172a" : "#f4f7f5";

    const labels = ["Win %", "Profit factor", "Avg win/loss", "Recovery factor", "Max drawdown", "Consistency"];
    const data = [
      score.winRate,
      score.profitFactor,
      score.avgWinLoss,
      score.recoveryFactor,
      score.maxDrawdownScore,
      score.consistency
    ];

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: "Score",
            data,
            backgroundColor: "rgba(139, 92, 246, 0.42)",
            borderColor: "#8b5cf6",
            borderWidth: 2,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: isLight ? "#0f172a" : "#ffffff",
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#a78bfa",
            pointHoverBorderColor: isLight ? "#0f172a" : "#ffffff"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              display: false,
              stepSize: 20
            },
            pointLabels: {
              color: pointLabelColor,
              font: {
                size: 11.5,
                family: "'Inter', sans-serif",
                weight: 500
              },
              padding: 8
            },
            grid: {
              color: gridColor,
              circular: false,
              lineWidth: 1
            },
            angleLines: {
              color: angleLineColor,
              lineWidth: 1
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: "rgba(139, 92, 246, 0.4)",
            borderWidth: 1,
            titleColor: tooltipTextColor,
            bodyColor: tooltipTextColor,
            titleFont: { family: "'Inter', sans-serif", size: 12, weight: "bold" },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            padding: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toFixed(1)} / 100`
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
  }, [score, theme]);

  const clampedScore = Math.max(0, Math.min(100, score.overall));

  return (
    <article className="panel dashboard-score-panel">
      <div className="panel-title dashboard-score-header">
        <div className="dashboard-score-title-row">
          <h2>Forex Lab Score</h2>
          <span
            className="info-tooltip"
            title="A weighted composite score across six performance dimensions: Win %, Profit factor, Avg win/loss, Recovery factor, Max drawdown, and Consistency."
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
        </div>
      </div>

      <div className="dashboard-score-body">
        <canvas ref={canvasRef} />
      </div>

      <div className="dashboard-score-footer">
        <div className="score-footer-left">
          <span className="score-footer-label">Your Forex Lab Score</span>
          <strong className="score-footer-value">{score.overall.toFixed(2)}</strong>
        </div>
        <div className="score-footer-right">
          <div className="score-gauge-bar-wrapper">
            <div className="score-gauge-bar">
              <div className="score-gauge-track" />
              <div className="score-gauge-marker" style={{ left: `${clampedScore}%` }} />
            </div>
            <div className="score-gauge-ticks">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
