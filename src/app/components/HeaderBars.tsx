import { useState, useEffect } from "react";
import { MONO, COMPANY, FY } from "../utils/accounting";

export interface SyncStatusInfo {
  status: "synced" | "offline" | "pending" | "syncing" | "failed" | "conflict";
  pendingCount: number;
  lastSync?: string;
  error?: string;
}

import { getClientConfig } from "../../config/clientConfig";

export function TitleBar({
  onOpenConnectionModal,
  onOpenSqlConsole,
  onOpenLogin,
  userEmail,
  syncStatus,
  onTriggerSync,
}: {
  onOpenConnectionModal?: () => void;
  onOpenSqlConsole?: () => void;
  onOpenLogin?: () => void;
  userEmail?: string | null;
  syncStatus?: SyncStatusInfo;
  onTriggerSync?: () => void;
}) {
  const [timeStr, setTimeStr] = useState("");
  const clientConfig = getClientConfig();

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      setTimeStr(`${day}-${month}-${year} ${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSyncBadge = () => {
    if (!syncStatus) return null;
    const { status, pendingCount, lastSync } = syncStatus;

    if (status === "syncing") {
      return (
        <button
          disabled
          style={{
            background: "#ffeeba",
            color: "#856404",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #ffe8a1",
            cursor: "wait",
            fontFamily: MONO,
            fontWeight: 700,
          }}
        >
          🔄 SYNCING...
        </button>
      );
    }

    if (status === "offline") {
      return (
        <button
          onClick={onTriggerSync}
          style={{
            background: "#f8d7da",
            color: "#721c24",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #f5c6cb",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title="Offline — Tap to attempt sync once connected"
        >
          📡 OFFLINE ({pendingCount} PENDING)
        </button>
      );
    }

    if (pendingCount > 0 || status === "pending") {
      return (
        <button
          onClick={onTriggerSync}
          style={{
            background: "#fff3cd",
            color: "#856404",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #ffeba2",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title="Click to push local changes to server"
        >
          ☁️ {pendingCount} PENDING — SYNC NOW
        </button>
      );
    }

    if (status === "failed" || status === "conflict") {
      return (
        <button
          onClick={onTriggerSync}
          style={{
            background: "#f8d7da",
            color: "#721c24",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #f5c6cb",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title="Some changes failed to sync. Tap to retry."
        >
          ⚠️ SYNC CONFLICT / ERROR — RETRY
        </button>
      );
    }

    return (
      <button
        onClick={onTriggerSync}
        style={{
          background: "#d4edda",
          color: "#155724",
          fontSize: 10,
          padding: "2px 8px",
          border: "1px solid #c3e6cb",
          cursor: "pointer",
          fontFamily: MONO,
          fontWeight: 700,
        }}
        title={`All changes synced${lastSync ? ` (last: ${lastSync})` : ""}. Click to sync again.`}
      >
        ✅ ALL SYNCED
      </button>
    );
  };

  return (
    <div style={{ background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontFamily: MONO }} className="flex items-center justify-between px-2 py-1">
      <div className="flex items-center gap-3">
        <span style={{ color: "#000000", fontSize: 12, fontWeight: 700 }}>{clientConfig.branding.clientName} — {COMPANY}</span>
        <button
          onClick={onOpenLogin}
          style={{
            background: userEmail ? "#d1fae5" : "#e0e7ff",
            color: userEmail ? "#065f46" : "#3730a3",
            fontSize: 10,
            padding: "2px 8px",
            border: userEmail ? "1px solid #6ee7b7" : "1px solid #a5b4fc",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title={userEmail ? `Logged in as ${userEmail}. Click to manage account.` : "Click to log in to Supabase"}
        >
          {userEmail ? `👤 ${userEmail}` : "🔑 LOGIN TO SUPABASE"}
        </button>
        <button
          onClick={onOpenConnectionModal}
          style={{
            background: "#9bc5e2",
            color: "#000000",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #7eaac9",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title="Tally HTTP/XML API Connection Status"
        >
          ● TALLY XML API: PORT 9000
        </button>
        <button
          onClick={onOpenSqlConsole}
          style={{
            background: "#fff8c5",
            color: "#0066cc",
            fontSize: 10,
            padding: "2px 8px",
            border: "1px solid #0066cc",
            cursor: "pointer",
            fontFamily: MONO,
            fontWeight: 700,
          }}
          title="Open SQL Query Console & Database Inspector"
        >
          🗄 SQL CONSOLE
        </button>
        {getSyncBadge()}
      </div>
      <span style={{ color: "#333333", fontSize: 11, fontWeight: 700 }}>{timeStr} &nbsp;|&nbsp; {FY}</span>
    </div>
  );
}

export function FKeyBar({ keys }: { keys: { f: string; label: string; active?: boolean }[] }) {
  return (
    <div style={{ background: "#d9e6f2", borderTop: "1px solid #b0b0b0", fontFamily: MONO }} className="flex gap-0 flex-wrap">
      {keys.map(({ f, label, active }) => (
        <div key={f} className="flex items-center" style={{ borderRight: "1px solid #b0b0b0" }}>
          <span style={{ background: active ? "#fff8c5" : "#ffffff", color: "#000000", fontSize: 11, padding: "3px 6px", fontWeight: 700, borderRight: "1px solid #b0b0b0" }}>{f}</span>
          <span style={{ color: "#222222", fontSize: 11, padding: "3px 8px", fontWeight: active ? 700 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function MenuBox({
  title,
  items,
  selectedIdx,
  width = 280,
}: {
  title: string;
  items: string[];
  selectedIdx: number;
  width?: number;
}) {
  return (
    <div style={{ width, border: "2px solid #0066cc", fontFamily: MONO, background: "#ffffff", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
      <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "6px 8px", color: "#000000", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: i === selectedIdx ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
            color: "#000000",
            padding: "6px 12px",
            fontSize: 13,
            cursor: "default",
            fontWeight: i === selectedIdx ? 700 : 400,
            borderLeft: i === selectedIdx ? "4px solid #0066cc" : "4px solid transparent",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export function PanelHeader({ title }: { title: string }) {
  return (
    <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "6px 8px", color: "#000000", fontFamily: MONO, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
      {title}
    </div>
  );
}
