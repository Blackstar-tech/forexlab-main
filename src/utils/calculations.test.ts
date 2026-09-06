import { describe, it, expect } from "vitest";
import { calculateCurrentBalance } from "./calculations";
import { Trade, BalanceCheckpoint } from "./types";

function mockTrade(date: string, pnl: number): Trade {
  return {
    id: `t_${Math.random()}`,
    userId: "u1",
    date,
    time: "10:00",
    pair: "EURUSD",
    session: "London",
    direction: "buy",
    result: pnl >= 0 ? "win" : "loss",
    setup: "FVG",
    entryPrice: 1.1,
    stopLoss: 1.09,
    takeProfit: 1.12,
    lotSize: 1,
    riskPercent: 1,
    plannedRr: 2,
    rrAchieved: "2",
    pips: 20,
    pnl,
    emotion: "calm",
    sleepQuality: "good",
    confidence: "high",
    rating: 4,
    preTradeNotes: "",
    notes: "",
    screenshots: { before: [], after: [], analysis: [] },
    createdAt: `${date}T10:00:00.000Z`
  };
}

describe("calculateCurrentBalance with Checkpoints", () => {
  it("falls back to fallbackStartingBalance + all trades when no checkpoints exist", () => {
    const trades: Trade[] = [
      mockTrade("2026-09-01", 100),
      mockTrade("2026-09-02", -50),
      mockTrade("2026-09-03", 250)
    ];

    const balance = calculateCurrentBalance([], trades, 1000);
    expect(balance).toBe(1300); // 1000 + 100 - 50 + 250
  });

  it("calculates balance using the most recent checkpoint and trades on/after effective_from", () => {
    const trades: Trade[] = [
      mockTrade("2026-09-01", 500), // before checkpoint -> ignored in current balance
      mockTrade("2026-09-04", -200), // before checkpoint -> ignored
      mockTrade("2026-09-05", 150), // on checkpoint date -> included
      mockTrade("2026-09-06", -50), // after checkpoint -> included
      mockTrade("2026-09-07", 300) // after checkpoint -> included
    ];

    const checkpoints: BalanceCheckpoint[] = [
      {
        id: "cp1",
        userId: "u1",
        balance: 10000,
        effectiveFrom: "2026-09-05T12:00:00.000Z",
        createdAt: "2026-09-05T12:00:00.000Z"
      }
    ];

    const balance = calculateCurrentBalance(checkpoints, trades, 0);
    // 10000 + 150 - 50 + 300 = 10400
    expect(balance).toBe(10400);
  });

  it("picks the most recent checkpoint when multiple checkpoints exist", () => {
    const trades: Trade[] = [
      mockTrade("2026-09-01", 100),
      mockTrade("2026-09-03", 200),
      mockTrade("2026-09-06", 50),
      mockTrade("2026-09-07", -100)
    ];

    const checkpoints: BalanceCheckpoint[] = [
      {
        id: "cp1",
        userId: "u1",
        balance: 5000,
        effectiveFrom: "2026-09-02",
        createdAt: "2026-09-02T10:00:00.000Z"
      },
      {
        id: "cp2",
        userId: "u1",
        balance: 8000,
        effectiveFrom: "2026-09-06",
        createdAt: "2026-09-06T15:00:00.000Z"
      }
    ];

    const balance = calculateCurrentBalance(checkpoints, trades, 0);
    // Most recent is cp2 (2026-09-06, $8000).
    // Trades >= 2026-09-06 are 2026-09-06 (+50) and 2026-09-07 (-100).
    // 8000 + 50 - 100 = 7950
    expect(balance).toBe(7950);
  });
});
