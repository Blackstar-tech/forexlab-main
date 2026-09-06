"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Trade, TabKey, BalanceCheckpoint } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";

interface Props {
  user: User | null;
  trades: Trade[];
  accountBalance: number;
  startingBalance: number;
  checkpoints?: BalanceCheckpoint[];
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
  checkpoints = [],
  onUpdateBalance,
  onLogout,
  selectedMonth,
  isMonthlyView,
  navItems,
  activeTab,
  onTabChange
}: Props) {
  const [editingBalance, setEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(accountBalance.toString());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const latestCheckpoint =
    checkpoints && checkpoints.length > 0
      ? [...checkpoints].sort((a, b) => {
          const diff =
            new Date(b.effectiveFrom).getTime() -
            new Date(a.effectiveFrom).getTime();

          if (diff !== 0) return diff;

          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
        })[0]
      : null;

  useEffect(() => {
    setTempBalance(accountBalance.toString());
  }, [accountBalance]);

  useEffect(() => {
    const stored = localStorage.getItem("forexlab.theme");

    let initialTheme: "dark" | "light" = "dark";

    if (stored === "light" || stored === "dark") {
      initialTheme = stored;
    } else if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      initialTheme = "light";
    }

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);

    localStorage.setItem("forexlab.theme", nextTheme);

    document.documentElement.setAttribute(
      "data-theme",
      nextTheme
    );

    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { theme: nextTheme }
      })
    );
  };

  const displayTrades = isMonthlyView
    ? trades.filter((t) => t.date.startsWith(selectedMonth))
    : trades;

  const total = displayTrades.length;

  const wins = displayTrades.filter(
    (t) => t.result === "win"
  ).length;

  const losses = displayTrades.filter(
    (t) => t.result === "loss"
  ).length;

  const breakeven = displayTrades.filter(
    (t) => t.result === "breakeven"
  ).length;

  const winRate = total ? (wins / total) * 100 : 0;

  const netPnl = displayTrades.reduce(
    (sum, t) => sum + t.pnl,
    0
  );

  const rated = displayTrades.filter((t) => t.rating > 0);

  const avgRating = rated.length
    ? (
        rated.reduce((sum, t) => sum + t.rating, 0) /
        rated.length
      ).toFixed(1)
    : "-";

  const monthLabel = (() => {
    if (!isMonthlyView) return null;

    const [yearStr, monthStr] = selectedMonth.split("-");

    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;

    const date = new Date(year, monthIndex, 1);

    const monthName = date.toLocaleString(
      "en-US",
      {
        month: "long"
      }
    );

    return `Stats for ${monthName} ${year}`;
  })();

  const handleBalanceSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const val = parseFloat(tempBalance);

    if (!isNaN(val) && val >= 0) {
      onUpdateBalance(val);
    }

    setEditingBalance(false);
  };

  return (
    <>
      <header className="forexlab-header">
        <div className="forexlab-header-inner">

          {/* LEFT SIDE */}
          <div className="header-left">

            {/* HAMBURGER MENU */}
            <div
              className="hamburger-wrap"
              ref={menuRef}
            >
              <button
                type="button"
                className="premium-menu-button"
                aria-expanded={menuOpen}
                aria-label="Open navigation menu"
                onClick={() =>
                  setMenuOpen((v) => !v)
                }
              >
                <span className="premium-menu-icon">
                  <span />
                  <span />
                  <span />
                </span>
              </button>

              {menuOpen && (
                <div className="premium-menu-panel">

                  <button
                    type="button"
                    className="menu-theme-button"
                    onClick={toggleTheme}
                    title={
                      theme === "dark"
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    }
                    aria-label="Toggle theme"
                  >
                    <span>
                      {theme === "dark"
                        ? "☀️"
                        : "🌙"}
                    </span>

                    {theme === "dark"
                      ? "Light Mode"
                      : "Dark Mode"}
                  </button>

                  <div className="menu-divider" />

                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={
                        activeTab === item.key
                          ? "menu-nav-item active"
                          : "menu-nav-item"
                      }
                      onClick={() => {
                        onTabChange(item.key);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="menu-item-icon">
                        {item.icon}
                      </span>

                      {item.label}
                    </button>
                  ))}

                  <div className="menu-divider" />

                  <button
                    type="button"
                    className="menu-logout-button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                  >
                    Sign Out
                  </button>

                </div>
              )}
            </div>

            {/* BRAND */}
            <div className="premium-brand">

              <div className="brand-main-row">

                <svg
                  className="brand-chart-icon"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="28"
                    width="10"
                    height="17"
                    rx="2"
                  />

                  <rect
                    x="19"
                    y="17"
                    width="10"
                    height="28"
                    rx="2"
                  />

                  <rect
                    x="35"
                    y="5"
                    width="10"
                    height="40"
                    rx="2"
                  />
                </svg>

                <div className="brand-name">
                  Forex<span>Lab</span>
                </div>

              </div>

              <div className="brand-tagline">
                <span>TRADE</span>
                <i />
                <span>JOURNAL</span>
                <i />
                <span>IMPROVE</span>
              </div>

            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="header-right">

            {/* BALANCE */}
            <div className="premium-balance">

              {editingBalance ? (
                <form
                  className="balance-edit-form"
                  onSubmit={handleBalanceSubmit}
                >
                  <input
                    type="number"
                    step="any"
                    value={tempBalance}
                    onChange={(e) =>
                      setTempBalance(e.target.value)
                    }
                    autoFocus
                  />

                  <button
                    type="submit"
                    className="balance-save"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    className="balance-cancel"
                    onClick={() =>
                      setEditingBalance(false)
                    }
                  >
                    ×
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="balance-display"
                  onClick={() => {
                    setTempBalance(
                      accountBalance.toString()
                    );

                    setEditingBalance(true);
                  }}
                  title="Click to edit balance"
                >

                  {/* WALLET ICON */}
                  <svg
                    className="balance-wallet-icon"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="3"
                      y="7"
                      width="26"
                      height="20"
                      rx="4"
                    />

                    <path
                      d="M3 12H25C27.2 12 29 13.8 29 16V18"
                    />

                    <circle
                      cx="24"
                      cy="18"
                      r="1.5"
                    />
                  </svg>

                  <div className="balance-text">
                    <strong>
                      {currency(accountBalance)}
                    </strong>

                    <small>
                      {latestCheckpoint
                        ? `Checkpoint: ${currency(
                            latestCheckpoint.balance
                          )}`
                        : `Starting: ${currency(
                            startingBalance
                          )}`}
                    </small>
                  </div>

                  {/* EDIT ICON */}
                  <svg
                    className="balance-edit-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M4 20H8L19 9L15 5L4 16V20Z" />
                    <path d="M13.5 6.5L17.5 10.5" />
                  </svg>

                </button>
              )}

            </div>

            {/* SIGN OUT - TEXT ONLY */}
            <button
              type="button"
              className="premium-signout"
              onClick={onLogout}
            >
              Sign Out
            </button>

          </div>
        </div>

        {isMonthlyView && monthLabel && (
          <div className="monthly-label">
            {monthLabel}
          </div>
        )}
      </header>

      {/* METRICS */}
      <section className="metrics-grid">

        <article className="metric">
          <span>TOTAL TRADES</span>
          <strong>{total}</strong>
        </article>

        <article className="metric">
          <span>WIN RATE</span>

          <strong className="positive">
            {percent(winRate)}
          </strong>

          <small>
            {wins} WIN • {breakeven} BE • {losses} LOSS
          </small>
        </article>

        <article className="metric">
          <span>NET P&amp;L</span>

          <strong
            className={
              netPnl >= 0
                ? "positive"
                : "negative"
            }
          >
            {currency(netPnl)}
          </strong>
        </article>

        <article className="metric">
          <span>AVG RATING</span>

          <strong>
            {avgRating}
            {avgRating !== "-" && " ★"}
          </strong>
        </article>

      </section>

      <style>{`
        .forexlab-header {
          width: 100%;
          margin-bottom: 18px;
          padding: 10px 0 0;
        }

        .forexlab-header-inner {
          width: 100%;
          min-height: 118px;
          padding: 20px 28px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;

          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(45, 211, 160, 0.06),
              transparent 38%
            ),
            linear-gradient(
              135deg,
              rgba(10, 17, 20, 0.98),
              rgba(5, 10, 13, 0.98)
            );

          border: 1px solid var(--line);
          border-radius: 22px;

          box-shadow:
            0 16px 45px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 26px;
          min-width: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 18px;
        }

        /* MENU */

        .hamburger-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .premium-menu-button {
          width: 74px;
          height: 74px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          border: 1px solid rgba(135, 157, 165, 0.28);

          background:
            linear-gradient(
              145deg,
              rgba(19, 29, 33, 0.95),
              rgba(7, 13, 16, 0.95)
            );

          cursor: pointer;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .premium-menu-button:hover {
          transform: translateY(-1px);

          border-color:
            color-mix(
              in srgb,
              var(--positive) 50%,
              var(--line)
            );

          box-shadow:
            0 0 25px
            color-mix(
              in srgb,
              var(--positive) 10%,
              transparent
            );
        }

        .premium-menu-icon {
          width: 28px;

          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .premium-menu-icon span {
          display: block;

          width: 100%;
          height: 3px;

          border-radius: 99px;

          background: var(--text);
        }

        .premium-menu-panel {
          position: absolute;
          z-index: 100;

          top: calc(100% + 12px);
          left: 0;

          width: 240px;
          padding: 10px;

          border-radius: 16px;
          border: 1px solid var(--line);

          background: rgba(9, 15, 18, 0.98);

          box-shadow:
            0 22px 60px rgba(0, 0, 0, 0.4);

          backdrop-filter: blur(20px);
        }

        .premium-menu-panel button {
          width: 100%;

          border: none;
          background: transparent;

          padding: 12px 13px;

          border-radius: 10px;

          color: var(--text);
          text-align: left;

          cursor: pointer;

          transition: background 0.2s ease;
        }

        .premium-menu-panel button:hover {
          background:
            color-mix(
              in srgb,
              var(--positive) 9%,
              transparent
            );
        }

        .menu-theme-button {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .menu-nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menu-nav-item.active {
          background:
            color-mix(
              in srgb,
              var(--positive) 12%,
              transparent
            ) !important;

          color: var(--positive) !important;
        }

        .menu-item-icon {
          width: 24px;
        }

        .menu-logout-button {
          color: #ff6b6b !important;
        }

        .menu-divider {
          height: 1px;
          margin: 7px 2px;

          background: var(--line);
        }

        /* BRAND */

        .premium-brand {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .brand-main-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-chart-icon {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
        }

        .brand-chart-icon rect {
          fill: var(--positive);
        }

        .brand-name {
          font-size: clamp(28px, 3vw, 48px);
          font-weight: 750;
          letter-spacing: -2px;
          line-height: 0.95;

          color: var(--text);
        }

        .brand-name span {
          color: var(--positive);
        }

        .brand-tagline {
          display: flex;
          align-items: center;
          gap: 13px;

          padding-left: 3px;

          font-size: 10px;
          font-weight: 700;
          letter-spacing: 4px;

          color: var(--muted);
        }

        .brand-tagline i {
          width: 4px;
          height: 4px;

          border-radius: 50%;

          background: var(--positive);
          opacity: 0.8;
        }

        /* BALANCE */

        .premium-balance {
          min-width: 300px;
          min-height: 76px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 24px;

          border-radius: 999px;

          border: 1px solid
            color-mix(
              in srgb,
              var(--positive) 40%,
              var(--line)
            );

          background:
            radial-gradient(
              circle at 50%,
              color-mix(
                in srgb,
                var(--positive) 10%,
                transparent
              ),
              transparent 70%
            );

          box-shadow:
            inset 0 0 30px
            color-mix(
              in srgb,
              var(--positive) 4%,
              transparent
            );
        }

        .balance-display {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 14px;

          padding: 0;

          border: none;
          background: transparent;

          cursor: pointer;
          color: var(--text);
        }

        .balance-wallet-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
        }

        .balance-wallet-icon rect,
        .balance-wallet-icon path,
        .balance-wallet-icon circle {
          stroke: var(--positive);
          stroke-width: 1.8;
        }

        .balance-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .balance-text strong {
          font-size: 26px;
          font-weight: 750;
          letter-spacing: -0.5px;

          color: var(--text);
        }

        .balance-text small {
          margin-top: 2px;

          font-size: 12px;

          color: var(--muted);
        }

        .balance-edit-icon {
          width: 27px;
          height: 27px;

          flex-shrink: 0;
        }

        .balance-edit-icon path {
          stroke: var(--positive);
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .balance-edit-form {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;
        }

        .balance-edit-form input {
          width: 130px;
          padding: 10px 12px;

          border-radius: 10px;
          border: 1px solid var(--line);

          background: rgba(0, 0, 0, 0.2);

          color: var(--text);
        }

        .balance-save,
        .balance-cancel {
          border: none;

          padding: 9px 12px;

          border-radius: 9px;

          cursor: pointer;
        }

        .balance-save {
          background: var(--positive);
          color: #04110c;
          font-weight: 700;
        }

        .balance-cancel {
          background: transparent;
          color: var(--muted);
        }

        /* SIGN OUT - TEXT ONLY */

        .premium-signout {
          min-width: 160px;
          height: 76px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 28px;

          border-radius: 999px;

          border: 1px solid
            color-mix(
              in srgb,
              var(--text) 18%,
              var(--line)
            );

          background:
            linear-gradient(
              145deg,
              rgba(17, 27, 31, 0.7),
              rgba(6, 12, 15, 0.75)
            );

          color: var(--text);

          font-size: 16px;
          font-weight: 650;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .premium-signout:hover {
          transform: translateY(-1px);

          border-color:
            color-mix(
              in srgb,
              var(--positive) 40%,
              var(--line)
            );

          background:
            color-mix(
              in srgb,
              var(--positive) 5%,
              transparent
            );
        }

        /* MONTH LABEL */

        .monthly-label {
          margin-top: 12px;
          padding: 0 4px;

          font-size: 13px;
          color: var(--muted);
        }

        /* METRICS */

        .metrics-grid {
          margin-top: 16px;
        }

        /* TABLET */

        @media (max-width: 1100px) {
          .forexlab-header-inner {
            padding: 20px;
          }

          .premium-balance {
            min-width: 240px;
          }

          .premium-signout {
            min-width: 135px;
          }

          .brand-name {
            font-size: 32px;
          }
        }

        /* MOBILE */

        @media (max-width: 820px) {
          .forexlab-header-inner {
            flex-direction: column;
            align-items: stretch;

            padding: 18px;
          }

          .header-left {
            width: 100%;
            justify-content: space-between;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .premium-balance {
            flex: 1;
            min-width: 0;
          }

          .premium-signout {
            min-width: 120px;
          }
        }

        @media (max-width: 560px) {
          .forexlab-header-inner {
            border-radius: 18px;
            padding: 14px;
          }

          .header-left {
            gap: 14px;
          }

          .premium-menu-button {
            width: 54px;
            height: 54px;
          }

          .premium-menu-icon {
            width: 22px;
            gap: 5px;
          }

          .brand-chart-icon {
            width: 38px;
            height: 38px;
          }

          .brand-name {
            font-size: 26px;
            letter-spacing: -1px;
          }

          .brand-tagline {
            font-size: 7px;
            letter-spacing: 2px;
            gap: 7px;
          }

          .brand-tagline i {
            width: 3px;
            height: 3px;
          }

          .header-right {
            gap: 10px;
          }

          .premium-balance {
            min-height: 62px;
            padding: 0 13px;
          }

          .balance-wallet-icon {
            width: 29px;
            height: 29px;
          }

          .balance-text strong {
            font-size: 18px;
          }

          .balance-text small {
            font-size: 9px;
          }

          .balance-edit-icon {
            width: 20px;
            height: 20px;
          }

          .premium-signout {
            min-width: 100px;
            height: 62px;
            padding: 0 16px;

            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}