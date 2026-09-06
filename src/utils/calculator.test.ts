import { describe, it, expect } from "vitest";
import {
  calculatePips,
  calculatePipValue,
  calculatePipsPnl,
  calculatePositionSize,
  calculateRiskReward,
  getMonthTradingDaysInfo,
  calculateGoalPacing,
  calculateCompounding,
  getInstrumentSpec
} from "./calculator";

describe("Calculator Utilities", () => {
  describe("Instrument Specs & Pip Calculations", () => {
    it("identifies correct pip sizes for forex, jpy, commodities, indices, and crypto", () => {
      expect(getInstrumentSpec("EURUSD").pipSize).toBe(0.0001);
      expect(getInstrumentSpec("USDJPY").pipSize).toBe(0.01);
      expect(getInstrumentSpec("GBPJPY").pipSize).toBe(0.01);
      expect(getInstrumentSpec("XAUUSD").pipSize).toBe(0.1);
      expect(getInstrumentSpec("NAS100").pipSize).toBe(1.0);
      expect(getInstrumentSpec("BTCUSD").pipSize).toBe(1.0);
    });

    it("calculates pips accurately for Buy trades", () => {
      // EURUSD: 1.08500 to 1.09000 is 50 pips
      const pips = calculatePips(1.085, 1.09, 0.0001, "buy");
      expect(pips).toBe(50);
    });

    it("calculates pips accurately for Sell trades", () => {
      // EURUSD: 1.09000 to 1.08500 is 50 pips profit
      const pips = calculatePips(1.09, 1.085, 0.0001, "sell");
      expect(pips).toBe(50);

      // EURUSD: 1.08500 to 1.09000 is -50 pips loss on sell
      const lossPips = calculatePips(1.085, 1.09, 0.0001, "sell");
      expect(lossPips).toBe(-50);
    });

    it("calculates pips accurately for JPY pairs", () => {
      // USDJPY: 155.20 to 155.70 is 50 pips
      const pips = calculatePips(155.2, 155.7, 0.01, "buy");
      expect(pips).toBe(50);
    });

    it("calculates pips accurately for Gold (XAUUSD)", () => {
      // $10 move from 2650.00 to 2660.00 = 100 standard gold pips
      const pips = calculatePips(2650.0, 2660.0, 0.1, "buy");
      expect(pips).toBe(100);
    });

    it("calculates pip value and trade monetary P&L", () => {
      // 1 standard lot EURUSD = $10/pip. 40 pips = $400
      const pipVal = calculatePipValue("EURUSD", 1.0);
      expect(pipVal).toBe(10);
      const pnl = calculatePipsPnl(40, 1.0, "EURUSD");
      expect(pnl).toBe(400);

      // 0.25 mini lots EURUSD = $2.50/pip. 30 pips = $75
      const pnlMini = calculatePipsPnl(30, 0.25, "EURUSD");
      expect(pnlMini).toBe(75);
    });
  });

  describe("Position Sizing & Risk Calculator", () => {
    it("calculates recommended lot size for percent risk", () => {
      // $10,000 balance, 1% risk = $100 risk.
      // 20 pips stop loss on EURUSD ($10/pip per standard lot).
      // $100 / (20 pips * $10) = 0.50 lots.
      const result = calculatePositionSize(10000, 1, "percent", 20, "EURUSD");
      expect(result.cashRisk).toBe(100);
      expect(result.recommendedLots).toBe(0.5);
      expect(result.units).toBe(50000);
      expect(result.pipValueAtLots).toBe(5);
    });

    it("calculates recommended lot size for fixed cash risk", () => {
      // $250 cash risk, 50 pips stop loss on EURUSD.
      // $250 / (50 * $10) = 0.50 lots.
      const result = calculatePositionSize(50000, 250, "cash", 50, "EURUSD");
      expect(result.cashRisk).toBe(250);
      expect(result.recommendedLots).toBe(0.5);
    });

    it("handles zero or invalid risk gracefully", () => {
      const result = calculatePositionSize(10000, 0, "percent", 20, "EURUSD");
      expect(result.recommendedLots).toBe(0);
      expect(result.cashRisk).toBe(0);
    });
  });

  describe("Risk to Reward Calculator", () => {
    it("computes risk-to-reward ratio, cash amounts, and breakeven win rate", () => {
      // Buy EURUSD: Entry 1.1000, SL 1.0980 (20 pips), TP 1.1060 (60 pips).
      // 1.0 lot ($10/pip)
      const res = calculateRiskReward(1.1, 1.098, 1.106, "buy", 1.0, "EURUSD");
      expect(res.riskPips).toBe(20);
      expect(res.rewardPips).toBe(60);
      expect(res.rrRatio).toBe(3.0);
      expect(res.cashRisk).toBe(200);
      expect(res.cashReward).toBe(600);
      // Breakeven win rate for 1:3 is 1 / (1 + 3) = 25%
      expect(res.breakevenWinRate).toBe(25);
    });
  });

  describe("Monthly Goal Pacing & Calendar Info", () => {
    it("correctly determines trading days in a month", () => {
      // September 2026 has 30 days. Sep 1 is Tuesday, Sep 30 is Wednesday.
      // Total weekdays = 22 weekdays.
      const info = getMonthTradingDaysInfo("2026-09", new Date("2026-09-10T12:00:00Z"));
      expect(info.totalTradingDays).toBe(22);
      expect(info.isCurrentMonth).toBe(true);
      expect(info.isPastMonth).toBe(false);
      expect(info.elapsedTradingDays).toBe(7); // Sep 1,2,3,4,7,8,9 = 7 days before Sep 10
      expect(info.remainingTradingDays).toBe(15);
    });

    it("calculates daily and weekly pace required to hit remaining goal", () => {
      // Target: $3,000. Realized so far: $1,000. Remaining: $2,000.
      // Remaining trading days: 10 days. 5 trading days/week -> 2 weeks.
      // 1 trade per day.
      const pacing = calculateGoalPacing(3000, 1000, 10, 5, 1);

      expect(pacing.remainingDollar).toBe(2000);
      expect(pacing.percentAchieved).toBe(33.3);
      expect(pacing.isAchieved).toBe(false);
      // $2000 / 10 days = $200 / day
      expect(pacing.requiredPerDay).toBe(200);
      // $2000 / 2 weeks = $1000 / week
      expect(pacing.requiredPerWeek).toBe(1000);
      // $2000 / 10 trades = $200 / trade
      expect(pacing.requiredPerTrade).toBe(200);
    });

    it("handles goal already achieved", () => {
      // Target: $2,500. Realized: $3,100.
      const pacing = calculateGoalPacing(2500, 3100, 8, 5, 2);

      expect(pacing.isAchieved).toBe(true);
      expect(pacing.remainingDollar).toBe(0);
      expect(pacing.surplusDollar).toBe(600);
      expect(pacing.percentAchieved).toBe(124);
      expect(pacing.requiredPerDay).toBe(0);
      expect(pacing.requiredPerWeek).toBe(0);
    });

    it("calculates trades per day pace correctly when taking 2 trades per day", () => {
      // Remaining: $1,000, 10 trading days, 2 trades/day = 20 trades
      // Required per trade = $1000 / 20 = $50
      const pacing = calculateGoalPacing(1000, 0, 10, 5, 2);
      expect(pacing.requiredPerDay).toBe(100);
      expect(pacing.requiredPerTrade).toBe(50);
    });
  });

  describe("Compounding Calculator", () => {
    it("projects compounding balance over periods", () => {
      // Starting $1,000 with 10% gain per period for 3 periods
      // P1: Start 1000 + 100 = 1100
      // P2: Start 1100 + 110 = 1210
      // P3: Start 1210 + 121 = 1331
      const rows = calculateCompounding(1000, 10, 3);
      expect(rows).toHaveLength(3);
      expect(rows[0].endingBalance).toBe(1100);
      expect(rows[1].endingBalance).toBe(1210);
      expect(rows[2].endingBalance).toBe(1331);
      expect(rows[2].totalGainPercent).toBe(33.1);
    });
  });
});
