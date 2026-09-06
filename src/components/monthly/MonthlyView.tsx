"use client";

import React, { useState, useEffect } from "react";
import { Trade } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";
import MonthYearPicker from "./MonthYearPicker";

interface Props {
  trades: Trade[];
  accountBalance: number;
  selectedMonth: string;                 // format "YYYY-MM"
  onMonthChange: (month: string) => void;
  userId?: string;
  onShowToast?: (msg: string) => void;
}

export default function MonthlyView({
  trades,
  accountBalance,
  selectedMonth,
  onMonthChange,
  userId,
  onShowToast
}: Props) {
  const [targetMode, setTargetMode] = useState<"currency" | "percent">("currency");
  const [targetValue, setTargetValue] = useState<number>(0);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempTargetMode, setTempTargetMode] = useState<"currency" | "percent">("currency");
  const [tempTargetValue, setTempTargetValue] = useState<string>("");

  // Load monthly target from localStorage scoped to user and month
  useEffect(() => {
    const monthKey = `forexlab.monthlyTarget.${userId || "default"}.${selectedMonth}`;
    const savedMonth = localStorage.getItem(monthKey);
    if (savedMonth) {
      try {
        const parsed = JSON.parse(savedMonth);
        if (parsed && typeof parsed.value === "number") {
          const mode = parsed.mode === "percent" ? "percent" : "currency";
          setTargetMode(mode);
          setTargetValue(parsed.value);
          setTempTargetMode(mode);
          setTempTargetValue(parsed.value > 0 ? parsed.value.toString() : "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse monthly target:", e);
      }
    }

    // Check user default target
    const defaultKey = `forexlab.monthlyTarget.${userId || "default"}.default`;
    const savedDefault = localStorage.getItem(defaultKey);
    if (savedDefault) {
      try {
        const parsed = JSON.parse(savedDefault);
        if (parsed && typeof parsed.value === "number") {
          const mode = parsed.mode === "percent" ? "percent" : "currency";
          setTargetMode(mode);
          setTargetValue(parsed.value);
          setTempTargetMode(mode);
          setTempTargetValue(parsed.value > 0 ? parsed.value.toString() : "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse default target:", e);
      }
    }

    // Brand new or unconfigured -> 0
    setTargetMode("currency");
    setTargetValue(0);
    setTempTargetMode("currency");
    setTempTargetValue("");
  }, [selectedMonth, userId]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempTargetValue);
    const cleanVal = isNaN(val) || val < 0 ? 0 : val;

    setTargetMode(tempTargetMode);
    setTargetValue(cleanVal);

    const data = { mode: tempTargetMode, value: cleanVal };
    const monthKey = `forexlab.monthlyTarget.${userId || "default"}.${selectedMonth}`;
    localStorage.setItem(monthKey, JSON.stringify(data));

    // Save as fallback default for this user
    const defaultKey = `forexlab.monthlyTarget.${userId || "default"}.default`;
    localStorage.setItem(defaultKey, JSON.stringify(data));

    setIsEditingGoal(false);

    if (onShowToast) {
      const calculatedTarget = tempTargetMode === "percent" ? (cleanVal / 100) * accountBalance : cleanVal;
      const formatted = tempTargetMode === "percent"
        ? `${cleanVal}% (${currency(calculatedTarget)})`
        : currency(cleanVal);
      onShowToast(`Monthly goal for ${selectedMonth} set to ${formatted}`);
    }
  };

  const monthTrades = trades.filter((t) => t.date.startsWith(selectedMonth));
  const monthlyTotal = monthTrades.reduce((sum, t) => sum + t.pnl, 0);

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
        <div className="monthly-goal-header" style={{ flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
          <div>
            <h3>Monthly Profit Goal</h3>
            <p>Target for {selectedMonth}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <MonthYearPicker value={selectedMonth} onChange={onMonthChange} />
            <button
              type="button"
              className={isEditingGoal ? "primary compact" : "ghost compact"}
              onClick={() => {
                if (!isEditingGoal) {
                  setTempTargetMode(targetMode);
                  setTempTargetValue(targetValue > 0 ? targetValue.toString() : "");
                }
                setIsEditingGoal(!isEditingGoal);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Set or edit your profit goal for this month"
            >
              {isEditingGoal ? "✕ Close" : targetValue > 0 ? "✏️ Edit Goal" : "🎯 Set Goal"}
            </button>
          </div>
        </div>

        {/* Set Goal Editor */}
        {isEditingGoal && (
          <form
            onSubmit={handleSaveGoal}
            className={`target-editor ${tempTargetMode === "percent" ? "has-base" : ""}`}
            style={{
              margin: "6px 0 10px",
              padding: "16px",
              background: "rgba(var(--color-white-rgb) / 0.03)",
              borderRadius: "8px",
              border: "1px solid var(--line)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>Type</span>
              <div className="target-mode" aria-label="Target mode">
                <button
                  type="button"
                  className={tempTargetMode === "currency" ? "is-active" : ""}
                  onClick={() => setTempTargetMode("currency")}
                  title="Fixed dollar target"
                >
                  $
                </button>
                <button
                  type="button"
                  className={tempTargetMode === "percent" ? "is-active" : ""}
                  onClick={() => setTempTargetMode("percent")}
                  title="Percentage of account balance target"
                >
                  %
                </button>
              </div>
            </div>

            <label className="target-field">
              <span>{tempTargetMode === "currency" ? "Target Profit ($)" : "Target Return (%)"}</span>
              <input
                type="number"
                min="0"
                step="any"
                value={tempTargetValue}
                onChange={(e) => setTempTargetValue(e.target.value)}
                placeholder={tempTargetMode === "currency" ? "e.g. 2500" : "e.g. 5"}
                autoFocus
                required
              />
            </label>

            {tempTargetMode === "percent" && (
              <label className="target-field">
                <span>Equivalent Dollar Goal</span>
                <input
                  type="text"
                  value={currency(((parseFloat(tempTargetValue) || 0) / 100) * accountBalance)}
                  disabled
                  style={{ opacity: 0.8, cursor: "not-allowed" }}
                />
              </label>
            )}

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="submit" className="primary compact" style={{ minHeight: "38px" }}>
                Save Goal
              </button>
              <button
                type="button"
                className="ghost compact"
                style={{ minHeight: "38px" }}
                onClick={() => setIsEditingGoal(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="goal-progress">
          <div className="goal-progress-track">
            <span style={{ width: `${targetAchievedPercent}%` }} />
          </div>
          <div className="goal-progress-meta">
            <span>
              Goal:{" "}
              <strong
                onClick={() => {
                  setTempTargetMode(targetMode);
                  setTempTargetValue(targetValue > 0 ? targetValue.toString() : "");
                  setIsEditingGoal(true);
                }}
                style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                title="Click to edit monthly goal"
              >
                {targetDollar > 0 ? currency(targetDollar) : "$0.00 (Click to set) ✏️"}
              </strong>
              {targetMode === "percent" && targetValue > 0 && (
                <small style={{ color: "var(--muted)", marginLeft: "4px" }}>({targetValue}%)</small>
              )}
            </span>
            <span>
              Net: <strong className={monthlyTotal >= 0 ? "positive" : "negative"}>{currency(monthlyTotal)}</strong>
            </span>
            <span>
              Progress: <strong>{targetDollar > 0 ? percent(targetAchievedPercent) : "—"}</strong>
            </span>
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