import { useState, useEffect, useMemo } from "react";
import { Voucher } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function SaleToUpdateScreen({
  dayBook,
  onSendToSaleAccount,
  onEsc,
}: {
  dayBook: Voucher[];
  onSendToSaleAccount: (vch: Voucher) => void;
  onEsc: () => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter for vouchers of type "Sales" that are pending update
  const pendingVouchers = useMemo(() => {
    return dayBook.filter((v) => v.type === "Sales" && v.isPendingUpdate);
  }, [dayBook]);

  useEffect(() => {
    if (selIdx >= pendingVouchers.length && pendingVouchers.length > 0) {
      setSelIdx(pendingVouchers.length - 1);
    }
  }, [pendingVouchers.length, selIdx]);

  const handleSendToSaleAccount = (vch: Voucher) => {
    const updatedVch: Voucher = {
      ...vch,
      isPendingUpdate: false,
    };
    onSendToSaleAccount(updatedVch);
    setNotification(`Voucher No. ${vch.vno} sent to Sale Account successfully!`);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelIdx((i) => Math.min(i + 1, Math.max(0, pendingVouchers.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (pendingVouchers[selIdx]) {
          e.preventDefault();
          handleSendToSaleAccount(pendingVouchers[selIdx]);
        }
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [pendingVouchers, selIdx, onEsc]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title="Sale to Update — Pending Sale Bills Register" />
      <div
        style={{
          padding: "6px 12px",
          background: "#d9e6f2",
          borderBottom: "1px solid #b0b0b0",
          fontSize: 11,
          color: "#222222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>↑↓ Navigate · Enter Send to Sale Account · Esc Return to Menu</span>
        <span style={{ fontWeight: 700, color: "#0066cc" }}>Pending Vouchers: {pendingVouchers.length}</span>
      </div>

      {notification && (
        <div
          style={{
            padding: "8px 12px",
            background: "#d4edda",
            color: "#155724",
            borderBottom: "1px solid #c3e6cb",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          ✓ {notification}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "25%", borderRight: "1px solid #b0b0b0" }}>
                Party Name
              </th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "18%", borderRight: "1px solid #b0b0b0" }}>
                Voucher No.
              </th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "18%", borderRight: "1px solid #b0b0b0" }}>
                Date of Bill
              </th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", width: "20%", borderRight: "1px solid #b0b0b0" }}>
                Total Amount (₹)
              </th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "center", width: "19%" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingVouchers.map((v, i) => {
              const isSelected = i === selIdx;
              const totalAmt = v.totalWithTax || v.amount || 0;
              return (
                <tr
                  key={v.id || i}
                  style={{
                    background: isSelected ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                    color: "#000000",
                    fontWeight: isSelected ? 700 : 400,
                    cursor: "pointer",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                  onClick={() => setSelIdx(i)}
                >
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0" }}>{v.particulars || "—"}</td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0", color: "#0066cc", fontWeight: 700 }}>
                    {v.vno}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0" }}>{v.date}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", fontWeight: 700 }}>
                    {fmt(totalAmt)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendToSaleAccount(v);
                      }}
                      style={{
                        background: "#0066cc",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    >
                      Send to Sale Account
                    </button>
                  </td>
                </tr>
              );
            })}
            {pendingVouchers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#666666" }}>
                  -- No Sale Bills Pending in Sale to Update --
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
