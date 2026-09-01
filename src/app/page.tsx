"use client";

import React, { useEffect, useState, useCallback } from "react";
import { User, Trade, CaseStudy, TabKey } from "@/utils/types";
import Header from "./header";
import Footer from "./footer";
import AuthModal from "@/components/auth/AuthModal";
import DashboardTab from "@/components/dashboard/DashboardTab";
import TradeForm from "@/components/trades/TradeForm";
import TradeHistory from "@/components/history/TradeHistory";
import MonthlyView from "@/components/monthly/MonthlyView";
import AnalyticsView from "@/components/analytics/AnalyticsView";
import CaseStudyView from "@/components/casestudy/CaseStudyView";
import TradingViewTab from "@/components/tradingview/TradingViewTab";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(50000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("forexlab.sidebarCollapsed");
    if (saved === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setUser(null);
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      // Load trades
      const tradesRes = await fetch("/api/trades");
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setTrades(tradesData.trades || []);
      }

      // Load case studies
      const csRes = await fetch("/api/casestudies");
      if (csRes.ok) {
        const csData = await csRes.json();
        setCaseStudies(csData.caseStudies || []);
      }

      // Load balance from storage
      const storedBalance = localStorage.getItem("forexlab.accountBalance.v1");
      if (storedBalance) {
        const parsed = parseFloat(storedBalance);
        if (!isNaN(parsed)) setAccountBalance(parsed);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleUpdateBalance = (newBalance: number) => {
    setAccountBalance(newBalance);
    localStorage.setItem("forexlab.accountBalance.v1", newBalance.toString());
    showToast(`Account balance updated to $${newBalance.toLocaleString()}`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTrades([]);
    setCaseStudies([]);
    showToast("Signed out.");
  };

  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tradeData)
    });
    if (!res.ok) throw new Error("Failed to save trade");
    const data = await res.json();
    setTrades((prev) => [data.trade, ...prev]);
  };

  const handleDeleteTrade = async (id: string) => {
    const res = await fetch(`/api/trades?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete trade");
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveCaseStudy = async (item: Partial<CaseStudy>) => {
    const res = await fetch("/api/casestudies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error("Failed to save case study");
    const data = await res.json();
    setCaseStudies((prev) => [data.caseStudy, ...prev]);
  };

  const handleDeleteCaseStudy = async (id: string) => {
    const res = await fetch(`/api/casestudies?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete case study");
    setCaseStudies((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--accent)" }}>
        <p>Loading ForexLab Journal...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={(u) => { setUser(u); loadUserData(); }} onShowToast={showToast} />;
  }

  return (
    <div className={`app-view ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand-mark small">FX</div>
          <div>
            <strong>ForexLab</strong>
            <span>PRO JOURNAL</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-nav-toggle"
          onClick={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            localStorage.setItem("forexlab.sidebarCollapsed", next ? "true" : "false");
          }}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span>Navigation</span>
          <span className="sidebar-nav-toggle-icon" />
        </button>

        <nav className="side-nav">
          <button
            type="button"
            className={activeTab === "dashboard" ? "is-active" : ""}
            onClick={() => setActiveTab("dashboard")}
            title="Dashboard"
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </button>
          <button
            type="button"
            className={activeTab === "log" ? "is-active" : ""}
            onClick={() => setActiveTab("log")}
            title="Log Trade"
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Log Trade</span>
          </button>
          <button
            type="button"
            className={activeTab === "history" ? "is-active" : ""}
            onClick={() => setActiveTab("history")}
            title="History"
          >
            <span className="nav-icon">📜</span>
            <span className="nav-label">History</span>
          </button>
          <button
            type="button"
            className={activeTab === "monthly" ? "is-active" : ""}
            onClick={() => setActiveTab("monthly")}
            title="Monthly P&L"
          >
            <span className="nav-icon">📅</span>
            <span className="nav-label">Monthly P&amp;L</span>
          </button>
          <button
            type="button"
            className={activeTab === "analytics" ? "is-active" : ""}
            onClick={() => setActiveTab("analytics")}
            title="Analytics"
          >
            <span className="nav-icon">📈</span>
            <span className="nav-label">Analytics</span>
          </button>
          <button
            type="button"
            className={activeTab === "casestudy" ? "is-active" : ""}
            onClick={() => setActiveTab("casestudy")}
            title="Case Studies"
          >
            <span className="nav-icon">🔬</span>
            <span className="nav-label">Case Studies</span>
          </button>
          <button
            type="button"
            className={activeTab === "tradingview" ? "is-active" : ""}
            onClick={() => setActiveTab("tradingview")}
            title="TradingView"
          >
            <span className="nav-icon">🕯️</span>
            <span className="nav-label">TradingView</span>
          </button>
        </nav>

        <div className="sidebar-logout">
          <button type="button" className="ghost danger" style={{ width: "100%" }} onClick={handleLogout} title="Sign Out">
            <span className="nav-icon" style={{ display: "none" }}>🚪</span>
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <Header
          user={user}
          trades={trades}
          accountBalance={accountBalance}
          onUpdateBalance={handleUpdateBalance}
          onLogout={handleLogout}
        />

        {activeTab === "dashboard" && (
          <DashboardTab trades={trades} accountBalance={accountBalance} />
        )}
        {activeTab === "log" && (
          <TradeForm onSaveTrade={handleSaveTrade} onShowToast={showToast} />
        )}
        {activeTab === "history" && (
          <TradeHistory trades={trades} onDeleteTrade={handleDeleteTrade} onShowToast={showToast} />
        )}
        {activeTab === "monthly" && (
          <MonthlyView trades={trades} accountBalance={accountBalance} />
        )}
        {activeTab === "analytics" && (
          <AnalyticsView trades={trades} />
        )}
        {activeTab === "casestudy" && (
          <CaseStudyView
            caseStudies={caseStudies}
            onSaveCaseStudy={handleSaveCaseStudy}
            onDeleteCaseStudy={handleDeleteCaseStudy}
            onShowToast={showToast}
          />
        )}
        {activeTab === "tradingview" && (
          <TradingViewTab />
        )}

        <Footer />
      </main>

      {toastMessage && (
        <div className="toast is-visible">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
