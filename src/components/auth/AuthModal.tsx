"use client";

import React, { useState } from "react";
import { User } from "@/utils/types";

interface Props {
  onLoginSuccess: (user: User) => void;
  onShowToast: (msg: string) => void;
}

export default function AuthModal({ onLoginSuccess, onShowToast }: Props) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Login failed.");
        } else {
          onLoginSuccess(data.user);
          onShowToast(`Welcome back, ${data.user.name}!`);
        }
      } else if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Signup failed.");
        } else {
          onLoginSuccess(data.user);
          onShowToast(`Account created, welcome ${data.user.name}!`);
        }
      } else {
        const res = await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        onShowToast(data.message || "Reset link requested.");
        setMode("login");
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div className="panel" style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", margin: 0 }}>
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your journal" : "Reset password"}
          </h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: "14px" }}>
            {mode === "login"
              ? "Sign in to review your trading journal."
              : mode === "signup"
              ? "Start tracking trades with a private account."
              : "Enter your email to receive a password reset link."}
          </p>
        </div>

        <div className="segmented" style={{ marginBottom: "18px" }}>
          <button
            type="button"
            className={mode === "login" ? "is-active" : ""}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Create account
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(255, 84, 104, 0.15)", border: "1px solid var(--color-loss)", color: "var(--color-loss)", padding: "10px", borderRadius: "6px", marginBottom: "14px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          {mode === "signup" && (
            <label>
              Your Name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}
          <label>
            Email Address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
          )}

          <button type="submit" className="primary" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          {mode === "login" ? (
            <button type="button" className="ghost compact" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          ) : (
            <button type="button" className="ghost compact" onClick={() => setMode("login")}>
              Back to Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
