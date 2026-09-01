"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  defaultSymbol?: string;
}

const POPULAR_PAIRS = [
  { label: "EUR/USD", symbol: "FX:EURUSD" },
  { label: "GBP/USD", symbol: "FX:GBPUSD" },
  { label: "USD/JPY", symbol: "FX:USDJPY" },
  { label: "Gold (XAU)", symbol: "OANDA:XAUUSD" },
  { label: "GBP/JPY", symbol: "FX:GBPJPY" },
  { label: "USD/CAD", symbol: "FX:USDCAD" },
  { label: "AUD/USD", symbol: "FX:AUDUSD" },
  { label: "BTC/USD", symbol: "BINANCE:BTCUSDT" }
];

export default function TradingViewTab({ defaultSymbol = "FX:EURUSD" }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      setTheme(isLight ? "light" : "dark");
    };
    updateTheme();
    window.addEventListener("themechange", updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("themechange", updateTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous widget instance
    el.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";
    el.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: selectedSymbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    el.appendChild(script);

    return () => {
      if (el) {
        el.innerHTML = "";
      }
    };
  }, [selectedSymbol, theme]);

  return (
    <section className="panel" style={{ padding: "22px", display: "flex", flexDirection: "column", minHeight: "800px" }}>
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2>🕯️ Live TradingView Terminal</h2>
          <p>Interactive charting and technical analysis embedded directly in your journal.</p>
        </div>
        <div className="segmented" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {POPULAR_PAIRS.map((pair) => (
            <button
              key={pair.symbol}
              type="button"
              className={selectedSymbol === pair.symbol ? "is-active" : ""}
              onClick={() => setSelectedSymbol(pair.symbol)}
            >
              {pair.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ flex: 1, minHeight: "680px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--line)" }}
      />
    </section>
  );
}
