import { MONO } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function InventoryRulesScreen({ onEsc }: { onEsc: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#6b7c8c", fontFamily: MONO, overflow: "hidden" }}>
      <PanelHeader title="Inventory Accounting Rules & Standards Reference (AS-2 / Ind AS 2 / IAS 2)" />
      <div style={{ padding: "4px 8px", background: "#d9e6f2", borderBottom: "1px solid #b0b0b0", fontSize: 11, color: "#222222" }}>
        Esc to return to Inventory Info Menu
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#ffffff", color: "#000000", fontSize: 12, lineHeight: 1.6 }}>
        <div style={{ color: "#0066cc", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          1. Valuation Rule: Lower of Cost or Net Realizable Value (NRV)
        </div>
        <p style={{ color: "#333333", marginBottom: 12 }}>
          As per Accounting Standard AS-2 (and International Standard IAS 2), inventories must be measured at the <strong>LOWER of Cost and Net Realizable Value</strong>.
          <br />
          • <strong>Cost</strong> includes purchase cost, duties, conversion costs, and freight-inward costs to bring goods to present location.
          <br />
          • <strong>Net Realizable Value (NRV)</strong> is estimated selling price in ordinary course of business less estimated completion &amp; selling costs.
        </p>

        <div style={{ color: "#0066cc", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          2. Inventory Cost Formulas Permitted
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16, border: "1px solid #b0b0b0" }}>
          <thead>
            <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
              <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Method</th>
              <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Accounting Formula / Principle</th>
              <th style={{ color: "#000000", padding: "6px", textAlign: "left" }}>Standard Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#ffffff" }}>
              <td style={{ padding: "6px", fontWeight: 700 }}>FIFO (First-In, First-Out)</td>
              <td style={{ padding: "6px" }}>Assumes items purchased earliest are sold first. Closing stock consists of recent purchases.</td>
              <td style={{ padding: "6px", color: "#0066cc", fontWeight: 700 }}>Primary Standard Method</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#f4f8fb" }}>
              <td style={{ padding: "6px", fontWeight: 700 }}>Weighted Average Cost</td>
              <td style={{ padding: "6px" }}>Unit cost = Total cost of stock available ÷ Total units available. Recalculated periodically or per shipment.</td>
              <td style={{ padding: "6px", color: "#0066cc", fontWeight: 700 }}>Primary Standard Method</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#ffffff" }}>
              <td style={{ padding: "6px", fontWeight: 700 }}>LIFO (Last-In, First-Out)</td>
              <td style={{ padding: "6px" }}>Assumes newest inventory sold first.</td>
              <td style={{ padding: "6px", color: "#d9534f", fontWeight: 700 }}>PROHIBITED under AS-2 &amp; IAS 2</td>
            </tr>
          </tbody>
        </table>

        <div style={{ color: "#0066cc", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          3. Perpetual Inventory System vs Periodic System
        </div>
        <p style={{ color: "#333333", marginBottom: 12 }}>
          TAP Accounting uses a <strong>Perpetual Inventory System</strong>. Inward Stock Purchases increase stock quantity &amp; stock asset value immediately. Outward Sales decrease stock quantity &amp; calculate Cost of Goods Sold (COGS).
        </p>

        <div style={{ color: "#0066cc", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          4. Double-Entry Accounting Rules for Stock Transactions
        </div>
        <div style={{ background: "#f4f8fb", border: "1px solid #d0d0d0", padding: "12px", fontFamily: MONO, fontSize: 11, color: "#333333" }}>
          <div><strong>A. Inward Purchase Transaction:</strong></div>
          <div style={{ color: "#0066cc", fontWeight: 700 }}>DEBIT: Stock-in-Hand / Purchase Account &nbsp;(Asset / Expense)</div>
          <div style={{ color: "#555555" }}>CREDIT: Sundry Creditor / Cash / Bank &nbsp;(Liability / Asset)</div>

          <div style={{ marginTop: 8 }}><strong>B. Outward Sale Transaction:</strong></div>
          <div style={{ color: "#0066cc", fontWeight: 700 }}>DEBIT: Sundry Debtor / Cash / Bank &nbsp;(Asset)</div>
          <div style={{ color: "#555555" }}>CREDIT: Sales Account &nbsp;(Income Revenue)</div>
          <div style={{ color: "#0066cc", fontWeight: 700 }}>DEBIT: Cost of Goods Sold (COGS) &nbsp;(Expense)</div>
          <div style={{ color: "#555555" }}>CREDIT: Stock-in-Hand &nbsp;(Asset Reduction)</div>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={onEsc}
            style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, fontFamily: MONO, cursor: "pointer" }}
          >
            Return to Inventory Info (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
