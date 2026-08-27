type User = {
  id: string;
  name: string;
  email: string;
};

type TradeScreenshots = {
  before: string | null;
  after: string | null;
  analysis: string | null;
};

type ShotTab = "before" | "after" | "analysis";

type Trade = {
  id: string;
  date: string;
  time: string;
  pair: string;
  session: string;
  direction: "buy" | "sell";
  result: "win" | "loss" | "breakeven";
  setup: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize?: number | null;
  riskPercent: number | null;
  plannedRr: number | null;
  rrAchieved?: string;
  pips?: number | null;
  pnl: number;
  emotion?: string;
  sleepQuality?: string;
  confidence?: string;
  rating: number;
  preTradeNotes?: string;
  notes: string;
  screenshots?: TradeScreenshots;
  createdAt: string;
};

type ApiError = {
  error?: string;
};

type AuthMode = "login" | "signup" | "forgot" | "reset";

type JournalTab = "log" | "history" | "monthly" | "analytics" | "casestudy";

type MonthlyTargetMode = "currency" | "percent";

type MonthlyTarget = {
  mode: MonthlyTargetMode;
  value: number;
  baseBalance: number | null;
};

type DailyPnlSummary = {
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
};

type CaseStudy = {
  id: string;
  date: string;
  pair: string;
  session: string;
  direction: "buy" | "sell";
  setup: string;
  notes: string;
  screenshot: string | null;
  createdAt: string;
};

const monthlyTargetStorageKey = "forexlab.monthlyTargets.v1";
const themeStorageKey = "forexlab.theme";
function applyStoredTheme(): void {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "light") document.documentElement.setAttribute("data-theme", "light");
}
applyStoredTheme();

const state: {
  user: User | null;
  trades: Trade[];
  activeTab: JournalTab;
  direction: "buy" | "sell";
  result: "win" | "loss" | "breakeven";
  rating: number;
  selectedMonth: string;
  emotion: string;
  sleepQuality: string;
  confidence: string;
  activeShot: ShotTab;
  screenshots: TradeScreenshots;
  resetToken: string;
  monthlyTarget: MonthlyTarget;
  historySort: { key: string; direction: "asc" | "desc" };
  caseStudies: CaseStudy[];
  caseStudyDirection: "buy" | "sell";
} = {
  user: null,
  trades: [],
  activeTab: "log",
  direction: "buy",
  result: "win",
  rating: 3,
  selectedMonth: monthKey(new Date()),
  emotion: "",
  sleepQuality: "",
  confidence: "",
  activeShot: "before",
  screenshots: { before: null, after: null, analysis: null },
  resetToken: "",
  monthlyTarget: { mode: "currency", value: 0, baseBalance: null },
  historySort: { key: "date", direction: "desc" },
  caseStudies: [],
  caseStudyDirection: "buy"
};

type CustomSelect = {
  root: HTMLDivElement;
  select: HTMLSelectElement;
  trigger: HTMLButtonElement;
  menu: HTMLDivElement;
};

function qs<T extends HTMLElement>(selector: string, root: Document | HTMLElement = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function qsa<T extends HTMLElement>(selector: string, root: Document | HTMLElement = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const contentType = response.headers.get("Content-Type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");
  let data = {} as T & ApiError;

  if (text && (isJson || text.trim().startsWith("{") || text.trim().startsWith("["))) {
    try {
      data = JSON.parse(text) as T & ApiError;
    } catch {
      throw new Error("The server returned invalid JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error || httpErrorMessage(response.status));
  }

  if (!isJson) {
    throw new Error("The API returned a non-JSON response. Check the Vercel API route.");
  }

  return data;
}

function httpErrorMessage(status: number): string {
  if (status === 405) return "The API route is not accepting this request. Check the Vercel routing.";
  if (status >= 500) return "The server crashed while handling this request.";
  return `Request failed (${status}).`;
}

function showToast(message: string): void {
  const toast = qs<HTMLDivElement>("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function showAuth(): void {
  qs("#authView").removeAttribute("hidden");
  qs("#appView").setAttribute("hidden", "true");
}

function showApp(): void {
  qs("#authView").setAttribute("hidden", "true");
  qs("#appView").removeAttribute("hidden");
  qs<HTMLSpanElement>("#userName").textContent = state.user?.name || "Trader";
}

function clearAuthMessages(): void {
  qsa<HTMLDivElement>(".auth-message").forEach((message) => {
    message.textContent = "";
    message.classList.remove("is-error");
    message.setAttribute("hidden", "true");
  });
}

function setAuthMessage(selector: string, text: string, isError = false): void {
  const message = qs<HTMLDivElement>(selector);
  message.textContent = text;
  message.classList.toggle("is-error", isError);
  message.removeAttribute("hidden");
}

function setAuthMode(mode: AuthMode): void {
  const loginForm = qs<HTMLFormElement>("#loginForm");
  const signupForm = qs<HTMLFormElement>("#signupForm");
  const forgotPasswordForm = qs<HTMLFormElement>("#forgotPasswordForm");
  const resetPasswordForm = qs<HTMLFormElement>("#resetPasswordForm");
  const authToggle = qs<HTMLDivElement>(".auth-toggle");
  const title = qs<HTMLHeadingElement>("#authTitle");
  const subtitle = qs<HTMLParagraphElement>("#authSubtitle");

  clearAuthMessages();
  loginForm.setAttribute("hidden", "true");
  signupForm.setAttribute("hidden", "true");
  forgotPasswordForm.setAttribute("hidden", "true");
  resetPasswordForm.setAttribute("hidden", "true");
  authToggle.toggleAttribute("hidden", mode === "forgot" || mode === "reset");

  qsa<HTMLButtonElement>("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });

  if (mode === "login") {
    loginForm.removeAttribute("hidden");
    title.textContent = "Welcome back";
    subtitle.textContent = "Sign in to review your trading journal.";
  } else if (mode === "signup") {
    signupForm.removeAttribute("hidden");
    title.textContent = "Create your journal";
    subtitle.textContent = "Start tracking trades with a private account.";
  } else if (mode === "forgot") {
    forgotPasswordForm.removeAttribute("hidden");
    title.textContent = "Reset your password";
    subtitle.textContent = "Enter your email and we'll send a reset link if the account exists.";
  } else {
    resetPasswordForm.removeAttribute("hidden");
    title.textContent = "Set a new password";
    subtitle.textContent = "Choose a fresh password for your Forex Lab account.";
  }
}

function resetTokenFromUrl(): string {
  if (window.location.pathname !== "/reset-password") return "";
  return new URLSearchParams(window.location.search).get("token") || "";
}

function returnToLogin(): void {
  window.history.replaceState({}, "", "/");
  state.resetToken = "";
  setAuthMode("login");
}

function setTab(tab: JournalTab): void {
  state.activeTab = tab;

  qsa<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tab);
  });

  qsa<HTMLElement>(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `tab-${tab}`);
  });

  if (tab === "history") renderHistory();
  if (tab === "monthly") renderMonthlyPnl();
  if (tab === "analytics") renderAnalytics();
  if (tab === "casestudy") renderCaseStudies();
}

function setSegment(group: string, value: string): void {
  qsa<HTMLButtonElement>(`[data-${group}]`).forEach((button) => {
    button.classList.toggle("is-active", button.dataset[group] === value);
  });
}

function setToday(): void {
  const now = new Date();
  qs<HTMLInputElement>("#tradeDate").value = now.toISOString().slice(0, 10);
  qs<HTMLInputElement>("#tradeTime").value = now.toTimeString().slice(0, 5);
}

function numberFromInput(selector: string): number | null {
  const value = qs<HTMLInputElement>(selector).value;
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateRr(): number | null {
  const entry = numberFromInput("#entryPrice");
  const stop = numberFromInput("#stopLoss");
  const take = numberFromInput("#takeProfit");

  if (entry === null || stop === null || take === null) return null;

  const risk = Math.abs(entry - stop);
  const reward = state.direction === "buy" ? take - entry : entry - take;
  if (risk <= 0 || reward <= 0) return null;

  return Number((reward / risk).toFixed(2));
}

function updateRr(): void {
  const rr = calculateRr();
  qs<HTMLInputElement>("#plannedRr").value = rr === null ? "" : `1:${rr}`;
}

function shotLabel(tab: ShotTab): string {
  if (tab === "before") return "Before Entry";
  if (tab === "after") return "After Exit";
  return "Analysis";
}

function renderShotPreview(): void {
  const tab = state.activeShot;
  qs<HTMLSpanElement>("#shotTabLabel").textContent = shotLabel(tab);

  const url = state.screenshots[tab];
  const empty = qs<HTMLDivElement>("#shotEmptyState");
  const preview = qs<HTMLDivElement>("#shotPreviewState");

  if (url) {
    empty.setAttribute("hidden", "true");
    preview.removeAttribute("hidden");
    qs<HTMLImageElement>("#shotPreviewImage").src = url;
  } else {
    preview.setAttribute("hidden", "true");
    empty.removeAttribute("hidden");
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

async function uploadShot(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image file.");
    return;
  }

  const dataUrl = await fileToDataUrl(file);
  const response = await api<{ url: string }>("/api/uploads", {
    method: "POST",
    body: JSON.stringify({ dataUrl })
  });

  state.screenshots[state.activeShot] = response.url;
  renderShotPreview();
  showToast("Screenshot attached.");
}

function removeShot(): void {
  state.screenshots[state.activeShot] = null;
  renderShotPreview();
}

function resetTradeForm(): void {
  qs<HTMLFormElement>("#tradeForm").reset();
  syncAllCustomSelects();
  state.direction = "buy";
  state.result = "win";
  state.rating = 3;
  state.emotion = "";
  state.sleepQuality = "";
  state.confidence = "";
  state.activeShot = "before";
  state.screenshots = { before: null, after: null, analysis: null };

  setSegment("direction", "buy");
  setSegment("result", "win");
  setSegment("emotion", "");
  setSegment("sleep", "");
  setSegment("confidence", "");
  setSegment("shot", "before");
  setRating(3);
  setToday();
  updateRr();
  renderShotPreview();
}

function setRating(value: number): void {
  state.rating = value;
  qsa<HTMLButtonElement>("[data-rating]").forEach((button) => {
    const rating = Number(button.dataset.rating || 0);
    button.classList.toggle("is-active", rating <= value);
  });
}

function tradePayload(): Record<string, unknown> {
  const rr = calculateRr();

  return {
    date: qs<HTMLInputElement>("#tradeDate").value,
    time: qs<HTMLInputElement>("#tradeTime").value,
    pair: qs<HTMLSelectElement>("#pair").value,
    session: qs<HTMLSelectElement>("#session").value,
    direction: state.direction,
    result: state.result,
    setup: qs<HTMLInputElement>("#setup").value,
    entryPrice: numberFromInput("#entryPrice"),
    stopLoss: numberFromInput("#stopLoss"),
    takeProfit: numberFromInput("#takeProfit"),
    lotSize: numberFromInput("#lotSize"),
    riskPercent: numberFromInput("#riskPercent"),
    plannedRr: rr,
    rrAchieved: qs<HTMLInputElement>("#rrAchieved").value,
    pips: numberFromInput("#pips"),
    pnl: numberFromInput("#pnl") || 0,
    emotion: state.emotion,
    sleepQuality: state.sleepQuality,
    confidence: state.confidence,
    rating: state.rating,
    preTradeNotes: qs<HTMLTextAreaElement>("#preTradeNotes").value,
    notes: qs<HTMLTextAreaElement>("#notes").value,
    screenshots: state.screenshots
  };
}

async function loadTrades(): Promise<void> {
  const response = await api<{ trades: Trade[] }>("/api/trades");
  state.trades = response.trades;
  loadMonthlyTargetForSelectedMonth();
  renderDashboard();
  renderHistory();
  renderMonthlyPnl();
  renderAnalytics();
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

function precisePercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

function defaultMonthlyTarget(): MonthlyTarget {
  return { mode: "currency", value: 0, baseBalance: null };
}

function normalizeMonthlyTarget(value: unknown): MonthlyTarget {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const mode: MonthlyTargetMode = input.mode === "percent" ? "percent" : "currency";
  const targetValue = typeof input.value === "number" && Number.isFinite(input.value) ? input.value : 0;
  const baseBalance =
    typeof input.baseBalance === "number" && Number.isFinite(input.baseBalance) && input.baseBalance > 0
      ? input.baseBalance
      : null;

  return {
    mode,
    value: Math.max(0, targetValue),
    baseBalance
  };
}

function monthlyTargetStoreKey(): string {
  return `${state.user?.id || "local"}:${state.selectedMonth}`;
}

function readMonthlyTargetStore(): Record<string, MonthlyTarget> {
  try {
    const parsed = JSON.parse(localStorage.getItem(monthlyTargetStorageKey) || "{}") as unknown;
    const input = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;

    return Object.entries(input).reduce<Record<string, MonthlyTarget>>((store, [key, value]) => {
      store[key] = normalizeMonthlyTarget(value);
      return store;
    }, {});
  } catch {
    return {};
  }
}

function writeMonthlyTargetStore(store: Record<string, MonthlyTarget>): void {
  localStorage.setItem(monthlyTargetStorageKey, JSON.stringify(store));
}

function loadMonthlyTargetForSelectedMonth(): void {
  const store = readMonthlyTargetStore();
  state.monthlyTarget = store[monthlyTargetStoreKey()] || defaultMonthlyTarget();
  syncMonthlyTargetControls();
}

function saveMonthlyTargetForSelectedMonth(): void {
  const store = readMonthlyTargetStore();
  const key = monthlyTargetStoreKey();

  if (state.monthlyTarget.value > 0 || state.monthlyTarget.baseBalance) {
    store[key] = state.monthlyTarget;
  } else {
    delete store[key];
  }

  writeMonthlyTargetStore(store);
}

function monthlyTargetFromControls(): MonthlyTarget {
  const targetInput = qs<HTMLInputElement>("#monthlyTargetInput");
  const baseInput = qs<HTMLInputElement>("#monthlyTargetBaseInput");
  const targetValue = Number(targetInput.value);
  const baseBalance = Number(baseInput.value);

  return {
    mode: state.monthlyTarget.mode,
    value: Number.isFinite(targetValue) ? Math.max(0, targetValue) : 0,
    baseBalance: Number.isFinite(baseBalance) && baseBalance > 0 ? baseBalance : null
  };
}

function syncMonthlyTargetControls(): void {
  const target = state.monthlyTarget;
  const targetInput = qs<HTMLInputElement>("#monthlyTargetInput");
  const baseInput = qs<HTMLInputElement>("#monthlyTargetBaseInput");
  const baseField = qs<HTMLElement>("#monthlyTargetBaseField");
  const targetEditor = qs<HTMLElement>(".target-editor");

  targetInput.value = target.value > 0 ? String(target.value) : "";
  targetInput.placeholder = target.mode === "percent" ? "8" : "2500";
  baseInput.value = target.baseBalance ? String(target.baseBalance) : "";
  baseField.toggleAttribute("hidden", target.mode !== "percent");
  targetEditor.classList.toggle("has-base", target.mode === "percent");

  qsa<HTMLButtonElement>("[data-target-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.targetMode === target.mode);
  });
}

function monthlyTargetAmount(target: MonthlyTarget): number | null {
  if (target.value <= 0) return null;
  if (target.mode === "currency") return target.value;
  if (!target.baseBalance) return null;
  return target.baseBalance * (target.value / 100);
}

function remainingWeekdaysInSelectedMonth(): number {
  const today = new Date();
  const todayMonth = monthKey(today);

  if (state.selectedMonth < todayMonth) return 0;

  const { year, month } = parseMonthKey(state.selectedMonth);
  const start =
    state.selectedMonth === todayMonth
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
      : new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  let days = 0;

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay();
    if (weekday >= 1 && weekday <= 5) days += 1;
  }

  return days;
}

function shiftMonth(delta: number): void {
  const { year, month } = parseMonthKey(state.selectedMonth);
  state.selectedMonth = monthKey(new Date(year, month + delta, 1));
  loadMonthlyTargetForSelectedMonth();
  renderMonthlyPnl();
}

function dayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

function stats() {
  const total = state.trades.length;
  const wins = state.trades.filter((trade) => trade.result === "win").length;
  const losses = state.trades.filter((trade) => trade.result === "loss").length;
  const breakeven = state.trades.filter((trade) => trade.result === "breakeven").length;
  const netPnl = state.trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winRate = total ? (wins / total) * 100 : 0;
  const rated = state.trades.filter((trade) => trade.rating > 0);
  const averageRating = rated.length
    ? rated.reduce((sum, trade) => sum + trade.rating, 0) / rated.length
    : 0;

  return { total, wins, losses, breakeven, netPnl, winRate, averageRating };
}

function renderDashboard(): void {
  const summary = stats();
  qs("#metricTrades").textContent = String(summary.total);
  qs("#metricWinRate").textContent = percent(summary.winRate);
  qs("#metricPnl").textContent = currency(summary.netPnl);
  qs("#metricRating").textContent = summary.averageRating ? summary.averageRating.toFixed(1) : "-";
  renderTraderLevel();
}

function traderLevelInfo(): { score: number; tier: string; label: string } {
  const summary = stats();
  const ratingScore = (summary.averageRating / 5) * 100;
  const score = Math.max(0, Math.min(100, summary.winRate * 0.6 + ratingScore * 0.4));
  let tier = "bronze";
  let label = "Bronze";
  if (score >= 80) { tier = "diamond"; label = "Diamond"; }
  else if (score >= 60) { tier = "platinum"; label = "Platinum"; }
  else if (score >= 40) { tier = "gold"; label = "Gold"; }
  else if (score >= 20) { tier = "silver"; label = "Silver"; }
  return { score, tier, label };
}

function renderTraderLevel(): void {
  const { score, tier, label } = traderLevelInfo();
  const circle = document.querySelector<SVGCircleElement>("#levelRingProgress");
if (!circle) throw new Error("Missing element: #levelRingProgress");
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = `${offset}`;
  circle.classList.remove("level-tier-bronze", "level-tier-silver", "level-tier-gold", "level-tier-platinum", "level-tier-diamond");
  circle.classList.add(`level-tier-${tier}`);

  qs<HTMLElement>("#levelScore").textContent = String(Math.round(score));
  qs<HTMLElement>("#levelLabel").textContent = label;
}

function historySortValue(trade: Trade, key: string): string | number {
  switch (key) {
    case "date": return `${trade.date} ${trade.time || ""}`;
    case "pair": return trade.pair;
    case "direction": return trade.direction;
    case "result": return trade.result;
    case "pnl": return trade.pnl;
    case "rr": return trade.plannedRr ?? -Infinity;
    case "rating": return trade.rating ?? 0;
    default: return "";
  }
}

function updateHistorySortIndicators(): void {
  qsa<HTMLTableCellElement>("th[data-sort]").forEach((th) => {
    const key = th.dataset.sort || "";
    const active = key === state.historySort.key;
    th.classList.toggle("is-sorted", active);
    th.classList.toggle("is-sorted-asc", active && state.historySort.direction === "asc");
    th.classList.toggle("is-sorted-desc", active && state.historySort.direction === "desc");
  });
}

function renderHistory(): void {
  const tbody = qs<HTMLTableSectionElement>("#historyBody");
  const resultFilter = qs<HTMLSelectElement>("#resultFilter").value;
  const search = qs<HTMLInputElement>("#searchTrades").value.trim().toLowerCase();
  const trades = state.trades
    .filter((trade) => {
      const matchesResult = resultFilter === "all" || trade.result === resultFilter;
      const text = `${trade.pair} ${trade.setup} ${trade.session} ${trade.notes}`.toLowerCase();
      return matchesResult && (!search || text.includes(search));
    })
    .sort((a, b) => {
      const { key, direction } = state.historySort;
      const valueA = historySortValue(a, key);
      const valueB = historySortValue(b, key);
      const compared =
        typeof valueA === "number" && typeof valueB === "number"
          ? valueA - valueB
          : String(valueA).localeCompare(String(valueB));
      return direction === "asc" ? compared : -compared;
    });

  updateHistorySortIndicators();
  tbody.textContent = "";

  if (!trades.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty-row";
    cell.textContent = "No trades match this view.";
    row.append(cell);
    tbody.append(row);
    return;
  }

  trades.forEach((trade) => {
    const row = document.createElement("tr");
    row.append(
      tableCell(trade.date),
      tradeSummaryCell(trade),
      badgeCell(trade.direction, trade.direction),
      badgeCell(trade.result, trade.result),
      tableCell(currency(trade.pnl), trade.pnl >= 0 ? "positive" : "negative"),
      tableCell(trade.plannedRr ? `1:${trade.plannedRr}` : "-"),
      tableCell(trade.rating ? `${trade.rating}/5` : "-"),
      actionCell(trade.id)
    );
    tbody.append(row);
  });
}

function tradeSummaryCell(trade: Trade): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = "trade-summary-cell";

  const summary = document.createElement("div");
  summary.className = "trade-summary";

  const pair = document.createElement("strong");
  pair.textContent = trade.pair;

  const tags = document.createElement("div");
  tags.className = "trade-tags";

  if (trade.session) tags.append(tagPill(trade.session, "session"));
  if (trade.setup) tags.append(tagPill(trade.setup, "setup"));

  summary.append(pair, tags);
  cell.append(summary);
  return cell;
}

function tagPill(text: string, tone: string): HTMLSpanElement {
  const tag = document.createElement("span");
  tag.className = `tag-pill ${tone}`;
  tag.textContent = text;
  return tag;
}

function tableCell(text: string, className = ""): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function badgeCell(text: string, tone: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${tone}`;
  badge.textContent = text;
  cell.append(badge);
  return cell;
}

function actionCell(id: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost danger";
  button.dataset.deleteTrade = id;
  button.textContent = "Delete";
  cell.append(button);
  return cell;
}

function syncCustomSelect(custom: CustomSelect): void {
  const selected = custom.select.selectedOptions[0];
  custom.trigger.textContent = selected?.textContent || "Select";

  qsa<HTMLButtonElement>(".select-option", custom.menu).forEach((option) => {
    const isSelected = option.dataset.value === custom.select.value;
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function closeCustomSelect(custom: CustomSelect): void {
  custom.root.classList.remove("is-open");
  custom.trigger.setAttribute("aria-expanded", "false");
}

function closeOtherSelects(active: CustomSelect): void {
  qsa<HTMLDivElement>(".custom-select.is-open").forEach((root) => {
    if (root !== active.root) {
      root.classList.remove("is-open");
      root.querySelector<HTMLButtonElement>(".select-trigger")?.setAttribute("aria-expanded", "false");
    }
  });
}

function createCustomSelect(select: HTMLSelectElement): CustomSelect {
  select.classList.add("native-select");
  select.tabIndex = -1;

  const root = document.createElement("div");
  root.className = "custom-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "select-menu";
  menu.setAttribute("role", "listbox");

  Array.from(select.options).forEach((nativeOption) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "select-option";
    option.dataset.value = nativeOption.value;
    option.setAttribute("role", "option");
    option.textContent = nativeOption.textContent || "";
    option.addEventListener("click", () => {
      select.value = nativeOption.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncCustomSelect(custom);
      closeCustomSelect(custom);
      trigger.focus();
    });
    menu.append(option);
  });

  select.after(root);
  root.append(select, trigger, menu);

  const custom = { root, select, trigger, menu };

  trigger.addEventListener("click", () => {
    const willOpen = !root.classList.contains("is-open");
    closeOtherSelects(custom);
    root.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeOtherSelects(custom);
      root.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      menu.querySelector<HTMLButtonElement>(".select-option")?.focus();
    }
  });

  menu.addEventListener("keydown", (event) => {
    const options = qsa<HTMLButtonElement>(".select-option", menu);
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") {
      closeCustomSelect(custom);
      trigger.focus();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    options[nextIndex]?.focus();
  });

  select.addEventListener("change", () => syncCustomSelect(custom));
  syncCustomSelect(custom);
  return custom;
}

function initCustomSelects(): void {
  qsa<HTMLSelectElement>("select").forEach((select) => createCustomSelect(select));

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    qsa<HTMLDivElement>(".custom-select.is-open").forEach((root) => {
      if (!root.contains(target)) {
        root.classList.remove("is-open");
        root.querySelector<HTMLButtonElement>(".select-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function syncAllCustomSelects(): void {
  qsa<HTMLSelectElement>("select").forEach((select) => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function renderAnalytics(): void {
  const summary = stats();
  qs("#analyticsRecord").textContent = `${summary.wins}W / ${summary.losses}L / ${summary.breakeven}B`;
  qs("#analyticsPnl").textContent = currency(summary.netPnl);
  qs("#analyticsWinRate").textContent = percent(summary.winRate);
  qs("#analyticsBestPair").textContent = bestPair();
  renderEquityCurve();
  renderPairBreakdown();
}

function renderMonthlyPnl(): void {
  const picker = qs<HTMLInputElement>("#monthPicker");
  picker.value = state.selectedMonth;

  const monthTrades = state.trades.filter((trade) => trade.date.startsWith(state.selectedMonth));
  const daily = new Map<string, DailyPnlSummary>();

  monthTrades.forEach((trade) => {
    const item = daily.get(trade.date) || { pnl: 0, trades: 0, wins: 0, losses: 0, breakeven: 0 };
    item.pnl += trade.pnl;
    item.trades += 1;
    if (trade.result === "win") item.wins += 1;
    if (trade.result === "loss") item.losses += 1;
    if (trade.result === "breakeven") item.breakeven += 1;
    daily.set(trade.date, item);
  });

  const monthlyTotal = monthTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const dailyValues = Array.from(daily.values());
  const bestDay = Array.from(daily.entries()).sort((a, b) => b[1].pnl - a[1].pnl)[0];

  setMoneyText("#monthlyTotal", monthlyTotal);
  qs("#monthlyTrades").textContent = String(monthTrades.length);
  qs("#monthlyDays").textContent = String(dailyValues.length);
  qs("#monthlyBestDay").textContent = bestDay ? `${dayLabel(bestDay[0])} ${currency(bestDay[1].pnl)}` : "-";

  renderMonthlyGoal(monthlyTotal);
  renderMonthlyCalendar(daily);
  renderMonthlyDayList(daily);
}

function renderMonthlyGoal(monthlyTotal: number): void {
  const target = state.monthlyTarget;
  const targetAmount = monthlyTargetAmount(target);
  const progressBar = qs<HTMLSpanElement>("#monthlyGoalProgressBar");
  const progressTrack = qs<HTMLDivElement>(".goal-progress-track");
  const status = qs<HTMLSpanElement>("#monthlyGoalStatus");
  const progressValue = qs<HTMLElement>("#monthlyGoalProgressValue");
  const achieved = targetAmount ? (monthlyTotal / targetAmount) * 100 : 0;
  const cappedProgress = Math.max(0, Math.min(100, achieved));

  progressBar.style.width = `${cappedProgress}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.round(cappedProgress)));
  progressValue.textContent = targetAmount ? precisePercent(achieved) : "0%";
  qs("#monthlyGoalAchieved").textContent = targetAmount ? precisePercent(achieved) : "0%";

  if (!targetAmount) {
    status.textContent = target.mode === "percent" && target.value > 0 ? "Add balance for % target" : "No target set";
    qs("#monthlyGoalRemaining").textContent = "-";
    qs("#monthlyGoalPace").textContent = "-";
    return;
  }

  const remaining = Math.max(0, targetAmount - monthlyTotal);
  const weekdaysRemaining = remainingWeekdaysInSelectedMonth();
  const dailyPace = remaining > 0 && weekdaysRemaining > 0 ? remaining / weekdaysRemaining : 0;
  const goalDescription =
    target.mode === "percent"
      ? `${precisePercent(target.value)} target = ${currency(targetAmount)}`
      : `${currency(targetAmount)} target`;

  status.textContent =
    remaining <= 0
      ? `${goalDescription} reached`
      : weekdaysRemaining > 0
        ? `${goalDescription} over ${weekdaysRemaining} trading day${weekdaysRemaining === 1 ? "" : "s"}`
        : `${goalDescription} month closed`;

  qs("#monthlyGoalRemaining").textContent = currency(remaining);
  qs("#monthlyGoalPace").textContent = currency(dailyPace);
}

function setMoneyText(selector: string, value: number): void {
  const element = qs<HTMLElement>(selector);
  element.textContent = currency(value);
  element.classList.toggle("positive", value > 0);
  element.classList.toggle("negative", value < 0);
}

function renderMonthlyCalendar(daily: Map<string, DailyPnlSummary>): void {
  const calendar = qs<HTMLDivElement>("#monthlyCalendar");
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const { year, month } = parseMonthKey(state.selectedMonth);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const strongestDay = Math.max(...Array.from(daily.values()).map((item) => Math.abs(item.pnl)), 0);

  calendar.textContent = "";

  weekdays.forEach((weekday) => {
    const cell = document.createElement("div");
    cell.className = "monthly-weekday";
    cell.textContent = weekday;
    calendar.append(cell);
  });

  for (let i = 0; i < firstDay; i += 1) {
    const cell = document.createElement("div");
    cell.className = "monthly-day is-empty";
    calendar.append(cell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${state.selectedMonth}-${String(day).padStart(2, "0")}`;
    const item = daily.get(dateKey);
    const cell = document.createElement("div");
    cell.className = "monthly-day";

    if (item) {
      cell.classList.add(item.pnl > 0 ? "is-profit" : item.pnl < 0 ? "is-loss" : "is-flat");
      const intensity = strongestDay ? Math.abs(item.pnl) / strongestDay : 0;
      cell.style.setProperty("--heatmap-alpha", (0.08 + intensity * 0.26).toFixed(3));
      cell.style.setProperty("--heatmap-border-alpha", (0.22 + intensity * 0.38).toFixed(3));
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);
    cell.append(dayNumber);

    if (item) {
      const pnl = document.createElement("strong");
      pnl.className = `day-pnl ${item.pnl >= 0 ? "positive" : "negative"}`;
      pnl.textContent = currency(item.pnl);
      cell.append(pnl);

      const count = document.createElement("span");
      count.className = "day-count";
      count.textContent = `${item.trades} trade${item.trades === 1 ? "" : "s"}`;
      cell.append(count);
    }

    calendar.append(cell);
  }
}

function renderMonthlyDayList(daily: Map<string, DailyPnlSummary>): void {
  const list = qs<HTMLDivElement>("#monthlyDayList");
  const entries = Array.from(daily.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  list.textContent = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-row monthly-empty";
    empty.textContent = "No P&L logged for this month yet.";
    list.append(empty);
    return;
  }

  entries.forEach(([date, item]) => {
    const row = document.createElement("div");
    row.className = "monthly-list-row";

    const dateText = document.createElement("span");
    dateText.textContent = dayLabel(date);

    const record = document.createElement("strong");
    record.textContent = `${item.wins}W / ${item.losses}L / ${item.breakeven}B`;

    const pnl = document.createElement("em");
    pnl.className = item.pnl >= 0 ? "positive" : "negative";
    pnl.textContent = currency(item.pnl);

    const count = document.createElement("small");
    count.textContent = `${item.trades} trade${item.trades === 1 ? "" : "s"}`;

    row.append(dateText, record, count, pnl);
    list.append(row);
  });
}

function bestPair(): string {
  const pairMap = new Map<string, number>();
  state.trades.forEach((trade) => pairMap.set(trade.pair, (pairMap.get(trade.pair) || 0) + trade.pnl));

  const best = Array.from(pairMap.entries()).sort((a, b) => b[1] - a[1])[0];
  return best ? `${best[0]} (${currency(best[1])})` : "-";
}

function renderPairBreakdown(): void {
  const list = qs<HTMLDivElement>("#pairBreakdown");
  const pairMap = new Map<string, { count: number; pnl: number }>();

  state.trades.forEach((trade) => {
    const item = pairMap.get(trade.pair) || { count: 0, pnl: 0 };
    item.count += 1;
    item.pnl += trade.pnl;
    pairMap.set(trade.pair, item);
  });

  list.textContent = "";

  if (!pairMap.size) {
    list.textContent = "No pair data yet.";
    return;
  }

  Array.from(pairMap.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 6)
    .forEach(([pair, item]) => {
      const row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = `<span></span><strong></strong><em></em>`;
      row.querySelector("span")!.textContent = pair;
      row.querySelector("strong")!.textContent = `${item.count} trades`;
      row.querySelector("em")!.textContent = currency(item.pnl);
      row.querySelector("em")!.className = item.pnl >= 0 ? "positive" : "negative";
      list.append(row);
    });
}

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  keywords: string;
  run: () => void;
};

let commandBarFiltered: CommandItem[] = [];
let commandBarActiveIndex = 0;

function commandItems(): CommandItem[] {
  return [
    { id: "new-trade", label: "New trade", hint: "Log Trade", keywords: "new trade log add create", run: () => { setTab("log"); qs<HTMLSelectElement>("#pair").focus(); } },
    { id: "history", label: "Trade history", hint: "History", keywords: "history trades review", run: () => setTab("history") },
    { id: "monthly", label: "Monthly P&L", hint: "Monthly", keywords: "monthly pnl target goal", run: () => setTab("monthly") },
    { id: "analytics", label: "Analytics", hint: "Analytics", keywords: "analytics equity pairs", run: () => setTab("analytics") },
    { id: "casestudy", label: "Case studies", hint: "Case Studies", keywords: "case study watch list observed", run: () => setTab("casestudy") },
    { id: "logout", label: "Log out", hint: "Account", keywords: "logout sign out exit", run: () => { logout().catch((error) => showToast(error.message)); } }
  ];
}

function renderCommandBarList(): void {
  const list = qs<HTMLDivElement>("#commandBarList");
  list.textContent = "";

  if (!commandBarFiltered.length) {
    const empty = document.createElement("div");
    empty.className = "command-bar-empty";
    empty.textContent = "No matching commands.";
    list.append(empty);
    return;
  }

  commandBarFiltered.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "command-bar-item";
    row.classList.toggle("is-active", index === commandBarActiveIndex);
    row.setAttribute("role", "option");

    const label = document.createElement("span");
    label.textContent = item.label;
    row.append(label);

    if (item.hint) {
      const hint = document.createElement("small");
      hint.textContent = item.hint;
      row.append(hint);
    }

    row.addEventListener("click", () => runCommand(item));
    list.append(row);
  });
}

function runCommand(item: CommandItem): void {
  closeCommandBar();
  item.run();
}

function filterCommandBar(query: string): void {
  const normalized = query.trim().toLowerCase();
  commandBarFiltered = commandItems().filter(
    (item) => !normalized || `${item.label} ${item.keywords}`.toLowerCase().includes(normalized)
  );
  commandBarActiveIndex = 0;
  renderCommandBarList();
}

function moveCommandBarSelection(delta: number): void {
  if (!commandBarFiltered.length) return;
  commandBarActiveIndex = (commandBarActiveIndex + delta + commandBarFiltered.length) % commandBarFiltered.length;
  renderCommandBarList();
}

function openCommandBar(): void {
  if (!state.user) return;
  commandBarFiltered = commandItems();
  commandBarActiveIndex = 0;
  qs<HTMLDivElement>("#commandBar").removeAttribute("hidden");
  const input = qs<HTMLInputElement>("#commandBarInput");
  input.value = "";
  renderCommandBarList();
  window.setTimeout(() => input.focus(), 0);
}

function closeCommandBar(): void {
  qs<HTMLDivElement>("#commandBar").setAttribute("hidden", "true");
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
function updateThemeToggleIcon(): void {
  const icon = document.querySelector<HTMLSpanElement>("#themeToggle .theme-toggle-icon");
  if (!icon) return;
  icon.textContent = currentTheme() === "light" ? "☀️" : "🌙";
}
function toggleTheme(): void {
  const next = currentTheme() === "light" ? "dark" : "light";
  if (next === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem(themeStorageKey, next);
  updateThemeToggleIcon();
}
function toggleSidebarNav(): void {
  const app = qs<HTMLElement>("#appView");
  const button = qs<HTMLButtonElement>("#sidebarNavToggle");
  const willOpen = app.classList.contains("sidebar-collapsed");
  app.classList.toggle("sidebar-collapsed", !willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
  button.setAttribute("aria-label", willOpen ? "Close navigation menu" : "Open navigation menu");
}

function toggleHamburgerMenu(forceClose = false): void {
  const panel = qs<HTMLElement>("#hamburgerMenuPanel");
  const trigger = qs<HTMLButtonElement>("#hamburgerMenuTrigger");
  const willOpen = forceClose ? false : panel.hasAttribute("hidden");
  panel.toggleAttribute("hidden", !willOpen);
  trigger.setAttribute("aria-expanded", String(willOpen));
  trigger.setAttribute("aria-label", willOpen ? "Close menu" : "Open menu");
}

function renderCaseStudies(): void {
  const list = qs<HTMLDivElement>("#caseStudyList");
  list.textContent = "";

  if (!state.caseStudies.length) {
    const empty = document.createElement("div");
    empty.className = "empty-row monthly-empty";
    empty.textContent = "No case studies logged yet.";
    list.append(empty);
    return;
  }

  state.caseStudies.forEach((item) => {
    const row = document.createElement("div");
    row.className = "case-study-row";

    const badge = document.createElement("span");
    badge.className = `badge ${item.direction}`;
    badge.textContent = item.direction;

    const meta = document.createElement("div");
    meta.className = "cs-meta";

    const title = document.createElement("strong");
    title.textContent = `${item.pair} · ${item.setup}`;

    const sub = document.createElement("small");
    sub.textContent = `${item.date}${item.session ? ` · ${item.session}` : ""}`;

    meta.append(title, sub);

    if (item.notes) {
      const notes = document.createElement("div");
      notes.className = "cs-notes";
      notes.textContent = item.notes;
      meta.append(notes);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteCaseStudy(item.id).catch((error) => showToast(error.message));
    });

    row.append(badge, meta, deleteButton);
    list.append(row);
  });
}

function caseStudyPayload(): Record<string, unknown> {
  return {
    date: qs<HTMLInputElement>("#csDate").value,
    pair: qs<HTMLSelectElement>("#csPair").value,
    session: qs<HTMLSelectElement>("#csSession").value,
    direction: state.caseStudyDirection,
    setup: qs<HTMLInputElement>("#csSetup").value,
    notes: qs<HTMLTextAreaElement>("#csNotes").value,
    screenshot: null
  };
}

function resetCaseStudyForm(): void {
  qs<HTMLFormElement>("#caseStudyForm").reset();
  syncAllCustomSelects();
  state.caseStudyDirection = "buy";
  setSegment("csdirection", "buy");
  qs<HTMLInputElement>("#csDate").value = new Date().toISOString().slice(0, 10);
}

async function loadCaseStudies(): Promise<void> {
  const response = await api<{ caseStudies: CaseStudy[] }>("/api/case-studies");
  state.caseStudies = response.caseStudies;
}

async function handleCaseStudySave(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  await api<{ caseStudy: CaseStudy }>("/api/case-studies", {
    method: "POST",
    body: JSON.stringify(caseStudyPayload())
  });

  await loadCaseStudies();
  renderCaseStudies();
  resetCaseStudyForm();
  showToast("Case study saved.");
}

async function deleteCaseStudy(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/case-studies/${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadCaseStudies();
  renderCaseStudies();
  showToast("Case study deleted.");
}

function openEditName(): void {
  qs<HTMLInputElement>("#editNameInput").value = state.user?.name || "";
  qs<HTMLFormElement>("#editNameForm").removeAttribute("hidden");
  qs<HTMLButtonElement>("#editNameButton").setAttribute("hidden", "true");
  qs<HTMLInputElement>("#editNameInput").focus();
}

function closeEditName(): void {
  qs<HTMLFormElement>("#editNameForm").setAttribute("hidden", "true");
  qs<HTMLButtonElement>("#editNameButton").removeAttribute("hidden");
}

async function handleEditNameSave(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const name = qs<HTMLInputElement>("#editNameInput").value.trim();
  if (!name || name.length < 2) {
    showToast("Name must be at least 2 characters.");
    return;
  }

  const response = await api<{ user: User }>("/api/me", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  state.user = response.user;
  qs<HTMLSpanElement>("#userName").textContent = state.user.name;
  closeEditName();
  showToast("Name updated.");
}

function renderEquityCurve(): void {
  const chart = qs<HTMLDivElement>("#equityCurve");
  const ordered = [...state.trades].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const values = ordered.reduce<number[]>((points, trade) => {
    const last = points.length ? points[points.length - 1] : 0;
    points.push(last + trade.pnl);
    return points;
  }, []);

  if (!values.length) {
    chart.innerHTML = `<div class="empty-chart">No equity data yet.</div>`;
    return;
  }

  const allValues = [0, ...values];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const width = 680;
  const height = 220;
  const points = allValues
    .map((value, index) => {
      const x = (index / Math.max(1, allValues.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Equity curve">
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" />
      <polyline points="${points}" />
    </svg>
  `;
}

async function handleLogin(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);

  const response = await api<{ user: User }>("/api/login", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password")
    })
  });

  state.user = response.user;
  showApp();
  await loadTrades();
  await loadCaseStudies();
  showToast("Signed in.");
}

async function handleSignup(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);

  const response = await api<{ user: User }>("/api/signup", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password")
    })
  });

  state.user = response.user;
  showApp();
  await loadTrades();
  await loadCaseStudies();
  showToast("Account created.");
}

async function handleForgotPassword(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);

  const response = await api<{ ok: boolean; message: string }>("/api/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email")
    })
  });

  setAuthMessage("#forgotPasswordMessage", response.message || "If that email is registered, a reset link has been sent.");
}

async function handleResetPassword(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!state.resetToken) {
    setAuthMessage("#resetPasswordMessage", "Reset link is invalid or expired.", true);
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage("#resetPasswordMessage", "Passwords do not match.", true);
    return;
  }

  await api<{ ok: boolean }>("/api/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: state.resetToken,
      password
    })
  });

  form.reset();
  setAuthMessage("#resetPasswordMessage", "Password updated. Redirecting to login...");
  window.setTimeout(returnToLogin, 1400);
}

async function handleTradeSave(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  await api<{ trade: Trade }>("/api/trades", {
    method: "POST",
    body: JSON.stringify(tradePayload())
  });

  await loadTrades();
  resetTradeForm();
  showToast("Trade saved.");
}

async function deleteTrade(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/trades/${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadTrades();
  showToast("Trade deleted.");
}

async function logout(): Promise<void> {
  await api<{ ok: boolean }>("/api/logout", { method: "POST", body: "{}" });
  state.user = null;
  state.trades = [];
  showAuth();
}

function bindEvents(): void {
  qsa<HTMLButtonElement>("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode === "signup" ? "signup" : "login"));
  });

  qsa<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (tab === "log" || tab === "history" || tab === "monthly" || tab === "analytics" || tab === "casestudy") setTab(tab);
      const nav = document.querySelector<HTMLElement>("#sideNav");
      if (nav?.classList.contains("is-open")) toggleSidebarNav();
      toggleHamburgerMenu(true);
    });
  });
  qs<HTMLButtonElement>("#themeToggle").addEventListener("click", toggleTheme);
  qs<HTMLButtonElement>("#sidebarNavToggle").addEventListener("click", toggleSidebarNav);

  qs<HTMLButtonElement>("#hamburgerMenuTrigger").addEventListener("click", () => toggleHamburgerMenu());

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const panel = qs<HTMLElement>("#hamburgerMenuPanel");
    const wrap = target.closest(".hamburger-wrap");
    if (!wrap && !panel.hasAttribute("hidden")) toggleHamburgerMenu(true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggleHamburgerMenu(true);
  });

  qsa<HTMLButtonElement>("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      state.direction = button.dataset.direction === "sell" ? "sell" : "buy";
      setSegment("direction", state.direction);
      updateRr();
    });
  });

  qsa<HTMLButtonElement>("[data-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.result;
      state.result = value === "loss" ? "loss" : value === "breakeven" ? "breakeven" : "win";
      setSegment("result", state.result);
    });
  });

  qsa<HTMLButtonElement>("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => setRating(Number(button.dataset.rating || 3)));
  });

  qsa<HTMLButtonElement>("[data-emotion]").forEach((button) => {
    button.addEventListener("click", () => {
      state.emotion = button.dataset.emotion || "";
      setSegment("emotion", state.emotion);
    });
  });

  qsa<HTMLButtonElement>("[data-sleep]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sleepQuality = button.dataset.sleep || "";
      setSegment("sleep", state.sleepQuality);
    });
  });

  qsa<HTMLButtonElement>("[data-confidence]").forEach((button) => {
    button.addEventListener("click", () => {
      state.confidence = button.dataset.confidence || "";
      setSegment("confidence", state.confidence);
    });
  });

  qsa<HTMLButtonElement>("[data-shot]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.shot as ShotTab;
      state.activeShot = tab === "after" || tab === "analysis" ? tab : "before";
      setSegment("shot", state.activeShot);
      renderShotPreview();
    });
  });

  qs<HTMLInputElement>("#shotFileInput").addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) uploadShot(file).catch((error) => showToast(error.message));
    input.value = "";
  });

  qs<HTMLButtonElement>("#shotRemoveButton").addEventListener("click", (event) => {
    event.stopPropagation();
    removeShot();
  });

  qs<HTMLDivElement>("#shotEmptyState").addEventListener("click", () => {
    qs<HTMLInputElement>("#shotFileInput").click();
  });

  const dropzone = qs<HTMLDivElement>("#shotDropzone");
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    const file = event.dataTransfer?.files?.[0];
    if (file) uploadShot(file).catch((error) => showToast(error.message));
  });

  ["#entryPrice", "#stopLoss", "#takeProfit"].forEach((selector) => {
    qs<HTMLInputElement>(selector).addEventListener("input", updateRr);
  });

  qs<HTMLFormElement>("#loginForm").addEventListener("submit", (event) => {
    handleLogin(event).catch((error) => showToast(error.message));
  });

  qs<HTMLFormElement>("#signupForm").addEventListener("submit", (event) => {
    handleSignup(event).catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#forgotPasswordButton").addEventListener("click", () => setAuthMode("forgot"));
  qs<HTMLButtonElement>("#forgotBackButton").addEventListener("click", returnToLogin);
  qs<HTMLButtonElement>("#resetBackButton").addEventListener("click", returnToLogin);

  qs<HTMLFormElement>("#forgotPasswordForm").addEventListener("submit", (event) => {
    handleForgotPassword(event).catch((error) => showToast(error.message));
  });

  qs<HTMLFormElement>("#resetPasswordForm").addEventListener("submit", (event) => {
    handleResetPassword(event).catch((error) => {
      setAuthMessage("#resetPasswordMessage", error.message, true);
    });
  });

  qs<HTMLFormElement>("#tradeForm").addEventListener("submit", (event) => {
    handleTradeSave(event).catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#logoutButton").addEventListener("click", () => {
    logout().catch((error) => showToast(error.message));
  });
  qs<HTMLButtonElement>("#mobileThemeToggle").addEventListener("click", toggleTheme);
  qs<HTMLButtonElement>("#mobileLogoutButton").addEventListener("click", () => {
    logout().catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#resetButton").addEventListener("click", resetTradeForm);
  qs<HTMLSelectElement>("#resultFilter").addEventListener("change", renderHistory);
  qs<HTMLInputElement>("#searchTrades").addEventListener("input", renderHistory);
  qs<HTMLInputElement>("#monthPicker").addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.selectedMonth = value || monthKey(new Date());
    loadMonthlyTargetForSelectedMonth();
    renderMonthlyPnl();
  });
  qs<HTMLButtonElement>("#prevMonth").addEventListener("click", () => shiftMonth(-1));
  qs<HTMLButtonElement>("#nextMonth").addEventListener("click", () => shiftMonth(1));
  qs<HTMLInputElement>("#monthlyTargetInput").addEventListener("input", () => {
    state.monthlyTarget = monthlyTargetFromControls();
    saveMonthlyTargetForSelectedMonth();
    renderMonthlyPnl();
  });
  qs<HTMLInputElement>("#monthlyTargetBaseInput").addEventListener("input", () => {
    state.monthlyTarget = monthlyTargetFromControls();
    saveMonthlyTargetForSelectedMonth();
    renderMonthlyPnl();
  });
  qsa<HTMLButtonElement>("[data-target-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.targetMode === "percent" ? "percent" : "currency";
      state.monthlyTarget = { ...monthlyTargetFromControls(), mode };
      syncMonthlyTargetControls();
      saveMonthlyTargetForSelectedMonth();
      renderMonthlyPnl();
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-delete-trade]");
    if (button?.dataset.deleteTrade) {
      deleteTrade(button.dataset.deleteTrade).catch((error) => showToast(error.message));
    }
  });

  qsa<HTMLTableCellElement>("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort || "";
      if (state.historySort.key === key) {
        state.historySort.direction = state.historySort.direction === "asc" ? "desc" : "asc";
      } else {
        state.historySort = { key, direction: key === "pnl" || key === "rating" ? "desc" : "asc" };
      }
      renderHistory();
    });
  });

  qs<HTMLButtonElement>("#fabNewTrade").addEventListener("click", () => setTab("log"));

  qs<HTMLDivElement>("#commandBar").addEventListener("click", (event) => {
    if (event.target === qs<HTMLDivElement>("#commandBar")) closeCommandBar();
  });

  qs<HTMLInputElement>("#commandBarInput").addEventListener("input", (event) => {
    filterCommandBar((event.currentTarget as HTMLInputElement).value);
  });

  qs<HTMLInputElement>("#commandBarInput").addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCommandBarSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCommandBarSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = commandBarFiltered[commandBarActiveIndex];
      if (item) runCommand(item);
    } else if (event.key === "Escape") {
      closeCommandBar();
    }
  });

  document.addEventListener("keydown", (event) => {
    const isCommandKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    if (isCommandKey) {
      event.preventDefault();
      const backdrop = qs<HTMLDivElement>("#commandBar");
      if (backdrop.hasAttribute("hidden")) openCommandBar();
      else closeCommandBar();
    }
  });

  qsa<HTMLButtonElement>("[data-csdirection]").forEach((button) => {
    button.addEventListener("click", () => {
      state.caseStudyDirection = button.dataset.csdirection === "sell" ? "sell" : "buy";
      setSegment("csdirection", state.caseStudyDirection);
    });
  });

  qs<HTMLFormElement>("#caseStudyForm").addEventListener("submit", (event) => {
    handleCaseStudySave(event).catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#csResetButton").addEventListener("click", resetCaseStudyForm);

  qs<HTMLButtonElement>("#editNameButton").addEventListener("click", openEditName);
  qs<HTMLButtonElement>("#editNameCancel").addEventListener("click", closeEditName);
  qs<HTMLFormElement>("#editNameForm").addEventListener("submit", (event) => {
    handleEditNameSave(event).catch((error) => showToast(error.message));
  });
}

async function init(): Promise<void> {
  bindEvents();
  updateThemeToggleIcon();
  initCustomSelects();
  setSegment("direction", state.direction);
  setSegment("result", state.result);
  setSegment("emotion", state.emotion);
  setSegment("sleep", state.sleepQuality);
  setSegment("confidence", state.confidence);
  setSegment("shot", state.activeShot);
  setSegment("csdirection", state.caseStudyDirection);
  setRating(state.rating);
  setToday();
  updateRr();
  renderShotPreview();
  qs<HTMLInputElement>("#csDate").value = new Date().toISOString().slice(0, 10);

  if (window.location.pathname === "/reset-password") {
    state.resetToken = resetTokenFromUrl();
    showAuth();
    setAuthMode("reset");
    if (!state.resetToken) setAuthMessage("#resetPasswordMessage", "Reset link is invalid or expired.", true);
    return;
  }

  setAuthMode("login");

  try {
    const response = await api<{ user: User }>("/api/me");
    state.user = response.user;
    showApp();
    await loadTrades();
    await loadCaseStudies();
  } catch {
    showAuth();
  }
}

init().catch((error) => showToast(error.message));
