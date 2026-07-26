import { useState, useEffect, useMemo } from "react";
import { Party, Voucher, Ledger } from "../../db/database";
import { MONO, calculateLedgerTransactions, fmt } from "../utils/accounting";

export function LedgerVouchersScreen({
  ledgerName,
  parties,
  dayBook,
  systemLedgers,
  onEsc,
  onAlterVoucher,
}: {
  ledgerName: string;
  parties: Party[];
  dayBook: Voucher[];
  systemLedgers: Ledger[];
  onEsc: () => void;
  onAlterVoucher?: (vch: Voucher) => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sortAsc, setSortAsc] = useState(false); // default descending (newest first)

  const ledgerData = useMemo(() => {
    return calculateLedgerTransactions(ledgerName, parties, dayBook, systemLedgers);
  }, [ledgerName, parties, dayBook, systemLedgers]);

  const { transactions, openingBal, closingBal, isNormalDr } = ledgerData;

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
    return [...transactions].sort((a, b) => {
      const dateA = parseVoucherDate(a.date);
      const dateB = parseVoucherDate(b.date);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [transactions, sortAsc]);

  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    transactions.forEach((tx: any) => {
      dr += tx.debit || 0;
      cr += tx.credit || 0;
    });
    return { debit: dr, credit: cr };
  }, [transactions]);

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
    window.addEventListener("keydown", h, true); // capture phase to override global App handler
    return () => window.removeEventListener("keydown", h, true);
  }, [sortedTransactions, selIdx, onEsc, onAlterVoucher, sortAsc]);

  const closingDrCr = closingBal >= 0 ? (isNormalDr ? "Dr" : "Cr") : (isNormalDr ? "Cr" : "Dr");
  const openingDrCr = openingBal >= 0 ? (isNormalDr ? "Dr" : "Cr") : (isNormalDr ? "Cr" : "Dr");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c", color: "#000000" }}>
      <div style={{ background: "#9bc5e2", color: "#000000", borderBottom: "1px solid #7eaac9", padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 13 }}>
        <span style={{ flex: 1 }}>Ledger Vouchers</span>
        <span style={{ flex: 1, textAlign: "center" }}>Meridian Enterprises Ltd.</span>
        <span style={{ flex: 1, textAlign: "right" }}>For 1-Apr-24 to 31-Mar-25</span>
        <span onClick={onEsc} style={{ marginLeft: 16, cursor: "pointer", fontWeight: 900 }}>✕</span>
      </div>

      <div style={{ padding: "6px 12px", background: "#ffffff", borderBottom: "1px solid #b0b0b0", fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Ledger : <span style={{ color: "#0066cc" }}>{ledgerName}</span></span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0066cc" }}>F2 Sort: Date ({sortAsc ? "Oldest First ▲" : "Newest First ▼"})</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#e2edf5", borderBottom: "1px solid #b0b0b0" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "12%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Date</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "38%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Particulars</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "15%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Vch Type</th>
              <th style={{ padding: "6px 8px", textAlign: "left", width: "13%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Vch No.</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "11%", borderRight: "1px solid #b0b0b0", color: "#000000" }}>Debit</th>
              <th style={{ padding: "6px 8px", textAlign: "right", width: "11%", color: "#000000" }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px 8px", color: "#777777" }}>
                  -- No Vouchers / Transactions Found for {ledgerName} --
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
                      {tx.debit > 0 ? fmt(tx.debit) : ""}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: "#000000" }}>
                      {tx.credit > 0 ? fmt(tx.credit) : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid #b0b0b0", background: "#ffffff", padding: "6px 12px", fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, marginBottom: 2 }}>
          <span style={{ color: "#555555" }}>Opening Balance :</span>
          <span style={{ fontWeight: 700, minWidth: 120, textAlign: "right" }}>
            ₹{fmt(Math.abs(openingBal))} {openingDrCr}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, marginBottom: 2 }}>
          <span style={{ color: "#555555" }}>Current Total :</span>
          <span style={{ fontWeight: 700, minWidth: 260, textAlign: "right" }}>
            Debit: ₹{fmt(totals.debit)} | Credit: ₹{fmt(totals.credit)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, borderTop: "1px dashed #cccccc", paddingTop: 4 }}>
          <span style={{ color: "#0066cc", fontWeight: 700 }}>Closing Balance :</span>
          <span style={{ fontWeight: 700, color: "#0066cc", minWidth: 120, textAlign: "right" }}>
            ₹{fmt(Math.abs(closingBal))} {closingDrCr}
          </span>
        </div>
      </div>
    </div>
  );
}
