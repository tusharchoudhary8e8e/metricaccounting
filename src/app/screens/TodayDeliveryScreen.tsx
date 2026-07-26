import { useState, useEffect, useMemo } from "react";
import { Voucher } from "../../db/database";
import { MONO, COMPANY, today, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function TodayDeliveryScreen({
  dayBook,
  onEsc,
}: {
  dayBook: Voucher[];
  onEsc: () => void;
}) {
  const [selIdx, setSelIdx] = useState(0);

  const deliveries = useMemo(() => {
    return dayBook.filter((v) => {
      if (!v.deliveryDate) return false;
      return v.deliveryDate.trim().toLowerCase() === today.trim().toLowerCase();
    });
  }, [dayBook]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
      }
      if (e.key === "ArrowDown" && deliveries.length > 0) {
        e.preventDefault();
        setSelIdx((i) => Math.min(i + 1, deliveries.length - 1));
      }
      if (e.key === "ArrowUp" && deliveries.length > 0) {
        e.preventDefault();
        setSelIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [deliveries.length, onEsc]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title={`Today's Deliveries — ${COMPANY} (${today})`} />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222" }}>
        Esc Return to Main Menu · Date: {today}
      </div>
      <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "12%", borderRight: "1px solid #b0b0b0" }}>Date</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "15%", borderRight: "1px solid #b0b0b0" }}>Voucher No</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "25%", borderRight: "1px solid #b0b0b0" }}>Party Name</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Item(s)</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", width: "12%", borderRight: "1px solid #b0b0b0" }}>Delivery Date</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", width: "15%" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                  -- No deliveries scheduled for today ({today}) --
                </td>
              </tr>
            ) : (
              deliveries.map((v, i) => {
                const isSelected = i === selIdx;
                const itemsStr = v.items && v.items.length > 0 ? v.items.map((it) => it.name).join(", ") : (v.item || "—");
                return (
                  <tr
                    key={v.id || i}
                    onClick={() => setSelIdx(i)}
                    style={{
                      background: isSelected ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                      color: "#000000",
                      fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer",
                      borderBottom: "1px solid #e0e0e0",
                    }}
                  >
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0" }}>{v.date}</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0", color: "#0066cc", fontWeight: 700 }}>{v.vno}</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0" }}>{v.particulars}</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0", color: "#333333" }}>{itemsStr}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", fontWeight: 700, color: "#0066cc" }}>{v.deliveryDate}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(v.amount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
