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

type JournalTab = "log" | "history" | "monthly" | "analytics";

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
  screenshots: { before: null, after: null, analysis: null }
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

  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
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

function setAuthMode(mode: "login" | "signup"): void {
  const loginForm = qs<HTMLFormElement>("#loginForm");
  const signupForm = qs<HTMLFormElement>("#signupForm");
  const title = qs<HTMLHeadingElement>("#authTitle");
  const subtitle = qs<HTMLParagraphElement>("#authSubtitle");

  qsa<HTMLButtonElement>("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });

  if (mode === "login") {
    loginForm.removeAttribute("hidden");
    signupForm.setAttribute("hidden", "true");
    title.textContent = "Welcome back";
    subtitle.textContent = "Sign in to review your trading journal.";
  } else {
    signupForm.removeAttribute("hidden");
    loginForm.setAttribute("hidden", "true");
    title.textContent = "Create your journal";
    subtitle.textContent = "Start tracking trades with a private account.";
  }
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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

function shiftMonth(delta: number): void {
  const { year, month } = parseMonthKey(state.selectedMonth);
  state.selectedMonth = monthKey(new Date(year, month + delta, 1));
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
}

function renderHistory(): void {
  const tbody = qs<HTMLTableSectionElement>("#historyBody");
  const resultFilter = qs<HTMLSelectElement>("#resultFilter").value;
  const search = qs<HTMLInputElement>("#searchTrades").value.trim().toLowerCase();
  const trades = state.trades.filter((trade) => {
    const matchesResult = resultFilter === "all" || trade.result === resultFilter;
    const text = `${trade.pair} ${trade.setup} ${trade.session} ${trade.notes}`.toLowerCase();
    return matchesResult && (!search || text.includes(search));
  });

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
      tableCell(trade.pair),
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
  const daily = new Map<string, { pnl: number; trades: number; wins: number; losses: number; breakeven: number }>();

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

  renderMonthlyCalendar(daily);
  renderMonthlyDayList(daily);
}

function setMoneyText(selector: string, value: number): void {
  const element = qs<HTMLElement>(selector);
  element.textContent = currency(value);
  element.classList.toggle("positive", value > 0);
  element.classList.toggle("negative", value < 0);
}

function renderMonthlyCalendar(
  daily: Map<string, { pnl: number; trades: number; wins: number; losses: number; breakeven: number }>
): void {
  const calendar = qs<HTMLDivElement>("#monthlyCalendar");
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const { year, month } = parseMonthKey(state.selectedMonth);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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

function renderMonthlyDayList(
  daily: Map<string, { pnl: number; trades: number; wins: number; losses: number; breakeven: number }>
): void {
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
  showToast("Account created.");
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
      if (tab === "log" || tab === "history" || tab === "monthly" || tab === "analytics") setTab(tab);
    });
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

  qs<HTMLFormElement>("#tradeForm").addEventListener("submit", (event) => {
    handleTradeSave(event).catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#logoutButton").addEventListener("click", () => {
    logout().catch((error) => showToast(error.message));
  });

  qs<HTMLButtonElement>("#resetButton").addEventListener("click", resetTradeForm);
  qs<HTMLSelectElement>("#resultFilter").addEventListener("change", renderHistory);
  qs<HTMLInputElement>("#searchTrades").addEventListener("input", renderHistory);
  qs<HTMLInputElement>("#monthPicker").addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.selectedMonth = value || monthKey(new Date());
    renderMonthlyPnl();
  });
  qs<HTMLButtonElement>("#prevMonth").addEventListener("click", () => shiftMonth(-1));
  qs<HTMLButtonElement>("#nextMonth").addEventListener("click", () => shiftMonth(1));

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-delete-trade]");
    if (button?.dataset.deleteTrade) {
      deleteTrade(button.dataset.deleteTrade).catch((error) => showToast(error.message));
    }
  });
}

async function init(): Promise<void> {
  bindEvents();
  setAuthMode("login");
  setSegment("direction", state.direction);
  setSegment("result", state.result);
  setSegment("emotion", state.emotion);
  setSegment("sleep", state.sleepQuality);
  setSegment("confidence", state.confidence);
  setSegment("shot", state.activeShot);
  setRating(state.rating);
  setToday();
  updateRr();
  renderShotPreview();

  try {
    const response = await api<{ user: User }>("/api/me");
    state.user = response.user;
    showApp();
    await loadTrades();
  } catch {
    showAuth();
  }
}

init().catch((error) => showToast(error.message));