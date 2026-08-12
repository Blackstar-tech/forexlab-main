(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/client.ts
  var require_client = __commonJS({
    "src/client.ts"() {
      var state = {
        user: null,
        trades: [],
        activeTab: "log",
        direction: "buy",
        result: "win",
        rating: 3,
        selectedMonth: monthKey(/* @__PURE__ */ new Date()),
        emotion: "",
        sleepQuality: "",
        confidence: "",
        activeShot: "before",
        screenshots: { before: null, after: null, analysis: null },
        resetToken: ""
      };
      function qs(selector, root = document) {
        const element = root.querySelector(selector);
        if (!element) throw new Error(`Missing element: ${selector}`);
        return element;
      }
      function qsa(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
      }
      async function api(path, options = {}) {
        const response = await fetch(path, {
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...options.headers || {}
          },
          ...options
        });
        const text = await response.text();
        const contentType = response.headers.get("Content-Type") || "";
        const isJson = contentType.toLowerCase().includes("application/json");
        let data = {};
        if (text && (isJson || text.trim().startsWith("{") || text.trim().startsWith("["))) {
          try {
            data = JSON.parse(text);
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
      function httpErrorMessage(status) {
        if (status === 405) return "The API route is not accepting this request. Check the Vercel routing.";
        if (status >= 500) return "The server crashed while handling this request.";
        return `Request failed (${status}).`;
      }
      function showToast(message) {
        const toast = qs("#toast");
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
      }
      function showAuth() {
        qs("#authView").removeAttribute("hidden");
        qs("#appView").setAttribute("hidden", "true");
      }
      function showApp() {
        qs("#authView").setAttribute("hidden", "true");
        qs("#appView").removeAttribute("hidden");
        qs("#userName").textContent = state.user?.name || "Trader";
      }
      function clearAuthMessages() {
        qsa(".auth-message").forEach((message) => {
          message.textContent = "";
          message.classList.remove("is-error");
          message.setAttribute("hidden", "true");
        });
      }
      function setAuthMessage(selector, text, isError = false) {
        const message = qs(selector);
        message.textContent = text;
        message.classList.toggle("is-error", isError);
        message.removeAttribute("hidden");
      }
      function setAuthMode(mode) {
        const loginForm = qs("#loginForm");
        const signupForm = qs("#signupForm");
        const forgotPasswordForm = qs("#forgotPasswordForm");
        const resetPasswordForm = qs("#resetPasswordForm");
        const authToggle = qs(".auth-toggle");
        const title = qs("#authTitle");
        const subtitle = qs("#authSubtitle");
        clearAuthMessages();
        loginForm.setAttribute("hidden", "true");
        signupForm.setAttribute("hidden", "true");
        forgotPasswordForm.setAttribute("hidden", "true");
        resetPasswordForm.setAttribute("hidden", "true");
        authToggle.toggleAttribute("hidden", mode === "forgot" || mode === "reset");
        qsa("[data-auth-mode]").forEach((button) => {
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
      function resetTokenFromUrl() {
        if (window.location.pathname !== "/reset-password") return "";
        return new URLSearchParams(window.location.search).get("token") || "";
      }
      function returnToLogin() {
        window.history.replaceState({}, "", "/");
        state.resetToken = "";
        setAuthMode("login");
      }
      function setTab(tab) {
        state.activeTab = tab;
        qsa("[data-tab]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.tab === tab);
        });
        qsa(".tab-panel").forEach((panel) => {
          panel.classList.toggle("is-active", panel.id === `tab-${tab}`);
        });
        if (tab === "history") renderHistory();
        if (tab === "monthly") renderMonthlyPnl();
        if (tab === "analytics") renderAnalytics();
      }
      function setSegment(group, value) {
        qsa(`[data-${group}]`).forEach((button) => {
          button.classList.toggle("is-active", button.dataset[group] === value);
        });
      }
      function setToday() {
        const now = /* @__PURE__ */ new Date();
        qs("#tradeDate").value = now.toISOString().slice(0, 10);
        qs("#tradeTime").value = now.toTimeString().slice(0, 5);
      }
      function numberFromInput(selector) {
        const value = qs(selector).value;
        if (!value) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      function calculateRr() {
        const entry = numberFromInput("#entryPrice");
        const stop = numberFromInput("#stopLoss");
        const take = numberFromInput("#takeProfit");
        if (entry === null || stop === null || take === null) return null;
        const risk = Math.abs(entry - stop);
        const reward = state.direction === "buy" ? take - entry : entry - take;
        if (risk <= 0 || reward <= 0) return null;
        return Number((reward / risk).toFixed(2));
      }
      function updateRr() {
        const rr = calculateRr();
        qs("#plannedRr").value = rr === null ? "" : `1:${rr}`;
      }
      function shotLabel(tab) {
        if (tab === "before") return "Before Entry";
        if (tab === "after") return "After Exit";
        return "Analysis";
      }
      function renderShotPreview() {
        const tab = state.activeShot;
        qs("#shotTabLabel").textContent = shotLabel(tab);
        const url = state.screenshots[tab];
        const empty = qs("#shotEmptyState");
        const preview = qs("#shotPreviewState");
        if (url) {
          empty.setAttribute("hidden", "true");
          preview.removeAttribute("hidden");
          qs("#shotPreviewImage").src = url;
        } else {
          preview.setAttribute("hidden", "true");
          empty.removeAttribute("hidden");
        }
      }
      function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read that file."));
          reader.readAsDataURL(file);
        });
      }
      async function uploadShot(file) {
        if (!file.type.startsWith("image/")) {
          showToast("Please choose an image file.");
          return;
        }
        const dataUrl = await fileToDataUrl(file);
        const response = await api("/api/uploads", {
          method: "POST",
          body: JSON.stringify({ dataUrl })
        });
        state.screenshots[state.activeShot] = response.url;
        renderShotPreview();
        showToast("Screenshot attached.");
      }
      function removeShot() {
        state.screenshots[state.activeShot] = null;
        renderShotPreview();
      }
      function resetTradeForm() {
        qs("#tradeForm").reset();
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
      function setRating(value) {
        state.rating = value;
        qsa("[data-rating]").forEach((button) => {
          const rating = Number(button.dataset.rating || 0);
          button.classList.toggle("is-active", rating <= value);
        });
      }
      function tradePayload() {
        const rr = calculateRr();
        return {
          date: qs("#tradeDate").value,
          time: qs("#tradeTime").value,
          pair: qs("#pair").value,
          session: qs("#session").value,
          direction: state.direction,
          result: state.result,
          setup: qs("#setup").value,
          entryPrice: numberFromInput("#entryPrice"),
          stopLoss: numberFromInput("#stopLoss"),
          takeProfit: numberFromInput("#takeProfit"),
          lotSize: numberFromInput("#lotSize"),
          riskPercent: numberFromInput("#riskPercent"),
          plannedRr: rr,
          rrAchieved: qs("#rrAchieved").value,
          pips: numberFromInput("#pips"),
          pnl: numberFromInput("#pnl") || 0,
          emotion: state.emotion,
          sleepQuality: state.sleepQuality,
          confidence: state.confidence,
          rating: state.rating,
          preTradeNotes: qs("#preTradeNotes").value,
          notes: qs("#notes").value,
          screenshots: state.screenshots
        };
      }
      async function loadTrades() {
        const response = await api("/api/trades");
        state.trades = response.trades;
        renderDashboard();
        renderHistory();
        renderMonthlyPnl();
        renderAnalytics();
      }
      function currency(value) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(value);
      }
      function percent(value) {
        return `${Math.round(value)}%`;
      }
      function monthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      function parseMonthKey(key) {
        const [year, month] = key.split("-").map(Number);
        return { year, month: month - 1 };
      }
      function shiftMonth(delta) {
        const { year, month } = parseMonthKey(state.selectedMonth);
        state.selectedMonth = monthKey(new Date(year, month + delta, 1));
        renderMonthlyPnl();
      }
      function dayLabel(dateKey) {
        return new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric"
        }).format(/* @__PURE__ */ new Date(`${dateKey}T12:00:00`));
      }
      function stats() {
        const total = state.trades.length;
        const wins = state.trades.filter((trade) => trade.result === "win").length;
        const losses = state.trades.filter((trade) => trade.result === "loss").length;
        const breakeven = state.trades.filter((trade) => trade.result === "breakeven").length;
        const netPnl = state.trades.reduce((sum, trade) => sum + trade.pnl, 0);
        const winRate = total ? wins / total * 100 : 0;
        const rated = state.trades.filter((trade) => trade.rating > 0);
        const averageRating = rated.length ? rated.reduce((sum, trade) => sum + trade.rating, 0) / rated.length : 0;
        return { total, wins, losses, breakeven, netPnl, winRate, averageRating };
      }
      function renderDashboard() {
        const summary = stats();
        qs("#metricTrades").textContent = String(summary.total);
        qs("#metricWinRate").textContent = percent(summary.winRate);
        qs("#metricPnl").textContent = currency(summary.netPnl);
        qs("#metricRating").textContent = summary.averageRating ? summary.averageRating.toFixed(1) : "-";
      }
      function renderHistory() {
        const tbody = qs("#historyBody");
        const resultFilter = qs("#resultFilter").value;
        const search = qs("#searchTrades").value.trim().toLowerCase();
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
      function tradeSummaryCell(trade) {
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
      function tagPill(text, tone) {
        const tag = document.createElement("span");
        tag.className = `tag-pill ${tone}`;
        tag.textContent = text;
        return tag;
      }
      function tableCell(text, className = "") {
        const cell = document.createElement("td");
        cell.textContent = text;
        if (className) cell.className = className;
        return cell;
      }
      function badgeCell(text, tone) {
        const cell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `badge ${tone}`;
        badge.textContent = text;
        cell.append(badge);
        return cell;
      }
      function actionCell(id) {
        const cell = document.createElement("td");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ghost danger";
        button.dataset.deleteTrade = id;
        button.textContent = "Delete";
        cell.append(button);
        return cell;
      }
      function syncCustomSelect(custom) {
        const selected = custom.select.selectedOptions[0];
        custom.trigger.textContent = selected?.textContent || "Select";
        qsa(".select-option", custom.menu).forEach((option) => {
          const isSelected = option.dataset.value === custom.select.value;
          option.setAttribute("aria-selected", String(isSelected));
        });
      }
      function closeCustomSelect(custom) {
        custom.root.classList.remove("is-open");
        custom.trigger.setAttribute("aria-expanded", "false");
      }
      function closeOtherSelects(active) {
        qsa(".custom-select.is-open").forEach((root) => {
          if (root !== active.root) {
            root.classList.remove("is-open");
            root.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
      }
      function createCustomSelect(select) {
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
            menu.querySelector(".select-option")?.focus();
          }
        });
        menu.addEventListener("keydown", (event) => {
          const options = qsa(".select-option", menu);
          const currentIndex = options.indexOf(document.activeElement);
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
      function initCustomSelects() {
        qsa("select").forEach((select) => createCustomSelect(select));
        document.addEventListener("click", (event) => {
          const target = event.target;
          qsa(".custom-select.is-open").forEach((root) => {
            if (!root.contains(target)) {
              root.classList.remove("is-open");
              root.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
            }
          });
        });
      }
      function syncAllCustomSelects() {
        qsa("select").forEach((select) => {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }
      function renderAnalytics() {
        const summary = stats();
        qs("#analyticsRecord").textContent = `${summary.wins}W / ${summary.losses}L / ${summary.breakeven}B`;
        qs("#analyticsPnl").textContent = currency(summary.netPnl);
        qs("#analyticsWinRate").textContent = percent(summary.winRate);
        qs("#analyticsBestPair").textContent = bestPair();
        renderEquityCurve();
        renderPairBreakdown();
      }
      function renderMonthlyPnl() {
        const picker = qs("#monthPicker");
        picker.value = state.selectedMonth;
        const monthTrades = state.trades.filter((trade) => trade.date.startsWith(state.selectedMonth));
        const daily = /* @__PURE__ */ new Map();
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
      function setMoneyText(selector, value) {
        const element = qs(selector);
        element.textContent = currency(value);
        element.classList.toggle("positive", value > 0);
        element.classList.toggle("negative", value < 0);
      }
      function renderMonthlyCalendar(daily) {
        const calendar = qs("#monthlyCalendar");
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
      function renderMonthlyDayList(daily) {
        const list = qs("#monthlyDayList");
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
      function bestPair() {
        const pairMap = /* @__PURE__ */ new Map();
        state.trades.forEach((trade) => pairMap.set(trade.pair, (pairMap.get(trade.pair) || 0) + trade.pnl));
        const best = Array.from(pairMap.entries()).sort((a, b) => b[1] - a[1])[0];
        return best ? `${best[0]} (${currency(best[1])})` : "-";
      }
      function renderPairBreakdown() {
        const list = qs("#pairBreakdown");
        const pairMap = /* @__PURE__ */ new Map();
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
        Array.from(pairMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl).slice(0, 6).forEach(([pair, item]) => {
          const row = document.createElement("div");
          row.className = "breakdown-row";
          row.innerHTML = `<span></span><strong></strong><em></em>`;
          row.querySelector("span").textContent = pair;
          row.querySelector("strong").textContent = `${item.count} trades`;
          row.querySelector("em").textContent = currency(item.pnl);
          row.querySelector("em").className = item.pnl >= 0 ? "positive" : "negative";
          list.append(row);
        });
      }
      function renderEquityCurve() {
        const chart = qs("#equityCurve");
        const ordered = [...state.trades].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        const values = ordered.reduce((points2, trade) => {
          const last = points2.length ? points2[points2.length - 1] : 0;
          points2.push(last + trade.pnl);
          return points2;
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
        const points = allValues.map((value, index) => {
          const x = index / Math.max(1, allValues.length - 1) * width;
          const y = height - (value - min) / range * height;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");
        chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Equity curve">
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" />
      <polyline points="${points}" />
    </svg>
  `;
      }
      async function handleLogin(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const response = await api("/api/login", {
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
      async function handleSignup(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const response = await api("/api/signup", {
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
      async function handleForgotPassword(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const response = await api("/api/forgot-password", {
          method: "POST",
          body: JSON.stringify({
            email: formData.get("email")
          })
        });
        setAuthMessage("#forgotPasswordMessage", response.message || "If that email is registered, a reset link has been sent.");
      }
      async function handleResetPassword(event) {
        event.preventDefault();
        const form = event.currentTarget;
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
        await api("/api/reset-password", {
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
      async function handleTradeSave(event) {
        event.preventDefault();
        await api("/api/trades", {
          method: "POST",
          body: JSON.stringify(tradePayload())
        });
        await loadTrades();
        resetTradeForm();
        showToast("Trade saved.");
      }
      async function deleteTrade(id) {
        await api(`/api/trades/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadTrades();
        showToast("Trade deleted.");
      }
      async function logout() {
        await api("/api/logout", { method: "POST", body: "{}" });
        state.user = null;
        state.trades = [];
        showAuth();
      }
      function bindEvents() {
        qsa("[data-auth-mode]").forEach((button) => {
          button.addEventListener("click", () => setAuthMode(button.dataset.authMode === "signup" ? "signup" : "login"));
        });
        qsa("[data-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            const tab = button.dataset.tab;
            if (tab === "log" || tab === "history" || tab === "monthly" || tab === "analytics") setTab(tab);
          });
        });
        qsa("[data-direction]").forEach((button) => {
          button.addEventListener("click", () => {
            state.direction = button.dataset.direction === "sell" ? "sell" : "buy";
            setSegment("direction", state.direction);
            updateRr();
          });
        });
        qsa("[data-result]").forEach((button) => {
          button.addEventListener("click", () => {
            const value = button.dataset.result;
            state.result = value === "loss" ? "loss" : value === "breakeven" ? "breakeven" : "win";
            setSegment("result", state.result);
          });
        });
        qsa("[data-rating]").forEach((button) => {
          button.addEventListener("click", () => setRating(Number(button.dataset.rating || 3)));
        });
        qsa("[data-emotion]").forEach((button) => {
          button.addEventListener("click", () => {
            state.emotion = button.dataset.emotion || "";
            setSegment("emotion", state.emotion);
          });
        });
        qsa("[data-sleep]").forEach((button) => {
          button.addEventListener("click", () => {
            state.sleepQuality = button.dataset.sleep || "";
            setSegment("sleep", state.sleepQuality);
          });
        });
        qsa("[data-confidence]").forEach((button) => {
          button.addEventListener("click", () => {
            state.confidence = button.dataset.confidence || "";
            setSegment("confidence", state.confidence);
          });
        });
        qsa("[data-shot]").forEach((button) => {
          button.addEventListener("click", () => {
            const tab = button.dataset.shot;
            state.activeShot = tab === "after" || tab === "analysis" ? tab : "before";
            setSegment("shot", state.activeShot);
            renderShotPreview();
          });
        });
        qs("#shotFileInput").addEventListener("change", (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (file) uploadShot(file).catch((error) => showToast(error.message));
          input.value = "";
        });
        qs("#shotRemoveButton").addEventListener("click", (event) => {
          event.stopPropagation();
          removeShot();
        });
        qs("#shotEmptyState").addEventListener("click", () => {
          qs("#shotFileInput").click();
        });
        const dropzone = qs("#shotDropzone");
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
          qs(selector).addEventListener("input", updateRr);
        });
        qs("#loginForm").addEventListener("submit", (event) => {
          handleLogin(event).catch((error) => showToast(error.message));
        });
        qs("#signupForm").addEventListener("submit", (event) => {
          handleSignup(event).catch((error) => showToast(error.message));
        });
        qs("#forgotPasswordButton").addEventListener("click", () => setAuthMode("forgot"));
        qs("#forgotBackButton").addEventListener("click", returnToLogin);
        qs("#resetBackButton").addEventListener("click", returnToLogin);
        qs("#forgotPasswordForm").addEventListener("submit", (event) => {
          handleForgotPassword(event).catch((error) => showToast(error.message));
        });
        qs("#resetPasswordForm").addEventListener("submit", (event) => {
          handleResetPassword(event).catch((error) => {
            setAuthMessage("#resetPasswordMessage", error.message, true);
          });
        });
        qs("#tradeForm").addEventListener("submit", (event) => {
          handleTradeSave(event).catch((error) => showToast(error.message));
        });
        qs("#logoutButton").addEventListener("click", () => {
          logout().catch((error) => showToast(error.message));
        });
        qs("#resetButton").addEventListener("click", resetTradeForm);
        qs("#resultFilter").addEventListener("change", renderHistory);
        qs("#searchTrades").addEventListener("input", renderHistory);
        qs("#monthPicker").addEventListener("change", (event) => {
          const value = event.currentTarget.value;
          state.selectedMonth = value || monthKey(/* @__PURE__ */ new Date());
          renderMonthlyPnl();
        });
        qs("#prevMonth").addEventListener("click", () => shiftMonth(-1));
        qs("#nextMonth").addEventListener("click", () => shiftMonth(1));
        document.addEventListener("click", (event) => {
          const target = event.target;
          const button = target.closest("[data-delete-trade]");
          if (button?.dataset.deleteTrade) {
            deleteTrade(button.dataset.deleteTrade).catch((error) => showToast(error.message));
          }
        });
      }
      async function init() {
        bindEvents();
        initCustomSelects();
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
        if (window.location.pathname === "/reset-password") {
          state.resetToken = resetTokenFromUrl();
          showAuth();
          setAuthMode("reset");
          if (!state.resetToken) setAuthMessage("#resetPasswordMessage", "Reset link is invalid or expired.", true);
          return;
        }
        setAuthMode("login");
        try {
          const response = await api("/api/me");
          state.user = response.user;
          showApp();
          await loadTrades();
        } catch {
          showAuth();
        }
      }
      init().catch((error) => showToast(error.message));
    }
  });
  require_client();
})();
