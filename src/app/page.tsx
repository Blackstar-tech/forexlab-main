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
import CalculatorView from "@/components/calculator/CalculatorView";

const NAV_ITEMS: { key: TabKey; icon: string; label: string }[] = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "log", icon: "📋", label: "Log Trade" },
  { key: "history", icon: "📜", label: "History" },
  { key: "monthly", icon: "📅", label: "Monthly P&L" },
  { key: "calculator", icon: "🧮", label: "Calculator" },
  { key: "analytics", icon: "📈", label: "Analytics" },
  { key: "casestudy", icon: "🔬", label: "Case Studies" },
  { key: "tradingview", icon: "🕯️", label: "TradingView" }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const accountBalance = startingBalance + trades.reduce((sum, t) => sum + t.pnl, 0);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

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
        setStartingBalance(0);
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

      // Load balance from storage scoped to current user
      if (meData.user?.id) {
        const storedBalance = localStorage.getItem(`forexlab.accountBalance.${meData.user.id}`);
        if (storedBalance !== null) {
          const parsed = parseFloat(storedBalance);
          setStartingBalance(!isNaN(parsed) ? parsed : 0);
        } else {
          // Brand new account defaults to zero
          setStartingBalance(0);
        }
      } else {
        setStartingBalance(0);
      }
    } catch {
      setUser(null);
      setStartingBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleUpdateBalance = (newStartingBalance: number) => {
    setStartingBalance(newStartingBalance);
    if (user?.id) {
      localStorage.setItem(`forexlab.accountBalance.${user.id}`, newStartingBalance.toString());
    } else {
      localStorage.setItem("forexlab.accountBalance.v1", newStartingBalance.toString());
    }
    showToast(`Starting balance updated to $${newStartingBalance.toLocaleString()}`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTrades([]);
    setCaseStudies([]);
    setStartingBalance(0);
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
    return (
      <AuthModal
        onLoginSuccess={(u) => {
          setUser(u);
          const userBalance = localStorage.getItem(`forexlab.accountBalance.${u.id}`);
          setStartingBalance(userBalance !== null && !isNaN(parseFloat(userBalance)) ? parseFloat(userBalance) : 0);
          loadUserData();
        }}
        onShowToast={showToast}
      />
    );
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeTab === item.key ? "is-active" : ""}
              onClick={() => setActiveTab(item.key)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
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
          startingBalance={startingBalance}
          onUpdateBalance={handleUpdateBalance}
          onLogout={handleLogout}
          selectedMonth={selectedMonth}
          isMonthlyView={activeTab === "monthly"}
          navItems={NAV_ITEMS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
          <MonthlyView
            trades={trades}
            accountBalance={accountBalance}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            userId={user?.id}
            onShowToast={showToast}
          />
        )}
        {activeTab === "calculator" && (
          <CalculatorView
            trades={trades}
            accountBalance={accountBalance}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            userId={user?.id}
            onShowToast={showToast}
          />
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