"use client";

import React, { useState, useMemo } from "react";
import { Trade, BalanceCheckpoint } from "@/utils/types";
import { currency } from "@/utils/formatters";

interface Props {
  trades: Trade[];
  checkpoints?: BalanceCheckpoint[];
  onDeleteTrade: (id: string) => Promise<void>;
  onDeleteCheckpoint?: (id: string) => Promise<void>;
  onAddCheckpoint?: (balance: number, effectiveFrom?: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

type TimelineItem =
  | { type: "trade"; key: string; dateSortKey: string; data: Trade }
  | { type: "checkpoint"; key: string; dateSortKey: string; data: BalanceCheckpoint };

export default function TradeHistory({
  trades,
  checkpoints = [],
  onDeleteTrade,
  onDeleteCheckpoint,
  onAddCheckpoint,
  onShowToast
}: Props) {
  const [search, setSearch] = useState("");
  const [pairFilter, setPairFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"date" | "pnl" | "pair">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [cpBalance, setCpBalance] = useState("");
  const [cpDate, setCpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cpTime, setCpTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [savingCp, setSavingCp] = useState(false);

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

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const tradeItems: TimelineItem[] = filteredTrades.map((t) => ({
      type: "trade",
      key: `trade-${t.id}`,
      dateSortKey: `${t.date} ${t.time || "00:00"}`,
      data: t
    }));

    const hasSpecificFilter = pairFilter !== "all" || sessionFilter !== "all" || resultFilter !== "all";
    if (hasSpecificFilter || !checkpoints || checkpoints.length === 0 || sortKey !== "date") {
      return tradeItems;
    }

    const matchingCheckpoints = checkpoints.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const dateStr = c.effectiveFrom.slice(0, 10);
      return (
        "balance".includes(q) ||
        "checkpoint".includes(q) ||
        "manually".includes(q) ||
        dateStr.includes(q) ||
        c.balance.toString().includes(q)
      );
    });

    const checkpointItems: TimelineItem[] = matchingCheckpoints.map((c) => {
      const timePart = c.effectiveFrom.includes("T") ? c.effectiveFrom.slice(11, 16) : "00:00";
      const datePart = c.effectiveFrom.slice(0, 10);
      return {
        type: "checkpoint",
        key: `checkpoint-${c.id}`,
        dateSortKey: `${datePart} ${timePart}`,
        data: c
      };
    });

    return [...tradeItems, ...checkpointItems].sort((a, b) => {
      return sortDir === "asc"
        ? a.dateSortKey.localeCompare(b.dateSortKey)
        : b.dateSortKey.localeCompare(a.dateSortKey);
    });
  }, [filteredTrades, checkpoints, sortKey, sortDir, pairFilter, sessionFilter, resultFilter, search]);

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

  const handleCreateCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(cpBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      onShowToast("Please enter a valid balance amount.");
      return;
    }
    if (!onAddCheckpoint) return;

    try {
      setSavingCp(true);
      const effectiveIso = cpDate
        ? new Date(`${cpDate}T${cpTime || "00:00"}:00`).toISOString()
        : new Date().toISOString();
      await onAddCheckpoint(balanceNum, effectiveIso);
      setCpBalance("");
      setShowCheckpointForm(false);
      onShowToast(`Balance checkpoint set to $${balanceNum.toLocaleString()}`);
    } catch {
      onShowToast("Failed to create balance checkpoint.");
    } finally {
      setSavingCp(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>📜 Trade History</h2>
          <p>Complete log of executed trades with details &amp; notes.</p>
        </div>
        {onAddCheckpoint && (
          <button
            type="button"
            className={showCheckpointForm ? "compact" : "ghost compact"}
            onClick={() => setShowCheckpointForm((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>📍</span> {showCheckpointForm ? "Close Checkpoint Form" : "Set Balance Checkpoint"}
          </button>
        )}
      </div>

      {showCheckpointForm && onAddCheckpoint && (
        <form
          onSubmit={handleCreateCheckpointSubmit}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "flex-end",
            padding: "14px 16px",
            marginBottom: "16px",
            background: "rgba(34, 224, 143, 0.06)",
            border: "1px solid rgba(34, 224, 143, 0.3)",
            borderRadius: "6px"
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
              NEW BALANCE ($)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 10000"
              value={cpBalance}
              onChange={(e) => setCpBalance(e.target.value)}
              style={{ width: "140px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
              EFFECTIVE DATE
            </label>
            <input
              type="date"
              required
              value={cpDate}
              onChange={(e) => setCpDate(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
              TIME (OPTIONAL)
            </label>
            <input
              type="time"
              value={cpTime}
              onChange={(e) => setCpTime(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="primary compact" disabled={savingCp}>
              {savingCp ? "Saving..." : "Save Checkpoint"}
            </button>
            <button
              type="button"
              className="ghost compact"
              onClick={() => setShowCheckpointForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
            {timelineItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  No trades match this view.
                </td>
              </tr>
            ) : (
              timelineItems.map((item) => {
                if (item.type === "checkpoint") {
                  const c = item.data;
                  const dateStr = c.effectiveFrom.includes("T") ? c.effectiveFrom.slice(0, 10) : c.effectiveFrom;
                  const timeStr = c.effectiveFrom.includes("T") ? c.effectiveFrom.slice(11, 16) : "";
                  return (
                    <tr key={item.key} className="checkpoint-marker-row">
                      <td colSpan={9} style={{ padding: "8px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                            padding: "10px 14px",
                            background: "rgba(34, 224, 143, 0.08)",
                            border: "1px solid rgba(34, 224, 143, 0.28)",
                            borderLeft: "4px solid var(--accent)",
                            borderRadius: "6px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "16px" }}>📍</span>
                            <div>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                                Balance manually set to{" "}
                                <strong style={{ color: "var(--color-profit)", fontFamily: "var(--font-mono)" }}>
                                  {currency(c.balance)}
                                </strong>
                              </span>
                              <small style={{ display: "block", color: "var(--muted)", fontSize: "11px", marginTop: "2px" }}>
                                Balance Checkpoint • Trade P&amp;L from {dateStr} onward calculates toward current balance
                              </small>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                background: "rgba(34, 224, 143, 0.15)",
                                color: "var(--color-profit)",
                                fontWeight: 700,
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase"
                              }}
                            >
                              CHECKPOINT
                            </span>
                            <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                              {dateStr}{timeStr ? ` ${timeStr}` : ""}
                            </span>
                            {onDeleteCheckpoint && (
                              <button
                                type="button"
                                className="ghost danger compact"
                                style={{ padding: "3px 8px", fontSize: "11px" }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Are you sure you want to delete this balance checkpoint?")) return;
                                  try {
                                    await onDeleteCheckpoint(c.id);
                                    onShowToast("Balance checkpoint deleted.");
                                  } catch {
                                    onShowToast("Failed to delete checkpoint.");
                                  }
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const t = item.data;
                return (
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
