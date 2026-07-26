import { useEffect, useMemo } from "react";
import { Party, Voucher, Ledger } from "../../db/database";
import { MONO, COMPANY, FY, calculateLedgerTransactions, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function PnLScreen({
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
  const pnl = useMemo(() => {
    const salesCalc = calculateLedgerTransactions("Sales Account", parties, dayBook, systemLedgers);
    const purCalc = calculateLedgerTransactions("Purchase Account", parties, dayBook, systemLedgers);
    const salaryCalc = calculateLedgerTransactions("Salary Expenses", parties, dayBook, systemLedgers);
    const rentCalc = calculateLedgerTransactions("Rent Expenses", parties, dayBook, systemLedgers);

    const salesIncome = Math.abs(salesCalc.closingBal);
    const purchaseCost = Math.abs(purCalc.closingBal);
    const salaries = Math.abs(salaryCalc.closingBal);
    const rent = Math.abs(rentCalc.closingBal);

    const totalExpenses = purchaseCost + salaries + rent;
    const netProfit = salesIncome - totalExpenses;

    return { salesIncome, purchaseCost, salaries, rent, totalExpenses, netProfit };
  }, [parties, dayBook, systemLedgers]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEsc]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title={`Profit & Loss Account — ${COMPANY} (${FY})`} />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222" }}>
        Esc Return to Reports Menu
      </div>
      <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", gap: 16, background: "#ffffff" }}>
        <div style={{ flex: 1, border: "2px solid #0066cc", background: "#ffffff", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "6px 8px", color: "#000000", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            Particulars (Expenses)
          </div>
          <div style={{ flex: 1, padding: "12px", fontSize: 12, color: "#000000" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>
              <span>Purchase Accounts</span>
              <span style={{ fontWeight: 700 }}>{fmt(pnl.purchaseCost)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>
              <span>Salary Expenses</span>
              <span style={{ fontWeight: 700 }}>{fmt(pnl.salaries)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>
              <span>Rent Expenses</span>
              <span style={{ fontWeight: 700 }}>{fmt(pnl.rent)}</span>
            </div>
          </div>
          <div style={{ background: "#9bc5e2", borderTop: "1px solid #7eaac9", padding: "6px 8px", display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#000000" }}>
            <span>Total Expenses:</span>
            <span>{fmt(pnl.totalExpenses)}</span>
          </div>
        </div>

        <div style={{ flex: 1, border: "2px solid #0066cc", background: "#ffffff", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
          <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "6px 8px", color: "#000000", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            Particulars (Income)
          </div>
          <div style={{ flex: 1, padding: "12px", fontSize: 12, color: "#000000" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 4 }}>
              <span>Sales Accounts</span>
              <span style={{ fontWeight: 700, color: "#0066cc" }}>{fmt(pnl.salesIncome)}</span>
            </div>
          </div>
          <div style={{ background: "#9bc5e2", borderTop: "1px solid #7eaac9", padding: "6px 8px", display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#000000" }}>
            <span>Total Income:</span>
            <span style={{ color: "#0066cc" }}>{fmt(pnl.salesIncome)}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "#d9e6f2", borderTop: "2px solid #b0b0b0", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>NET PROFIT / LOSS:</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: pnl.netProfit >= 0 ? "#0066cc" : "#d9534f" }}>
          {pnl.netProfit >= 0 ? `Net Profit: ₹${fmt(pnl.netProfit)}` : `Net Loss: ₹${fmt(Math.abs(pnl.netProfit))}`}
        </span>
      </div>
    </div>
  );
}
