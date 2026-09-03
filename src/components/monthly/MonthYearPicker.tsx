"use client";

import React, { useState, useRef, useEffect } from "react";

interface Props {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthYearPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseInt(value.split("-")[0], 10));
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedYear, selectedMonthNum] = value.split("-").map((v) => parseInt(v, 10));

  // Keep the visible year in sync if the selected value changes externally
  useEffect(() => {
    setViewYear(selectedYear);
  }, [selectedYear]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMonthClick = (monthIndex: number) => {
    const monthStr = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${monthStr}`);
    setOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, "0");
    setViewYear(now.getFullYear());
    onChange(`${now.getFullYear()}-${monthStr}`);
    setOpen(false);
  };

  const triggerLabel = `${FULL_MONTHS[selectedMonthNum - 1]} ${selectedYear}`;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: "999px",
          border: "1px solid rgba(var(--color-white-rgb) / 0.1)",
          background: "rgba(var(--color-white-rgb) / 0.04)",
          color: "var(--text)",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer"
        }}
      >
        {triggerLabel}
        <span style={{ fontSize: "13px", opacity: 0.7 }}>📅</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            width: "260px",
            background: "var(--panel-bg, #14171c)",
            border: "1px solid rgba(var(--color-white-rgb) / 0.1)",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            padding: "14px"
          }}
        >
          {/* Year nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px"
            }}
          >
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous year"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px 8px"
              }}
            >
              ‹
            </button>
            <strong style={{ color: "var(--text)", fontSize: "14px" }}>{viewYear}</strong>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Next year"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px 8px"
              }}
            >
              ›
            </button>
          </div>

          {/* Month grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "6px",
              marginBottom: "12px"
            }}
          >
            {MONTHS.map((label, i) => {
              const isSelected = viewYear === selectedYear && i + 1 === selectedMonthNum;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleMonthClick(i)}
                  style={{
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: isSelected
                      ? "1px solid var(--accent)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "var(--accent)"
                      : "transparent",
                    color: isSelected
                      ? "#04140c"
                      : "var(--text)",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(var(--color-white-rgb) / 0.06)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid rgba(var(--color-white-rgb) / 0.08)",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "flex-start"
            }}
          >
            <button
              type="button"
              onClick={handleThisMonth}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0
              }}
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}