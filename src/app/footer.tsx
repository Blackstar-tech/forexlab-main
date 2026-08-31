"use client";

import React from "react";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "40px",
        padding: "20px 0",
        borderTop: "1px solid var(--line)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "var(--muted)",
        fontSize: "12px"
      }}
    >
      <div>
        <strong>ForexLab Journal</strong> • Master your trading execution &amp; edge
      </div>
      <div>
        Secure Cloud &amp; Local Storage Sync
      </div>
    </footer>
  );
}
