import { useState, useEffect, useMemo } from "react";
import { Party, Voucher, Ledger } from "../../db/database";
import { MONO, COMPANY, FY, calculateLedgerTransactions, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function TrialBalanceScreen({
  parties,
  dayBook,
  systemLedgers,
  onEsc,
}: {
  parties: Party[];
  dayBook: Voucher[];
  systemLedgers: Ledger[];
  onEsc: () => void;
}) {
  const [selIdx, setSelIdx] = useState(0);

  const tbData = useMemo(() => {
    const list: { name: string; group: string; debit: number; credit: number }[] = [];

    const allNames = [
      ...systemLedgers.map((l) => l.name),
      ...parties.map((p) => p.name),
    ];

    const uniqueNames = Array.from(new Set(allNames));

    let totDr = 0;
    let totCr = 0;

    uniqueNames.forEach((name) => {
      const calc = calculateLedgerTransactions(name, parties, dayBook, systemLedgers);
      const party = parties.find((p) => p.name === name);
      const sys = systemLedgers.find((l) => l.name === name);
      const group = party?.group || sys?.group || "General Ledger";

      const bal = calc.closingBal;
      let dr = 0;
      let cr = 0;

      if (calc.isNormalDr) {
        if (bal >= 0) dr = bal;
        else cr = Math.abs(bal);
      } else {
        if (bal >= 0) cr = bal;
        else dr = Math.abs(bal);
      }

      if (dr > 0 || cr > 0) {
        list.push({ name, group, debit: dr, credit: cr });
        totDr += dr;
        totCr += cr;
      }
    });

    return { list, totDr, totCr };
  }, [parties, dayBook, systemLedgers]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, Math.max(0, tbData.list.length - 1))); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tbData.list.length, onEsc]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title={`Trial Balance — ${COMPANY} (${FY})`} />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222" }}>
        ↑↓ Navigate · Esc Return to Reports Menu
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Particulars (Ledger Name)</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Group</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", width: "20%", borderRight: "1px solid #b0b0b0" }}>Debit (Dr) ₹</th>
              <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", width: "20%" }}>Credit (Cr) ₹</th>
            </tr>
          </thead>
          <tbody>
            {tbData.list.map((row, i) => {
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
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{row.name}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#333" }}>{row.group}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>
                    {row.debit > 0 ? fmt(row.debit) : ""}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    {row.credit > 0 ? fmt(row.credit) : ""}
                  </td>
                </tr>
              );
            })}
            {tbData.list.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                  -- No Ledger Transactions Recorded --
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: "#9bc5e2", borderTop: "2px solid #7eaac9", fontWeight: 700, color: "#000000" }}>
              <td colSpan={2} style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>Grand Total:</td>
              <td style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{fmt(tbData.totDr)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(tbData.totCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
