"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Trade, TabKey } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";

interface Props {
  user: User | null;
  trades: Trade[];
  accountBalance: number;
  startingBalance: number;
  onUpdateBalance: (newBalance: number) => void;
  onLogout: () => void;
  selectedMonth: string;
  isMonthlyView: boolean;
  navItems: { key: TabKey; icon: string; label: string }[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export default function Header({
  user,
  trades,
  accountBalance,
  startingBalance,
  onUpdateBalance,
  onLogout,
  selectedMonth,
  isMonthlyView,
  navItems,
  activeTab,
  onTabChange
}: Props) {
  const [editingBalance, setEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(startingBalance.toString());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("forexlab.theme");
    let initialTheme: "dark" | "light" = "dark";
    if (stored === "light" || stored === "dark") {
      initialTheme = stored;
    } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      initialTheme = "light";
    }
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("forexlab.theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
  };

  const displayTrades = isMonthlyView
    ? trades.filter((t) => t.date.startsWith(selectedMonth))
    : trades;

  const total = displayTrades.length;
  const wins = displayTrades.filter((t) => t.result === "win").length;
  const losses = displayTrades.filter((t) => t.result === "loss").length;
  const breakeven = displayTrades.filter((t) => t.result === "breakeven").length;
  const winRate = total ? (wins / total) * 100 : 0;
  const netPnl = displayTrades.reduce((sum, t) => sum + t.pnl, 0);
  const rated = displayTrades.filter((t) => t.rating > 0);
  const avgRating = rated.length ? (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1) : "-";

  const monthLabel = (() => {
    if (!isMonthlyView) return null;
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const date = new Date(year, monthIndex, 1);
    const monthName = date.toLocaleString("en-US", { month: "long" });
    return `Stats for ${monthName} ${year}`;
  })();

  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempBalance);
    if (!isNaN(val) && val >= 0) {
      onUpdateBalance(val);
    }
    setEditingBalance(false);
  };

  return (
    <header className="topbar-section" style={{ marginBottom: "20px" }}>
      <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="hamburger-wrap" ref={menuRef}>
          <button
            type="button"
            className="hamburger-btn ghost"
            aria-expanded={menuOpen}
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hamburger-icon">
              <span />
              <span />
              <span />
            </span>
          </button>
          {menuOpen && (
            <div className="hamburger-menu-panel">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeTab === item.key ? "is-active" : ""}
                  onClick={() => { onTabChange(item.key); setMenuOpen(false); }}
                >
                  <span style={{ marginRight: "8px" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--line)", margin: "6px 0" }} />
              <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "24px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Welcome, <span>{user?.name || "Trader"}</span>
          </h1>
        </div>

        <div className="topbar-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>ACCOUNT BALANCE</span>
              {editingBalance ? (
                <form onSubmit={handleBalanceSubmit} style={{ display: "inline-flex", gap: "6px" }}>
                  <input
                    type="number"
                    value={tempBalance}
                    onChange={(e) => setTempBalance(e.target.value)}
                    style={{ width: "120px", padding: "4px 8px" }}
                    autoFocus
                  />
                  <button type="submit" className="primary compact">Save</button>
                </form>
              ) : (
                <strong
                  onClick={() => { setTempBalance(startingBalance.toString()); setEditingBalance(true); }}
                  style={{ cursor: "pointer", color: "var(--text)", textDecoration: "underline dotted" }}
                  title="Click to edit balance"
                >
                  {currency(accountBalance)} ✏️
                </strong>
              )}
            </div>
            {!editingBalance && (
              <small className="balance-starting-note" style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                Starting: {currency(startingBalance)}
              </small>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
            style={{ margin: 0 }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button type="button" className="ghost compact topbar-signout-desktop" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {isMonthlyView && monthLabel && (
        <div style={{ marginTop: "16px", fontSize: "13px", color: "var(--muted)" }}>
          {monthLabel}
        </div>
      )}

      <section className="metrics-grid" style={{ marginTop: "16px" }}>
        <article className="metric">
          <span>TOTAL TRADES</span>
          <strong>{total}</strong>
        </article>

        <article className="metric">
          <span>WIN RATE</span>
          <strong className="positive">{percent(winRate)}</strong>
          <small style={{ display: "block", color: "var(--muted)", fontSize: "11px", marginTop: "4px" }}>
            {wins} WIN • {breakeven} BE • {losses} LOSS
          </small>
        </article>

        <article className="metric">
          <span>NET P&amp;L</span>
          <strong className={netPnl >= 0 ? "positive" : "negative"}>
            {currency(netPnl)}
          </strong>
        </article>

        <article className="metric">
          <span>AVG RATING</span>
          <strong>{avgRating} {avgRating !== "-" && "★"}</strong>
        </article>
      </section>
    </header>
  );
}