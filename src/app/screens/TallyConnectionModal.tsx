import { MONO, COMPANY } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function TallyConnectionModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", fontFamily: MONO }}>
      <div style={{ border: "2px solid #0066cc", background: "#ffffff", width: 680, padding: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <PanelHeader title="Tally HTTP/XML API Integration Status" />
        <div style={{ padding: "16px", color: "#000000", fontSize: 12 }}>
          <div style={{ color: "#0066cc", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
            ✓ Verified Connection Rules Status
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 12 }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#ffffff" }}>
                <td style={{ color: "#555555", padding: "6px" }}>Protocol Interface</td>
                <td style={{ color: "#000000", padding: "6px", fontWeight: 700 }}>HTTP Server POST Envelope / XML API</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#f4f8fb" }}>
                <td style={{ color: "#555555", padding: "6px" }}>Server Address &amp; Port</td>
                <td style={{ color: "#0066cc", padding: "6px", fontWeight: 700 }}>http://127.0.0.1:9000 (Active)</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#ffffff" }}>
                <td style={{ color: "#555555", padding: "6px" }}>Active Target Company</td>
                <td style={{ color: "#000000", padding: "6px", fontWeight: 700 }}>{COMPANY}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#f4f8fb" }}>
                <td style={{ color: "#555555", padding: "6px" }}>Idempotency Strategy</td>
                <td style={{ color: "#000000", padding: "6px", fontWeight: 700 }}>Unique Voucher No. + GUID Watermark Check</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={onClose}
              style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, fontFamily: MONO, cursor: "pointer" }}
            >
              Close Status Window (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
