import { useState, useEffect, useMemo } from "react";
import { Voucher } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function StockItemVouchersScreen({
  itemName,
  dayBook,
  onEsc,
  onAlterVoucher,
}: {
  itemName: string;
  dayBook: Voucher[];
  onEsc: () => void;
  onAlterVoucher?: (vch: Voucher) => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sortAsc, setSortAsc] = useState(false); // default newest first

  // Filter vouchers that contain this stock item
  const itemTransactions = useMemo(() => {
    const list: Array<{
      date: string;
      particulars: string; // party/ledger name
      type: string;
      vno: string;
      qty: number;
      rate: number;
      amount: number;
      raw: Voucher;
    }> = [];

    dayBook.forEach((v) => {
      // Check list items
      if (v.items && v.items.length > 0) {
        v.items.forEach((it) => {
          if (it.name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
            list.push({
              date: v.date,
              particulars: v.particulars,
              type: v.type,
              vno: v.vno,
              qty: it.qty,
              rate: it.rate,
              amount: it.amount,
              raw: v,
            });
          }
        });
      } else if (v.item && v.item.trim().toLowerCase() === itemName.trim().toLowerCase()) {
        // Fallback to single item
        list.push({
          date: v.date,
          particulars: v.particulars,
          type: v.type,
          vno: v.vno,
          qty: v.qty || 1,
          rate: v.rate || 0,
          amount: v.amount,
          raw: v,
        });
      }
    });

    return list;
  }, [itemName, dayBook]);

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

  const sortedTransactions = useMemo(() => {
    return [...itemTransactions].sort((a, b) => {
      const dateA = parseVoucherDate(a.date);
      const dateB = parseVoucherDate(b.date);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [itemTransactions, sortAsc]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    sortedTransactions.forEach((tx) => {
      totalQty += tx.qty;
      totalVal += tx.amount;
    });
    return { qty: totalQty, val: totalVal };
  }, [sortedTransactions]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        e.preventDefault();
        onEsc();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelIdx((i) => Math.min(i + 1, Math.max(0, sortedTransactions.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (sortedTransactions[selIdx]) {
          onAlterVoucher?.(sortedTransactions[selIdx].raw);
        }
      }
      if (e.key === "F2") {
        e.preventDefault();
        setSortAsc((prev) => !prev);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [sortedTransactions, selIdx, onEsc, onAlterVoucher, sortAsc]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c", color: "#000000" }}>
      <div style={{ background: "#9bc5e2", color: "#000000", borderBottom: "1px solid #7eaac9", padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 13 }}>
        <span style={{ flex: 1 }}>Stock Item Vouchers</span>
        <span style={{ flex: 1, textAlign: "center" }}>Meridian Enterprises Ltd.</span>
        <span style={{ flex: 1, textAlign: "right" }}>For 1-Apr-24 to 31-Mar-25</span>
        <span onClick={onEsc} style={{ marginLeft: 16, cursor: "pointer", fontWeight: 900 }}>✕</span>
      </div>

      <div style={{ padding: "6px 12px", background: "#ffffff", borderBottom: "1px solid #b0b0b0", fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Stock Item Name : <span style={{ color: "#0066cc" }}>{itemName}</span></span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0066cc" }}>F2 Sort: Date ({sortAsc ? "Oldest First ▲" : "Newest First ▼"})</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#e2edf5", borderBottom: "1px solid #b0b0b0" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "12%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Date</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "35%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Particulars (Party)</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "15%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Vch Type</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "13%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Vch No.</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "12%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Quantity</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "13%", color: "#000000" }}>Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px 8px", color: "#777777" }}>
                  -- No Vouchers Found involving Stock Item: {itemName} --
                </td>
              </tr>
            ) : (
              sortedTransactions.map((tx: any, i: number) => {
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
                    onDoubleClick={() => {
                      if (tx && tx.raw) {
                        onAlterVoucher?.(tx.raw);
                      }
                    }}
                  >
                    <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{tx.date}</td>
                    <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{tx.particulars}</td>
                    <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{tx.type}</td>
                    <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{tx.vno}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", color: "#000000" }}>
                      {tx.qty} (Rate: ₹{fmt(tx.rate)})
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: "#000000", fontWeight: 700 }}>
                      {fmt(tx.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid #b0b0b0", background: "#ffffff", padding: "6px 12px", fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 30 }}>
          <span style={{ color: "#0066cc", fontWeight: 700 }}>Total Transactions Summary:</span>
          <span style={{ fontWeight: 700, color: "#0066cc" }}>
            Total Qty: {totals.qty} &nbsp;|&nbsp; Total Value: ₹{fmt(totals.val)}
          </span>
        </div>
      </div>
    </div>
  );
}
