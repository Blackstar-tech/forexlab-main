"use client";

import React, { useState } from "react";
import { CaseStudy } from "@/utils/types";

interface Props {
  caseStudies: CaseStudy[];
  onSaveCaseStudy: (item: Partial<CaseStudy>) => Promise<void>;
  onDeleteCaseStudy: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export default function CaseStudyView({ caseStudies, onSaveCaseStudy, onDeleteCaseStudy, onShowToast }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pair, setPair] = useState("EURUSD");
  const [session, setSession] = useState("London");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [setup, setSetup] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl })
        });
        const data = await res.json();
        if (data.url) {
          setScreenshots((prev) => [...prev, data.url]);
          onShowToast("Screenshot added to case study!");
        }
      } catch {
        onShowToast("Failed to upload screenshot.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup.trim()) {
      onShowToast("Please enter a setup / theme.");
      return;
    }

    setSubmitting(true);
    try {
      await onSaveCaseStudy({
        date,
        pair,
        session,
        direction,
        setup: setup.trim(),
        notes,
        screenshots
      });
      setSetup("");
      setNotes("");
      setScreenshots([]);
      onShowToast("Case study saved!");
    } catch {
      onShowToast("Failed to save case study.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="analytics-layout">
      <div className="panel-title">
        <h2>🔬 Case Studies &amp; Playbook</h2>
        <p>Document ideal setups, playbook rules, and chart breakdowns.</p>
      </div>

      <form onSubmit={handleSubmit} className="panel">
        <h3>Create New Playbook Case Study</h3>
        <div className="form-grid three" style={{ marginTop: "12px" }}>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Pair
            <select value={pair} onChange={(e) => setPair(e.target.value)}>
              <option value="EURUSD">EURUSD</option>
              <option value="GBPUSD">GBPUSD</option>
              <option value="USDJPY">USDJPY</option>
              <option value="XAUUSD">XAUUSD</option>
              <option value="GBPJPY">GBPJPY</option>
              <option value="USDCAD">USDCAD</option>
              <option value="AUDUSD">AUDUSD</option>
            </select>
          </label>
          <label>
            Session
            <select value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Asian">Asian</option>
            </select>
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: "10px" }}>
          <label>
            Setup Name / Key Concept
            <input
              type="text"
              placeholder="e.g. Liquidity sweep into 15m order block"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              required
            />
          </label>
          <label>
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as "buy" | "sell")}>
              <option value="buy">BUY / LONG</option>
              <option value="sell">SELL / SHORT</option>
            </select>
          </label>
        </div>

        <label style={{ marginTop: "10px" }}>
          Detailed Playbook Notes &amp; Rules
          <textarea
            rows={3}
            placeholder="Key indicators, confluence list, entry triggers, invalidation conditions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div style={{ marginTop: "12px" }}>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
          {screenshots.length > 0 && (
            <p style={{ fontSize: "12px", color: "var(--accent)", marginTop: "4px" }}>
              ✓ {screenshots.length} screenshot(s) attached
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Case Study"}
          </button>
        </div>
      </form>

      <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
        {caseStudies.length === 0 ? (
          <article className="panel">
            <p style={{ color: "var(--muted)", margin: 0 }}>No case studies created yet.</p>
          </article>
        ) : (
          caseStudies.map((cs) => (
            <article key={cs.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{cs.setup}</h3>
                  <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: "13px" }}>
                    {cs.pair} • {cs.session} • {cs.date} • <span className={`badge ${cs.direction}`}>{cs.direction.toUpperCase()}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost danger compact"
                  onClick={() => onDeleteCaseStudy(cs.id)}
                >
                  Delete
                </button>
              </div>
              {cs.notes && <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.5 }}>{cs.notes}</p>}
              {cs.screenshots && cs.screenshots.length > 0 && (
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                  {cs.screenshots.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Screenshot ${idx + 1}`}
                        style={{ height: "90px", borderRadius: "6px", border: "1px solid var(--line)" }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
