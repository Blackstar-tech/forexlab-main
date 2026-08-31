import type {
  ForexLabScoreBreakdown,
  Streak,
  Trade,
  TradeSummary,
  TraderLevel,
} from "./types";

export function tradesChronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
}

export function summarizeTrades(trades: Trade[]): TradeSummary {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const breakeven = trades.filter((t) => t.result === "breakeven").length;
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = total ? (wins / total) * 100 : 0;
  const rated = trades.filter((t) => t.rating > 0);
  const averageRating = rated.length
    ? rated.reduce((sum, t) => sum + t.rating, 0) / rated.length
    : 0;
  return { total, wins, losses, breakeven, netPnl, winRate, averageRating };
}

export function profitFactor(trades: Trade[]): number {
  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)
  );
  if (grossLoss <= 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export function avgWinLoss(trades: Trade[]): {
  avgWin: number;
  avgLoss: number;
  ratio: number;
} {
  const wins = trades.filter((t) => t.pnl > 0).map((t) => t.pnl);
  const losses = trades.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
  const avgWin = wins.length
    ? wins.reduce((a, b) => a + b, 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? losses.reduce((a, b) => a + b, 0) / losses.length
    : 0;
  const ratio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  return { avgWin, avgLoss, ratio };
}

export function dailyPnlSeries(trades: Trade[]): { date: string; pnl: number }[] {
  const daily = new Map<string, number>();
  tradesChronological(trades).forEach((trade) => {
    daily.set(trade.date, (daily.get(trade.date) || 0) + trade.pnl);
  });
  return Array.from(daily.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date, pnl }));
}

export function cumulativePnlSeries(
  trades: Trade[]
): { date: string; cumulative: number }[] {
  let running = 0;
  return dailyPnlSeries(trades).map(({ date, pnl }) => {
    running += pnl;
    return { date, cumulative: running };
  });
}

export function maxDrawdown(series: number[]): number {
  let peak = 0;
  let maxDd = 0;
  series.forEach((value) => {
    if (value > peak) peak = value;
    const drawdown = peak - value;
    if (drawdown > maxDd) maxDd = drawdown;
  });
  return maxDd;
}

export function consistencyScore(dailyPnls: number[]): number {
  if (dailyPnls.length < 2) return 50;
  const mean = dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length;
  const variance =
    dailyPnls.reduce((sum, v) => sum + (v - mean) ** 2, 0) / dailyPnls.length;
  const stdDev = Math.sqrt(variance);
  const denominator = Math.abs(mean) || 1;
  const volatilityRatio = stdDev / denominator;
  return Math.max(0, Math.min(100, 100 - volatilityRatio * 12));
}

export function calculateForexLabScore(trades: Trade[]): ForexLabScoreBreakdown {
  const summary = summarizeTrades(trades);
  const factor = profitFactor(trades);
  const ratio = avgWinLoss(trades).ratio;
  const cumulative = cumulativePnlSeries(trades).map((p) => p.cumulative);
  const dd = maxDrawdown(cumulative);
  const netPnl = summary.netPnl;
  const dailyPnls = dailyPnlSeries(trades).map((d) => d.pnl);

  const winRateScore = Math.max(0, Math.min(100, summary.winRate));
  const profitFactorScore = Number.isFinite(factor)
    ? Math.max(0, Math.min(100, factor * 25))
    : 100;
  const avgWinLossScore = Number.isFinite(ratio)
    ? Math.max(0, Math.min(100, ratio * 25))
    : 100;
  const consistency = consistencyScore(dailyPnls);
  const maxDrawdownScore =
    dd > 0
      ? Math.max(
          0,
          100 - Math.min(100, (dd / (Math.abs(netPnl) || dd || 1)) * 50)
        )
      : 100;
  const recoveryFactorRaw = dd > 0 ? netPnl / dd : netPnl > 0 ? Infinity : 0;
  const recoveryFactorScore = Number.isFinite(recoveryFactorRaw)
    ? Math.max(0, Math.min(100, recoveryFactorRaw * 20))
    : 100;

  const overall =
    (winRateScore +
      profitFactorScore +
      avgWinLossScore +
      consistency +
      maxDrawdownScore +
      recoveryFactorScore) /
    6;

  return {
    overall,
    winRate: winRateScore,
    profitFactor: profitFactorScore,
    avgWinLoss: avgWinLossScore,
    consistency,
    maxDrawdownScore,
    recoveryFactor: recoveryFactorScore,
  };
}

export function currentTradeStreak(trades: Trade[]): Streak {
  const ordered = tradesChronological(trades).filter(
    (t) => t.result !== "breakeven"
  );
  if (!ordered.length) return { type: "none", count: 0 };
  const last = ordered[ordered.length - 1];
  const type = last.result === "win" ? "win" : "loss";
  let count = 0;
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    if (ordered[i].result !== last.result) break;
    count += 1;
  }
  return { type, count };
}

export function currentDayStreak(trades: Trade[]): Streak {
  const daily = new Map<string, number>();
  trades.forEach((trade) => {
    daily.set(trade.date, (daily.get(trade.date) || 0) + trade.pnl);
  });
  const days = Array.from(daily.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  if (!days.length) return { type: "none", count: 0 };
  const lastPnl = days[days.length - 1][1];
  if (lastPnl === 0) return { type: "none", count: 0 };
  const type = lastPnl > 0 ? "win" : "loss";
  let count = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const pnl = days[i][1];
    const dayType = pnl > 0 ? "win" : pnl < 0 ? "loss" : "none";
    if (dayType !== type) break;
    count += 1;
  }
  return { type, count };
}

export function traderLevelInfo(summary: TradeSummary): TraderLevel {
  const ratingScore = (summary.averageRating / 5) * 100;
  const score = Math.max(
    0,
    Math.min(100, summary.winRate * 0.6 + ratingScore * 0.4)
  );
  let tier: TraderLevel["tier"] = "bronze";
  let label = "Bronze";
  if (score >= 80) {
    tier = "diamond";
    label = "Diamond";
  } else if (score >= 60) {
    tier = "platinum";
    label = "Platinum";
  } else if (score >= 40) {
    tier = "gold";
    label = "Gold";
  } else if (score >= 20) {
    tier = "silver";
    label = "Silver";
  }
  return { score, tier, label };
}

export function bestPair(trades: Trade[]): string {
  const pairMap = new Map<string, number>();
  trades.forEach((trade) => {
    pairMap.set(trade.pair, (pairMap.get(trade.pair) || 0) + trade.pnl);
  });
  const sorted = Array.from(pairMap.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : "-";
}

export function calculateRr(
  entry: number | null,
  stop: number | null,
  take: number | null,
  direction: "buy" | "sell"
): number | null {
  if (entry === null || stop === null || take === null) return null;
  const risk = Math.abs(entry - stop);
  const reward = direction === "buy" ? take - entry : entry - take;
  if (risk <= 0 || reward <= 0) return null;
  return Number((reward / risk).toFixed(2));
}