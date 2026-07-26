import { useState, useEffect, useMemo } from "react";
import { StockItem, Voucher } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

type SortField = "name" | "group" | "unit" | "openingQty" | "openingValue" | "valuationMethod";

export function StockItemsListScreen({
  stockItems,
  onEsc,
  onSelectStockItem,
}: {
  stockItems: StockItem[];
  dayBook?: Voucher[];
  onEsc: () => void;
  onSelectStockItem?: (itemName: string) => void;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const sortedItems = useMemo(() => {
    return [...stockItems].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? ((valA as number) || 0) - ((valB as number) || 0) : ((valB as number) || 0) - ((valA as number) || 0);
    });
  }, [stockItems, sortField, sortAsc]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedItems, searchQuery]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, filteredItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selIdx]) {
          onSelectStockItem?.(filteredItems[selIdx].name);
        }
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [filteredItems, onEsc, onSelectStockItem, selIdx]);

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getHeaderIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortAsc ? " ▲" : " ▼";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title="List of Stock Items (Fetched from Local Cache / Server)" />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222", display: "flex", justifyContent: "space-between" }}>
        <span>↑↓ Navigate · Esc Back</span>
        <span style={{ fontWeight: 700, color: "#0066cc" }}>Click headers to sort table data</span>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ padding: "6px 12px", background: "#f4f8fb", borderBottom: "1px solid #b0b0b0", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#333333" }}>Search Stock Item:</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelIdx(0);
          }}
          placeholder="Type name here to filter stock items..."
          style={{ flex: 1, padding: "3px 8px", border: "1px solid #0066cc", fontFamily: MONO, fontSize: 12, outline: "none", background: "#ffffff" }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th onClick={() => handleHeaderClick("name")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Stock Item Name{getHeaderIndicator("name")}
              </th>
              <th onClick={() => handleHeaderClick("group")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Stock Group{getHeaderIndicator("group")}
              </th>
              <th onClick={() => handleHeaderClick("unit")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Unit{getHeaderIndicator("unit")}
              </th>
              <th onClick={() => handleHeaderClick("openingQty")} style={{ color: "#000000", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Opening Qty{getHeaderIndicator("openingQty")}
              </th>
              <th onClick={() => handleHeaderClick("openingValue")} style={{ color: "#000000", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0", cursor: "pointer", userSelect: "none" }}>
                Opening Value{getHeaderIndicator("openingValue")}
              </th>
              <th onClick={() => handleHeaderClick("valuationMethod")} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", cursor: "pointer", userSelect: "none" }}>
                Valuation Method{getHeaderIndicator("valuationMethod")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, i) => {
              const isSelected = i === selIdx;
              return (
                <tr
                  key={i}
                  style={{
                    background: isSelected ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                    color: "#000000",
                    fontWeight: isSelected ? 700 : 400,
                    borderBottom: "1px solid #e0e0e0",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelIdx(i)}
                  onDoubleClick={() => onSelectStockItem?.(item.name)}
                >
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>
                    <span style={{ color: isSelected ? "#000000" : "#888888", marginRight: 4 }}>▶</span>
                    {item.name}
                  </td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#333333" }}>{item.group}</td>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{item.unit}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{item.openingQty}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{fmt(item.openingValue)}</td>
                  <td style={{ padding: "4px 8px", color: "#0066cc" }}>{item.valuationMethod || "FIFO"}</td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                  -- No Stock Items Found --
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
