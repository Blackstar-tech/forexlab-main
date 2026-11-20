export type TradeResult = "win" | "loss" | "breakeven";
export type TradeDirection = "buy" | "sell";
export type TargetMode = "currency" | "percent";
export type TabKey = "dashboard" | "log" | "history" | "monthly" | "analytics" | "casestudy" | "tradingview" | "calculator" | "mymodel";

export type ShotTab = "before" | "after" | "analysis";

export interface TradeScreenshots {
  before: string[];
  after: string[];
  analysis: string[];
}

export interface Trade {
  id: string;
  userId: string;
  date: string;
  time: string;
  pair: string;
  session: string;
  direction: TradeDirection;
  result: TradeResult;
  setup: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  riskPercent: number | null;
  plannedRr: number | null;
  rrAchieved: string;
  pips: number | null;
  pnl: number;
  emotion: string;
  sleepQuality: string;
  confidence: string;
  rating: number;
  preTradeNotes: string;
  notes: string;
  screenshots: TradeScreenshots;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface BalanceCheckpoint {
  id: string;
  userId: string;
  balance: number;
  effectiveFrom: string; // ISO string or "YYYY-MM-DD"
  createdAt: string;
}

export interface CaseStudy {
  id: string;
  userId: string;
  date: string;
  pair: string;
  session: string;
  direction: TradeDirection;
  setup: string;
  notes: string;
  screenshots: string[];
  createdAt: string;
}

export type ModelCategory = "Chart analysis" | "Backtest" | "Forward test" | "Trade idea" | "Case study";
export type ModelType = "backtest" | "forward";
export type ModelOutcome = "win" | "loss" | "breakeven";

export interface ModelResult {
  id: string;
  userId: string;
  category: ModelCategory;
  instrument: string;
  timeframes: string[];
  title: string;
  subtitle: string;
  modelDate: string;
  type: ModelType;
  notes: string;
  imagePaths: string[];
  imageUrls: string[];
  outcome: ModelOutcome | null;
  resultR: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
}

export interface MonthlyTarget {
  mode: TargetMode;
  value: number;
  baseBalance: number | null;
}

export interface Streak {
  type: "win" | "loss" | "none";
  count: number;
}

export interface TradeSummary {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  netPnl: number;
  winRate: number;
  averageRating: number;
}

export interface ForexLabScoreBreakdown {
  overall: number;
  winRate: number;
  profitFactor: number;
  avgWinLoss: number;
  consistency: number;
  maxDrawdownScore: number;
  recoveryFactor: number;
}

export interface TraderLevel {
  score: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  label: string;
}
