"use client";

import React, { useState, useMemo } from "react";
import { Trade } from "@/utils/types";
import { currency } from "@/utils/formatters";

interface Props {
  trades: Trade[];
  onDeleteTrade: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export default function TradeHistory({ trades, onDeleteTrade, onShowToast }: Props) {
  const [search, setSearch] = useState("");
  const [pairFilter, setPairFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"date" | "pnl" | "pair">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (pairFilter !== "all" && t.pair !== pairFilter) return false;
      if (sessionFilter !== "all" && t.session !== sessionFilter) return false;
      if (resultFilter !== "all" && t.result !== resultFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          t.pair.toLowerCase().includes(q) ||
          t.setup.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortKey === "date") {
        const valA = `${a.date} ${a.time}`;
        const valB = `${b.date} ${b.time}`;
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortKey === "pnl") {
        return sortDir === "asc" ? a.pnl - b.pnl : b.pnl - a.pnl;
      }
      return sortDir === "asc" ? a.pair.localeCompare(b.pair) : b.pair.localeCompare(a.pair);
    });
  }, [trades, pairFilter, sessionFilter, resultFilter, search, sortKey, sortDir]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this trade?")) return;
    try {
      await onDeleteTrade(id);
      onShowToast("Trade deleted.");
    } catch {
      onShowToast("Failed to delete trade.");
    }
  };

  const handleSort = (key: "date" | "pnl" | "pair") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>📜 Trade History</h2>
        <p>Complete log of executed trades with details &amp; notes.</p>
      </div>

      <div className="panel-toolbar">
        <div className="filters" style={{ flexWrap: "wrap", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search pair, setup, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "240px" }}
          />
          <select value={pairFilter} onChange={(e) => setPairFilter(e.target.value)}>
            <option value="all">All Pairs</option>
            <option value="EURUSD">EURUSD</option>
            <option value="GBPUSD">GBPUSD</option>
            <option value="USDJPY">USDJPY</option>
            <option value="XAUUSD">XAUUSD</option>
            <option value="GBPJPY">GBPJPY</option>
            <option value="USDCAD">USDCAD</option>
            <option value="AUDUSD">AUDUSD</option>
          </select>
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
            <option value="all">All Sessions</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Asian">Asian</option>
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="all">All Results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>
                Date / Time {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("pair")}>
                Pair {sortKey === "pair" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Session</th>
              <th>Direction</th>
              <th>Setup</th>
              <th>Outcome</th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("pnl")}>
                P&amp;L {sortKey === "pnl" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  No trades match this view.
                </td>
              </tr>
            ) : (
              filteredTrades.map((t) => (
                <React.Fragment key={t.id}>
                  <tr
                    style={{ cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <td>
                      <strong>{t.date}</strong>
                      <small style={{ display: "block", color: "var(--muted)" }}>{t.time || "-"}</small>
                    </td>
                    <td><strong>{t.pair}</strong></td>
                    <td>{t.session || "-"}</td>
                    <td>
                      <span className={`badge ${t.direction}`}>
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td>{t.setup}</td>
                    <td>
                      <span className={`badge ${t.result}`}>
                        {t.result.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong className={t.pnl > 0 ? "positive" : t.pnl < 0 ? "negative" : ""}>
                        {currency(t.pnl)}
                      </strong>
                    </td>
                    <td>{"★".repeat(t.rating || 3)}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost danger compact"
                        onClick={(e) => handleDelete(t.id, e)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={9} style={{ background: "rgba(var(--color-white-rgb) / 0.02)", padding: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "10px" }}>
                          <div><span className="muted-label">Entry:</span> <strong>{t.entryPrice || "-"}</strong></div>
                          <div><span className="muted-label">SL:</span> <strong>{t.stopLoss || "-"}</strong></div>
                          <div><span className="muted-label">TP:</span> <strong>{t.takeProfit || "-"}</strong></div>
                          <div><span className="muted-label">Planned RR:</span> <strong>{t.plannedRr ? `1:${t.plannedRr}` : "-"}</strong></div>
                        </div>
                        {t.preTradeNotes && (
                          <p style={{ margin: "6px 0", fontSize: "13px" }}>
                            <strong>Pre-Trade:</strong> {t.preTradeNotes}
                          </p>
                        )}
                        {t.notes && (
                          <p style={{ margin: "6px 0", fontSize: "13px" }}>
                            <strong>Notes:</strong> {t.notes}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
