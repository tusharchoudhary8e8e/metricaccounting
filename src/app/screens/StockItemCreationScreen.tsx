import { useState, useEffect } from "react";
import { StockItem } from "../../db/database";
import { MONO, fmt } from "../utils/accounting";

export function StockItemCreationScreen({
  onSave,
  onEsc,
}: {
  onSave: (item: StockItem) => void;
  onEsc: () => void;
}) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [group, setGroup] = useState("Primary");
  const [unit, setUnit] = useState("Not Applicable");
  const [openingQty, setOpeningQty] = useState("0");
  const [openingRate, setOpeningRate] = useState("0");

  const [gstApplicability, setGstApplicability] = useState("Applicable");
  const [hsnDetails, setHsnDetails] = useState("As per Company/Stock Group");
  const [hsnCode, setHsnCode] = useState("");
  const [description, setDescription] = useState("");
  const [gstRateDetails, setGstRateDetails] = useState("As per Company/Stock Group");
  const [taxabilityType, setTaxabilityType] = useState("Taxable");
  const [gstRate, setGstRate] = useState("0");
  const [typeOfSupply, setTypeOfSupply] = useState<"Goods" | "Services">("Goods");
  const [rateOfDuty, setRateOfDuty] = useState("");

  const [activeField, setActiveField] = useState<number>(0);
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);

  const totalFields = 13;
  const calculatedValue = (parseFloat(openingQty) || 0) * (parseFloat(openingRate) || 0);

  const handleSave = () => {
    if (!name.trim()) return;
    const qty = parseFloat(openingQty) || 0;
    const rate = parseFloat(openingRate) || 0;
    const newItem: StockItem = {
      name: name.trim(),
      alias: alias.trim(),
      group: group.trim() || "Primary",
      unit: unit.trim() || "Not Applicable",
      openingQty: qty,
      openingRate: rate,
      openingValue: qty * rate,
      valuationMethod: "FIFO",
      gstApplicability,
      hsnDetails,
      hsnCode: hsnCode.trim(),
      description: description.trim(),
      gstRateDetails,
      gstRate: parseFloat(gstRate) || 0,
      typeOfSupply,
      rateOfDuty: parseFloat(rateOfDuty) || 0,
    };
    onSave(newItem);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showAcceptModal) {
        if (e.key.toLowerCase() === "y" || e.key === "Enter") {
          e.preventDefault();
          handleSave();
        } else if (e.key.toLowerCase() === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAcceptModal(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (activeField === totalFields - 1) {
          if (name.trim()) {
            setShowAcceptModal(true);
          }
        } else {
          setActiveField((prev) => Math.min(prev + 1, totalFields - 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveField((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveField((prev) => Math.min(prev + 1, totalFields - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeField, showAcceptModal, name, alias, group, unit, openingQty, openingRate, gstApplicability, hsnCode, description, gstRate, typeOfSupply, rateOfDuty]);

  const inputStyle = (idx: number) => ({
    background: activeField === idx ? "#fff8c5" : "#ffffff",
    border: activeField === idx ? "1px solid #0066cc" : "1px solid #cccccc",
    outline: "none",
    padding: "3px 8px",
    fontSize: 12,
    fontFamily: MONO,
    color: "#000000",
    fontWeight: activeField === idx ? 700 : 400,
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#6b7c8c", fontFamily: MONO, overflowY: "auto" }}>
      <div style={{ background: "#9bc5e2", padding: "6px 12px", borderBottom: "1px solid #7eaac9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#000000", fontWeight: 700, fontSize: 13 }}>Stock Item Creation</span>
        <span style={{ color: "#000000", fontWeight: 700, fontSize: 13 }}>Meridian Enterprises Ltd.</span>
      </div>

      <div style={{ flex: 1, padding: "12px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <div style={{ width: "100%", maxWidth: 940, background: "#ffffff", border: "2px solid #0066cc", color: "#000000", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <label style={{ width: 100, color: "#000000", fontSize: 12, fontWeight: 700 }}>Name</label>
              <span style={{ marginRight: 12 }}>:</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setActiveField(0)}
                style={{ ...inputStyle(0), width: 340 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ width: 100, color: "#555555", fontSize: 12, fontStyle: "italic" }}>(alias)</label>
              <span style={{ marginRight: 12 }}>:</span>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onFocus={() => setActiveField(1)}
                style={{ ...inputStyle(1), width: 340 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", minHeight: 380 }}>
            <div style={{ width: "45%", padding: "16px", borderRight: "1px solid #e0e0e0" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                <label style={{ width: 90, color: "#000000", fontWeight: 700 }}>Under</label>
                <span style={{ marginRight: 8 }}>:</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  onFocus={() => setActiveField(2)}
                  style={{ ...inputStyle(2), width: 180, fontWeight: 700 }}
                >
                  <option value="Primary">Primary</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Finished Goods">Finished Goods</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
                <label style={{ width: 90, color: "#000000", fontWeight: 700 }}>Units</label>
                <span style={{ marginRight: 8 }}>:</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  onFocus={() => setActiveField(3)}
                  style={{ ...inputStyle(3), width: 180, fontWeight: 700 }}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Kg">Kg</option>
                  <option value="Ltr">Ltr</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Nos">Nos</option>
                </select>
              </div>

              <div style={{ marginTop: 40, borderTop: "1px dashed #d0d0d0", paddingTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#333333" }}>Opening Balance Details</div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ width: 100, color: "#555" }}>Quantity:</label>
                  <input
                    type="number"
                    value={openingQty}
                    onChange={(e) => setOpeningQty(e.target.value)}
                    onFocus={() => setActiveField(11)}
                    style={{ ...inputStyle(11), width: 120 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ width: 100, color: "#555" }}>Rate (₹):</label>
                  <input
                    type="number"
                    value={openingRate}
                    onChange={(e) => setOpeningRate(e.target.value)}
                    onFocus={() => setActiveField(12)}
                    style={{ ...inputStyle(12), width: 120 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <label style={{ width: 100, color: "#555", fontWeight: 700 }}>Value (₹):</label>
                  <span style={{ fontWeight: 700, color: "#0066cc", padding: "2px 6px" }}>₹ {fmt(calculatedValue)}</span>
                </div>
              </div>
            </div>

            <div style={{ width: "55%", padding: "16px", background: "#ffffff" }}>
              <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#000000", fontSize: 13 }}>
                Statutory Details
              </div>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <label style={{ width: 190, color: "#000000" }}>GST applicability</label>
                <span style={{ marginRight: 8 }}>:</span>
                <select
                  value={gstApplicability}
                  onChange={(e) => setGstApplicability(e.target.value)}
                  onFocus={() => setActiveField(4)}
                  style={{ ...inputStyle(4), width: 160, fontWeight: 700 }}
                >
                  <option value="Applicable">Applicable</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>

              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, textDecoration: "underline", color: "#000000", marginBottom: 6 }}>
                  HSN/SAC &amp; Related Details
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ width: 190, color: "#555555" }}>HSN/SAC Details</label>
                  <span style={{ marginRight: 8 }}>:</span>
                  <span style={{ fontWeight: 700, color: "#000000" }}>{hsnDetails}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ width: 190, color: "#000000" }}>HSN/SAC</label>
                  <span style={{ marginRight: 8 }}>:</span>
                  <input
                    type="text"
                    value={hsnCode}
                    placeholder="e.g. 8471"
                    onChange={(e) => setHsnCode(e.target.value)}
                    onFocus={() => setActiveField(5)}
                    style={{ ...inputStyle(5), width: 160 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ width: 190, color: "#000000" }}>Description</label>
                  <span style={{ marginRight: 8 }}>:</span>
                  <input
                    type="text"
                    value={description}
                    placeholder="Item description"
                    onChange={(e) => setDescription(e.target.value)}
                    onFocus={() => setActiveField(6)}
                    style={{ ...inputStyle(6), width: 160 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, textDecoration: "underline", color: "#000000", marginBottom: 6 }}>
                  GST Rate &amp; Related Details
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ width: 190, color: "#000000" }}>Taxability Type</label>
                  <span style={{ marginRight: 8 }}>:</span>
                  <input
                    type="text"
                    value={taxabilityType}
                    onChange={(e) => setTaxabilityType(e.target.value)}
                    onFocus={() => setActiveField(7)}
                    style={{ ...inputStyle(7), width: 160 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ width: 190, color: "#000000" }}>GST Rate</label>
                  <span style={{ marginRight: 8 }}>:</span>
                  <input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    onFocus={() => setActiveField(8)}
                    style={{ ...inputStyle(8), width: 60 }}
                  />
                  <span style={{ marginLeft: 4, fontWeight: 700 }}>%</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <label style={{ width: 190, color: "#000000", fontWeight: 700 }}>Type of Supply</label>
                <span style={{ marginRight: 8 }}>:</span>
                <select
                  value={typeOfSupply}
                  onChange={(e) => setTypeOfSupply(e.target.value as any)}
                  onFocus={() => setActiveField(9)}
                  style={{ ...inputStyle(9), width: 160, fontWeight: 700 }}
                >
                  <option value="Goods">Goods</option>
                  <option value="Services">Services</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ width: 190, color: "#000000" }}>Rate of Duty (eg 5)</label>
                <span style={{ marginRight: 8 }}>:</span>
                <input
                  type="number"
                  value={rateOfDuty}
                  onChange={(e) => setRateOfDuty(e.target.value)}
                  onFocus={() => setActiveField(10)}
                  style={{ ...inputStyle(10), width: 100 }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: "#d9e6f2", borderTop: "1px solid #b0b0b0", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#222222", fontSize: 11, fontWeight: 700 }}>Use ↑↓ / Tab to Navigate · Esc to Cancel</span>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onEsc}
                style={{ background: "#e0e0e0", border: "1px solid #b0b0b0", padding: "4px 16px", fontSize: 12, cursor: "pointer", fontFamily: MONO }}
              >
                Quit (Esc)
              </button>
              <button
                onClick={() => {
                  if (!name.trim()) return;
                  setShowAcceptModal(true);
                }}
                style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: MONO }}
              >
                Accept (Enter)
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAcceptModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#ffffff", border: "2px solid #0066cc", padding: "20px 40px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", fontFamily: MONO }}>
            <div style={{ color: "#000000", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Accept?</div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <button
                onClick={handleSave}
                style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, cursor: "pointer" }}
              >
                Yes (Y)
              </button>
              <button
                onClick={() => setShowAcceptModal(false)}
                style={{ background: "#e0e0e0", color: "#000000", border: "1px solid #b0b0b0", padding: "6px 20px", cursor: "pointer" }}
              >
                No (N)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
