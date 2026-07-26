import { useState, useEffect, useRef, useMemo } from "react";
import { Party, Voucher, StockItem, VoucherEntryLine } from "../../db/database";
import { MONO, today, parseAndFormatDate, VoucherType, generateVoucherNo, fmt } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

interface VoucherField {
  label: string;
  value: string;
  width: number;
}

export function VoucherEntryScreen({
  type,
  parties,
  dayBook,
  stockItems,
  onEsc,
  onShortcutCreateParty,
  onSave,
  voucherToEdit,
}: {
  type: VoucherType;
  parties: Party[];
  dayBook: Voucher[];
  stockItems: StockItem[];
  onEsc: () => void;
  onShortcutCreateParty?: () => void;
  onSave?: (vch: Voucher) => void;
  voucherToEdit?: Voucher;
}) {
  const isInventory = type === "Sales" || type === "Purchase";
  const isSales = type === "Sales";
  const defaultVno = useMemo(() => generateVoucherNo(type, dayBook), [type, dayBook]);

  // States for Inventory Vouchers (Sales/Purchase)
  const [invDate, setInvDate] = useState(voucherToEdit ? voucherToEdit.date : today);
  const [invVno, setInvVno] = useState(voucherToEdit ? voucherToEdit.vno : defaultVno);
  const [invPartyName, setInvPartyName] = useState(voucherToEdit ? voucherToEdit.particulars : "");
  const [curItemName, setCurItemName] = useState("");
  const [curQty, setCurQty] = useState("1");
  const [curRate, setCurRate] = useState("0");
  const [itemsList, setItemsList] = useState<Array<{ name: string; qty: number; rate: number; amount: number; gstRate?: number }>>(() => {
    if (voucherToEdit) {
      if (voucherToEdit.items && voucherToEdit.items.length > 0) {
        return voucherToEdit.items.map(it => ({ name: it.name, qty: it.qty, rate: it.rate, amount: it.amount, gstRate: it.gstRate || 18 }));
      }
      if (voucherToEdit.item) {
        return [{
          name: voucherToEdit.item,
          qty: voucherToEdit.qty || 1,
          rate: voucherToEdit.rate || 0,
          amount: voucherToEdit.amount,
          gstRate: 18
        }];
      }
    }
    return [];
  });
  const [advance, setAdvance] = useState(voucherToEdit ? String(voucherToEdit.advance || 0) : "0");
  const [orderDate, setOrderDate] = useState(voucherToEdit ? (voucherToEdit.orderDate || today) : today);
  const [deliveryDate, setDeliveryDate] = useState(voucherToEdit ? (voucherToEdit.deliveryDate || today) : today);
  const [invNarration, setInvNarration] = useState(voucherToEdit ? (voucherToEdit.narration || "") : "");
  const [sendToSaleToUpdate, setSendToSaleToUpdate] = useState<boolean>(voucherToEdit ? !!voucherToEdit.isPendingUpdate : false);

  const invFocusFields = isSales
    ? ["date", "vno", "partyName", "itemName", "qty", "rate", "advance", "orderDate", "deliveryDate", "narration"]
    : ["date", "vno", "partyName", "itemName", "qty", "rate", "narration"];

  // States for Non-Inventory Vouchers (Payment, Receipt, etc.)
  const fieldDefs: VoucherField[] = [
    { label: "Date", value: voucherToEdit ? voucherToEdit.date : today, width: 20 },
    { label: "Voucher No.", value: voucherToEdit ? voucherToEdit.vno : defaultVno, width: 20 },
    { label: "Account", value: voucherToEdit ? (voucherToEdit.account || "") : (type === "Payment" || type === "Receipt" ? "Bank of India - CC" : "Sales Account"), width: 40 },
    { label: "Particulars / Ledger", value: voucherToEdit ? voucherToEdit.particulars : "", width: 40 },
    { label: "Amount (Dr)", value: voucherToEdit ? (voucherToEdit.dr ? String(voucherToEdit.amount) : "") : (type === "Payment" || type === "Journal" || type === "Purchase" ? "0" : ""), width: 20 },
    { label: "Amount (Cr)", value: voucherToEdit ? (!voucherToEdit.dr ? String(voucherToEdit.amount) : "") : (type === "Receipt" ? "0" : ""), width: 20 },
    { label: "Narration", value: voucherToEdit ? (voucherToEdit.narration || "") : "", width: 60 },
  ];

  const [ledgerFields, setLedgerFields] = useState(fieldDefs.map((f) => f.value));

  // Common States
  const [fieldIdx, setFieldIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listSelIdx, setListSelIdx] = useState(0);
  const [showAccept, setShowAccept] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus mappings
  const isPartyField = isInventory ? fieldIdx === 2 : fieldIdx === 3;
  const isItemField = isInventory ? fieldIdx === 3 : false;
  const isAccountField = !isInventory && fieldIdx === 2;
  const isListOpen = isPartyField || isItemField || isAccountField;

  const activeList = useMemo(() => {
    if (isPartyField) {
      return parties.map((p) => p.name);
    }
    if (isAccountField) {
      return ["Bank of India - CC", "Cash", "Sales Account", "Purchase Account", ...parties.map((p) => p.name)];
    }
    if (isItemField) {
      return [...stockItems.map((s) => s.name), "None"];
    }
    return [];
  }, [isPartyField, isAccountField, isItemField, parties, stockItems]);

  const filterText = useMemo(() => {
    if (isInventory) {
      if (fieldIdx === 2) return invPartyName;
      if (fieldIdx === 3) return curItemName;
    } else {
      return ledgerFields[fieldIdx] || "";
    }
    return "";
  }, [isInventory, fieldIdx, invPartyName, curItemName, ledgerFields]);

  const filteredList = useMemo(() => {
    if (!isListOpen) return [];
    const matched = activeList.filter((name) =>
      name.toLowerCase().includes(filterText.toLowerCase())
    );
    if (isPartyField || isAccountField) {
      return [...matched, "<Create New Party>"];
    }
    return matched;
  }, [isListOpen, activeList, filterText, isPartyField, isAccountField]);

  useEffect(() => {
    setListSelIdx(0);
  }, [fieldIdx]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [fieldIdx]);

  // Fix 1.4 & Fix 1.5: Compute GST breakdown and Double Entry lines
  const handleSaveVoucher = () => {
    setErrorMsg(null);
    try {
      if (isInventory) {
        // Auto-add current item if user filled it but forgot to press Enter on rate field
        let currentItems = [...itemsList];
        if (curItemName.trim() && curItemName.trim().toLowerCase() !== "none") {
          const q = parseFloat(curQty) || 1;
          const r = parseFloat(curRate) || 0;
          currentItems.push({ name: curItemName.trim(), qty: q, rate: r, amount: q * r, gstRate: 18 });
          setItemsList(currentItems);
          setCurItemName("");
          setCurQty("1");
          setCurRate("0");
        }

        if (currentItems.length === 0) {
          throw new Error("Please add at least one stock item to the voucher before saving.");
        }

        const taxableValue = currentItems.reduce((sum, it) => sum + it.amount, 0);

        // Find Party details for state check
        const partyObj = parties.find(p => p.name.trim().toLowerCase() === invPartyName.trim().toLowerCase());
        const isInterState = partyObj && partyObj.state && partyObj.state.toLowerCase() !== "maharashtra";

        // Average GST rate of items or default 18%
        const avgGstRate = 18;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (isInterState) {
          igst = taxableValue * (avgGstRate / 100);
        } else {
          cgst = taxableValue * (avgGstRate / 2 / 100);
          sgst = taxableValue * (avgGstRate / 2 / 100);
        }
        const totalWithTax = taxableValue + cgst + sgst + igst;

        // Double-entry validation entries (1.5)
        const entries: VoucherEntryLine[] = [];
        if (type === "Sales") {
          // Debit Party / Cash
          entries.push({ ledgerName: invPartyName || "Sundry Debtors", amount: totalWithTax, dr: true });
          // Credit Sales
          entries.push({ ledgerName: "Sales Account", amount: taxableValue, dr: false });
          if (cgst > 0) entries.push({ ledgerName: "CGST", amount: cgst, dr: false });
          if (sgst > 0) entries.push({ ledgerName: "SGST", amount: sgst, dr: false });
          if (igst > 0) entries.push({ ledgerName: "IGST", amount: igst, dr: false });
        } else {
          // Debit Purchase
          entries.push({ ledgerName: "Purchase Account", amount: taxableValue, dr: true });
          if (cgst > 0) entries.push({ ledgerName: "CGST", amount: cgst, dr: true });
          if (sgst > 0) entries.push({ ledgerName: "SGST", amount: sgst, dr: true });
          if (igst > 0) entries.push({ ledgerName: "IGST", amount: igst, dr: true });
          // Credit Party / Cash
          entries.push({ ledgerName: invPartyName || "Sundry Creditors", amount: totalWithTax, dr: false });
        }

        const newVch: Voucher = {
          ...(voucherToEdit ? { id: voucherToEdit.id, createdAt: voucherToEdit.createdAt } : {}),
          date: parseAndFormatDate(invDate),
          vno: invVno,
          type: type,
          particulars: invPartyName,
          account: type === "Sales" ? "Sales Account" : "Purchase Account",
          item: currentItems[0]?.name || "",
          qty: currentItems[0]?.qty || 0,
          rate: currentItems[0]?.rate || 0,
          amount: totalWithTax,
          taxableValue,
          cgst,
          sgst,
          igst,
          totalWithTax,
          entries,
          dr: type === "Purchase",
          narration: invNarration,
          items: currentItems.map(it => ({
            ...it,
            taxableValue: it.amount,
            cgst: isInterState ? 0 : it.amount * 0.09,
            sgst: isInterState ? 0 : it.amount * 0.09,
            igst: isInterState ? it.amount * 0.18 : 0
          })),
          ...(type === "Sales" ? {
            advance: parseFloat(advance) || 0,
            orderDate: parseAndFormatDate(orderDate),
            deliveryDate: parseAndFormatDate(deliveryDate),
            isPendingUpdate: sendToSaleToUpdate,
          } : {})
        };

        setSaved(true);
        if (onSave) onSave(newVch);
        setTimeout(onEsc, 800);
      } else {
        const nextFields = [...ledgerFields];
        nextFields[0] = parseAndFormatDate(nextFields[0]);
        const amt = parseFloat(ledgerFields[4] || ledgerFields[5]) || 0;
        const isDr = !!ledgerFields[4] && parseFloat(ledgerFields[4]) > 0;

        const entries: VoucherEntryLine[] = [
          { ledgerName: ledgerFields[3], amount: amt, dr: isDr },
          { ledgerName: ledgerFields[2], amount: amt, dr: !isDr },
        ];

        const newVch: Voucher = {
          ...(voucherToEdit ? { id: voucherToEdit.id, createdAt: voucherToEdit.createdAt } : {}),
          date: nextFields[0],
          vno: ledgerFields[1],
          type: type,
          particulars: ledgerFields[3],
          account: ledgerFields[2],
          amount: amt,
          dr: isDr,
          entries,
          narration: ledgerFields[6],
        };
        setSaved(true);
        if (onSave) onSave(newVch);
        setTimeout(onEsc, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showQuitConfirm) {
        if (e.key.toLowerCase() === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowQuitConfirm(false);
          onEsc();
        } else if (e.key.toLowerCase() === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowQuitConfirm(false);
        }
        return;
      }

      if (showAccept) {
        if (e.key.toLowerCase() === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowAccept(false);
          handleSaveVoucher();
        } else if (e.key.toLowerCase() === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (fieldIdx === 0) {
          setShowQuitConfirm(true);
        } else {
          setFieldIdx((i) => i - 1);
        }
        return;
      }

      if (e.altKey && (e.key === "c" || e.key === "C")) {
        if (isPartyField || isAccountField) {
          e.preventDefault();
          onShortcutCreateParty?.();
        }
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();

        if (isListOpen && filteredList.length > 0) {
          const selectedValue = filteredList[listSelIdx];
          if (selectedValue === "<Create New Party>") {
            onShortcutCreateParty?.();
            return;
          }

          if (isInventory) {
            if (fieldIdx === 2) {
              setInvPartyName(selectedValue);
              setFieldIdx(3);
            } else if (fieldIdx === 3) {
              if (selectedValue === "None") {
                setCurItemName("");
                const nextIdx = invFocusFields.indexOf(isSales ? "advance" : "narration");
                setFieldIdx(nextIdx);
              } else {
                setCurItemName(selectedValue);
                setFieldIdx(4);
              }
            }
          } else {
            const next = [...ledgerFields];
            next[fieldIdx] = selectedValue;
            setLedgerFields(next);
            setFieldIdx((i) => Math.min(i + 1, fieldDefs.length - 1));
          }
          return;
        }

        if (isInventory) {
          const fieldName = invFocusFields[fieldIdx];
          if (fieldName === "itemName") {
            if (!curItemName.trim() || curItemName.trim().toLowerCase() === "none") {
              setCurItemName("");
              const nextIdx = invFocusFields.indexOf(isSales ? "advance" : "narration");
              setFieldIdx(nextIdx);
            } else {
              setFieldIdx(4);
            }
          } else if (fieldName === "rate") {
            if (curItemName.trim()) {
              const q = parseFloat(curQty) || 1;
              const r = parseFloat(curRate) || 0;
              setItemsList(prev => [...prev, { name: curItemName.trim(), qty: q, rate: r, amount: q * r, gstRate: 18 }]);
              setCurItemName("");
              setCurQty("1");
              setCurRate("0");
              setFieldIdx(3);
            }
          } else if (fieldIdx === invFocusFields.length - 1) {
            setShowAccept(true);
          } else {
            setFieldIdx(i => Math.min(i + 1, invFocusFields.length - 1));
          }
        } else {
          if (fieldIdx === fieldDefs.length - 1) {
            setShowAccept(true);
          } else {
            setFieldIdx((i) => Math.min(i + 1, fieldDefs.length - 1));
          }
        }
      }

      if (e.key === "ArrowDown") {
        if (isListOpen && filteredList.length > 0) {
          e.preventDefault();
          setListSelIdx((idx) => Math.min(idx + 1, filteredList.length - 1));
        } else {
          e.preventDefault();
          const limit = isInventory ? invFocusFields.length - 1 : fieldDefs.length - 1;
          setFieldIdx((i) => Math.min(i + 1, limit));
        }
      }

      if (e.key === "ArrowUp") {
        if (isListOpen && filteredList.length > 0 && listSelIdx > 0) {
          e.preventDefault();
          setListSelIdx((idx) => Math.max(idx - 1, 0));
        } else {
          e.preventDefault();
          setFieldIdx((i) => Math.max(i - 1, 0));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    fieldIdx,
    isInventory,
    isSales,
    invDate,
    invVno,
    invPartyName,
    curItemName,
    curQty,
    curRate,
    itemsList,
    advance,
    orderDate,
    deliveryDate,
    invNarration,
    ledgerFields,
    listSelIdx,
    isListOpen,
    filteredList,
    showAccept,
    showQuitConfirm,
    onEsc,
    onShortcutCreateParty
  ]);

  const rawSubtotal = itemsList.reduce((sum, it) => sum + it.amount, 0);
  const gstAmount = isInventory ? rawSubtotal * 0.18 : 0;
  const finalAmountWithTax = isInventory ? rawSubtotal + gstAmount : (parseFloat(ledgerFields[4] || ledgerFields[5]) || 0);

  return (
    <div style={{ flex: 1, background: "#6b7c8c", padding: 0, fontFamily: MONO, display: "flex", flexDirection: "column" }}>
      <PanelHeader title={`${type} Voucher ${voucherToEdit ? "Alteration" : "Entry"} (Offline Cache & Sync Outbox Active)`} />
      <div style={{ padding: "8px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#000000", fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
          ── {type} Voucher ── Use ↑↓ / Tab / Enter to navigate · Alt+C to Create Party · Esc to cancel
        </div>
        {saved && (
          <div style={{ color: "#0066cc", fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
            ✓ Voucher {isInventory ? invVno : ledgerFields[1]} saved &amp; queued for sync!
          </div>
        )}
        {errorMsg && (
          <div style={{ color: "#d9534f", background: "#fdf2f2", border: "1px solid #f8b4b4", padding: "6px 12px", fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
            ❌ Validation Error: {errorMsg}
          </div>
        )}

        <div style={{ flex: 1, background: "#ffffff", border: "2px solid #0066cc", padding: 16, display: "flex", flexDirection: "column" }}>
          {isInventory ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "#555555", fontSize: 11 }}>Date:</span>
                  <input
                    ref={fieldIdx === 0 ? inputRef : null}
                    type="text"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    onFocus={() => setFieldIdx(0)}
                    style={{ width: "100%", background: fieldIdx === 0 ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "#555555", fontSize: 11 }}>Voucher No:</span>
                  <input
                    ref={fieldIdx === 1 ? inputRef : null}
                    type="text"
                    value={invVno}
                    onChange={(e) => setInvVno(e.target.value)}
                    onFocus={() => setFieldIdx(1)}
                    style={{ width: "100%", background: fieldIdx === 1 ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <span style={{ color: "#555555", fontSize: 11 }}>Party Account Name:</span>
                  <input
                    ref={fieldIdx === 2 ? inputRef : null}
                    type="text"
                    value={invPartyName}
                    onChange={(e) => setInvPartyName(e.target.value)}
                    onFocus={() => setFieldIdx(2)}
                    style={{ width: "100%", background: fieldIdx === 2 ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Item Entry Table */}
              <div style={{ flex: 1, border: "1px solid #b0b0b0", marginBottom: 12, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#9bc5e2", borderBottom: "1px solid #7eaac9" }}>
                      <th style={{ padding: "4px 8px", textAlign: "left" }}>Name of Item</th>
                      <th style={{ padding: "4px 8px", textAlign: "right" }}>Quantity</th>
                      <th style={{ padding: "4px 8px", textAlign: "right" }}>Rate (₹)</th>
                      <th style={{ padding: "4px 8px", textAlign: "right" }}>Taxable Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsList.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e0e0e0" }}>
                        <td style={{ padding: "4px 8px", fontWeight: 700 }}>{it.name}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{it.qty}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{fmt(it.rate)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(it.amount)}</td>
                      </tr>
                    ))}
                    {/* Active Line Item Input */}
                    <tr style={{ background: "#fff8c5" }}>
                      <td style={{ padding: "4px 8px" }}>
                        <input
                          ref={fieldIdx === 3 ? inputRef : null}
                          type="text"
                          value={curItemName}
                          onChange={(e) => setCurItemName(e.target.value)}
                          onFocus={() => setFieldIdx(3)}
                          placeholder="Select stock item..."
                          style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right" }}>
                        <input
                          ref={fieldIdx === 4 ? inputRef : null}
                          type="number"
                          value={curQty}
                          onChange={(e) => setCurQty(e.target.value)}
                          onFocus={() => setFieldIdx(4)}
                          style={{ width: 60, textAlign: "right", background: "transparent", border: "none", outline: "none", fontFamily: MONO, fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right" }}>
                        <input
                          ref={fieldIdx === 5 ? inputRef : null}
                          type="number"
                          value={curRate}
                          onChange={(e) => setCurRate(e.target.value)}
                          onFocus={() => setFieldIdx(5)}
                          style={{ width: 80, textAlign: "right", background: "transparent", border: "none", outline: "none", fontFamily: MONO, fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>
                        {fmt((parseFloat(curQty) || 0) * (parseFloat(curRate) || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax & Total Summary */}
              <div style={{ background: "#f4f8fb", border: "1px solid #d0d0d0", padding: "8px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "#555" }}>
                  Taxable Value: <strong>₹ {fmt(rawSubtotal)}</strong> | Estimated GST (18%): <strong>₹ {fmt(gstAmount)}</strong>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0066cc" }}>
                  Total Invoice Amount: ₹ {fmt(finalAmountWithTax)}
                </div>
              </div>

              {isSales && (
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#555555", fontSize: 11 }}>Date of Order Taken:</span>
                    <input
                      ref={fieldIdx === invFocusFields.indexOf("orderDate") ? inputRef : null}
                      type="text"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      onFocus={() => setFieldIdx(invFocusFields.indexOf("orderDate"))}
                      style={{ width: "100%", background: fieldIdx === invFocusFields.indexOf("orderDate") ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#555555", fontSize: 11 }}>Date of Delivery:</span>
                    <input
                      ref={fieldIdx === invFocusFields.indexOf("deliveryDate") ? inputRef : null}
                      type="text"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      onFocus={() => setFieldIdx(invFocusFields.indexOf("deliveryDate"))}
                      style={{ width: "100%", background: fieldIdx === invFocusFields.indexOf("deliveryDate") ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#555555", fontSize: 11 }}>Advance:</span>
                    <input
                      ref={fieldIdx === invFocusFields.indexOf("advance") ? inputRef : null}
                      type="number"
                      value={advance}
                      onChange={(e) => setAdvance(e.target.value)}
                      onFocus={() => setFieldIdx(invFocusFields.indexOf("advance"))}
                      style={{ width: "100%", background: fieldIdx === invFocusFields.indexOf("advance") ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "2px 6px", fontFamily: MONO, fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {isSales && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 10px", background: "#eef5fc", border: "1px solid #9bc5e2", borderRadius: 4 }}>
                  <input
                    id="sendToSaleToUpdate"
                    type="checkbox"
                    checked={sendToSaleToUpdate}
                    onChange={(e) => setSendToSaleToUpdate(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <label htmlFor="sendToSaleToUpdate" style={{ fontSize: 12, fontWeight: 700, color: "#004085", cursor: "pointer" }}>
                    Send to 'Sale to Update' (Hold bill before posting to Sales Account)
                  </label>
                </div>
              )}

              <div style={{ marginTop: "auto" }}>
                <span style={{ color: "#555555", fontSize: 11 }}>Narration:</span>
                <input
                  ref={fieldIdx === invFocusFields.length - 1 ? inputRef : null}
                  type="text"
                  value={invNarration}
                  onChange={(e) => setInvNarration(e.target.value)}
                  onFocus={() => setFieldIdx(invFocusFields.length - 1)}
                  style={{ width: "100%", background: fieldIdx === invFocusFields.length - 1 ? "#fff8c5" : "#ffffff", border: "1px solid #b0b0b0", padding: "4px 8px", fontFamily: MONO, fontSize: 12 }}
                />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {fieldDefs.map((fd, i) => (
                <div key={fd.label} style={{ display: "flex", alignItems: "center" }}>
                  <label style={{ width: 140, fontSize: 12, fontWeight: 700 }}>{fd.label}:</label>
                  <input
                    ref={fieldIdx === i ? inputRef : null}
                    type="text"
                    value={ledgerFields[i]}
                    onChange={(e) => {
                      const next = [...ledgerFields];
                      next[i] = e.target.value;
                      setLedgerFields(next);
                    }}
                    onFocus={() => setFieldIdx(i)}
                    style={{
                      flex: 1,
                      background: fieldIdx === i ? "#fff8c5" : "#ffffff",
                      border: "1px solid #b0b0b0",
                      padding: "4px 8px",
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: fieldIdx === i ? 700 : 400,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isListOpen && filteredList.length > 0 && (
        <div style={{ position: "fixed", right: 24, top: 120, width: 280, background: "#ffffff", border: "2px solid #0066cc", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100 }}>
          <div style={{ background: "#9bc5e2", padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>List of Masters</div>
          {filteredList.map((item, i) => (
            <div
              key={i}
              onClick={() => {
                if (item === "<Create New Party>") onShortcutCreateParty?.();
                else if (isInventory) {
                  if (fieldIdx === 2) setInvPartyName(item);
                  if (fieldIdx === 3) setCurItemName(item);
                } else {
                  const next = [...ledgerFields];
                  next[fieldIdx] = item;
                  setLedgerFields(next);
                }
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                background: i === listSelIdx ? "#fff8c5" : "#ffffff",
                cursor: "pointer",
                fontWeight: i === listSelIdx ? 700 : 400,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}

      {showAccept && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", border: "2px solid #0066cc", padding: "20px 40px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Accept Voucher?</div>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              <button onClick={handleSaveVoucher} style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "6px 20px", fontWeight: 700, cursor: "pointer" }}>Yes (Y)</button>
              <button onClick={() => setShowAccept(false)} style={{ background: "#e0e0e0", border: "1px solid #b0b0b0", padding: "6px 20px", cursor: "pointer" }}>No (N)</button>
            </div>
          </div>
        </div>
      )}
      {showQuitConfirm && (
        <div style={{ position: "fixed", right: 24, bottom: 60, background: "#ffffff", border: "2px solid #d9534f", padding: "12px 24px", boxShadow: "0 4px 15px rgba(0,0,0,0.3)", zIndex: 1000, fontFamily: MONO }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#d9534f", marginBottom: 8 }}>Quit Voucher Entry?</div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button onClick={() => { setShowQuitConfirm(false); onEsc(); }} style={{ background: "#d9534f", color: "#ffffff", border: "none", padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Yes (Enter)</button>
            <button onClick={() => setShowQuitConfirm(false)} style={{ background: "#e0e0e0", border: "1px solid #b0b0b0", padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>No (Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
}
