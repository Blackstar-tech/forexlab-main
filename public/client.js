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
      var monthlyTargetStorageKey = "forexlab.monthlyTargets.v1";
      var accountBalanceStorageKey = "forexlab.accountBalance.v1";
      var winRateGaugeRadius = 90;
      var themeStorageKey = "forexlab.theme";
      function applyStoredTheme() {
        const stored = localStorage.getItem(themeStorageKey);
        if (stored === "light") document.documentElement.setAttribute("data-theme", "light");
      }
      applyStoredTheme();
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
        resetToken: "",
        monthlyTarget: { mode: "currency", value: 0, baseBalance: null },
        accountBalance: 0,
        historySort: { key: "date", direction: "desc" },
        caseStudies: [],
        caseStudyDirection: "buy",
        caseStudyScreenshots: []
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
        if (tab === "dashboard") renderDashboardTab();
        if (tab === "history") renderHistory();
        if (tab === "monthly") renderMonthlyPnl();
        if (tab === "analytics") renderAnalytics();
        if (tab === "casestudy") renderCaseStudies();
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
      function renderCaseStudyScreenshotPreview() {
        const empty = qs("#csShotEmptyState");
        const preview = qs("#csShotPreviewState");
        const gallery = qs("#csShotGallery");
        const hasScreenshots = state.caseStudyScreenshots.length > 0;
        gallery.textContent = "";
        if (hasScreenshots) {
          empty.setAttribute("hidden", "true");
          preview.removeAttribute("hidden");
        } else {
          preview.setAttribute("hidden", "true");
          empty.removeAttribute("hidden");
        }
        state.caseStudyScreenshots.forEach((url, index) => {
          const thumb = document.createElement("div");
          thumb.className = "cs-shot-thumb";
          const image = document.createElement("img");
          image.src = url;
          image.alt = `Case study screenshot ${index + 1}`;
          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "cs-shot-thumb-remove";
          removeButton.textContent = "\xD7";
          removeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            removeCaseStudyScreenshot(index);
          });
          thumb.append(image, removeButton);
          gallery.append(thumb);
        });
      }
      async function uploadCaseStudyScreenshots(files) {
        const selectedFiles = Array.from(files);
        const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length !== selectedFiles.length) {
          showToast("Please choose image files.");
        }
        if (!imageFiles.length) {
          return;
        }
        for (const file of imageFiles) {
          const dataUrl = await fileToDataUrl(file);
          const response = await api("/api/uploads", {
            method: "POST",
            body: JSON.stringify({ dataUrl })
          });
          state.caseStudyScreenshots.push(response.url);
        }
        renderCaseStudyScreenshotPreview();
        showToast(`${imageFiles.length} screenshot${imageFiles.length === 1 ? "" : "s"} attached.`);
      }
      function removeCaseStudyScreenshot(index) {
        state.caseStudyScreenshots.splice(index, 1);
        renderCaseStudyScreenshotPreview();
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
        loadMonthlyTargetForSelectedMonth();
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
      function precisePercent(value) {
        const rounded = Math.round(value * 10) / 10;
        return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
      }
      function monthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      function parseMonthKey(key) {
        const [year, month] = key.split("-").map(Number);
        return { year, month: month - 1 };
      }
      function defaultMonthlyTarget() {
        return { mode: "currency", value: 0, baseBalance: null };
      }
      function normalizeMonthlyTarget(value) {
        const input = value && typeof value === "object" ? value : {};
        const mode = input.mode === "percent" ? "percent" : "currency";
        const targetValue = typeof input.value === "number" && Number.isFinite(input.value) ? input.value : 0;
        const baseBalance = typeof input.baseBalance === "number" && Number.isFinite(input.baseBalance) && input.baseBalance > 0 ? input.baseBalance : null;
        return {
          mode,
          value: Math.max(0, targetValue),
          baseBalance
        };
      }
      function monthlyTargetStoreKey() {
        return `${state.user?.id || "local"}:${state.selectedMonth}`;
      }
      function readMonthlyTargetStore() {
        try {
          const parsed = JSON.parse(localStorage.getItem(monthlyTargetStorageKey) || "{}");
          const input = parsed && typeof parsed === "object" ? parsed : {};
          return Object.entries(input).reduce((store, [key, value]) => {
            store[key] = normalizeMonthlyTarget(value);
            return store;
          }, {});
        } catch {
          return {};
        }
      }
      function writeMonthlyTargetStore(store) {
        localStorage.setItem(monthlyTargetStorageKey, JSON.stringify(store));
      }
      function accountBalanceStoreKey() {
        return `${accountBalanceStorageKey}:${state.user?.id || "local"}`;
      }
      function loadAccountBalance() {
        const raw = localStorage.getItem(accountBalanceStoreKey());
        const parsed = raw ? Number(raw) : 0;
        state.accountBalance = Number.isFinite(parsed) ? parsed : 0;
        renderAccountBalance();
      }
      function saveAccountBalance(value) {
        state.accountBalance = value;
        localStorage.setItem(accountBalanceStoreKey(), String(value));
        renderAccountBalance();
      }
      function renderAccountBalance() {
        qs("#metricBalance").textContent = currency(state.accountBalance);
      }
      function openEditBalance() {
        qs("#editBalanceInput").value = state.accountBalance > 0 ? String(state.accountBalance) : "";
        qs("#editBalanceForm").removeAttribute("hidden");
        qs("#editBalanceButton").setAttribute("hidden", "true");
        qs("#editBalanceInput").focus();
      }
      function closeEditBalance() {
        qs("#editBalanceForm").setAttribute("hidden", "true");
        qs("#editBalanceButton").removeAttribute("hidden");
      }
      function handleEditBalanceSave(event) {
        event.preventDefault();
        const value = Number(qs("#editBalanceInput").value);
        if (!Number.isFinite(value) || value < 0) {
          showToast("Enter a valid balance.");
          return;
        }
        saveAccountBalance(value);
        closeEditBalance();
        showToast("Account balance updated.");
      }
      function loadMonthlyTargetForSelectedMonth() {
        const store = readMonthlyTargetStore();
        state.monthlyTarget = store[monthlyTargetStoreKey()] || defaultMonthlyTarget();
        syncMonthlyTargetControls();
      }
      function saveMonthlyTargetForSelectedMonth() {
        const store = readMonthlyTargetStore();
        const key = monthlyTargetStoreKey();
        if (state.monthlyTarget.value > 0 || state.monthlyTarget.baseBalance) {
          store[key] = state.monthlyTarget;
        } else {
          delete store[key];
        }
        writeMonthlyTargetStore(store);
      }
      function monthlyTargetFromControls() {
        const targetInput = qs("#monthlyTargetInput");
        const baseInput = qs("#monthlyTargetBaseInput");
        const targetValue = Number(targetInput.value);
        const baseBalance = Number(baseInput.value);
        return {
          mode: state.monthlyTarget.mode,
          value: Number.isFinite(targetValue) ? Math.max(0, targetValue) : 0,
          baseBalance: Number.isFinite(baseBalance) && baseBalance > 0 ? baseBalance : null
        };
      }
      function syncMonthlyTargetControls() {
        const target = state.monthlyTarget;
        const targetInput = qs("#monthlyTargetInput");
        const baseInput = qs("#monthlyTargetBaseInput");
        const baseField = qs("#monthlyTargetBaseField");
        const targetEditor = qs(".target-editor");
        targetInput.value = target.value > 0 ? String(target.value) : "";
        targetInput.placeholder = target.mode === "percent" ? "8" : "2500";
        baseInput.value = target.baseBalance ? String(target.baseBalance) : "";
        baseField.toggleAttribute("hidden", target.mode !== "percent");
        targetEditor.classList.toggle("has-base", target.mode === "percent");
        qsa("[data-target-mode]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.targetMode === target.mode);
        });
      }
      function monthlyTargetAmount(target) {
        if (target.value <= 0) return null;
        if (target.mode === "currency") return target.value;
        if (!target.baseBalance) return null;
        return target.baseBalance * (target.value / 100);
      }
      function remainingWeekdaysInSelectedMonth() {
        const today = /* @__PURE__ */ new Date();
        const todayMonth = monthKey(today);
        if (state.selectedMonth < todayMonth) return 0;
        const { year, month } = parseMonthKey(state.selectedMonth);
        const start = state.selectedMonth === todayMonth ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        let days = 0;
        for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          const weekday = cursor.getDay();
          if (weekday >= 1 && weekday <= 5) days += 1;
        }
        return days;
      }
      function shiftMonth(delta) {
        const { year, month } = parseMonthKey(state.selectedMonth);
        state.selectedMonth = monthKey(new Date(year, month + delta, 1));
        loadMonthlyTargetForSelectedMonth();
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
      function amountMeter(value) {
        if (value === 0) return 0;
        return Math.max(16, Math.min(100, Math.abs(value) / 35));
      }
      function setMeter(selector, value, isNegative = false) {
        const target = qs(selector);
        const panel = target.closest(".metric, .stat-panel");
        if (!panel) return;
        const clamped = Math.max(0, Math.min(100, value));
        panel.style.setProperty("--meter", `${clamped}%`);
        panel.classList.toggle("is-negative-meter", isNegative);
      }
      function renderDashboard() {
        const summary = stats();
        qs("#metricTrades").textContent = String(summary.total);
        qs("#metricWinRate").textContent = percent(summary.winRate);
        qs("#metricPnl").textContent = currency(summary.netPnl);
        qs("#metricRating").textContent = summary.averageRating ? summary.averageRating.toFixed(1) : "-";
        setMeter("#metricTrades", summary.total ? Math.min(100, summary.total * 8) : 0);
        setMeter("#metricWinRate", summary.winRate);
        renderWinRateGauge(summary);
        setMeter("#metricPnl", amountMeter(summary.netPnl), summary.netPnl < 0);
        setMeter("#metricRating", summary.averageRating ? summary.averageRating / 5 * 100 : 0);
        renderTraderLevel();
      }
      function traderLevelInfo() {
        const summary = stats();
        const ratingScore = summary.averageRating / 5 * 100;
        const score = Math.max(0, Math.min(100, summary.winRate * 0.6 + ratingScore * 0.4));
        let tier = "bronze";
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
      function renderWinRateGauge(summary) {
        const total = summary.total;
        const totalLength = Math.PI * winRateGaugeRadius;
        const winLen = total ? summary.wins / total * totalLength : 0;
        const beLen = total ? summary.breakeven / total * totalLength : 0;
        const lossLen = total ? summary.losses / total * totalLength : 0;
        const winArc = document.querySelector("#gaugeWinArc");
        const beArc = document.querySelector("#gaugeBreakevenArc");
        const lossArc = document.querySelector("#gaugeLossArc");
        if (!winArc || !beArc || !lossArc) return;
        winArc.style.strokeDasharray = `${winLen} ${totalLength - winLen}`;
        winArc.style.strokeDashoffset = "0";
        beArc.style.strokeDasharray = `${beLen} ${totalLength - beLen}`;
        beArc.style.strokeDashoffset = `${-winLen}`;
        lossArc.style.strokeDasharray = `${lossLen} ${totalLength - lossLen}`;
        lossArc.style.strokeDashoffset = `${-(winLen + beLen)}`;
        qs("#legendWins").textContent = String(summary.wins);
        qs("#legendBreakeven").textContent = String(summary.breakeven);
        qs("#legendLosses").textContent = String(summary.losses);
      }
      function renderTraderLevel() {
        const { score, tier, label } = traderLevelInfo();
        const circle = document.querySelector("#levelRingProgress");
        if (!circle) throw new Error("Missing element: #levelRingProgress");
        const radius = 52;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - score / 100);
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${offset}`;
        circle.classList.remove("level-tier-bronze", "level-tier-silver", "level-tier-gold", "level-tier-platinum", "level-tier-diamond");
        circle.classList.add(`level-tier-${tier}`);
        qs("#levelScore").textContent = String(Math.round(score));
        qs("#levelLabel").textContent = label;
      }
      function historySortValue(trade, key) {
        switch (key) {
          case "date":
            return `${trade.date} ${trade.time || ""}`;
          case "pair":
            return trade.pair;
          case "direction":
            return trade.direction;
          case "result":
            return trade.result;
          case "pnl":
            return trade.pnl;
          case "rr":
            return trade.plannedRr ?? -Infinity;
          case "rating":
            return trade.rating ?? 0;
          default:
            return "";
        }
      }
      function updateHistorySortIndicators() {
        qsa("th[data-sort]").forEach((th) => {
          const key = th.dataset.sort || "";
          const active = key === state.historySort.key;
          th.classList.toggle("is-sorted", active);
          th.classList.toggle("is-sorted-asc", active && state.historySort.direction === "asc");
          th.classList.toggle("is-sorted-desc", active && state.historySort.direction === "desc");
        });
      }
      function renderHistory() {
        const tbody = qs("#historyBody");
        const resultFilter = qs("#resultFilter").value;
        const search = qs("#searchTrades").value.trim().toLowerCase();
        const trades = state.trades.filter((trade) => {
          const matchesResult = resultFilter === "all" || trade.result === resultFilter;
          const text = `${trade.pair} ${trade.setup} ${trade.session} ${trade.notes}`.toLowerCase();
          return matchesResult && (!search || text.includes(search));
        }).sort((a, b) => {
          const { key, direction } = state.historySort;
          const valueA = historySortValue(a, key);
          const valueB = historySortValue(b, key);
          const compared = typeof valueA === "number" && typeof valueB === "number" ? valueA - valueB : String(valueA).localeCompare(String(valueB));
          return direction === "asc" ? compared : -compared;
        });
        updateHistorySortIndicators();
        renderHistorySummary(trades);
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
        cell.className = "actions-cell";
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "ghost compact view-trade-btn";
        viewButton.dataset.viewTrade = id;
        viewButton.textContent = "View";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ghost danger compact";
        button.dataset.deleteTrade = id;
        button.textContent = "Delete";
        cell.append(viewButton, button);
        return cell;
      }
      function fieldValue(label, value) {
        return `<div class="trade-detail-field"><span>${label}</span><strong>${value}</strong></div>`;
      }
      function renderTradeDetail(trade) {
        const body = qs("#tradeDetailBody");
        qs("#tradeDetailTitle").textContent = `${trade.pair} \xB7 ${trade.date}`;
        const overviewFields = [
          fieldValue("Date", `${trade.date}${trade.time ? ` ${trade.time}` : ""}`),
          fieldValue("Session", trade.session || "-"),
          fieldValue("Direction", trade.direction === "buy" ? "Buy / Long" : "Sell / Short"),
          fieldValue("Result", trade.result),
          fieldValue("P&L", currency(trade.pnl)),
          fieldValue("Rating", trade.rating ? `${trade.rating}/5` : "-")
        ].join("");
        const numbersFields = [
          fieldValue("Entry", trade.entryPrice != null ? String(trade.entryPrice) : "-"),
          fieldValue("Stop loss", trade.stopLoss != null ? String(trade.stopLoss) : "-"),
          fieldValue("Take profit", trade.takeProfit != null ? String(trade.takeProfit) : "-"),
          fieldValue("Lot size", trade.lotSize != null ? String(trade.lotSize) : "-"),
          fieldValue("Risk %", trade.riskPercent != null ? String(trade.riskPercent) : "-"),
          fieldValue("Planned R:R", trade.plannedRr ? `1:${trade.plannedRr}` : "-"),
          fieldValue("R:R achieved", trade.rrAchieved || "-"),
          fieldValue("Pips", trade.pips != null ? String(trade.pips) : "-"),
          fieldValue("Setup", trade.setup || "-")
        ].join("");
        const psychFields = [
          fieldValue("Emotion", trade.emotion || "-"),
          fieldValue("Sleep quality", trade.sleepQuality || "-"),
          fieldValue("Confidence", trade.confidence || "-")
        ].join("");
        const screenshots = trade.screenshots || { before: null, after: null, analysis: null };
        const shotEntries = [
          ["Before entry", screenshots.before],
          ["After exit", screenshots.after],
          ["Analysis", screenshots.analysis]
        ];
        const shotsHtml = shotEntries.filter(([, url]) => Boolean(url)).map(([label, url]) => `
      <figure>
        <a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${label}"></a>
        <figcaption>${label}</figcaption>
      </figure>
    `).join("");
        body.innerHTML = `
    <section class="trade-detail-section">
      <h3>Overview</h3>
      <div class="trade-detail-grid">${overviewFields}</div>
    </section>
    <section class="trade-detail-section">
      <h3>Trade numbers</h3>
      <div class="trade-detail-grid">${numbersFields}</div>
    </section>
    <section class="trade-detail-section">
      <h3>Psychology</h3>
      <div class="trade-detail-grid">${psychFields}</div>
    </section>
    ${trade.preTradeNotes ? `
      <section class="trade-detail-section">
        <h3>Pre-trade notes</h3>
        <div class="trade-detail-notes">${trade.preTradeNotes}</div>
      </section>` : ""}
    ${trade.notes ? `
      <section class="trade-detail-section">
        <h3>Post-trade notes</h3>
        <div class="trade-detail-notes">${trade.notes}</div>
      </section>` : ""}
    ${shotsHtml ? `
      <section class="trade-detail-section">
        <h3>Screenshots</h3>
        <div class="trade-detail-shots">${shotsHtml}</div>
      </section>` : ""}
  `;
      }
      function openTradeDetail(id) {
        const trade = state.trades.find((t) => t.id === id);
        if (!trade) return;
        renderTradeDetail(trade);
        qs("#tradeDetailModal").removeAttribute("hidden");
      }
      function closeTradeDetail() {
        qs("#tradeDetailModal").setAttribute("hidden", "true");
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
        setMeter("#analyticsRecord", summary.total ? summary.wins / summary.total * 100 : 0);
        setMeter("#analyticsPnl", amountMeter(summary.netPnl), summary.netPnl < 0);
        setMeter("#analyticsWinRate", summary.winRate);
        setMeter("#analyticsBestPair", summary.total ? Math.min(100, summary.total * 8) : 0);
        renderEquityCurve();
        renderPairBreakdown();
      }
      function dailyPnlSeries() {
        const daily = /* @__PURE__ */ new Map();
        tradesChronological(state.trades).forEach((trade) => {
          daily.set(trade.date, (daily.get(trade.date) || 0) + trade.pnl);
        });
        return Array.from(daily.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, pnl]) => ({ date, pnl }));
      }
      function cumulativePnlSeries() {
        let running = 0;
        return dailyPnlSeries().map(({ date, pnl }) => {
          running += pnl;
          return { date, cumulative: running };
        });
      }
      function maxDrawdown(series) {
        let peak = 0;
        let maxDd = 0;
        series.forEach((value) => {
          if (value > peak) peak = value;
          const drawdown = peak - value;
          if (drawdown > maxDd) maxDd = drawdown;
        });
        return maxDd;
      }
      function consistencyScore(dailyPnls) {
        if (dailyPnls.length < 2) return 50;
        const mean = dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length;
        const variance = dailyPnls.reduce((sum, v) => sum + (v - mean) ** 2, 0) / dailyPnls.length;
        const stdDev = Math.sqrt(variance);
        const denominator = Math.abs(mean) || 1;
        const volatilityRatio = stdDev / denominator;
        return Math.max(0, Math.min(100, 100 - volatilityRatio * 12));
      }
      function forexLabScore() {
        const summary = stats();
        const factor = profitFactor(state.trades);
        const ratio = avgWinLoss(state.trades).ratio;
        const cumulative = cumulativePnlSeries().map((p) => p.cumulative);
        const dd = maxDrawdown(cumulative);
        const netPnl = summary.netPnl;
        const dailyPnls = dailyPnlSeries().map((d) => d.pnl);
        const winRateScore = Math.max(0, Math.min(100, summary.winRate));
        const profitFactorScore = Number.isFinite(factor) ? Math.max(0, Math.min(100, factor * 25)) : 100;
        const avgWinLossScore = Number.isFinite(ratio) ? Math.max(0, Math.min(100, ratio * 25)) : 100;
        const consistency = consistencyScore(dailyPnls);
        const maxDrawdownScore = dd > 0 ? Math.max(0, 100 - Math.min(100, dd / (Math.abs(netPnl) || dd || 1) * 50)) : 100;
        const recoveryFactorRaw = dd > 0 ? netPnl / dd : netPnl > 0 ? Infinity : 0;
        const recoveryFactorScore = Number.isFinite(recoveryFactorRaw) ? Math.max(0, Math.min(100, recoveryFactorRaw * 20)) : 100;
        const overall = (winRateScore + profitFactorScore + avgWinLossScore + consistency + maxDrawdownScore + recoveryFactorScore) / 6;
        return {
          overall,
          winRate: winRateScore,
          profitFactor: profitFactorScore,
          avgWinLoss: avgWinLossScore,
          consistency,
          maxDrawdownScore,
          recoveryFactor: recoveryFactorScore
        };
      }
      function renderDashboardTab() {
        const summary = stats();
        const factor = profitFactor(state.trades);
        const ratio = avgWinLoss(state.trades).ratio;
        const dayStreak = currentDayStreak(state.trades);
        const tradeStreak = currentTradeStreak(state.trades);
        qs("#dashBalance").textContent = currency(state.accountBalance);
        qs("#dashWinRate").textContent = percent(summary.winRate);
        qs("#dashProfitFactor").textContent = formatRatio(factor);
        qs("#dashAvgWinLoss").textContent = formatRatio(ratio);
        const dayStreakEl = qs("#dashDayStreak");
        dayStreakEl.textContent = streakLabel(dayStreak, "days");
        dayStreakEl.classList.toggle("positive", dayStreak.type === "win");
        dayStreakEl.classList.toggle("negative", dayStreak.type === "loss");
        const tradeStreakEl = qs("#dashTradeStreak");
        tradeStreakEl.textContent = streakLabel(tradeStreak, "trades");
        tradeStreakEl.classList.toggle("positive", tradeStreak.type === "win");
        tradeStreakEl.classList.toggle("negative", tradeStreak.type === "loss");
        renderDashboardScoreChart();
        renderDashboardPnlChart();
      }
      function renderDashboardScoreChart() {
        const score = forexLabScore();
        qs("#dashboardScoreValue").textContent = score.overall.toFixed(2);
        const canvas = qs("#dashboardScoreRadar");
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue("--color-accent").trim() || "#22e08f";
        const muted = styles.getPropertyValue("--color-text-muted").trim() || "#8b978f";
        if (dashboardScoreChartInstance) dashboardScoreChartInstance.destroy();
        dashboardScoreChartInstance = new Chart(canvas, {
          type: "radar",
          data: {
            labels: ["Win %", "Profit factor", "Avg win/loss", "Consistency", "Max drawdown", "Recovery factor"],
            datasets: [
              {
                label: "Forex Lab Score",
                data: [
                  score.winRate,
                  score.profitFactor,
                  score.avgWinLoss,
                  score.consistency,
                  score.maxDrawdownScore,
                  score.recoveryFactor
                ],
                backgroundColor: `${accent}33`,
                borderColor: accent,
                pointBackgroundColor: accent
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                min: 0,
                max: 100,
                ticks: { display: false },
                pointLabels: { color: muted },
                grid: { color: "rgba(255,255,255,0.08)" },
                angleLines: { color: "rgba(255,255,255,0.08)" }
              }
            },
            plugins: { legend: { display: false } }
          }
        });
      }
      function renderDashboardPnlChart() {
        const series = cumulativePnlSeries();
        const canvas = qs("#dashboardPnlChart");
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue("--color-accent").trim() || "#22e08f";
        const muted = styles.getPropertyValue("--color-text-muted").trim() || "#8b978f";
        if (dashboardPnlChartInstance) dashboardPnlChartInstance.destroy();
        dashboardPnlChartInstance = new Chart(canvas, {
          type: "line",
          data: {
            labels: series.map((point) => dayLabel(point.date)),
            datasets: [
              {
                label: "Cumulative P&L",
                data: series.map((point) => point.cumulative),
                borderColor: accent,
                backgroundColor: `${accent}22`,
                fill: true,
                tension: 0.35,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { color: muted }, grid: { display: false } },
              y: { ticks: { color: muted }, grid: { color: "rgba(255,255,255,0.06)" } }
            },
            plugins: { legend: { display: false } }
          }
        });
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
        setMeter("#monthlyTotal", amountMeter(monthlyTotal), monthlyTotal < 0);
        setMeter("#monthlyTrades", monthTrades.length ? Math.min(100, monthTrades.length * 10) : 0);
        setMeter("#monthlyDays", dailyValues.length ? Math.min(100, dailyValues.length * 14) : 0);
        setMeter("#monthlyBestDay", bestDay ? amountMeter(bestDay[1].pnl) : 0, Boolean(bestDay && bestDay[1].pnl < 0));
        renderMonthlyGoal(monthlyTotal);
        renderMonthlyCalendar(daily);
        renderMonthlyDayList(daily);
        renderStreaks();
      }
      function renderMonthlyGoal(monthlyTotal) {
        const target = state.monthlyTarget;
        const targetAmount = monthlyTargetAmount(target);
        const progressBar = qs("#monthlyGoalProgressBar");
        const progressTrack = qs(".goal-progress-track");
        const status = qs("#monthlyGoalStatus");
        const progressValue = qs("#monthlyGoalProgressValue");
        const achieved = targetAmount ? monthlyTotal / targetAmount * 100 : 0;
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
        const goalDescription = target.mode === "percent" ? `${precisePercent(target.value)} target = ${currency(targetAmount)}` : `${currency(targetAmount)} target`;
        status.textContent = remaining <= 0 ? `${goalDescription} reached` : weekdaysRemaining > 0 ? `${goalDescription} over ${weekdaysRemaining} trading day${weekdaysRemaining === 1 ? "" : "s"}` : `${goalDescription} month closed`;
        qs("#monthlyGoalRemaining").textContent = currency(remaining);
        qs("#monthlyGoalPace").textContent = currency(dailyPace);
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
      function tradesChronological(trades) {
        return [...trades].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      }
      function profitFactor(trades) {
        const grossProfit = trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
        if (grossLoss <= 0) return grossProfit > 0 ? Infinity : 0;
        return grossProfit / grossLoss;
      }
      function avgWinLoss(trades) {
        const wins = trades.filter((t) => t.pnl > 0).map((t) => t.pnl);
        const losses = trades.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
        const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
        const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
        const ratio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
        return { avgWin, avgLoss, ratio };
      }
      function formatRatio(value) {
        if (!Number.isFinite(value)) return "\u221E";
        if (value === 0) return "-";
        return value.toFixed(2);
      }
      function currentTradeStreak(trades) {
        const ordered = tradesChronological(trades).filter((t) => t.result !== "breakeven");
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
      function currentDayStreak(trades) {
        const daily = /* @__PURE__ */ new Map();
        trades.forEach((trade) => {
          daily.set(trade.date, (daily.get(trade.date) || 0) + trade.pnl);
        });
        const days = Array.from(daily.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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
      function streakLabel(streak, unit) {
        if (streak.type === "none" || streak.count === 0) return "No streak";
        const noun = streak.count === 1 ? unit.replace(/s$/, "") : unit;
        return `${streak.count} ${streak.type === "win" ? "winning" : "losing"} ${noun}`;
      }
      function renderStreaks() {
        const tradeStreak = currentTradeStreak(state.trades);
        const dayStreak = currentDayStreak(state.trades);
        const tradesEl = qs("#streakTrades");
        tradesEl.textContent = streakLabel(tradeStreak, "trades");
        tradesEl.classList.toggle("positive", tradeStreak.type === "win");
        tradesEl.classList.toggle("negative", tradeStreak.type === "loss");
        const daysEl = qs("#streakDays");
        daysEl.textContent = streakLabel(dayStreak, "days");
        daysEl.classList.toggle("positive", dayStreak.type === "win");
        daysEl.classList.toggle("negative", dayStreak.type === "loss");
        setMeter("#streakTrades", tradeStreak.count ? Math.min(100, tradeStreak.count * 18) : 0, tradeStreak.type === "loss");
        setMeter("#streakDays", dayStreak.count ? Math.min(100, dayStreak.count * 22) : 0, dayStreak.type === "loss");
      }
      function renderHistorySummary(trades) {
        const wins = trades.filter((t) => t.result === "win").length;
        const total = trades.length;
        const winRate = total ? wins / total * 100 : 0;
        const factor = profitFactor(trades);
        const averageWinLoss = avgWinLoss(trades).ratio;
        qs("#historySummaryCount").textContent = String(total);
        qs("#historySummaryWinRate").textContent = percent(winRate);
        qs("#historySummaryProfitFactor").textContent = formatRatio(factor);
        qs("#historySummaryAvgWinLoss").textContent = formatRatio(averageWinLoss);
        setMeter("#historySummaryCount", total ? Math.min(100, total * 10) : 0);
        setMeter("#historySummaryWinRate", winRate);
        setMeter("#historySummaryProfitFactor", Number.isFinite(factor) ? Math.min(100, factor * 20) : 100);
        setMeter("#historySummaryAvgWinLoss", Number.isFinite(averageWinLoss) ? Math.min(100, averageWinLoss * 22) : 100);
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
          row.classList.toggle("is-negative-meter", item.pnl < 0);
          row.style.setProperty("--meter", `${Math.max(14, Math.min(100, Math.abs(item.pnl) / 35))}%`);
          list.append(row);
        });
      }
      var commandBarFiltered = [];
      var commandBarActiveIndex = 0;
      var dashboardScoreChartInstance = null;
      var dashboardPnlChartInstance = null;
      function commandItems() {
        return [
          { id: "dashboard", label: "Dashboard", hint: "Dashboard", keywords: "dashboard overview score summary", run: () => setTab("dashboard") },
          { id: "new-trade", label: "New trade", hint: "Log Trade", keywords: "new trade log add create", run: () => {
            setTab("log");
            qs("#pair").focus();
          } },
          { id: "history", label: "Trade history", hint: "History", keywords: "history trades review", run: () => setTab("history") },
          { id: "monthly", label: "Monthly P&L", hint: "Monthly", keywords: "monthly pnl target goal", run: () => setTab("monthly") },
          { id: "analytics", label: "Analytics", hint: "Analytics", keywords: "analytics equity pairs", run: () => setTab("analytics") },
          { id: "casestudy", label: "Case studies", hint: "Case Studies", keywords: "case study watch list observed", run: () => setTab("casestudy") },
          { id: "logout", label: "Log out", hint: "Account", keywords: "logout sign out exit", run: () => {
            logout().catch((error) => showToast(error.message));
          } }
        ];
      }
      function renderCommandBarList() {
        const list = qs("#commandBarList");
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
      function runCommand(item) {
        closeCommandBar();
        item.run();
      }
      function filterCommandBar(query) {
        const normalized = query.trim().toLowerCase();
        commandBarFiltered = commandItems().filter(
          (item) => !normalized || `${item.label} ${item.keywords}`.toLowerCase().includes(normalized)
        );
        commandBarActiveIndex = 0;
        renderCommandBarList();
      }
      function moveCommandBarSelection(delta) {
        if (!commandBarFiltered.length) return;
        commandBarActiveIndex = (commandBarActiveIndex + delta + commandBarFiltered.length) % commandBarFiltered.length;
        renderCommandBarList();
      }
      function openCommandBar() {
        if (!state.user) return;
        commandBarFiltered = commandItems();
        commandBarActiveIndex = 0;
        qs("#commandBar").removeAttribute("hidden");
        const input = qs("#commandBarInput");
        input.value = "";
        renderCommandBarList();
        window.setTimeout(() => input.focus(), 0);
      }
      function closeCommandBar() {
        qs("#commandBar").setAttribute("hidden", "true");
      }
      function currentTheme() {
        return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      }
      function updateThemeToggleIcon() {
        const icon = document.querySelector("#themeToggle .theme-toggle-icon");
        if (!icon) return;
        icon.textContent = currentTheme() === "light" ? "\u2600\uFE0F" : "\u{1F319}";
      }
      function toggleTheme() {
        const next = currentTheme() === "light" ? "dark" : "light";
        if (next === "light") {
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
        localStorage.setItem(themeStorageKey, next);
        updateThemeToggleIcon();
      }
      function toggleSidebarNav() {
        const app = qs("#appView");
        const button = qs("#sidebarNavToggle");
        const willOpen = app.classList.contains("sidebar-collapsed");
        app.classList.toggle("sidebar-collapsed", !willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
        button.setAttribute("aria-label", willOpen ? "Close navigation menu" : "Open navigation menu");
      }
      function toggleHamburgerMenu(forceClose = false) {
        const panel = qs("#hamburgerMenuPanel");
        const trigger = qs("#hamburgerMenuTrigger");
        const willOpen = forceClose ? false : panel.hasAttribute("hidden");
        panel.toggleAttribute("hidden", !willOpen);
        trigger.setAttribute("aria-expanded", String(willOpen));
        trigger.setAttribute("aria-label", willOpen ? "Close menu" : "Open menu");
      }
      function renderCaseStudies() {
        const list = qs("#caseStudyList");
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
          const screenshots = Array.isArray(item.screenshots) ? item.screenshots : [];
          if (screenshots.length > 0) {
            row.classList.add("has-image");
            const thumbStrip = document.createElement("div");
            thumbStrip.className = "cs-thumb-strip";
            screenshots.slice(0, 3).forEach((url, index) => {
              const thumbLink = document.createElement("a");
              thumbLink.href = url;
              thumbLink.target = "_blank";
              thumbLink.rel = "noopener";
              const thumbImg = document.createElement("img");
              thumbImg.className = "cs-thumb";
              thumbImg.src = url;
              thumbImg.alt = `${item.pair} ${item.setup} screenshot ${index + 1}`;
              thumbLink.append(thumbImg);
              thumbStrip.append(thumbLink);
            });
            if (screenshots.length > 3) {
              const more = document.createElement("span");
              more.className = "cs-thumb-more";
              more.textContent = `+${screenshots.length - 3}`;
              thumbStrip.append(more);
            }
            row.append(thumbStrip);
          }
          const badge = document.createElement("span");
          badge.className = `badge ${item.direction}`;
          badge.textContent = item.direction;
          const meta = document.createElement("div");
          meta.className = "cs-meta";
          const title = document.createElement("strong");
          title.textContent = `${item.pair} \xB7 ${item.setup}`;
          const sub = document.createElement("small");
          sub.textContent = `${item.date}${item.session ? ` \xB7 ${item.session}` : ""}`;
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
      function caseStudyPayload() {
        return {
          date: qs("#csDate").value,
          pair: qs("#csPair").value,
          session: qs("#csSession").value,
          direction: state.caseStudyDirection,
          setup: qs("#csSetup").value,
          notes: qs("#csNotes").value,
          screenshots: state.caseStudyScreenshots
        };
      }
      function resetCaseStudyForm() {
        qs("#caseStudyForm").reset();
        syncAllCustomSelects();
        state.caseStudyDirection = "buy";
        state.caseStudyScreenshots = [];
        setSegment("csdirection", "buy");
        qs("#csDate").value = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        renderCaseStudyScreenshotPreview();
      }
      async function loadCaseStudies() {
        const response = await api("/api/case-studies");
        state.caseStudies = response.caseStudies;
      }
      async function handleCaseStudySave(event) {
        event.preventDefault();
        await api("/api/case-studies", {
          method: "POST",
          body: JSON.stringify(caseStudyPayload())
        });
        await loadCaseStudies();
        renderCaseStudies();
        resetCaseStudyForm();
        showToast("Case study saved.");
      }
      async function deleteCaseStudy(id) {
        await api(`/api/case-studies/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadCaseStudies();
        renderCaseStudies();
        showToast("Case study deleted.");
      }
      function openEditName() {
        qs("#editNameInput").value = state.user?.name || "";
        qs("#editNameForm").removeAttribute("hidden");
        qs("#editNameButton").setAttribute("hidden", "true");
        qs("#editNameInput").focus();
      }
      function closeEditName() {
        qs("#editNameForm").setAttribute("hidden", "true");
        qs("#editNameButton").removeAttribute("hidden");
      }
      async function handleEditNameSave(event) {
        event.preventDefault();
        const name = qs("#editNameInput").value.trim();
        if (!name || name.length < 2) {
          showToast("Name must be at least 2 characters.");
          return;
        }
        const response = await api("/api/me", {
          method: "POST",
          body: JSON.stringify({ name })
        });
        state.user = response.user;
        qs("#userName").textContent = state.user.name;
        closeEditName();
        showToast("Name updated.");
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
        const coordinates = allValues.map((value, index) => {
          const x = index / Math.max(1, allValues.length - 1) * width;
          const y = height - (value - min) / range * height;
          return { x, y, value };
        });
        const points = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const areaPoints = `0,${height} ${points} ${width},${height}`;
        const gridLines = [0.25, 0.5, 0.75].map((ratio) => `<line class="equity-gridline" x1="0" y1="${(height * ratio).toFixed(1)}" x2="${width}" y2="${(height * ratio).toFixed(1)}" />`).join("");
        const nodes = coordinates.map(({ x, y }) => `<circle class="equity-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" />`).join("");
        const trendClass = values[values.length - 1] < 0 ? "is-negative-chart" : "is-positive-chart";
        chart.innerHTML = `
    <svg class="${trendClass}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Equity curve">
      <defs>
        <linearGradient id="equityAreaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.55"></stop>
          <stop offset="72%" stop-color="currentColor" stop-opacity="0.12"></stop>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      ${gridLines}
      <line class="equity-baseline" x1="0" y1="${height}" x2="${width}" y2="${height}" />
      <polygon class="equity-area" points="${areaPoints}" />
      <polyline class="equity-line" points="${points}" />
      ${nodes}
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
        loadAccountBalance();
        await loadCaseStudies();
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
        loadAccountBalance();
        await loadCaseStudies();
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
            if (tab === "dashboard" || tab === "log" || tab === "history" || tab === "monthly" || tab === "analytics" || tab === "casestudy") setTab(tab);
            const nav = document.querySelector("#sideNav");
            if (nav?.classList.contains("is-open")) toggleSidebarNav();
            toggleHamburgerMenu(true);
          });
        });
        qs("#themeToggle").addEventListener("click", toggleTheme);
        qs("#sidebarNavToggle").addEventListener("click", toggleSidebarNav);
        qs("#hamburgerMenuTrigger").addEventListener("click", () => toggleHamburgerMenu());
        document.addEventListener("click", (event) => {
          const target = event.target;
          const panel = qs("#hamburgerMenuPanel");
          const wrap = target.closest(".hamburger-wrap");
          if (!wrap && !panel.hasAttribute("hidden")) toggleHamburgerMenu(true);
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") toggleHamburgerMenu(true);
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
        qs("#csShotFileInput").addEventListener("change", (event) => {
          const input = event.currentTarget;
          if (input.files?.length) uploadCaseStudyScreenshots(input.files).catch((error) => showToast(error.message));
          input.value = "";
        });
        qs("#csShotAddMoreButton").addEventListener("click", (event) => {
          event.stopPropagation();
          qs("#csShotFileInput").click();
        });
        qs("#csShotEmptyState").addEventListener("click", () => {
          qs("#csShotFileInput").click();
        });
        const caseStudyDropzone = qs("#csShotDropzone");
        caseStudyDropzone.addEventListener("dragover", (event) => {
          event.preventDefault();
          caseStudyDropzone.classList.add("is-dragover");
        });
        caseStudyDropzone.addEventListener("dragleave", () => caseStudyDropzone.classList.remove("is-dragover"));
        caseStudyDropzone.addEventListener("drop", (event) => {
          event.preventDefault();
          caseStudyDropzone.classList.remove("is-dragover");
          const files = event.dataTransfer?.files;
          if (files?.length) uploadCaseStudyScreenshots(files).catch((error) => showToast(error.message));
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
        qs("#mobileThemeToggle").addEventListener("click", toggleTheme);
        qs("#mobileLogoutButton").addEventListener("click", () => {
          logout().catch((error) => showToast(error.message));
        });
        qs("#resetButton").addEventListener("click", resetTradeForm);
        qs("#resultFilter").addEventListener("change", renderHistory);
        qs("#searchTrades").addEventListener("input", renderHistory);
        qs("#monthPicker").addEventListener("change", (event) => {
          const value = event.currentTarget.value;
          state.selectedMonth = value || monthKey(/* @__PURE__ */ new Date());
          loadMonthlyTargetForSelectedMonth();
          renderMonthlyPnl();
        });
        qs("#prevMonth").addEventListener("click", () => shiftMonth(-1));
        qs("#nextMonth").addEventListener("click", () => shiftMonth(1));
        qs("#monthlyTargetInput").addEventListener("input", () => {
          state.monthlyTarget = monthlyTargetFromControls();
          saveMonthlyTargetForSelectedMonth();
          renderMonthlyPnl();
        });
        qs("#monthlyTargetBaseInput").addEventListener("input", () => {
          state.monthlyTarget = monthlyTargetFromControls();
          saveMonthlyTargetForSelectedMonth();
          renderMonthlyPnl();
        });
        qsa("[data-target-mode]").forEach((button) => {
          button.addEventListener("click", () => {
            const mode = button.dataset.targetMode === "percent" ? "percent" : "currency";
            state.monthlyTarget = { ...monthlyTargetFromControls(), mode };
            syncMonthlyTargetControls();
            saveMonthlyTargetForSelectedMonth();
            renderMonthlyPnl();
          });
        });
        document.addEventListener("click", (event) => {
          const target = event.target;
          const button = target.closest("[data-delete-trade]");
          if (button?.dataset.deleteTrade) {
            deleteTrade(button.dataset.deleteTrade).catch((error) => showToast(error.message));
          }
        });
        document.addEventListener("click", (event) => {
          const target = event.target;
          const viewButton = target.closest("[data-view-trade]");
          if (viewButton?.dataset.viewTrade) {
            openTradeDetail(viewButton.dataset.viewTrade);
          }
        });
        qs("#tradeDetailClose").addEventListener("click", closeTradeDetail);
        qs("#tradeDetailModal").addEventListener("click", (event) => {
          if (event.target === qs("#tradeDetailModal")) closeTradeDetail();
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeTradeDetail();
        });
        qsa("th[data-sort]").forEach((th) => {
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
        qs("#fabNewTrade").addEventListener("click", () => setTab("log"));
        qs("#commandBar").addEventListener("click", (event) => {
          if (event.target === qs("#commandBar")) closeCommandBar();
        });
        qs("#commandBarInput").addEventListener("input", (event) => {
          filterCommandBar(event.currentTarget.value);
        });
        qs("#commandBarInput").addEventListener("keydown", (event) => {
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
            const backdrop = qs("#commandBar");
            if (backdrop.hasAttribute("hidden")) openCommandBar();
            else closeCommandBar();
          }
        });
        qsa("[data-csdirection]").forEach((button) => {
          button.addEventListener("click", () => {
            state.caseStudyDirection = button.dataset.csdirection === "sell" ? "sell" : "buy";
            setSegment("csdirection", state.caseStudyDirection);
          });
        });
        qs("#caseStudyForm").addEventListener("submit", (event) => {
          handleCaseStudySave(event).catch((error) => showToast(error.message));
        });
        qs("#csResetButton").addEventListener("click", resetCaseStudyForm);
        qs("#editNameButton").addEventListener("click", openEditName);
        qs("#editNameCancel").addEventListener("click", closeEditName);
        qs("#editNameForm").addEventListener("submit", (event) => {
          handleEditNameSave(event).catch((error) => showToast(error.message));
        });
        qs("#editBalanceButton").addEventListener("click", openEditBalance);
        qs("#editBalanceCancel").addEventListener("click", closeEditBalance);
        qs("#editBalanceForm").addEventListener("submit", handleEditBalanceSave);
      }
      async function init() {
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
        renderCaseStudyScreenshotPreview();
        qs("#csDate").value = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
          loadAccountBalance();
          await loadCaseStudies();
        } catch {
          showAuth();
        }
      }
      init().catch((error) => showToast(error.message));
    }
  });
  require_client();
})();
