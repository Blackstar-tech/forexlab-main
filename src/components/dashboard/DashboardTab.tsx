"use client";

import React from "react";
import { Trade } from "@/utils/types";
import {
  calculateForexLabScore,
  profitFactor,
  avgWinLoss,
  currentDayStreak,
  currentTradeStreak
} from "@/utils/calculations";
import { currency, percent, formatRatio } from "@/utils/formatters";
import ForexLabScoreCard from "./ForexLabScoreCard";
import PnlLineChart from "./PnlLineChart";

interface Props {
  trades: Trade[];
  accountBalance: number;
}

export default function DashboardTab({ trades, accountBalance }: Props) {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const winRate = total ? (wins / total) * 100 : 0;
  const factor = profitFactor(trades);
  const ratio = avgWinLoss(trades).ratio;
  const dayStreak = currentDayStreak(trades);
  const tradeStreak = currentTradeStreak(trades);
  const score = calculateForexLabScore(trades);

  const streakLabel = (streak: { type: string; count: number }, unit: string) => {
    if (!streak.count || streak.type === "none") return "No streak";
    return `${streak.count} ${streak.type.toUpperCase()} ${unit}`;
  };

  return (
    <section className="tab-panel is-active">
      <div className="panel-title">
        <h2>Dashboard</h2>
        <p>Your trading performance at a glance.</p>
      </div>

      <section className="dashboard-grid" aria-label="Dashboard metrics">
        <article className="panel stat-panel">
          <span>Account balance</span>
          <strong>{currency(accountBalance)}</strong>
        </article>
        <article className="panel stat-panel">
          <span>Trade win %</span>
          <strong>{percent(winRate)}</strong>
        </article>
        <article className="panel stat-panel">
          <span>Profit factor</span>
          <strong>{formatRatio(factor)}</strong>
        </article>
        <article className="panel stat-panel">
          <span>Avg win / loss</span>
          <strong>{formatRatio(ratio)}</strong>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-2" aria-label="Dashboard streaks">
        <article className="panel stat-panel">
          <span>Current day streak</span>
          <strong className={dayStreak.type === "win" ? "positive" : dayStreak.type === "loss" ? "negative" : ""}>
            {streakLabel(dayStreak, "days")}
          </strong>
        </article>
        <article className="panel stat-panel">
          <span>Current trade streak</span>
          <strong className={tradeStreak.type === "win" ? "positive" : tradeStreak.type === "loss" ? "negative" : ""}>
            {streakLabel(tradeStreak, "trades")}
          </strong>
        </article>
      </section>

      <section className="dashboard-charts">
        <ForexLabScoreCard score={score} />
        <PnlLineChart trades={trades} />
      </section>
    </section>
  );
}
