import { useState, useEffect, useRef } from "react";
import { Party } from "../../db/database";
import { MONO, COMPANY } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

interface FieldDef {
  label: string;
  value: string;
  width: number;
}

export function PartyCreationScreen({
  onSave,
  onEsc,
}: {
  onSave: (p: Party) => void;
  onEsc: () => void;
}) {
  const fieldDefs: FieldDef[] = [
    { label: "Party Name", value: "", width: 45 },
    { label: "Group", value: "Sundry Debtors", width: 25 },
    { label: "Mailing Address", value: "", width: 60 },
    { label: "Phone Number", value: "", width: 25 },
    { label: "GSTIN / Tax ID", value: "", width: 25 },
    { label: "State", value: "Maharashtra", width: 25 },
    { label: "Opening Balance", value: "0", width: 20 },
  ];

  const [fields, setFields] = useState(fieldDefs.map((f) => f.value));
  const [fieldIdx, setFieldIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (fieldIdx === fieldDefs.length - 1) {
          if (!fields[0].trim()) {
            return;
          }
          setSaved(true);
          const newParty: Party = {
            name: fields[0].trim(),
            group: fields[1].trim() || "Sundry Debtors",
            address: fields[2].trim(),
            phone: fields[3].trim(),
            gstin: fields[4].trim(),
            state: fields[5].trim() || "Maharashtra",
            opening: fields[6].trim() || "0",
          };
          setTimeout(() => onSave(newParty), 600);
        } else {
          setFieldIdx((i) => Math.min(i + 1, fieldDefs.length - 1));
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFieldIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFieldIdx((i) => Math.min(i + 1, fieldDefs.length - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fieldIdx, fields, onEsc, onSave, fieldDefs.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [fieldIdx]);

  return (
    <div style={{ flex: 1, background: "#6b7c8c", padding: 0, fontFamily: MONO, display: "flex", flexDirection: "column" }}>
      <PanelHeader title="Party Account Creation (Offline Cache & Sync Outbox Active)" />
      <div style={{ padding: "8px 16px", flex: 1 }}>
        <div style={{ color: "#000000", fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
          ── Create Party Account ── Use ↑↓ / Tab / Enter to navigate · Esc to cancel
        </div>
        {saved && (
          <div style={{ color: "#0066cc", fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
            ✓ Party saved &amp; queued for sync.
          </div>
        )}
        <div style={{ border: "2px solid #0066cc", display: "inline-block", minWidth: 600, background: "#ffffff", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
          <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "4px 8px", color: "#000000", fontSize: 12, fontWeight: 700 }}>
            {COMPANY}
          </div>
          {fieldDefs.map((fd, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                background: i === fieldIdx ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                borderBottom: "1px solid #e0e0e0",
                padding: "4px 8px",
              }}
            >
              <span style={{ color: "#333333", fontSize: 12, width: 180, flexShrink: 0, fontWeight: 700 }}>{fd.label}</span>
              <span style={{ color: "#888", fontSize: 12, marginRight: 4 }}>:</span>
              {i === fieldIdx ? (
                <input
                  ref={inputRef}
                  value={fields[i]}
                  onChange={(e) => {
                    const next = [...fields];
                    next[i] = e.target.value;
                    setFields(next);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#000000",
                    fontSize: 13,
                    fontFamily: MONO,
                    width: fd.width * 10,
                    caretColor: "#000000",
                    fontWeight: 700,
                  }}
                  autoFocus
                />
              ) : (
                <span style={{ color: fields[i] ? "#000000" : "#888888", fontSize: 13, width: fd.width * 10 }}>
                  {fields[i] || "___"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
