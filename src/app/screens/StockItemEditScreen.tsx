import { useState, useEffect } from "react";
import { StockItem } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function StockItemEditScreen({
  stockItems,
  onSave,
  onDelete,
  onEsc,
  initialStockItemToEdit,
}: {
  stockItems: StockItem[];
  onSave: (item: StockItem) => void;
  onDelete: (id: number) => void;
  onEsc: () => void;
  initialStockItemToEdit?: StockItem;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [group, setGroup] = useState("");
  const [unit, setUnit] = useState("");
  const [openingQty, setOpeningQty] = useState("0");
  const [openingRate, setOpeningRate] = useState("0");
  const [valuationMethod, setValuationMethod] = useState<"FIFO" | "Weighted Average" | "Last Purchase">("FIFO");

  const startEdit = (item: StockItem) => {
    setEditingItem(item);
    setName(item.name);
    setAlias(item.alias || "");
    setGroup(item.group);
    setUnit(item.unit);
    setOpeningQty(String(item.openingQty || 0));
    setOpeningRate(String(item.openingRate || 0));
    setValuationMethod(item.valuationMethod || "FIFO");
  };

  useEffect(() => {
    if (initialStockItemToEdit) {
      startEdit(initialStockItemToEdit);
    }
  }, [initialStockItemToEdit]);

  useEffect(() => {
    if (editingItem) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onEsc(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, stockItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && stockItems[selIdx]) { e.preventDefault(); startEdit(stockItems[selIdx]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stockItems, selIdx, editingItem, onEsc]);

  const calcValue = (parseFloat(openingQty) || 0) * (parseFloat(openingRate) || 0);

  const handleSave = () => {
    if (!editingItem || !name.trim()) return;
    const qty = parseFloat(openingQty) || 0;
    const rate = parseFloat(openingRate) || 0;
    const updated: StockItem = {
      ...editingItem,
      name: name.trim(),
      alias: alias.trim(),
      group: group.trim() || "Primary",
      unit: unit.trim() || "Not Applicable",
      openingQty: qty,
      openingRate: rate,
      openingValue: qty * rate,
      valuationMethod,
    };
    onSave(updated);
    setEditingItem(null);
  };

  const handleDelete = () => {
    if (!editingItem || !editingItem.id) return;
    if (window.confirm(`Are you sure you want to delete stock item "${editingItem.name}"?`)) {
      onDelete(editingItem.id);
      setEditingItem(null);
    }
  };

  const formInputStyle = {
    width: "100%",
    background: "#ffffff",
    color: "#000000",
    border: "1px solid #b0b0b0",
    padding: "4px 8px",
    fontFamily: MONO,
    fontSize: 12,
    outline: "none",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO, background: "#6b7c8c" }}>
      <PanelHeader title="Edit / Alter Stock Items Master Records" />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222" }}>
        {editingItem ? "Editing Selected Stock Item · Save or Delete · Esc Cancel" : "↑↓ Select Stock Item · Enter Edit Item · Esc Back"}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#ffffff" }}>
        <div style={{ flex: 1, borderRight: "1px solid #b0b0b0", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Stock Item</th>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Group</th>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>Unit</th>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>Qty</th>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>Value (₹)</th>
                <th style={{ color: "#000000", padding: "6px 8px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#666666" }}>
                    No stock items found in database.
                  </td>
                </tr>
              ) : (
                stockItems.map((item, i) => {
                  const isSelected = i === selIdx;
                  const isBeingEdited = editingItem?.id === item.id;
                  return (
                    <tr
                      key={item.id || i}
                      onClick={() => {
                        setSelIdx(i);
                        startEdit(item);
                      }}
                      style={{
                        background: isBeingEdited ? "#e2edf5" : isSelected ? "#fff8c5" : i % 2 === 0 ? "#ffffff" : "#f4f8fb",
                        color: "#000000",
                        fontWeight: isSelected || isBeingEdited ? 700 : 400,
                        cursor: "pointer",
                        borderBottom: "1px solid #e0e0e0",
                      }}
                    >
                      <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>
                        <span style={{ marginRight: 4, color: "#0066cc" }}>{isSelected ? "▶" : " "}</span>
                        {item.name}
                      </td>
                      <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0", color: "#333333" }}>{item.group}</td>
                      <td style={{ padding: "4px 8px", borderRight: "1px solid #b0b0b0" }}>{item.unit}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{item.openingQty}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #b0b0b0" }}>{fmt(item.openingValue)}</td>
                      <td style={{ padding: "4px 8px", textAlign: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelIdx(i);
                            startEdit(item);
                          }}
                          style={{
                            background: "none",
                            border: "1px solid #0066cc",
                            color: "#0066cc",
                            fontSize: 10,
                            padding: "1px 6px",
                            cursor: "pointer",
                            fontFamily: MONO,
                          }}
                        >
                          EDIT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {editingItem && (
          <div style={{ width: 380, background: "#ffffff", borderLeft: "2px solid #0066cc", padding: 16, display: "flex", flexDirection: "column", boxShadow: "-2px 0 10px rgba(0,0,0,0.05)" }}>
            <div style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: 8, marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#0066cc" }}>
              EDITING: {editingItem.name}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Item Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={formInputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Alias Name:</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                style={formInputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Stock Group:</label>
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                style={formInputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Unit of Measure:</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={formInputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Opening Qty:</label>
                <input
                  type="number"
                  value={openingQty}
                  onChange={(e) => setOpeningQty(e.target.value)}
                  style={formInputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Opening Rate (₹):</label>
                <input
                  type="number"
                  value={openingRate}
                  onChange={(e) => setOpeningRate(e.target.value)}
                  style={formInputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Calculated Opening Value:</label>
              <div style={{ background: "#f4f8fb", border: "1px solid #d0d0d0", padding: "6px 8px", color: "#0066cc", fontWeight: 700, fontSize: 12 }}>
                ₹ {fmt(calcValue)}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#333333", fontSize: 11, display: "block", marginBottom: 4, fontWeight: 700 }}>Valuation Method:</label>
              <select
                value={valuationMethod}
                onChange={(e) => setValuationMethod(e.target.value as any)}
                style={formInputStyle}
              >
                <option value="FIFO">FIFO (First In First Out)</option>
                <option value="Weighted Average">Weighted Average</option>
                <option value="Last Purchase">Last Purchase</option>
              </select>
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleSave}
                style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "8px", fontWeight: 700, fontFamily: MONO, cursor: "pointer" }}
              >
                SAVE CHANGES
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setEditingItem(null)}
                  style={{ flex: 1, background: "#e0e0e0", color: "#333333", border: "1px solid #b0b0b0", padding: "6px", fontFamily: MONO, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{ flex: 1, background: "#d9534f", color: "#ffffff", border: "none", padding: "6px", fontFamily: MONO, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                >
                  DELETE ITEM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
