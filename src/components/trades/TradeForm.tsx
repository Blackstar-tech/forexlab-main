"use client";

import React, { useState } from "react";
import { Trade, ShotTab } from "@/utils/types";

interface Props {
  onSaveTrade: (tradeData: Partial<Trade>) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export default function TradeForm({ onSaveTrade, onShowToast }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(now);
  const [session, setSession] = useState("London");
  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [result, setResult] = useState<"win" | "loss" | "breakeven">("win");
  const [setup, setSetup] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [pips, setPips] = useState("");
  const [pnl, setPnl] = useState("");
  const [emotion, setEmotion] = useState("calm");
  const [sleepQuality, setSleepQuality] = useState("good");
  const [confidence, setConfidence] = useState("high");
  const [rating, setRating] = useState(3);
  const [preTradeNotes, setPreTradeNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [activeShot, setActiveShot] = useState<ShotTab>("before");
  const [screenshots, setScreenshots] = useState<{ before: string[]; after: string[]; analysis: string[] }>({
    before: [],
    after: [],
    analysis: []
  });

  const [submitting, setSubmitting] = useState(false);

  // Compute planned RR dynamically
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);
  let plannedRr: number | null = null;
  if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp)) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk > 0) plannedRr = parseFloat((reward / risk).toFixed(2));
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl })
        });
        const data = await res.json();
        if (data.url) uploadedUrls.push(data.url);
      } catch {
        onShowToast(`Failed to upload one of the screenshots.`);
      }
    }

    if (uploadedUrls.length > 0) {
      setScreenshots((prev) => ({
        ...prev,
        [activeShot]: [...prev[activeShot], ...uploadedUrls]
      }));
      onShowToast(`${uploadedUrls.length} screenshot${uploadedUrls.length > 1 ? "s" : ""} uploaded!`);
    }

    // reset the input so selecting the same file again still fires onChange
    e.target.value = "";
  };

  const handleRemoveScreenshot = (tab: ShotTab, index: number) => {
    setScreenshots((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup.trim()) {
      onShowToast("Please enter a setup / strategy.");
      return;
    }

    setSubmitting(true);
    try {
      await onSaveTrade({
        date,
        time,
        session,
        pair,
        direction,
        result,
        setup: setup.trim(),
        entryPrice: entry || null,
        stopLoss: sl || null,
        takeProfit: tp || null,
        lotSize: parseFloat(lotSize) || null,
        riskPercent: parseFloat(riskPercent) || null,
        plannedRr,
        pips: parseFloat(pips) || null,
        pnl: parseFloat(pnl) || 0,
        emotion,
        sleepQuality,
        confidence,
        rating,
        preTradeNotes,
        notes,
        screenshots
      });

      // Reset form
      setSetup("");
      setEntryPrice("");
      setStopLoss("");
      setTakeProfit("");
      setLotSize("");
      setRiskPercent("");
      setPips("");
      setPnl("");
      setPreTradeNotes("");
      setNotes("");
      setScreenshots({ before: [], after: [], analysis: [] });
      onShowToast("Trade logged successfully!");
    } catch {
      onShowToast("Failed to save trade.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="journal-form">
      <section className="panel">
        <div className="panel-title">
          <h2>📋 Trade Details</h2>
          <p>Core execution data.</p>
        </div>

        <div className="mini-header"><span>Date &amp; time</span></div>
        <div className="form-grid three">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label>
            Session
            <select value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Asian">Asian</option>
              <option value="London Close">London Close</option>
            </select>
          </label>
        </div>

        <div className="mini-header"><span>Instrument &amp; direction</span></div>
        <div className="form-grid">
          <label>
            Pair / instrument
            <select value={pair} onChange={(e) => setPair(e.target.value)}>
              <option value="EURUSD">EURUSD</option>
              <option value="GBPUSD">GBPUSD</option>
              <option value="USDJPY">USDJPY</option>
              <option value="XAUUSD">XAUUSD (Gold)</option>
              <option value="GBPJPY">GBPJPY</option>
              <option value="USDCAD">USDCAD</option>
              <option value="AUDUSD">AUDUSD</option>
              <option value="NAS100">NAS100</option>
              <option value="US30">US30</option>
              <option value="BTCUSD">BTCUSD</option>
            </select>
          </label>
          <label>
            Setup / strategy
            <input
              type="text"
              placeholder="e.g. 15m FVG Sweep, Order Block"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="segmented-row">
          <span>Direction</span>
          <div className="segmented">
            <button
              type="button"
              className={direction === "buy" ? "is-active" : ""}
              onClick={() => setDirection("buy")}
            >
              📈 BUY / LONG
            </button>
            <button
              type="button"
              className={direction === "sell" ? "is-active" : ""}
              onClick={() => setDirection("sell")}
            >
              📉 SELL / SHORT
            </button>
          </div>
        </div>

        <div className="mini-header"><span>Trade Numbers</span></div>
        <div className="form-grid three">
          <label>
            Entry price
            <input type="number" step="any" placeholder="0.00" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          </label>
          <label>
            Stop loss
            <input type="number" step="any" placeholder="0.00" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </label>
          <label>
            Take profit
            <input type="number" step="any" placeholder="0.00" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
          </label>
        </div>

        <div className="form-grid three">
          <label>
            Lot size
            <input type="number" step="any" placeholder="0.10" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
          </label>
          <label>
            Risk %
            <input type="number" step="any" placeholder="1.0" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} />
          </label>
          <label>
            Planned R:R
            <input type="text" readOnly value={plannedRr !== null ? `1:${plannedRr}` : "-"} />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Pips
            <input type="number" step="any" placeholder="0" value={pips} onChange={(e) => setPips(e.target.value)} />
          </label>
          <label>
            P&amp;L ($)
            <input type="number" step="any" placeholder="0.00" value={pnl} onChange={(e) => setPnl(e.target.value)} required />
          </label>
        </div>

        <div className="segmented-row">
          <span>Outcome</span>
          <div className="segmented result">
            <button
              type="button"
              className={result === "win" ? "is-active" : ""}
              onClick={() => setResult("win")}
            >
              WIN
            </button>
            <button
              type="button"
              className={result === "breakeven" ? "is-active" : ""}
              onClick={() => setResult("breakeven")}
            >
              BREAKEVEN
            </button>
            <button
              type="button"
              className={result === "loss" ? "is-active" : ""}
              onClick={() => setResult("loss")}
            >
              LOSS
            </button>
          </div>
        </div>

        <div className="mini-header"><span>Psychology &amp; Star Rating</span></div>
        <div className="form-grid three">
          <label>
            Emotion / Mood
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              <option value="calm">Calm / Neutral</option>
              <option value="confident">Confident</option>
              <option value="disciplined">Disciplined</option>
              <option value="anxious">Anxious / Fearful</option>
              <option value="greedy">Greedy / FOMO</option>
              <option value="frustrated">Frustrated</option>
            </select>
          </label>
          <label>
            Sleep quality
            <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)}>
              <option value="great">Great (&gt;8h)</option>
              <option value="good">Good (7-8h)</option>
              <option value="fair">Fair (5-6h)</option>
              <option value="poor">Poor (&lt;5h)</option>
            </select>
          </label>
          <label>
            Confidence
            <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        <div className="segmented-row">
          <span>Execution Rating</span>
          <div className="rating-buttons">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={rating === star ? "is-active" : ""}
                onClick={() => setRating(star)}
              >
                {star}★
              </button>
            ))}
          </div>
        </div>

        <div className="mini-header"><span>Notes &amp; Screenshots</span></div>
        <label>
          Pre-trade notes
          <textarea
            rows={2}
            placeholder="Higher timeframe bias, news check, key levels..."
            value={preTradeNotes}
            onChange={(e) => setPreTradeNotes(e.target.value)}
          />
        </label>
        <label style={{ marginTop: "12px" }}>
          Post-trade execution notes
          <textarea
            rows={3}
            placeholder="What went well? Did you follow rules? Mistakes made..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="screenshots-panel" style={{ marginTop: "16px" }}>
          <div className="segmented">
            {(["before", "after", "analysis"] as ShotTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeShot === tab ? "is-active" : ""}
                onClick={() => setActiveShot(tab)}
                style={{ textTransform: "capitalize" }}
              >
                {tab} {screenshots[tab].length > 0 && `(${screenshots[tab].length})`}
              </button>
            ))}
          </div>

          <label
            htmlFor="screenshot-upload"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "12px",
              padding: "24px",
              borderRadius: "10px",
              border: "1.5px dashed rgba(var(--color-white-rgb) / 0.15)",
              background: "rgba(var(--color-white-rgb) / 0.02)",
              cursor: "pointer",
              textAlign: "center"
            }}
          >
            <span style={{ fontSize: "20px" }}>📎</span>
            <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600 }}>
              Click to upload screenshots
            </span>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              You can select multiple images at once for &quot;{activeShot}&quot;
            </span>
            <input
              id="screenshot-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>

          {screenshots[activeShot].length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                gap: "10px",
                marginTop: "14px"
              }}
            >
              {screenshots[activeShot].map((url, index) => (
                <div
                  key={`${activeShot}-${index}`}
                  style={{
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid rgba(var(--color-white-rgb) / 0.1)",
                    aspectRatio: "1 / 1"
                  }}
                >
                  <img
                    src={url}
                    alt={`${activeShot} screenshot ${index + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveScreenshot(activeShot, index)}
                    title="Remove screenshot"
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      fontSize: "12px",
                      lineHeight: "20px",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Saving Trade..." : "Save Trade Execution"}
          </button>
        </div>
      </section>
    </form>
  );
}