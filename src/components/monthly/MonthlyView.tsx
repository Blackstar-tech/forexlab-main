"use client";

import React, { useState } from "react";
import { Trade, MonthlyTarget } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";

interface Props {
  trades: Trade[];
  accountBalance: number;
}

export default function MonthlyView({ trades, accountBalance }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [targetMode, setTargetMode] = useState<"currency" | "percent">("currency");
  const [targetValue, setTargetValue] = useState<number>(2000);

  const monthTrades = trades.filter((t) => t.date.startsWith(selectedMonth));
  const monthlyTotal = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  const monthlyWins = monthTrades.filter((t) => t.result === "win").length;
  const monthlyLosses = monthTrades.filter((t) => t.result === "loss").length;
  const monthlyWinRate = monthTrades.length ? (monthlyWins / monthTrades.length) * 100 : 0;

  // Calendar generation
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Daily map
  const dailyPnls = new Map<string, { pnl: number; count: number }>();
  monthTrades.forEach((t) => {
    const curr = dailyPnls.get(t.date) || { pnl: 0, count: 0 };
    curr.pnl += t.pnl;
    curr.count += 1;
    dailyPnls.set(t.date, curr);
  });

  const targetDollar = targetMode === "percent" ? (targetValue / 100) * accountBalance : targetValue;
  const targetAchievedPercent = targetDollar > 0 ? Math.min(100, Math.max(0, (monthlyTotal / targetDollar) * 100)) : 0;

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>📅 Monthly Performance &amp; Target</h2>
        <p>Track your calendar P&amp;L and monthly progress.</p>
      </div>

      <div className="monthly-goal">
        <div className="monthly-goal-header">
          <div>
            <h3>Monthly Profit Goal</h3>
            <p>Target for {selectedMonth}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: "180px" }}
            />
          </div>
        </div>

        <div className="goal-progress">
          <div className="goal-progress-track">
            <span style={{ width: `${targetAchievedPercent}%` }} />
          </div>
          <div className="goal-progress-meta">
            <span>Goal: <strong>{currency(targetDollar)}</strong></span>
            <span>Net: <strong className={monthlyTotal >= 0 ? "positive" : "negative"}>{currency(monthlyTotal)}</strong></span>
            <span>Progress: <strong>{percent(targetAchievedPercent)}</strong></span>
          </div>
        </div>
      </div>

      <div className="calendar-grid-wrapper" style={{ marginTop: "24px" }}>
        <div className="calendar-weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontWeight: "700", marginBottom: "8px", color: "var(--muted)" }}>
          <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
        </div>
        <div className="calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day is-empty" style={{ minHeight: "80px", border: "1px dashed rgba(var(--color-white-rgb) / 0.08)", borderRadius: "6px" }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, "0")}`;
            const dayData = dailyPnls.get(dateStr);
            const pnl = dayData?.pnl || 0;
            const count = dayData?.count || 0;

            const bg = count > 0 ? (pnl > 0 ? "rgba(34, 224, 143, 0.12)" : pnl < 0 ? "rgba(255, 84, 104, 0.12)" : "rgba(var(--color-white-rgb) / 0.05)") : "rgba(var(--color-white-rgb) / 0.02)";
            const border = count > 0 ? (pnl > 0 ? "rgba(34, 224, 143, 0.3)" : pnl < 0 ? "rgba(255, 84, 104, 0.3)" : "rgba(var(--color-white-rgb) / 0.1)") : "rgba(var(--color-white-rgb) / 0.06)";

            return (
              <div
                key={dateStr}
                style={{
                  minHeight: "80px",
                  padding: "8px",
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700" }}>{dayNum}</div>
                {count > 0 && (
                  <div>
                    <strong style={{ fontSize: "13px", color: pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)", display: "block" }}>
                      {currency(pnl)}
                    </strong>
                    <small style={{ fontSize: "10px", color: "var(--muted)" }}>{count} trade{count > 1 ? "s" : ""}</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
