"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError("Invalid or missing reset link.");
      setCheckingToken(false);
      return;
    }

    let isMounted = true;
    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (isMounted) {
          if (!res.ok || !data.valid) {
            setTokenError(data.error || "Reset link is invalid or has expired.");
          }
          setCheckingToken(false);
        }
      } catch {
        if (isMounted) {
          setTokenError("Could not verify reset link. Please check your internet connection.");
          setCheckingToken(false);
        }
      }
    }

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccessMessage(data.message || "Password updated successfully! Redirecting to sign in...");
        setPassword("");
        setConfirmPassword("");
        // Redirect back to login after 2.5 seconds
        setTimeout(() => {
          router.push("/");
        }, 2500);
      }
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-view"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px"
      }}
    >
      <div className="panel" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px"
            }}
          >
            <div className="brand-mark small">FX</div>
            <strong style={{ fontSize: "17px", letterSpacing: "-0.02em" }}>ForexLab</strong>
          </div>
          <h1 style={{ fontSize: "22px", margin: 0 }}>Set a new password</h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: "14px" }}>
            Choose a strong password to secure your trading journal.
          </p>
        </div>

        {/* Loading Token Check */}
        {checkingToken && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
            <p>Verifying your reset link...</p>
          </div>
        )}

        {/* Invalid or Expired Token Error */}
        {!checkingToken && tokenError && (
          <div>
            <div
              style={{
                background: "rgba(255, 84, 104, 0.15)",
                border: "1px solid var(--color-loss)",
                color: "var(--color-loss)",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "18px",
                fontSize: "13px",
                lineHeight: "1.5"
              }}
            >
              {tokenError}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", marginBottom: "18px" }}>
              Please request a new reset link from the sign-in page.
            </p>
            <Link
              href="/"
              className="primary"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                width: "100%"
              }}
            >
              Back to Sign in
            </Link>
          </div>
        )}

        {/* Success State */}
        {!checkingToken && !tokenError && successMessage && (
          <div>
            <div
              style={{
                background: "rgba(34, 224, 143, 0.15)",
                border: "1px solid var(--color-profit)",
                color: "var(--color-profit)",
                padding: "14px",
                borderRadius: "6px",
                marginBottom: "18px",
                fontSize: "13px",
                lineHeight: "1.5",
                textAlign: "center"
              }}
            >
              {successMessage}
            </div>
            <Link
              href="/"
              className="primary"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                width: "100%"
              }}
            >
              Sign In Now &rarr;
            </Link>
          </div>
        )}

        {/* Password Reset Form */}
        {!checkingToken && !tokenError && !successMessage && (
          <>
            {error && (
              <div
                style={{
                  background: "rgba(255, 84, 104, 0.15)",
                  border: "1px solid var(--color-loss)",
                  color: "var(--color-loss)",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  fontSize: "13px"
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
              <label>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                />
              </label>

              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </label>

              <button
                type="submit"
                className="primary"
                disabled={loading}
                style={{ width: "100%", marginTop: "8px" }}
              >
                {loading ? "Updating password..." : "Update Password"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <Link href="/" className="ghost compact" style={{ textDecoration: "none" }}>
                Cancel and return to Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "100vh",
            color: "var(--accent)"
          }}
        >
          <p>Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
