export interface InstrumentSpec {
  symbol: string;
  name: string;
  category: "forex_major" | "forex_jpy" | "commodity" | "index" | "crypto";
  pipSize: number;
  pipDecimalPlaces: number;
  standardLotUnits: number;
  defaultPipValuePerLot: number; // in USD for 1.0 lot
}

export const INSTRUMENTS: InstrumentSpec[] = [
  {
    symbol: "EURUSD",
    name: "EUR / USD",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 10.0
  },
  {
    symbol: "GBPUSD",
    name: "GBP / USD",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 10.0
  },
  {
    symbol: "USDJPY",
    name: "USD / JPY",
    category: "forex_jpy",
    pipSize: 0.01,
    pipDecimalPlaces: 2,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 6.8
  },
  {
    symbol: "GBPJPY",
    name: "GBP / JPY",
    category: "forex_jpy",
    pipSize: 0.01,
    pipDecimalPlaces: 2,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 6.8
  },
  {
    symbol: "EURJPY",
    name: "EUR / JPY",
    category: "forex_jpy",
    pipSize: 0.01,
    pipDecimalPlaces: 2,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 6.8
  },
  {
    symbol: "AUDUSD",
    name: "AUD / USD",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 10.0
  },
  {
    symbol: "USDCAD",
    name: "USD / CAD",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 7.4
  },
  {
    symbol: "USDCHF",
    name: "USD / CHF",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 11.2
  },
  {
    symbol: "NZDUSD",
    name: "NZD / USD",
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 10.0
  },
  {
    symbol: "XAUUSD",
    name: "XAU / USD (Gold)",
    category: "commodity",
    pipSize: 0.1,
    pipDecimalPlaces: 2,
    standardLotUnits: 100,
    defaultPipValuePerLot: 10.0
  },
  {
    symbol: "US30",
    name: "US30 (Dow Jones)",
    category: "index",
    pipSize: 1.0,
    pipDecimalPlaces: 1,
    standardLotUnits: 1,
    defaultPipValuePerLot: 1.0
  },
  {
    symbol: "NAS100",
    name: "NAS100 (Nasdaq)",
    category: "index",
    pipSize: 1.0,
    pipDecimalPlaces: 1,
    standardLotUnits: 1,
    defaultPipValuePerLot: 1.0
  },
  {
    symbol: "SPX500",
    name: "SPX500 (S&P 500)",
    category: "index",
    pipSize: 0.1,
    pipDecimalPlaces: 1,
    standardLotUnits: 1,
    defaultPipValuePerLot: 1.0
  },
  {
    symbol: "BTCUSD",
    name: "BTC / USD (Bitcoin)",
    category: "crypto",
    pipSize: 1.0,
    pipDecimalPlaces: 2,
    standardLotUnits: 1,
    defaultPipValuePerLot: 1.0
  },
  {
    symbol: "ETHUSD",
    name: "ETH / USD (Ethereum)",
    category: "crypto",
    pipSize: 0.1,
    pipDecimalPlaces: 2,
    standardLotUnits: 1,
    defaultPipValuePerLot: 1.0
  }
];

export function getInstrumentSpec(symbol: string): InstrumentSpec {
  const found = INSTRUMENTS.find((inst) => inst.symbol.toUpperCase() === symbol.toUpperCase());
  if (found) return found;

  const upper = symbol.toUpperCase();
  if (upper.includes("JPY")) {
    return {
      symbol: upper,
      name: upper,
      category: "forex_jpy",
      pipSize: 0.01,
      pipDecimalPlaces: 2,
      standardLotUnits: 100000,
      defaultPipValuePerLot: 6.8
    };
  }
  if (upper.includes("XAU") || upper.includes("GOLD")) {
    return {
      symbol: upper,
      name: upper,
      category: "commodity",
      pipSize: 0.1,
      pipDecimalPlaces: 2,
      standardLotUnits: 100,
      defaultPipValuePerLot: 10.0
    };
  }
  if (upper.includes("BTC") || upper.includes("ETH")) {
    return {
      symbol: upper,
      name: upper,
      category: "crypto",
      pipSize: 1.0,
      pipDecimalPlaces: 2,
      standardLotUnits: 1,
      defaultPipValuePerLot: 1.0
    };
  }
  return {
    symbol: upper,
    name: upper,
    category: "forex_major",
    pipSize: 0.0001,
    pipDecimalPlaces: 4,
    standardLotUnits: 100000,
    defaultPipValuePerLot: 10.0
  };
}

export function calculatePips(
  entryPrice: number,
  exitPrice: number,
  pipSize: number,
  direction: "buy" | "sell" = "buy"
): number {
  if (pipSize <= 0) return 0;
  const rawDiff = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Number((rawDiff / pipSize).toFixed(1));
}

export function calculatePipValue(
  symbol: string,
  lotSize: number,
  customPipValuePerLot?: number
): number {
  if (lotSize <= 0) return 0;
  const spec = getInstrumentSpec(symbol);
  const baseValuePerLot =
    typeof customPipValuePerLot === "number" && customPipValuePerLot > 0
      ? customPipValuePerLot
      : spec.defaultPipValuePerLot;
  return Number((lotSize * baseValuePerLot).toFixed(2));
}

export function calculatePipsPnl(
  pips: number,
  lotSize: number,
  symbol: string,
  customPipValuePerLot?: number
): number {
  const pipVal = calculatePipValue(symbol, lotSize, customPipValuePerLot);
  return Number((pips * pipVal).toFixed(2));
}

export function calculatePositionSize(
  accountBalance: number,
  riskValue: number,
  riskMode: "percent" | "cash",
  stopLossPips: number,
  symbol: string,
  customPipValuePerLot?: number
): {
  cashRisk: number;
  recommendedLots: number;
  units: number;
  pipValueAtLots: number;
} {
  const cashRisk =
    riskMode === "percent"
      ? (riskValue / 100) * accountBalance
      : riskValue;

  if (cashRisk <= 0 || stopLossPips <= 0) {
    return { cashRisk: Math.max(0, cashRisk), recommendedLots: 0, units: 0, pipValueAtLots: 0 };
  }

  const spec = getInstrumentSpec(symbol);
  const pipValuePerLot =
    typeof customPipValuePerLot === "number" && customPipValuePerLot > 0
      ? customPipValuePerLot
      : spec.defaultPipValuePerLot;

  const exactLots = cashRisk / (stopLossPips * pipValuePerLot);
  const recommendedLots = Math.max(0.01, Number(exactLots.toFixed(2)));
  const units = Math.round(recommendedLots * spec.standardLotUnits);
  const pipValueAtLots = Number((recommendedLots * pipValuePerLot).toFixed(2));

  return {
    cashRisk: Number(cashRisk.toFixed(2)),
    recommendedLots,
    units,
    pipValueAtLots
  };
}

export function calculateRiskReward(
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  direction: "buy" | "sell",
  lotSize: number,
  symbol: string
): {
  riskPips: number;
  rewardPips: number;
  rrRatio: number;
  cashRisk: number;
  cashReward: number;
  breakevenWinRate: number;
} {
  const spec = getInstrumentSpec(symbol);
  const riskDiff = direction === "buy" ? entryPrice - stopLossPrice : stopLossPrice - entryPrice;
  const rewardDiff = direction === "buy" ? takeProfitPrice - entryPrice : entryPrice - takeProfitPrice;

  const riskPips = Math.max(0, Number((riskDiff / spec.pipSize).toFixed(1)));
  const rewardPips = Math.max(0, Number((rewardDiff / spec.pipSize).toFixed(1)));

  const rrRatio = riskPips > 0 ? Number((rewardPips / riskPips).toFixed(2)) : 0;
  const breakevenWinRate = rrRatio > 0 ? Number(((1 / (1 + rrRatio)) * 100).toFixed(1)) : 0;

  const pipVal = calculatePipValue(symbol, lotSize);
  const cashRisk = Number((riskPips * pipVal).toFixed(2));
  const cashReward = Number((rewardPips * pipVal).toFixed(2));

  return {
    riskPips,
    rewardPips,
    rrRatio,
    cashRisk,
    cashReward,
    breakevenWinRate
  };
}

export function getMonthTradingDaysInfo(
  yearMonth: string,
  referenceDate: Date = new Date()
): {
  year: number;
  month: number;
  monthName: string;
  totalTradingDays: number;
  elapsedTradingDays: number;
  remainingTradingDays: number;
  remainingWeeks: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
} {
  const [yStr, mStr] = yearMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const isCurrentMonth = year === refYear && month === refMonth;
  const isPastMonth = year < refYear || (year === refYear && month < refMonth);
  const isFutureMonth = year > refYear || (year === refYear && month > refMonth);

  let totalTradingDays = 0;
  let elapsedTradingDays = 0;
  let remainingTradingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (isWeekday) {
      totalTradingDays++;
      if (isPastMonth) {
        elapsedTradingDays++;
      } else if (isFutureMonth) {
        remainingTradingDays++;
      } else {
        if (day < refDay) {
          elapsedTradingDays++;
        } else {
          remainingTradingDays++;
        }
      }
    }
  }

  const remainingWeeks = remainingTradingDays > 0 ? Math.max(1, Number((remainingTradingDays / 5).toFixed(1))) : 0;

  return {
    year,
    month,
    monthName,
    totalTradingDays,
    elapsedTradingDays,
    remainingTradingDays,
    remainingWeeks,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth
  };
}

export function calculateGoalPacing(
  targetDollar: number,
  realizedPnl: number,
  remainingTradingDays: number,
  tradingDaysPerWeek: number = 5,
  tradesPerDay: number = 1
): {
  remainingDollar: number;
  percentAchieved: number;
  isAchieved: boolean;
  surplusDollar: number;
  requiredPerDay: number;
  requiredPerWeek: number;
  requiredPerTrade: number;
} {
  const percentAchieved = targetDollar > 0 ? Number(((realizedPnl / targetDollar) * 100).toFixed(1)) : 0;
  const isAchieved = realizedPnl >= targetDollar && targetDollar > 0;
  const remainingDollar = isAchieved ? 0 : Math.max(0, targetDollar - realizedPnl);
  const surplusDollar = isAchieved ? Number((realizedPnl - targetDollar).toFixed(2)) : 0;

  const validDays = Math.max(1, remainingTradingDays);
  const requiredPerDay = remainingDollar > 0 ? Number((remainingDollar / validDays).toFixed(2)) : 0;

  const daysPerWeek = Math.max(1, Math.min(7, tradingDaysPerWeek));
  const effectiveWeeks = Math.max(0.5, validDays / daysPerWeek);
  const requiredPerWeek = remainingDollar > 0 ? Number((remainingDollar / effectiveWeeks).toFixed(2)) : 0;

  const validTradesPerDay = Math.max(0.5, tradesPerDay);
  const totalRemainingTrades = validDays * validTradesPerDay;
  const requiredPerTrade = remainingDollar > 0 ? Number((remainingDollar / totalRemainingTrades).toFixed(2)) : 0;

  return {
    remainingDollar: Number(remainingDollar.toFixed(2)),
    percentAchieved,
    isAchieved,
    surplusDollar,
    requiredPerDay,
    requiredPerWeek,
    requiredPerTrade
  };
}

export interface CompoundingRow {
  period: number;
  startingBalance: number;
  profit: number;
  deposit: number;
  endingBalance: number;
  totalGainPercent: number;
}

export function calculateCompounding(
  startingBalance: number,
  gainPercentPerPeriod: number,
  periods: number,
  contributionPerPeriod: number = 0
): CompoundingRow[] {
  const rows: CompoundingRow[] = [];
  let currentBalance = Math.max(0, startingBalance);
  const baseStart = currentBalance;

  const safePeriods = Math.min(100, Math.max(1, periods));

  for (let i = 1; i <= safePeriods; i++) {
    const periodStart = currentBalance;
    const profit = periodStart * (gainPercentPerPeriod / 100);
    const deposit = contributionPerPeriod;
    const endingBalance = periodStart + profit + deposit;
    const totalGainPercent = baseStart > 0 ? ((endingBalance - baseStart) / baseStart) * 100 : 0;

    rows.push({
      period: i,
      startingBalance: Number(periodStart.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      deposit: Number(deposit.toFixed(2)),
      endingBalance: Number(endingBalance.toFixed(2)),
      totalGainPercent: Number(totalGainPercent.toFixed(1))
    });

    currentBalance = endingBalance;
  }

  return rows;
}
