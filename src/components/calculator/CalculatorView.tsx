"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Trade } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";
import MonthYearPicker from "@/components/monthly/MonthYearPicker";
import {
  INSTRUMENTS,
  getInstrumentSpec,
  calculatePips,
  calculatePipValue,
  calculatePipsPnl,
  calculatePositionSize,
  calculateRiskReward,
  getMonthTradingDaysInfo,
  calculateGoalPacing,
  calculateCompounding
} from "@/utils/calculator";

interface Props {
  trades: Trade[];
  accountBalance: number;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  userId?: string;
  onShowToast?: (msg: string) => void;
}

type CalculatorMode = "goal_pacer" | "pips" | "position_size" | "risk_reward" | "compounding";

export default function CalculatorView({
  trades,
  accountBalance,
  selectedMonth,
  onMonthChange,
  userId,
  onShowToast
}: Props) {
  const [activeMode, setActiveMode] = useState<CalculatorMode>("goal_pacer");

  // ==========================================
  // 1. GOAL PACER STATE (Monthly Target Sync)
  // ==========================================
  const [targetMode, setTargetMode] = useState<"currency" | "percent">("currency");
  const [targetValue, setTargetValue] = useState<number>(0);
  const [tempGoalValue, setTempGoalValue] = useState<string>("");
  const [tradingDaysPerWeek, setTradingDaysPerWeek] = useState<number>(5);
  const [tradesPerDay, setTradesPerDay] = useState<number>(1);
  const [customRemainingDays, setCustomRemainingDays] = useState<number | null>(null);

  // Load monthly target from localStorage (same key as MonthlyView)
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
          setTempGoalValue(parsed.value > 0 ? parsed.value.toString() : "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse monthly target:", e);
      }
    }

    const defaultKey = `forexlab.monthlyTarget.${userId || "default"}.default`;
    const savedDefault = localStorage.getItem(defaultKey);
    if (savedDefault) {
      try {
        const parsed = JSON.parse(savedDefault);
        if (parsed && typeof parsed.value === "number") {
          const mode = parsed.mode === "percent" ? "percent" : "currency";
          setTargetMode(mode);
          setTargetValue(parsed.value);
          setTempGoalValue(parsed.value > 0 ? parsed.value.toString() : "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse default target:", e);
      }
    }

    setTargetMode("currency");
    setTargetValue(0);
    setTempGoalValue("");
    setCustomRemainingDays(null);
  }, [selectedMonth, userId]);

  // Compute month's realized net PnL from trades
  const monthTrades = useMemo(() => {
    return trades.filter((t) => t.date.startsWith(selectedMonth));
  }, [trades, selectedMonth]);

  const monthlyRealizedPnl = useMemo(() => {
    return monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [monthTrades]);

  // Calendar info
  const calendarInfo = useMemo(() => {
    return getMonthTradingDaysInfo(selectedMonth, new Date());
  }, [selectedMonth]);

  // Effective remaining trading days
  const effectiveRemainingDays =
    customRemainingDays !== null
      ? customRemainingDays
      : calendarInfo.remainingTradingDays;

  // Dollar target
  const targetDollar =
    targetMode === "percent"
      ? (targetValue / 100) * accountBalance
      : targetValue;

  // Pacing calculations
  const goalPacing = useMemo(() => {
    return calculateGoalPacing(
      targetDollar,
      monthlyRealizedPnl,
      effectiveRemainingDays,
      tradingDaysPerWeek,
      tradesPerDay
    );
  }, [targetDollar, monthlyRealizedPnl, effectiveRemainingDays, tradingDaysPerWeek, tradesPerDay]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempGoalValue);
    const cleanVal = isNaN(val) || val < 0 ? 0 : val;

    setTargetValue(cleanVal);
    const data = { mode: targetMode, value: cleanVal };

    const monthKey = `forexlab.monthlyTarget.${userId || "default"}.${selectedMonth}`;
    localStorage.setItem(monthKey, JSON.stringify(data));

    const defaultKey = `forexlab.monthlyTarget.${userId || "default"}.default`;
    localStorage.setItem(defaultKey, JSON.stringify(data));

    if (onShowToast) {
      const formatted =
        targetMode === "percent"
          ? `${cleanVal}% (${currency((cleanVal / 100) * accountBalance)})`
          : currency(cleanVal);
      onShowToast(`Monthly goal for ${selectedMonth} updated to ${formatted}`);
    }
  };

  // ==========================================
  // 2. PIP & P&L CALCULATOR STATE
  // ==========================================
  const [pipSymbol, setPipSymbol] = useState<string>("EURUSD");
  const [pipDirection, setPipDirection] = useState<"buy" | "sell">("buy");
  const [pipEntryPrice, setPipEntryPrice] = useState<string>("1.0850");
  const [pipExitPrice, setPipExitPrice] = useState<string>("1.0900");
  const [pipLotSize, setPipLotSize] = useState<string>("1.00");
  const [pipCustomSize, setPipCustomSize] = useState<string>("");

  const activeInstrument = useMemo(() => getInstrumentSpec(pipSymbol), [pipSymbol]);

  // Auto-fill sensible default entry/exit when instrument changes
  const handleInstrumentChange = (newSymbol: string) => {
    setPipSymbol(newSymbol);
    const spec = getInstrumentSpec(newSymbol);
    if (newSymbol === "EURUSD") {
      setPipEntryPrice("1.0850");
      setPipExitPrice("1.0900");
    } else if (newSymbol === "GBPUSD") {
      setPipEntryPrice("1.2950");
      setPipExitPrice("1.3000");
    } else if (newSymbol.includes("JPY")) {
      setPipEntryPrice("155.00");
      setPipExitPrice("155.50");
    } else if (newSymbol === "XAUUSD") {
      setPipEntryPrice("2650.00");
      setPipExitPrice("2665.00");
    } else if (newSymbol === "NAS100") {
      setPipEntryPrice("20400.00");
      setPipExitPrice("20500.00");
    } else if (newSymbol === "US30") {
      setPipEntryPrice("43500.00");
      setPipExitPrice("43700.00");
    } else if (newSymbol === "BTCUSD") {
      setPipEntryPrice("65000.00");
      setPipExitPrice("66000.00");
    }
  };

  const pipCalcResults = useMemo(() => {
    const entry = parseFloat(pipEntryPrice) || 0;
    const exit = parseFloat(pipExitPrice) || 0;
    const lots = parseFloat(pipLotSize) || 0;
    const customPipVal = pipCustomSize ? parseFloat(pipCustomSize) : undefined;
    const effectivePipSize = activeInstrument.pipSize;

    const pips = calculatePips(entry, exit, effectivePipSize, pipDirection);
    const pipValue = calculatePipValue(pipSymbol, lots, customPipVal);
    const pnl = calculatePipsPnl(pips, lots, pipSymbol, customPipVal);
    const accountGainPercent = accountBalance > 0 ? (pnl / accountBalance) * 100 : 0;

    return {
      pips,
      pipValue,
      pnl,
      accountGainPercent
    };
  }, [pipEntryPrice, pipExitPrice, pipLotSize, pipCustomSize, activeInstrument, pipDirection, pipSymbol, accountBalance]);

  // ==========================================
  // 3. POSITION SIZE & RISK CALCULATOR STATE
  // ==========================================
  const [posAccountBalance, setPosAccountBalance] = useState<string>(
    accountBalance > 0 ? accountBalance.toString() : "10000"
  );
  const [posRiskMode, setPosRiskMode] = useState<"percent" | "cash">("percent");
  const [posRiskValue, setPosRiskValue] = useState<string>("1.0");
  const [posStopLossPips, setPosStopLossPips] = useState<string>("20");
  const [posSymbol, setPosSymbol] = useState<string>("EURUSD");

  const posResults = useMemo(() => {
    const bal = parseFloat(posAccountBalance) || 0;
    const riskVal = parseFloat(posRiskValue) || 0;
    const slPips = parseFloat(posStopLossPips) || 0;
    return calculatePositionSize(bal, riskVal, posRiskMode, slPips, posSymbol);
  }, [posAccountBalance, posRiskValue, posRiskMode, posStopLossPips, posSymbol]);

  // ==========================================
  // 4. RISK / REWARD CALCULATOR STATE
  // ==========================================
  const [rrSymbol, setRrSymbol] = useState<string>("EURUSD");
  const [rrDirection, setRrDirection] = useState<"buy" | "sell">("buy");
  const [rrEntry, setRrEntry] = useState<string>("1.0850");
  const [rrSl, setRrSl] = useState<string>("1.0820");
  const [rrTp, setRrTp] = useState<string>("1.0925");
  const [rrLotSize, setRrLotSize] = useState<string>("1.00");

  const rrResults = useMemo(() => {
    const entry = parseFloat(rrEntry) || 0;
    const sl = parseFloat(rrSl) || 0;
    const tp = parseFloat(rrTp) || 0;
    const lots = parseFloat(rrLotSize) || 1.0;
    return calculateRiskReward(entry, sl, tp, rrDirection, lots, rrSymbol);
  }, [rrEntry, rrSl, rrTp, rrDirection, rrLotSize, rrSymbol]);

  // ==========================================
  // 5. COMPOUNDING SIMULATOR STATE
  // ==========================================
  const [compStartBalance, setCompStartBalance] = useState<string>(
    accountBalance > 0 ? accountBalance.toString() : "5000"
  );
  const [compRatePercent, setCompRatePercent] = useState<string>("1.0");
  const [compPeriods, setCompPeriods] = useState<string>("20");
  const [compDeposit, setCompDeposit] = useState<string>("0");

  const compRows = useMemo(() => {
    const start = parseFloat(compStartBalance) || 0;
    const rate = parseFloat(compRatePercent) || 0;
    const periods = parseInt(compPeriods, 10) || 20;
    const deposit = parseFloat(compDeposit) || 0;
    return calculateCompounding(start, rate, periods, deposit);
  }, [compStartBalance, compRatePercent, compPeriods, compDeposit]);

  const finalCompRow = compRows.length ? compRows[compRows.length - 1] : null;

  return (
    <section className="tab-panel is-active" style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Page Title */}
      <div className="panel-title" style={{ marginBottom: "20px" }}>
        <h2>🧮 Trading Calculator &amp; Goal Pacer</h2>
        <p>Complete execution mathematics: Monthly Target Pacer, Pip &amp; P&amp;L, Position Sizing, R:R, and Growth Simulator.</p>
      </div>

      {/* Main Navigation Segmented Control */}
      <div
        className="segmented"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          marginBottom: "24px",
          background: "rgba(255, 255, 255, 0.03)",
          padding: "4px",
          borderRadius: "8px",
          border: "1px solid var(--line)"
        }}
      >
        <button
          type="button"
          className={activeMode === "goal_pacer" ? "is-active" : ""}
          onClick={() => setActiveMode("goal_pacer")}
          style={{ flex: "1 1 auto", minWidth: "160px", padding: "10px 14px", fontWeight: 600 }}
        >
          🎯 Goal Pacer (Monthly)
        </button>
        <button
          type="button"
          className={activeMode === "pips" ? "is-active" : ""}
          onClick={() => setActiveMode("pips")}
          style={{ flex: "1 1 auto", minWidth: "140px", padding: "10px 14px", fontWeight: 600 }}
        >
          📏 Pip &amp; P&amp;L
        </button>
        <button
          type="button"
          className={activeMode === "position_size" ? "is-active" : ""}
          onClick={() => setActiveMode("position_size")}
          style={{ flex: "1 1 auto", minWidth: "140px", padding: "10px 14px", fontWeight: 600 }}
        >
          ⚖️ Position Sizing
        </button>
        <button
          type="button"
          className={activeMode === "risk_reward" ? "is-active" : ""}
          onClick={() => setActiveMode("risk_reward")}
          style={{ flex: "1 1 auto", minWidth: "140px", padding: "10px 14px", fontWeight: 600 }}
        >
          📐 Risk to Reward
        </button>
        <button
          type="button"
          className={activeMode === "compounding" ? "is-active" : ""}
          onClick={() => setActiveMode("compounding")}
          style={{ flex: "1 1 auto", minWidth: "140px", padding: "10px 14px", fontWeight: 600 }}
        >
          📈 Compounding
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. GOAL PACER VIEW (Monthly Goal Breakdown & Execution)   */}
      {/* ======================================================== */}
      {activeMode === "goal_pacer" && (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Header Card with Month Picker and Target Sync */}
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎯</span> Monthly Goal Pacer
                </h3>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                  Pacing and daily/weekly required profit to hit your Monthly P&amp;L target.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>Month:</span>
                <MonthYearPicker value={selectedMonth} onChange={onMonthChange} />
              </div>
            </div>

            {/* Target Edit Form */}
            <form onSubmit={handleSaveGoal} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>TARGET MODE:</span>
                <div className="segmented" style={{ padding: "2px" }}>
                  <button
                    type="button"
                    className={targetMode === "currency" ? "is-active" : ""}
                    onClick={() => setTargetMode("currency")}
                    style={{ padding: "4px 10px" }}
                  >
                    $ Cash
                  </button>
                  <button
                    type="button"
                    className={targetMode === "percent" ? "is-active" : ""}
                    onClick={() => setTargetMode("percent")}
                    style={{ padding: "4px 10px" }}
                  >
                    % Return
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>GOAL:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tempGoalValue}
                  onChange={(e) => setTempGoalValue(e.target.value)}
                  placeholder={targetMode === "currency" ? "e.g. 2500" : "e.g. 5"}
                  style={{ flex: "1", minWidth: "120px", padding: "6px 10px" }}
                />
                {targetMode === "percent" && (
                  <span style={{ fontSize: "12px", color: "var(--accent)" }}>
                    ≈ {currency(((parseFloat(tempGoalValue) || 0) / 100) * accountBalance)}
                  </span>
                )}
              </div>

              <button type="submit" className="primary compact" style={{ padding: "8px 16px" }}>
                💾 Save Monthly Goal
              </button>
            </form>

            {/* Visual Progress Bar */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                <span>
                  Goal: <strong>{currency(targetDollar)}</strong>
                  {targetMode === "percent" && targetValue > 0 && <small style={{ color: "var(--muted)", marginLeft: "4px" }}>({targetValue}%)</small>}
                </span>
                <span>
                  Realized MTD:{" "}
                  <strong className={monthlyRealizedPnl >= 0 ? "positive" : "negative"}>
                    {currency(monthlyRealizedPnl)}
                  </strong>
                </span>
                <span>
                  Progress: <strong>{percent(goalPacing.percentAchieved)}</strong>
                </span>
              </div>

              <div className="goal-progress-track" style={{ height: "12px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden", position: "relative" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, goalPacing.percentAchieved))}%`,
                    background: goalPacing.isAchieved ? "var(--color-profit)" : "var(--accent)",
                    transition: "width 0.4s ease"
                  }}
                />
              </div>

              {goalPacing.isAchieved && (
                <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(34, 224, 143, 0.12)", border: "1px solid var(--color-profit)", borderRadius: "6px", color: "var(--color-profit)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎉</span>
                  <strong>Monthly goal achieved!</strong> You are currently {currency(goalPacing.surplusDollar)} in surplus above your target for {selectedMonth}.
                </div>
              )}
            </div>
          </div>

          {/* Primary Required Breakdown Grid */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <article className="panel stat-panel" style={{ borderLeft: "4px solid var(--accent)", padding: "18px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                REMAINING TO GOAL
              </span>
              <strong style={{ fontSize: "26px", color: goalPacing.remainingDollar > 0 ? "var(--text)" : "var(--color-profit)", margin: "6px 0" }}>
                {currency(goalPacing.remainingDollar)}
              </strong>
              <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                {goalPacing.isAchieved ? "Target accomplished" : `${effectiveRemainingDays} trading day${effectiveRemainingDays === 1 ? "" : "s"} left`}
              </small>
            </article>

            <article className="panel stat-panel" style={{ borderLeft: "4px solid var(--color-profit)", padding: "18px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                REQUIRED PER DAY
              </span>
              <strong style={{ fontSize: "26px", color: "var(--color-profit)", margin: "6px 0" }}>
                {currency(goalPacing.requiredPerDay)}
                <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 400 }}> / day</span>
              </strong>
              <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                {accountBalance > 0
                  ? `${((goalPacing.requiredPerDay / accountBalance) * 100).toFixed(2)}% daily return on balance`
                  : "Based on active balance"}
              </small>
            </article>

            <article className="panel stat-panel" style={{ borderLeft: "4px solid var(--color-cyan-soft)", padding: "18px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                REQUIRED PER WEEK
              </span>
              <strong style={{ fontSize: "26px", color: "var(--color-cyan-soft)", margin: "6px 0" }}>
                {currency(goalPacing.requiredPerWeek)}
                <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 400 }}> / week</span>
              </strong>
              <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                Across {tradingDaysPerWeek} trading sessions / week
              </small>
            </article>

            <article className="panel stat-panel" style={{ borderLeft: "4px solid #f6c85f", padding: "18px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                REQUIRED PER TRADE
              </span>
              <strong style={{ fontSize: "26px", color: "#f6c85f", margin: "6px 0" }}>
                {currency(goalPacing.requiredPerTrade)}
                <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 400 }}> / trade</span>
              </strong>
              <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                At {tradesPerDay} trade{tradesPerDay > 1 ? "s" : ""} / day
              </small>
            </article>
          </div>

          {/* Schedule & Pace Tuner Controls */}
          <div className="panel" style={{ padding: "20px" }}>
            <h4 style={{ margin: "0 0 14px", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚙️</span> Fine-Tune Trading Schedule &amp; Execution Frequency
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
              {/* Remaining Days adjustment */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Remaining Trading Days in Month
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={effectiveRemainingDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCustomRemainingDays(!isNaN(val) && val > 0 ? val : 1);
                    }}
                    style={{ width: "100px" }}
                  />
                  <button
                    type="button"
                    className="ghost compact"
                    onClick={() => setCustomRemainingDays(null)}
                    title="Reset to calendar default"
                  >
                    ↺ Reset ({calendarInfo.remainingTradingDays} days)
                  </button>
                </div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: "4px", fontSize: "11px" }}>
                  Total {calendarInfo.totalTradingDays} business days in {calendarInfo.monthName} ({calendarInfo.elapsedTradingDays} passed).
                </small>
              </div>

              {/* Trading days per week */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Your Trading Days Per Week
                </label>
                <div className="segmented" style={{ display: "flex", width: "100%" }}>
                  {[3, 4, 5].map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={tradingDaysPerWeek === days ? "is-active" : ""}
                      onClick={() => setTradingDaysPerWeek(days)}
                      style={{ flex: 1 }}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: "4px", fontSize: "11px" }}>
                  {tradingDaysPerWeek === 5 ? "Full Forex week (Mon-Fri)" : "Selective trading week"}
                </small>
              </div>

              {/* Trades per day */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Planned Trades Per Day
                </label>
                <div className="segmented" style={{ display: "flex", width: "100%" }}>
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={tradesPerDay === count ? "is-active" : ""}
                      onClick={() => setTradesPerDay(count)}
                      style={{ flex: 1 }}
                    >
                      {count} {count === 1 ? "trade" : "trades"}
                    </button>
                  ))}
                </div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: "4px", fontSize: "11px" }}>
                  Total ~{effectiveRemainingDays * tradesPerDay} executions remaining this month.
                </small>
              </div>
            </div>

            {/* Strategic Execution Roadmap */}
            <div style={{ marginTop: "24px", padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <h5 style={{ margin: "0 0 10px", fontSize: "14px", color: "var(--accent)" }}>
                💡 Execution Strategy Scenario
              </h5>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: "var(--muted)" }}>
                To achieve <strong>{currency(goalPacing.requiredPerDay)} / day</strong> over the remaining{" "}
                <strong>{effectiveRemainingDays} trading days</strong>:
              </p>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "13px", color: "var(--text)", lineHeight: "1.8" }}>
                <li>
                  <strong>At 1:2 R:R (e.g. risking $100 to make $200)</strong>: You need approximately{" "}
                  <strong>{Math.ceil(goalPacing.requiredPerDay / 200) || 1} win per day</strong> to satisfy your pace.
                </li>
                <li>
                  <strong>Pip equivalent (1.0 lot on EUR/USD, $10/pip)</strong>: Capturing{" "}
                  <strong>{(goalPacing.requiredPerDay / 10).toFixed(1)} pips per day</strong> achieves your daily target.
                </li>
                <li>
                  <strong>Pip equivalent (0.5 lots on EUR/USD, $5/pip)</strong>: Capturing{" "}
                  <strong>{(goalPacing.requiredPerDay / 5).toFixed(1)} pips per day</strong> achieves your daily target.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PIP & P&L CALCULATOR VIEW                             */}
      {/* ======================================================== */}
      {activeMode === "pips" && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>📏 Pip &amp; Monetary P&amp;L Calculator</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Calculate precise pips and dollar profit/loss for any asset and lot size.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Input Column */}
            <div style={{ display: "grid", gap: "16px" }}>
              <label>
                Pair / Instrument
                <select value={pipSymbol} onChange={(e) => handleInstrumentChange(e.target.value)}>
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.name} ({inst.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Direction</span>
                <div className="segmented" style={{ display: "flex", width: "100%" }}>
                  <button
                    type="button"
                    className={pipDirection === "buy" ? "is-active" : ""}
                    onClick={() => setPipDirection("buy")}
                    style={{ flex: 1, color: pipDirection === "buy" ? "var(--color-profit)" : "inherit" }}
                  >
                    🟢 BUY (Long)
                  </button>
                  <button
                    type="button"
                    className={pipDirection === "sell" ? "is-active" : ""}
                    onClick={() => setPipDirection("sell")}
                    style={{ flex: 1, color: pipDirection === "sell" ? "var(--color-loss)" : "inherit" }}
                  >
                    🔴 SELL (Short)
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Entry Price
                  <input
                    type="number"
                    step="any"
                    value={pipEntryPrice}
                    onChange={(e) => setPipEntryPrice(e.target.value)}
                  />
                </label>
                <label>
                  Exit / Target Price
                  <input
                    type="number"
                    step="any"
                    value={pipExitPrice}
                    onChange={(e) => setPipExitPrice(e.target.value)}
                  />
                </label>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px" }}>Lot Size</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={pipLotSize}
                  onChange={(e) => setPipLotSize(e.target.value)}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  {["0.01", "0.05", "0.10", "0.25", "0.50", "1.00", "2.00"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="ghost compact"
                      onClick={() => setPipLotSize(s)}
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <details style={{ marginTop: "4px", fontSize: "12px", color: "var(--muted)" }}>
                <summary style={{ cursor: "pointer" }}>Advanced: Custom Pip Value Override</summary>
                <div style={{ marginTop: "8px" }}>
                  <label>
                    Custom Pip Value ($ per 1.0 lot)
                    <input
                      type="number"
                      step="any"
                      placeholder={`Default for ${pipSymbol}: $${activeInstrument.defaultPipValuePerLot}`}
                      value={pipCustomSize}
                      onChange={(e) => setPipCustomSize(e.target.value)}
                    />
                  </label>
                </div>
              </details>
            </div>

            {/* Results Column */}
            <div style={{ display: "grid", gap: "16px" }}>
              <div
                className="panel"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  padding: "20px",
                  borderRadius: "8px"
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  CALCULATED RESULT
                </span>

                <div style={{ margin: "16px 0", display: "grid", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
                    <span style={{ color: "var(--muted)" }}>Total Movement:</span>
                    <strong
                      style={{
                        fontSize: "24px",
                        color: pipCalcResults.pips >= 0 ? "var(--color-profit)" : "var(--color-loss)"
                      }}
                    >
                      {pipCalcResults.pips >= 0 ? `+${pipCalcResults.pips}` : pipCalcResults.pips} pips
                    </strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
                    <span style={{ color: "var(--muted)" }}>Pip Value ({pipLotSize} lots):</span>
                    <strong style={{ fontSize: "18px" }}>{currency(pipCalcResults.pipValue)} / pip</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
                    <span style={{ color: "var(--muted)" }}>Total Monetary P&amp;L:</span>
                    <strong
                      style={{
                        fontSize: "26px",
                        color: pipCalcResults.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"
                      }}
                    >
                      {pipCalcResults.pnl >= 0 ? `+${currency(pipCalcResults.pnl)}` : currency(pipCalcResults.pnl)}
                    </strong>
                  </div>

                  {accountBalance > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ color: "var(--muted)" }}>Return on Account:</span>
                      <strong
                        style={{
                          fontSize: "16px",
                          color: pipCalcResults.accountGainPercent >= 0 ? "var(--color-profit)" : "var(--color-loss)"
                        }}
                      >
                        {pipCalcResults.accountGainPercent >= 0 ? `+${pipCalcResults.accountGainPercent.toFixed(2)}%` : `${pipCalcResults.accountGainPercent.toFixed(2)}%`}
                      </strong>
                    </div>
                  )}
                </div>

                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 12px", borderRadius: "6px", fontSize: "12px", color: "var(--muted)" }}>
                  Instrument: <strong>{activeInstrument.name}</strong> • 1 pip = {activeInstrument.pipSize} • Contract size = {activeInstrument.standardLotUnits.toLocaleString()} units
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. POSITION SIZING & RISK CALCULATOR VIEW                */}
      {/* ======================================================== */}
      {activeMode === "position_size" && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>⚖️ Position Size &amp; Risk Calculator</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Calculate the exact lot size to keep your capital safe and risk strictly within limits.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={{ display: "grid", gap: "16px" }}>
              <label>
                Account Capital / Balance ($)
                <input
                  type="number"
                  step="any"
                  value={posAccountBalance}
                  onChange={(e) => setPosAccountBalance(e.target.value)}
                />
              </label>

              <div>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Risk Method
                </span>
                <div className="segmented" style={{ display: "flex", width: "100%" }}>
                  <button
                    type="button"
                    className={posRiskMode === "percent" ? "is-active" : ""}
                    onClick={() => setPosRiskMode("percent")}
                    style={{ flex: 1 }}
                  >
                    % of Account
                  </button>
                  <button
                    type="button"
                    className={posRiskMode === "cash" ? "is-active" : ""}
                    onClick={() => setPosRiskMode("cash")}
                    style={{ flex: 1 }}
                  >
                    Fixed Cash ($)
                  </button>
                </div>
              </div>

              <label>
                {posRiskMode === "percent" ? "Risk Percentage (%)" : "Risk Cash ($)"}
                <input
                  type="number"
                  step="any"
                  value={posRiskValue}
                  onChange={(e) => setPosRiskValue(e.target.value)}
                  placeholder={posRiskMode === "percent" ? "e.g. 1.0" : "e.g. 200"}
                />
              </label>

              <label>
                Pair / Instrument
                <select value={posSymbol} onChange={(e) => setPosSymbol(e.target.value)}>
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Stop Loss (in Pips)
                <input
                  type="number"
                  step="any"
                  value={posStopLossPips}
                  onChange={(e) => setPosStopLossPips(e.target.value)}
                  placeholder="e.g. 20"
                />
              </label>
            </div>

            {/* Results */}
            <div style={{ display: "grid", gap: "16px" }}>
              <div
                className="panel"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  padding: "20px",
                  borderRadius: "8px"
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  RECOMMENDED POSITION
                </span>

                <div style={{ margin: "18px 0" }}>
                  <div style={{ color: "var(--muted)", fontSize: "13px" }}>Recommended Lot Size:</div>
                  <strong style={{ fontSize: "36px", color: "var(--accent)", display: "block", marginTop: "4px" }}>
                    {posResults.recommendedLots} <span style={{ fontSize: "18px", color: "var(--muted)", fontWeight: 400 }}>Lots</span>
                  </strong>
                </div>

                <div style={{ display: "grid", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Cash at Risk:</span>
                    <strong>{currency(posResults.cashRisk)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Total Units:</span>
                    <strong>{posResults.units.toLocaleString()} units</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Pip Value for Size:</span>
                    <strong>{currency(posResults.pipValueAtLots)} / pip</strong>
                  </div>
                </div>

                <div style={{ marginTop: "16px", padding: "10px 12px", background: "rgba(34, 224, 143, 0.08)", borderRadius: "6px", fontSize: "12px", color: "var(--color-profit)" }}>
                  ✓ Risking exactly {currency(posResults.cashRisk)} if your {posStopLossPips} pips stop loss is triggered.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. RISK TO REWARD (R:R) CALCULATOR VIEW                  */}
      {/* ======================================================== */}
      {activeMode === "risk_reward" && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>📐 Risk-to-Reward &amp; Breakeven Calculator</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Calculate planned R:R ratio, dollar payout, and the minimum required win rate to stay profitable.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={{ display: "grid", gap: "14px" }}>
              <label>
                Pair / Instrument
                <select value={rrSymbol} onChange={(e) => setRrSymbol(e.target.value)}>
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Direction</span>
                <div className="segmented" style={{ display: "flex", width: "100%" }}>
                  <button
                    type="button"
                    className={rrDirection === "buy" ? "is-active" : ""}
                    onClick={() => setRrDirection("buy")}
                    style={{ flex: 1 }}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    className={rrDirection === "sell" ? "is-active" : ""}
                    onClick={() => setRrDirection("sell")}
                    style={{ flex: 1 }}
                  >
                    SELL (Short)
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <label>
                  Entry
                  <input type="number" step="any" value={rrEntry} onChange={(e) => setRrEntry(e.target.value)} />
                </label>
                <label>
                  Stop Loss
                  <input type="number" step="any" value={rrSl} onChange={(e) => setRrSl(e.target.value)} />
                </label>
                <label>
                  Take Profit
                  <input type="number" step="any" value={rrTp} onChange={(e) => setRrTp(e.target.value)} />
                </label>
              </div>

              <label>
                Position Size (Lots)
                <input type="number" step="0.01" value={rrLotSize} onChange={(e) => setRrLotSize(e.target.value)} />
              </label>
            </div>

            {/* Results */}
            <div style={{ display: "grid", gap: "16px" }}>
              <div
                className="panel"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  padding: "20px",
                  borderRadius: "8px"
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  R:R RATIO &amp; PROJECTIONS
                </span>

                <div style={{ margin: "16px 0" }}>
                  <div style={{ color: "var(--muted)", fontSize: "13px" }}>Planned Risk-to-Reward:</div>
                  <strong style={{ fontSize: "36px", color: "var(--accent)", display: "block", marginTop: "4px" }}>
                    1 : {rrResults.rrRatio.toFixed(2)}
                  </strong>
                </div>

                <div style={{ display: "grid", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-loss)" }}>Risk (Loss):</span>
                    <strong>{rrResults.riskPips} pips ({currency(rrResults.cashRisk)})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-profit)" }}>Reward (Profit):</span>
                    <strong>{rrResults.rewardPips} pips ({currency(rrResults.cashReward)})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Minimum Breakeven Win Rate:</span>
                    <strong style={{ color: "var(--color-cyan-soft)" }}>{rrResults.breakevenWinRate}%</strong>
                  </div>
                </div>

                <div style={{ marginTop: "16px", padding: "10px 12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", fontSize: "12px", color: "var(--muted)" }}>
                  💡 At a 1:{rrResults.rrRatio.toFixed(2)} R:R, winning just <strong>{rrResults.breakevenWinRate}%</strong> of your trades covers all your losses.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. COMPOUNDING & GROWTH SIMULATOR VIEW                   */}
      {/* ======================================================== */}
      {activeMode === "compounding" && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px" }}>📈 Compounding &amp; Account Growth Simulator</h3>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Simulate exponential account growth over trading sessions, weeks, or months.
            </p>
          </div>

          {/* Inputs Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <label>
              Starting Balance ($)
              <input
                type="number"
                step="any"
                value={compStartBalance}
                onChange={(e) => setCompStartBalance(e.target.value)}
              />
            </label>
            <label>
              Return Per Period (%)
              <input
                type="number"
                step="0.1"
                value={compRatePercent}
                onChange={(e) => setCompRatePercent(e.target.value)}
                placeholder="e.g. 1.0% per day"
              />
            </label>
            <label>
              Number of Periods (Days/Weeks)
              <input
                type="number"
                min="1"
                max="60"
                value={compPeriods}
                onChange={(e) => setCompPeriods(e.target.value)}
              />
            </label>
            <label>
              Periodic Deposit ($) (Optional)
              <input
                type="number"
                min="0"
                step="any"
                value={compDeposit}
                onChange={(e) => setCompDeposit(e.target.value)}
              />
            </label>
          </div>

          {/* Highlight metrics */}
          {finalCompRow && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <article className="panel stat-panel" style={{ padding: "16px" }}>
                <span>PROJECTED END BALANCE</span>
                <strong style={{ fontSize: "24px", color: "var(--color-profit)" }}>
                  {currency(finalCompRow.endingBalance)}
                </strong>
              </article>
              <article className="panel stat-panel" style={{ padding: "16px" }}>
                <span>TOTAL GAIN</span>
                <strong style={{ fontSize: "24px", color: "var(--color-cyan-soft)" }}>
                  +{percent(finalCompRow.totalGainPercent)}
                </strong>
              </article>
              <article className="panel stat-panel" style={{ padding: "16px" }}>
                <span>NET COMPOUND PROFIT</span>
                <strong style={{ fontSize: "24px", color: "var(--accent)" }}>
                  {currency(finalCompRow.endingBalance - (parseFloat(compStartBalance) || 0))}
                </strong>
              </article>
            </div>
          )}

          {/* Schedule Table */}
          <div style={{ maxHeight: "360px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px" }}>Period</th>
                  <th style={{ padding: "10px 14px" }}>Starting Capital</th>
                  <th style={{ padding: "10px 14px" }}>Profit ({compRatePercent}%)</th>
                  <th style={{ padding: "10px 14px" }}>Ending Balance</th>
                  <th style={{ padding: "10px 14px" }}>Cumulative Growth</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row) => (
                  <tr key={row.period} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <td style={{ padding: "8px 14px", color: "var(--muted)" }}>Day / Period {row.period}</td>
                    <td style={{ padding: "8px 14px" }}>{currency(row.startingBalance)}</td>
                    <td style={{ padding: "8px 14px", color: "var(--color-profit)" }}>+{currency(row.profit)}</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600 }}>{currency(row.endingBalance)}</td>
                    <td style={{ padding: "8px 14px", color: "var(--accent)" }}>+{row.totalGainPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
