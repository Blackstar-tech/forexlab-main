"use client";

import React from "react";
import { Trade } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";

interface Props {
  trades: Trade[];
}

export default function AnalyticsView({ trades }: Props) {
  // --- Aggregators ---
  const pairStats = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  const sessionStats = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  const setupStats = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  const directionStats = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  const emotionStats = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();

  trades.forEach((t) => {
    const bump = (map: Map<string, { trades: number; wins: number; losses: number; pnl: number }>, key: string) => {
      const curr = map.get(key) || { trades: 0, wins: 0, losses: 0, pnl: 0 };
      curr.trades += 1;
      if (t.result === "win") curr.wins += 1;
      if (t.result === "loss") curr.losses += 1;
      curr.pnl += t.pnl;
      map.set(key, curr);
    };
    bump(pairStats, t.pair);
    bump(sessionStats, t.session || "Unknown");
    bump(setupStats, t.setup || "General");
    bump(directionStats, t.direction === "buy" ? "LONG" : "SHORT");
    bump(emotionStats, t.emotion || "Neutral");
  });

  // --- Key calculations ---
  const wins = trades.filter((t) => t.result === "win");
  const losses = trades.filter((t) => t.result === "loss");
  const totalWinPnl = wins.reduce((s, t) => s + t.pnl, 0);
  const totalLossPnl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const avgWin = wins.length ? totalWinPnl / wins.length : 0;
  const avgLoss = losses.length ? totalLossPnl / losses.length : 0;
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;
  const expectancy = trades.length
    ? ((wins.length / trades.length) * avgWin) - ((losses.length / trades.length) * avgLoss)
    : 0;
  const largestWin = wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0;
  const largestLoss = losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0;

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let curStreak = 0;
  let curType: "win" | "loss" | "" = "";
  [...trades].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => {
    if (t.result === "win") {
      curStreak = curType === "win" ? curStreak + 1 : 1;
      curType = "win";
      maxWinStreak = Math.max(maxWinStreak, curStreak);
    } else if (t.result === "loss") {
      curStreak = curType === "loss" ? curStreak + 1 : 1;
      curType = "loss";
      maxLossStreak = Math.max(maxLossStreak, curStreak);
    }
  });

  const rated = trades.filter((t) => t.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, t) => s + t.rating, 0) / rated.length : 0;

  const pairList = Array.from(pairStats.entries()).sort((a, b) => b[1].pnl - a[1].pnl);
  const bestPair = pairList[0];
  const worstPair = pairList.length > 1 ? pairList[pairList.length - 1] : null;

  // --- Breakdown renderer ---
  const renderBreakdown = (
    title: string,
    emoji: string,
    dataMap: Map<string, { trades: number; wins: number; losses: number; pnl: number }>
  ) => {
    const list = Array.from(dataMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl);
    return (
      <article className="panel">
        <div className="panel-title">
          <h3>{emoji} {title}</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {list.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>No data yet.</p>
          ) : (
            list.map(([key, item]) => {
              const wr = item.trades ? (item.wins / item.trades) * 100 : 0;
              const barW = trades.length ? (item.trades / trades.length) * 100 : 0;
              return (
                <div
                  key={key}
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(var(--color-white-rgb) / 0.02)",
                    borderRadius: "6px",
                    border: "1px solid rgba(var(--color-white-rgb) / 0.04)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0, top: 0, bottom: 0,
                      width: `${barW}%`,
                      background: item.pnl >= 0 ? "rgba(34,224,143,0.07)" : "rgba(255,84,104,0.07)",
                      borderRight: `2px solid ${item.pnl >= 0 ? "rgba(34,224,143,0.18)" : "rgba(255,84,104,0.18)"}`
                    }}
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <strong style={{ display: "block", fontSize: "13px", fontFamily: "var(--font-mono)" }}>{key}</strong>
                    <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {item.trades} trade{item.trades !== 1 ? "s" : ""} &bull; {percent(wr)} WR &bull; {item.wins}W/{item.losses}L
                    </small>
                  </div>
                  <strong style={{
                    position: "relative", zIndex: 1,
                    fontFamily: "var(--font-mono)", fontSize: "13px",
                    color: item.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"
                  }}>
                    {currency(item.pnl)}
                  </strong>
                </div>
              );
            })
          )}
        </div>
      </article>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* ── Title ── */}
      <div className="panel-title" style={{ marginBottom: 0 }}>
        <h2>📊 Performance Analytics</h2>
        <p>Detailed edge breakdown by asset, session, and trading strategy.</p>
      </div>

      {/* ── Row 1: Core stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <article className="metric">
          <span>PROFIT FACTOR</span>
          <strong style={{ color: profitFactor >= 1.5 ? "var(--color-profit)" : profitFactor >= 1 ? "var(--warning)" : "var(--color-loss)" }}>
            {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
          </strong>
        </article>
        <article className="metric">
          <span>EXPECTANCY / TRADE</span>
          <strong className={expectancy >= 0 ? "positive" : "negative"}>
            {currency(expectancy)}
          </strong>
        </article>
        <article className="metric">
          <span>AVG WIN</span>
          <strong className="positive">{currency(avgWin)}</strong>
        </article>
        <article className="metric">
          <span>AVG LOSS</span>
          <strong className="negative">-{currency(avgLoss)}</strong>
        </article>
      </div>

      {/* ── Row 2: Streaks & extremes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <article className="metric">
          <span>BEST WIN STREAK</span>
          <strong style={{ color: "var(--color-profit)" }}>{maxWinStreak} 🔥</strong>
        </article>
        <article className="metric">
          <span>WORST LOSS STREAK</span>
          <strong style={{ color: "var(--color-loss)" }}>{maxLossStreak} 💀</strong>
        </article>
        <article className="metric">
          <span>LARGEST WIN</span>
          <strong className="positive">{currency(largestWin)}</strong>
        </article>
        <article className="metric">
          <span>LARGEST LOSS</span>
          <strong className="negative">{currency(largestLoss)}</strong>
        </article>
      </div>

      {/* ── Row 3: Best & Worst pair highlights ── */}
      {bestPair && worstPair && bestPair[0] !== worstPair[0] && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <article className="panel" style={{ borderLeft: "3px solid var(--color-profit)" }}>
            <small style={{ color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
              🏆 Best Performing Pair
            </small>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "18px" }}>{bestPair[0]}</h3>
                <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                  {bestPair[1].trades} trades &bull; {percent(bestPair[1].wins / bestPair[1].trades * 100)} win rate
                </small>
              </div>
              <strong style={{ fontSize: "20px", fontFamily: "var(--font-mono)", color: "var(--color-profit)" }}>
                {currency(bestPair[1].pnl)}
              </strong>
            </div>
          </article>

          <article className="panel" style={{ borderLeft: "3px solid var(--color-loss)" }}>
            <small style={{ color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
              ⚠️ Worst Performing Pair
            </small>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "18px" }}>{worstPair[0]}</h3>
                <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                  {worstPair[1].trades} trades &bull; {percent(worstPair[1].wins / worstPair[1].trades * 100)} win rate
                </small>
              </div>
              <strong style={{ fontSize: "20px", fontFamily: "var(--font-mono)", color: "var(--color-loss)" }}>
                {currency(worstPair[1].pnl)}
              </strong>
            </div>
          </article>
        </div>
      )}

      {/* ── Row 4: Instrument + Session ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
        {renderBreakdown("By Instrument", "💱", pairStats)}
        {renderBreakdown("By Session", "🕐", sessionStats)}
      </div>

      {/* ── Row 5: Strategy + Direction ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
        {renderBreakdown("By Strategy", "🎯", setupStats)}
        {renderBreakdown("By Direction", "↕️", directionStats)}
      </div>

      {/* ── Row 6: Emotion (full width) ── */}
      {renderBreakdown("By Emotion / Mindset", "🧠", emotionStats)}

      {/* ── Row 7: Quality summary ── */}
      <article className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <small style={{ color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", fontSize: "11px" }}>
              EXECUTION QUALITY
            </small>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Average self-rated quality across {rated.length} rated trade{rated.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong style={{ fontSize: "28px", fontFamily: "var(--font-mono)" }}>
              {avgRating.toFixed(1)} <span style={{ fontSize: "20px" }}>★</span>
            </strong>
            <small style={{ display: "block", color: "var(--muted)", fontSize: "11px", marginTop: "2px" }}>
              out of 5.0
            </small>
          </div>
        </div>
        {/* Rating distribution bar */}
        <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginTop: "14px", gap: "2px" }}>
          {[1, 2, 3, 4, 5].map((r) => {
            const count = trades.filter((t) => t.rating === r).length;
            const pct = rated.length ? (count / rated.length) * 100 : 0;
            const colors = ["var(--color-loss)", "#ff8c42", "var(--warning)", "#86efac", "var(--color-profit)"];
            return (
              <div
                key={r}
                title={`${r}★: ${count} trades (${pct.toFixed(0)}%)`}
                style={{
                  flex: pct > 0 ? pct : 0.5,
                  background: colors[r - 1],
                  opacity: pct > 0 ? 1 : 0.15,
                  borderRadius: "3px",
                  transition: "flex 0.3s ease"
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          {[1, 2, 3, 4, 5].map((r) => {
            const count = trades.filter((t) => t.rating === r).length;
            return (
              <small key={r} style={{ color: "var(--muted)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                {r}★ ({count})
              </small>
            );
          })}
        </div>
      </article>
    </div>
  );
}
