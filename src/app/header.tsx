"use client";

import React, { useState } from "react";
import { User, Trade } from "@/utils/types";
import { currency, percent } from "@/utils/formatters";

interface Props {
  user: User | null;
  trades: Trade[];
  accountBalance: number;
  onUpdateBalance: (newBalance: number) => void;
  onLogout: () => void;
}

export default function Header({
  user,
  trades,
  accountBalance,
  onUpdateBalance,
  onLogout
}: Props) {
  const [editingBalance, setEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(accountBalance.toString());

  const total = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const breakeven = trades.filter((t) => t.result === "breakeven").length;
  const winRate = total ? (wins / total) * 100 : 0;
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const rated = trades.filter((t) => t.rating > 0);
  const avgRating = rated.length ? (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1) : "-";

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
        <div>
          <h1 style={{ fontSize: "24px", margin: 0 }}>
            Welcome, <span>{user?.name || "Trader"}</span>
          </h1>
        </div>

        <div className="topbar-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
                onClick={() => { setTempBalance(accountBalance.toString()); setEditingBalance(true); }}
                style={{ cursor: "pointer", color: "var(--text)", textDecoration: "underline dotted" }}
                title="Click to edit balance"
              >
                {currency(accountBalance)} ✏️
              </strong>
            )}
          </div>
          <button type="button" className="ghost compact" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

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
