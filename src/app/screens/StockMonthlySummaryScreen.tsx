import { useState, useEffect, useMemo } from "react";
import { StockItem, Voucher } from "../../db/database";
import { MONO, MONTHS, FY, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function StockMonthlySummaryScreen({
  stockItems,
  dayBook,
  onEsc,
}: {
  stockItems: StockItem[];
  dayBook: Voucher[];
  onEsc: () => void;
}) {
  const [selectedItemName, setSelectedItemName] = useState<string>(
    stockItems[0]?.name || "Tech Hardware Supplies"
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [selRowIdx, setSelRowIdx] = useState(1); // 0=Opening, 1=April...
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [stockItems, searchFilter]);

  const selectedItem = useMemo(() => {
    return stockItems.find((s) => s.name === selectedItemName) || stockItems[0];
  }, [stockItems, selectedItemName]);

  // Compute Monthly Inwards, Outwards & Closing Balances
  const monthlyData = useMemo(() => {
    if (!selectedItem) {
      return { rows: [], grandInwardQty: 0, grandInwardVal: 0, grandOutwardQty: 0, grandOutwardVal: 0, finalClosingQty: 0, finalClosingVal: 0 };
    }

    let currentQty = selectedItem.openingQty || 0;
    let currentVal = selectedItem.openingValue || 0;

    let grandInwardQty = 0;
    let grandInwardVal = 0;
    let grandOutwardQty = 0;
    let grandOutwardVal = 0;

    const normItemName = selectedItem.name.trim().toLowerCase();

    const rows = MONTHS.map((m) => {
      // Find matching item entries in dayBook for this month
      const monthItemRows = dayBook.flatMap((v) => {
        if (!v.date.toLowerCase().includes(m.short.toLowerCase())) return [];
        const items = v.items && v.items.length > 0 ? v.items : (v.item ? [{ name: v.item, qty: v.qty || 1, rate: v.rate || 0, amount: v.amount }] : []);
        return items
          .filter((it) => it.name.trim().toLowerCase() === normItemName)
          .map((it) => ({ ...it, type: v.type }));
      });

      // Purchases = Inwards
      const purchaseVchs = monthItemRows.filter((r) => r.type === "Purchase");
      const inwardQty = purchaseVchs.reduce((s, r) => s + (r.qty || 0), 0);
      const inwardVal = purchaseVchs.reduce((s, r) => s + (r.amount || 0), 0);

      // Sales = Outwards
      const salesVchs = monthItemRows.filter((r) => r.type === "Sales");
      const outwardQty = salesVchs.reduce((s, r) => s + (r.qty || 0), 0);
      const outwardVal = salesVchs.reduce((s, r) => s + (r.amount || 0), 0);

      grandInwardQty += inwardQty;
      grandInwardVal += inwardVal;
      grandOutwardQty += outwardQty;
      grandOutwardVal += outwardVal;

      currentQty = currentQty + inwardQty - outwardQty;
      currentVal = currentVal + inwardVal - outwardVal;

      return {
        month: m.full,
        short: m.short,
        inwardQty,
        inwardVal,
        outwardQty,
        outwardVal,
        closingQty: currentQty,
        closingVal: currentVal,
      };
    });

    return {
      rows,
      grandInwardQty,
      grandInwardVal,
      grandOutwardQty,
      grandOutwardVal,
      finalClosingQty: currentQty,
      finalClosingVal: currentVal,
    };
  }, [selectedItem, dayBook]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (drillMonth) {
          setDrillMonth(null);
        } else {
          onEsc();
        }
      } else if (!drillMonth) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelRowIdx((i) => Math.min(i + 1, 12));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelRowIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (selRowIdx > 0) {
            setDrillMonth(MONTHS[selRowIdx - 1].short);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selRowIdx, drillMonth, onEsc]);

  // Vouchers for drill down month
  const monthDrillVouchers = useMemo(() => {
    if (!drillMonth || !selectedItem) return [];
    const norm = selectedItem.name.trim().toLowerCase();
    return dayBook.flatMap((v) => {
      if (!v.date.toLowerCase().includes(drillMonth.toLowerCase())) return [];
      const items = v.items && v.items.length > 0 ? v.items : (v.item ? [{ name: v.item, qty: v.qty || 1, rate: v.rate || 0, amount: v.amount }] : []);
      return items
        .filter((it) => it.name.trim().toLowerCase() === norm)
        .map((it) => ({
          ...v,
          item: it.name,
          qty: it.qty,
          rate: it.rate,
          amount: it.amount,
        }));
    });
  }, [drillMonth, selectedItem, dayBook]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#6b7c8c", fontFamily: MONO, overflow: "hidden" }}>
      <div style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9", padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#000000", fontSize: 13, fontWeight: 700 }}>Stock Item Monthly Summary</span>
        <span style={{ color: "#000000", fontSize: 13, fontWeight: 700 }}>{selectedItem?.name}</span>
        <button onClick={onEsc} style={{ background: "transparent", border: "none", color: "#000000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: "6px 12px", background: "#ffffff", borderBottom: "1px solid #b0b0b0", display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ color: "#0066cc", fontSize: 12, fontWeight: 700 }}>Select / Search Item:</span>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Type stock item name..."
          style={{
            background: "#ffffff",
            border: "1px solid #b0b0b0",
            color: "#000000",
            fontFamily: MONO,
            fontSize: 12,
            padding: "2px 8px",
            width: 260,
            outline: "none",
          }}
        />
        <select
          value={selectedItemName}
          onChange={(e) => setSelectedItemName(e.target.value)}
          style={{
            background: "#ffffff",
            border: "1px solid #b0b0b0",
            color: "#000000",
            fontFamily: MONO,
            fontSize: 12,
            padding: "2px 8px",
          }}
        >
          {filteredItems.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name} ({item.group})
            </option>
          ))}
        </select>
        <span style={{ color: "#555555", fontSize: 11 }}>Unit: <span style={{ color: "#000000", fontWeight: 700 }}>{selectedItem?.unit}</span> | Valuation: <span style={{ color: "#0066cc", fontWeight: 700 }}>{selectedItem?.valuationMethod || "FIFO"}</span></span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
                <th rowSpan={2} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", width: "30%", borderRight: "1px solid #b0b0b0" }}>
                  Particulars
                </th>
                <th colSpan={6} style={{ color: "#000000", padding: "4px 8px", textAlign: "center", borderBottom: "1px solid #b0b0b0" }}>
                  The <br /> <span style={{ fontStyle: "italic" }}>{selectedItem?.name}</span> <br /> For 1-Apr-2024 to 31-Mar-2025
                </th>
              </tr>
              <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
                <th colSpan={2} style={{ color: "#000000", padding: "4px 8px", textAlign: "center", borderRight: "1px solid #b0b0b0" }}>
                  Inwards (Purchases) <br />
                  <span style={{ color: "#333333", fontWeight: 400, fontSize: 10 }}>Quantity &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Value</span>
                </th>
                <th colSpan={2} style={{ color: "#000000", padding: "4px 8px", textAlign: "center", borderRight: "1px solid #b0b0b0" }}>
                  Outwards (Sales) <br />
                  <span style={{ color: "#333333", fontWeight: 400, fontSize: 10 }}>Quantity &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Value</span>
                </th>
                <th colSpan={2} style={{ color: "#000000", padding: "4px 8px", textAlign: "center" }}>
                  Closing Balance <br />
                  <span style={{ color: "#333333", fontWeight: 400, fontSize: 10 }}>Quantity &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Value</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: selRowIdx === 0 ? "#fff8c5" : "#ffffff", color: "#000000", fontStyle: "italic", borderBottom: "1px solid #e0e0e0" }}>
                <td style={{ padding: "3px 8px", borderRight: "1px solid #b0b0b0" }}>Opening Balance</td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "10%" }}></td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "12%", borderRight: "1px solid #b0b0b0" }}></td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "10%" }}></td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "12%", borderRight: "1px solid #b0b0b0" }}></td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "10%", fontWeight: 700 }}>{selectedItem?.openingQty} {selectedItem?.unit}</td>
                <td style={{ padding: "3px 8px", textAlign: "right", width: "14%", fontWeight: 700 }}>{fmt(selectedItem?.openingValue || 0)}</td>
              </tr>

              {monthlyData.rows.map((row, idx) => {
                const isSelected = selRowIdx === idx + 1;
                return (
                  <tr
                    key={row.month}
                    onClick={() => { setSelRowIdx(idx + 1); setDrillMonth(row.short); }}
                    style={{
                      background: isSelected ? "#fff8c5" : idx % 2 === 0 ? "#ffffff" : "#f4f8fb",
                      color: "#000000",
                      cursor: "pointer",
                      borderBottom: "1px solid #e0e0e0",
                    }}
                  >
                    <td style={{ padding: "3px 8px", borderRight: "1px solid #b0b0b0" }}>{row.month}</td>
                    <td style={{ padding: "3px 8px", textAlign: "right", color: "#000000" }}>
                      {row.inwardQty > 0 ? `${row.inwardQty} ${selectedItem?.unit}` : ""}
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", color: "#0066cc" }}>
                      {row.inwardVal > 0 ? fmt(row.inwardVal) : ""}
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "right", color: "#000000" }}>
                      {row.outwardQty > 0 ? `${row.outwardQty} ${selectedItem?.unit}` : ""}
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", color: "#000000" }}>
                      {row.outwardVal > 0 ? fmt(row.outwardVal) : ""}
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700 }}>
                      {row.closingQty} {selectedItem?.unit}
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700 }}>
                      {fmt(row.closingVal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#9bc5e2", borderTop: "2px solid #7eaac9", fontWeight: 700, color: "#000000" }}>
                <td style={{ padding: "6px 8px", borderRight: "1px solid #b0b0b0" }}>Grand Total</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000" }}>{monthlyData.grandInwardQty} {selectedItem?.unit}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#0066cc", borderRight: "1px solid #b0b0b0" }}>{fmt(monthlyData.grandInwardVal)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000" }}>{monthlyData.grandOutwardQty} {selectedItem?.unit}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000", borderRight: "1px solid #b0b0b0" }}>{fmt(monthlyData.grandOutwardVal)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000" }}>{monthlyData.finalClosingQty} {selectedItem?.unit}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#000000" }}>{fmt(monthlyData.finalClosingVal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ height: 120, background: "#ffffff", borderTop: "2px solid #b0b0b0", padding: "8px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#333333", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            Grand Total Movement Bar Chart — {selectedItem?.name} ({FY})
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 4, borderBottom: "1px solid #b0b0b0" }}>
            {monthlyData.rows.map((r) => {
              const maxVal = Math.max(...monthlyData.rows.map((row) => Math.max(row.inwardQty, row.outwardQty, row.closingQty)), 10);
              const inHeight = Math.min(100, Math.max(10, (r.inwardQty / maxVal) * 80));
              const outHeight = Math.min(100, Math.max(10, (r.outwardQty / maxVal) * 80));
              return (
                <div key={r.short} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 75 }}>
                    <div style={{ width: 8, height: `${inHeight}%`, background: "#0066cc" }} title={`Inward ${r.short}: ${r.inwardQty}`} />
                    <div style={{ width: 8, height: `${outHeight}%`, background: "#ffb703" }} title={`Outward ${r.short}: ${r.outwardQty}`} />
                  </div>
                  <span style={{ fontSize: 9, color: "#555555" }}>{r.short}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 10, marginTop: 4, justifyContent: "center" }}>
            <span style={{ color: "#0066cc" }}>■ Inwards (Purchases)</span>
            <span style={{ color: "#ffb703" }}>■ Outwards (Sales)</span>
          </div>
        </div>
      </div>

      {drillMonth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ border: "2px solid #0066cc", background: "#ffffff", width: 700, padding: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            <PanelHeader title={`Stock Register Invoices — ${selectedItem?.name} (${drillMonth} 2024)`} />
            <div style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Date</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Vch No</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Type</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Party / Ledger</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "right" }}>Qty</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "right" }}>Rate</th>
                    <th style={{ color: "#000000", padding: "6px", textAlign: "right" }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDrillVouchers.map((v, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e0e0e0", background: i % 2 === 0 ? "#ffffff" : "#f4f8fb" }}>
                      <td style={{ padding: "4px", color: "#000000" }}>{v.date}</td>
                      <td style={{ padding: "4px", color: "#0066cc", fontWeight: 700 }}>{v.vno}</td>
                      <td style={{ padding: "4px", color: v.type === "Purchase" ? "#0066cc" : "#ffb703", fontWeight: 700 }}>{v.type} ({v.type === "Purchase" ? "Inward" : "Outward"})</td>
                      <td style={{ padding: "4px", color: "#000000" }}>{v.particulars}</td>
                      <td style={{ padding: "4px", textAlign: "right", color: "#000000" }}>{v.qty} {selectedItem?.unit}</td>
                      <td style={{ padding: "4px", textAlign: "right", color: "#555555" }}>{fmt(v.rate || 0)}</td>
                      <td style={{ padding: "4px", textAlign: "right", color: "#000000", fontWeight: 700 }}>{fmt(v.amount)}</td>
                    </tr>
                  ))}
                  {monthDrillVouchers.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#777" }}>
                        -- No Inward/Outward stock vouchers recorded in {drillMonth} --
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <button
                  onClick={() => setDrillMonth(null)}
                  style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, fontFamily: MONO, cursor: "pointer" }}
                >
                  Close Register View (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
