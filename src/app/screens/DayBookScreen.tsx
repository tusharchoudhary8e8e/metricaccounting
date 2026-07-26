import { useState, useEffect, useMemo } from "react";
import { Voucher } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function DayBookScreen({
  dayBook,
  onEsc,
}: {
  dayBook: Voucher[];
  onEsc: () => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sortAsc, setSortAsc] = useState(false); // default descending (newest first)

  const parseVoucherDate = (dStr: string) => {
    if (!dStr) return 0;
    const parts = dStr.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const mmm = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthIndex = months.indexOf(mmm);
      if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
        return new Date(year, monthIndex, day).getTime();
      }
    }
    const parsed = Date.parse(dStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  const sortedVouchers = useMemo(() => {
    return [...dayBook].sort((a, b) => {
      const dateA = parseVoucherDate(a.date);
      const dateB = parseVoucherDate(b.date);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [dayBook, sortAsc]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, Math.max(0, sortedVouchers.length - 1))); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "F2") { e.preventDefault(); setSortAsc((prev) => !prev); }
    };
    window.addEventListener("keydown", h, true); // capture phase to override global App handler
    return () => window.removeEventListener("keydown", h, true);
  }, [sortedVouchers, onEsc, sortAsc]);

  const totalAmount = useMemo(() => dayBook.reduce((s, v) => s + (v.amount || 0), 0), [dayBook]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title="Day Book — Accounting Voucher Register" />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222", display: "flex", justifyContent: "space-between" }}>
        <span>↑↓ Navigate · Esc Return to Reports Menu</span>
        <span style={{ fontWeight: 700, color: "#0066cc" }}>F2 Sort: Date ({sortAsc ? "Oldest First ▲" : "Newest First ▼"})</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "12%", borderRight: "1px solid #b0b0b0" }}>Date</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "15%", borderRight: "1px solid #b0b0b0" }}>Voucher No</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "15%", borderRight: "1px solid #b0b0b0" }}>Voucher Type</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Particulars / Party</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "20%", borderRight: "1px solid #b0b0b0" }}>Account</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sortedVouchers.map((v, i) => {
              const isSelected = i === selIdx;
              return (
                <tr
                  key={i}
                  style={{
                    background: isSelected ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                    color: "#000000",
                    fontWeight: isSelected ? 700 : 400,
                    cursor: "pointer",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                  onClick={() => setSelIdx(i)}
                >
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{v.date}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#0066cc", fontWeight: 700 }}>{v.vno}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#000000" }}>{v.type}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{v.particulars}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#333" }}>{v.account || "—"}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(v.amount)}</td>
                </tr>
              );
            })}
            {sortedVouchers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                  -- No Vouchers Found in Day Book --
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: "#9bc5e2", borderTop: "2px solid #7eaac9", fontWeight: 700, color: "#000000" }}>
              <td colSpan={5} style={{ padding: "6px 8px", color: "#000000", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>Total Day Book Turnover:</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000" }}>{fmt(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
