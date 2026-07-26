import { useState, useEffect, useMemo } from "react";
import { Party, Voucher, Ledger } from "../../db/database";
import { MONO, calculateLedgerTransactions, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function LedgerListScreen({
  parties,
  dayBook,
  systemLedgers,
  onEsc,
  onSelectLedger,
}: {
  parties: Party[];
  dayBook: Voucher[];
  systemLedgers: Ledger[];
  onEsc: () => void;
  onSelectLedger: (ledgerName: string) => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sortField, setSortField] = useState<"name" | "group" | "opening" | "closing">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const allLedgers = useMemo(() => {
    const list: { name: string; group: string; opening: number; closing: number; isNormalDr: boolean }[] = [];

    systemLedgers.forEach((l) => {
      const calc = calculateLedgerTransactions(l.name, parties, dayBook, systemLedgers);
      list.push({
        name: l.name,
        group: l.group,
        opening: l.opening || 0,
        closing: calc.closingBal,
        isNormalDr: calc.isNormalDr,
      });
    });

    parties.forEach((p) => {
      const calc = calculateLedgerTransactions(p.name, parties, dayBook, systemLedgers);
      list.push({
        name: p.name,
        group: p.group,
        opening: parseFloat(p.opening) || 0,
        closing: calc.closingBal,
        isNormalDr: calc.isNormalDr,
      });
    });

    return list;
  }, [systemLedgers, parties, dayBook]);

  const sortedLedgers = useMemo(() => {
    return [...allLedgers].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [allLedgers, sortField, sortAsc]);

  const filteredLedgers = useMemo(() => {
    return sortedLedgers.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedLedgers, searchQuery]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, Math.max(0, filteredLedgers.length - 1))); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredLedgers[selIdx]) {
          onSelectLedger(filteredLedgers[selIdx].name);
        }
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [filteredLedgers, selIdx, onEsc, onSelectLedger]);

  const handleHeaderClick = (field: "name" | "group" | "opening" | "closing") => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getHeaderIndicator = (field: "name" | "group" | "opening" | "closing") => {
    if (sortField !== field) return "";
    return sortAsc ? " ▲" : " ▼";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title="List of Accounts & Ledgers Master Data" />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222", display: "flex", justifyContent: "space-between" }}>
        <span>↑↓ Navigate · Esc Return to Accounts Info Menu</span>
        <span style={{ fontWeight: 700, color: "#0066cc" }}>Click headers to sort table data</span>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ padding: "6px 12px", background: "#f4f8fb", borderBottom: "1px solid #b0b0b0", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#333333" }}>Search Ledger:</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelIdx(0);
          }}
          placeholder="Type name here to filter ledger accounts..."
          style={{ flex: 1, padding: "3px 8px", border: "1px solid #0066cc", fontFamily: MONO, fontSize: 12, outline: "none", background: "#ffffff" }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th onClick={() => handleHeaderClick("name")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Ledger Name{getHeaderIndicator("name")}
              </th>
              <th onClick={() => handleHeaderClick("group")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Account Group{getHeaderIndicator("group")}
              </th>
              <th onClick={() => handleHeaderClick("opening")} style={{ color: "#000000", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Opening Balance{getHeaderIndicator("opening")}
              </th>
              <th onClick={() => handleHeaderClick("closing")} style={{ color: "#000000", padding: "6px 8px", textAlign: "right", cursor: "pointer", userSelect: "none" }}>
                Closing Balance{getHeaderIndicator("closing")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLedgers.map((l, i) => {
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
                  onDoubleClick={() => onSelectLedger(l.name)}
                >
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>
                    <span style={{ color: isSelected ? "#000000" : "#0066cc", marginRight: 6 }}>▶</span>
                    {l.name}
                  </td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#333" }}>{l.group}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{fmt(l.opening)}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "#000000" }}>
                    {fmt(Math.abs(l.closing))} {l.closing >= 0 ? (l.isNormalDr ? "Dr" : "Cr") : (l.isNormalDr ? "Cr" : "Dr")}
                  </td>
                </tr>
              );
            })}
            {filteredLedgers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                  -- No Ledgers or Party Accounts Found --
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
