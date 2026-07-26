import { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { onAuthStateChange, getCurrentUser } from "../lib/supabase";
import { DB, Party, Voucher, Ledger, StockItem, Company } from "../db/database";
import { syncEngine } from "../db/syncEngine";
import { MONO, COMPANY, FY } from "./utils/accounting";
import { TitleBar, FKeyBar, MenuBox, PanelHeader, SyncStatusInfo } from "./components/HeaderBars";
import { StockMonthlySummaryScreen } from "./screens/StockMonthlySummaryScreen";
import { InventoryRulesScreen } from "./screens/InventoryRulesScreen";
import { StockItemsListScreen } from "./screens/StockItemsListScreen";
import { StockItemCreationScreen } from "./screens/StockItemCreationScreen";
import { StockItemEditScreen } from "./screens/StockItemEditScreen";
import { TodayDeliveryScreen } from "./screens/TodayDeliveryScreen";
import { SqlConsoleScreen } from "./screens/SqlConsoleScreen";
import { TallyConnectionModal } from "./screens/TallyConnectionModal";
import { VoucherEntryScreen } from "./screens/VoucherEntryScreen";
import { PartyCreationScreen } from "./screens/PartyCreationScreen";
import { LedgerListScreen } from "./screens/LedgerListScreen";
import { LedgerVouchersScreen } from "./screens/LedgerVouchersScreen";
import { DayBookScreen } from "./screens/DayBookScreen";
import { TrialBalanceScreen } from "./screens/TrialBalanceScreen";
import { PnLScreen } from "./screens/PnLScreen";
import { StockItemVouchersScreen } from "./screens/StockItemVouchersScreen";
import { SaleToUpdateScreen } from "./screens/SaleToUpdateScreen";
import { LoginScreen } from "./screens/LoginScreen";

type Screen =
  | "gateway"
  | "login"
  | "accounts_info"
  | "ledger_list"
  | "vouchers"
  | "voucher_entry"
  | "party_creation"
  | "reports"
  | "daybook"
  | "trial_balance"
  | "profit_loss"
  | "balance_sheet"
  | "inventory_info"
  | "stock_items_list"
  | "stock_item_creation"
  | "stock_item_edit"
  | "stock_monthly_summary"
  | "inventory_rules"
  | "today_delivery"
  | "payroll"
  | "quit_confirm"
  | "connection_modal"
  | "sql_console"
  | "stock_item_vouchers"
  | "ledger_vouchers"
  | "sale_to_update";

type VoucherType = "Payment" | "Receipt" | "Sales" | "Purchase" | "Journal" | "Contra";

const GATEWAY_ITEMS = [
  "Login / Account",
  "Accounts Info",
  "Inventory Info",
  "Voucher Entry",
  "Sale to Update",
  "Banking",
  "Reports",
  "Today Delivery",
  "Payroll",
  "Quit",
];

const ACCOUNTS_INFO_ITEMS = ["Ledgers", "Groups", "Voucher Types", "Back"];
const INVENTORY_INFO_ITEMS = ["Create Stock Item", "Edit Stock Item", "Stock Items", "Stock Monthly Summary", "Inventory Accounting Rules", "Back"];
const VOUCHER_ITEMS = ["Sales (F8)", "Payment (F5)", "Receipt (F6)", "Purchase (F9)", "Journal (F7)", "Contra (F4)", "Sale to Update", "Create Party", "Back"];
const REPORTS_ITEMS = ["Day Book", "Trial Balance", "Profit & Loss", "Balance Sheet", "Back"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("gateway");
  const [menuIdx, setMenuIdx] = useState(0);
  const [voucherType, setVoucherType] = useState<VoucherType>("Sales");
  const [selectedLedgerName, setSelectedLedgerName] = useState<string>("");
  const [selectedStockItemName, setSelectedStockItemName] = useState<string>("");
  const [voucherToEdit, setVoucherToEdit] = useState<Voucher | undefined>(undefined);
  const [activeOverlayScreen, setActiveOverlayScreen] = useState<"party_creation" | "stock_item_creation" | null>(null);

  // Auth State
  const [authUser, setAuthUser] = useState<User | null>(null);

  // State from Local Cache / Database
  const [company, setCompany] = useState<Company | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [dayBook, setDayBook] = useState<Voucher[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [systemLedgers, setSystemLedgers] = useState<Ledger[]>([]);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({ status: "synced", pendingCount: 0 });

  const fetchAllData = useCallback(async () => {
    await DB.init();
    const c = await DB.getCompany();
    const p = await DB.getParties();
    const v = await DB.getVouchers();
    const s = await DB.getStockItems();
    const l = await DB.getLedgers();

    setCompany(c);
    setParties(p);
    setDayBook(v);
    setStockItems(s);
    setSystemLedgers(l);
  }, []);

  useEffect(() => {
    getCurrentUser().then((u) => setAuthUser(u));

    const { data: authListener } = onAuthStateChange(async (u) => {
      setAuthUser(u);
      await DB.resetAndReloadForUser();
      fetchAllData();
    });

    fetchAllData();
    syncEngine.setStatusListener((status) => setSyncStatus(status));

    const handleOnlineStatus = () => syncEngine.notifyStatus();
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, [fetchAllData]);

  const currentMenuItems = useMemo(() => {
    switch (screen) {
      case "gateway":
        return GATEWAY_ITEMS;
      case "accounts_info":
        return ACCOUNTS_INFO_ITEMS;
      case "inventory_info":
        return INVENTORY_INFO_ITEMS;
      case "vouchers":
        return VOUCHER_ITEMS;
      case "reports":
        return REPORTS_ITEMS;
      default:
        return [];
    }
  }, [screen]);

  useEffect(() => {
    setMenuIdx(0);
  }, [screen]);

  // Main menu keyboard listener
  useEffect(() => {
    if (
      screen !== "gateway" &&
      screen !== "accounts_info" &&
      screen !== "inventory_info" &&
      screen !== "vouchers" &&
      screen !== "reports"
    ) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      const items = currentMenuItems;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIdx((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIdx((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (screen !== "gateway") setScreen("gateway");
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = items[menuIdx];
        handleMenuSelect(sel);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, menuIdx, currentMenuItems]);

  // Global Function Key (F1 - F12) shortcuts listener
  useEffect(() => {
    const handleFKeys = (e: KeyboardEvent) => {
      if (activeOverlayScreen) return;
      if (e.key.startsWith("F") && e.key.length > 1) {
        const num = parseInt(e.key.substring(1));
        if (num >= 1 && num <= 12) {
          const handled = [1, 4, 5, 6, 7, 8, 9, 12];
          if (handled.includes(num)) {
            e.preventDefault(); // Block browser defaults only for keys we handle

            if (num === 4) {
              setVoucherType("Contra");
              setScreen("voucher_entry");
            } else if (num === 5) {
              setVoucherType("Payment");
              setScreen("voucher_entry");
            } else if (num === 6) {
              setVoucherType("Receipt");
              setScreen("voucher_entry");
            } else if (num === 7) {
              setVoucherType("Journal");
              setScreen("voucher_entry");
            } else if (num === 8) {
              setVoucherType("Sales");
              setScreen("voucher_entry");
            } else if (num === 9) {
              setVoucherType("Purchase");
              setScreen("voucher_entry");
            } else if (num === 1 || num === 12) {
              setScreen("connection_modal");
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleFKeys, true);
    return () => window.removeEventListener("keydown", handleFKeys, true);
  }, [activeOverlayScreen]);

  const handleMenuSelect = (sel: string) => {
    setVoucherToEdit(undefined);
    if (screen === "gateway") {
      if (sel === "Login / Account") setScreen("login");
      else if (sel === "Accounts Info") setScreen("accounts_info");
      else if (sel === "Inventory Info") setScreen("inventory_info");
      else if (sel === "Voucher Entry") setScreen("vouchers");
      else if (sel === "Sale to Update") setScreen("sale_to_update");
      else if (sel === "Reports") setScreen("reports");
      else if (sel === "Today Delivery") setScreen("today_delivery");
      else if (sel === "Payroll") setScreen("payroll");
      else if (sel === "Quit") setScreen("quit_confirm");
    } else if (screen === "accounts_info") {
      if (sel === "Ledgers") setScreen("ledger_list");
      else if (sel === "Back") setScreen("gateway");
    } else if (screen === "inventory_info") {
      if (sel === "Create Stock Item") setScreen("stock_item_creation");
      else if (sel === "Edit Stock Item") setScreen("stock_item_edit");
      else if (sel === "Stock Items") setScreen("stock_items_list");
      else if (sel === "Stock Monthly Summary") setScreen("stock_monthly_summary");
      else if (sel === "Inventory Accounting Rules") setScreen("inventory_rules");
      else if (sel === "Back") setScreen("gateway");
    } else if (screen === "vouchers") {
      if (sel === "Create Party") setScreen("party_creation");
      else if (sel === "Sale to Update") setScreen("sale_to_update");
      else if (sel === "Back") setScreen("gateway");
      else {
        let vt: VoucherType = "Sales";
        if (sel.startsWith("Sales")) vt = "Sales";
        else if (sel.startsWith("Payment")) vt = "Payment";
        else if (sel.startsWith("Receipt")) vt = "Receipt";
        else if (sel.startsWith("Purchase")) vt = "Purchase";
        else if (sel.startsWith("Journal")) vt = "Journal";
        else if (sel.startsWith("Contra")) vt = "Contra";
        setVoucherType(vt);
        setScreen("voucher_entry");
      }
    } else if (screen === "reports") {
      if (sel === "Day Book") setScreen("daybook");
      else if (sel === "Trial Balance") setScreen("trial_balance");
      else if (sel === "Profit & Loss") setScreen("profit_loss");
      else if (sel === "Balance Sheet") setScreen("trial_balance");
      else if (sel === "Back") setScreen("gateway");
    }
  };

  // Data Actions with Sync Queue integration
  const handleSaveVoucher = async (vch: Voucher) => {
    let saved: Voucher;
    let operation: "create" | "update" = "create";
    if (vch.id) {
      operation = "update";
      saved = await DB.updateVoucher(vch);
    } else {
      saved = await DB.addVoucher(vch);
    }
    await syncEngine.enqueue("voucher", operation, saved.id!, saved);
    await fetchAllData();
  };

  const handleSaveParty = async (party: Party) => {
    let saved: Party;
    let operation: "create" | "update" = "create";
    if (party.id) {
      operation = "update";
      saved = await DB.updateParty(party);
    } else {
      saved = await DB.addParty(party);
    }
    await syncEngine.enqueue("party", operation, saved.id!, saved);
    await fetchAllData();
    setScreen("vouchers");
  };

  const handleSavePartyFromVoucher = async (party: Party) => {
    let saved: Party;
    let operation: "create" | "update" = "create";
    if (party.id) {
      operation = "update";
      saved = await DB.updateParty(party);
    } else {
      saved = await DB.addParty(party);
    }
    await syncEngine.enqueue("party", operation, saved.id!, saved);
    await fetchAllData();
    setActiveOverlayScreen(null);
  };

  const handleSaveStockItemFromVoucher = async (item: StockItem) => {
    let saved: StockItem;
    let operation: "create" | "update" = "create";
    if (item.id) {
      operation = "update";
      saved = await DB.updateStockItem(item);
    } else {
      saved = await DB.addStockItem(item);
    }
    await syncEngine.enqueue("stock_item", operation, saved.id!, saved);
    await fetchAllData();
    setActiveOverlayScreen(null);
  };

  const handleDeleteStockItemFromVoucher = async (id: number) => {
    await DB.deleteStockItem(id);
    await syncEngine.enqueue("stock_item", "delete", id, { id });
    await fetchAllData();
    setActiveOverlayScreen(null);
  };

  const handleSaveStockItem = async (item: StockItem) => {
    let saved: StockItem;
    let operation: "create" | "update" = "create";
    if (item.id) {
      operation = "update";
      saved = await DB.updateStockItem(item);
    } else {
      saved = await DB.addStockItem(item);
    }
    await syncEngine.enqueue("stock_item", operation, saved.id!, saved);
    await fetchAllData();
    setScreen("inventory_info");
  };

  const handleDeleteStockItem = async (id: number) => {
    await DB.deleteStockItem(id);
    await syncEngine.enqueue("stock_item", "delete", id, { id });
    await fetchAllData();
  };

  const handleTriggerManualSync = async () => {
    try {
      console.log("Triggering manual sync...");
      const res = await syncEngine.executeSync();
      console.log("Sync result:", res);
      if (!res.success) {
        alert("Sync Failed: " + res.message);
      } else {
        alert("Sync Completed: " + res.message);
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("Sync Error: " + (err.message || String(err)));
    }
    await fetchAllData();
  };

  const fkeys = [
    { f: "F1", label: "Select Cmp" },
    { f: "F2", label: "Date" },
    { f: "F3", label: "Cmp" },
    { f: "F4", label: "Contra", active: voucherType === "Contra" },
    { f: "F5", label: "Payment", active: voucherType === "Payment" },
    { f: "F6", label: "Receipt", active: voucherType === "Receipt" },
    { f: "F7", label: "Journal", active: voucherType === "Journal" },
    { f: "F8", label: "Sales", active: voucherType === "Sales" },
    { f: "F9", label: "Purchase", active: voucherType === "Purchase" },
    { f: "F10", label: "Other Vchs" },
    { f: "F11", label: "Features" },
    { f: "F12", label: "Configure" },
  ];

  if (!authUser) {
    return (
      <LoginScreen
        onBack={() => {}}
        onLoginSuccess={async () => {
          await DB.resetAndReloadForUser();
          await fetchAllData();
          setScreen("gateway");
        }}
        isMandatory={true}
      />
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#6b7c8c", userSelect: "none" }}>
      <TitleBar
        onOpenConnectionModal={() => setScreen("connection_modal")}
        onOpenSqlConsole={() => setScreen("sql_console")}
        onOpenLogin={() => setScreen("login")}
        userEmail={authUser?.email}
        syncStatus={syncStatus}
        onTriggerSync={handleTriggerManualSync}
      />

      <div className="flex-1 flex overflow-hidden">
        {screen === "login" ? (
          <LoginScreen
            onBack={() => setScreen("gateway")}
            onLoginSuccess={async () => {
              await DB.resetAndReloadForUser();
              fetchAllData();
              setScreen("gateway");
            }}
            isMandatory={false}
          />
        ) : screen === "gateway" ||
        screen === "accounts_info" ||
        screen === "inventory_info" ||
        screen === "vouchers" ||
        screen === "reports" ? (
          <div style={{ flex: 1, display: "flex" }}>
            <div style={{ flex: 1, background: "#6b7c8c", padding: "16px 24px", fontFamily: MONO }}>
              <PanelHeader title="Current Company Information" />
              <div style={{ border: "1px solid #7eaac9", background: "#ffffff", padding: "12px 16px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#555" }}>Current Company:</span>
                  <span style={{ color: "#000000", fontWeight: 700 }}>{company?.name || COMPANY}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#555" }}>Financial Year:</span>
                  <span style={{ color: "#000000" }}>{company?.financialYear || FY}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#555" }}>Books Date:</span>
                  <span style={{ color: "#000000" }}>{company?.booksFrom || "1-Apr-2024"}</span>
                </div>
              </div>
            </div>

            <div style={{ width: 340, background: "#e2edf5", borderLeft: "1px solid #b0b0b0", padding: "20px 16px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
              <MenuBox
                title={
                  screen === "gateway"
                    ? "Gateway of Tally"
                    : screen === "accounts_info"
                    ? "Accounts Info"
                    : screen === "inventory_info"
                    ? "Inventory Info"
                    : screen === "vouchers"
                    ? "Voucher Menu"
                    : "Reports Menu"
                }
                items={currentMenuItems}
                selectedIdx={menuIdx}
                width={300}
              />
            </div>
          </div>
        ) : screen === "voucher_entry" ? (
          <VoucherEntryScreen
            type={voucherType}
            parties={parties}
            dayBook={dayBook}
            stockItems={stockItems}
            onEsc={() => setScreen("vouchers")}
            onShortcutCreateParty={() => setActiveOverlayScreen("party_creation")}
            onShortcutCreateStockItem={(itemName) => {
              const matched = stockItems.find(s => s.name.trim().toLowerCase() === itemName?.trim().toLowerCase());
              if (matched) {
                setSelectedStockItemName(matched.name);
                setActiveOverlayScreen("stock_item_edit");
              } else {
                setActiveOverlayScreen("stock_item_creation");
              }
            }}
            onSave={handleSaveVoucher}
            voucherToEdit={voucherToEdit}
            disableKeyboard={activeOverlayScreen !== null}
          />
        ) : screen === "party_creation" ? (
          <PartyCreationScreen
            onSave={handleSaveParty}
            onEsc={() => setScreen("vouchers")}
          />
        ) : screen === "stock_monthly_summary" ? (
          <StockMonthlySummaryScreen
            stockItems={stockItems}
            dayBook={dayBook}
            onEsc={() => setScreen("inventory_info")}
          />
        ) : screen === "inventory_rules" ? (
          <InventoryRulesScreen onEsc={() => setScreen("inventory_info")} />
        ) : screen === "stock_items_list" ? (
          <StockItemsListScreen
            stockItems={stockItems}
            dayBook={dayBook}
            onEsc={() => setScreen("inventory_info")}
            onSelectStockItem={(name) => {
              setSelectedStockItemName(name);
              setScreen("stock_item_vouchers");
            }}
          />
        ) : screen === "stock_item_creation" ? (
          <StockItemCreationScreen onSave={handleSaveStockItem} onEsc={() => setScreen("inventory_info")} />
        ) : screen === "stock_item_edit" ? (
          <StockItemEditScreen stockItems={stockItems} onSave={handleSaveStockItem} onDelete={handleDeleteStockItem} onEsc={() => setScreen("inventory_info")} />
        ) : screen === "today_delivery" ? (
          <TodayDeliveryScreen dayBook={dayBook} onEsc={() => setScreen("gateway")} />
        ) : screen === "sql_console" ? (
          <SqlConsoleScreen onEsc={() => setScreen("gateway")} onRefreshData={fetchAllData} />
        ) : screen === "connection_modal" ? (
          <TallyConnectionModal onClose={() => setScreen("gateway")} />
        ) : screen === "ledger_list" ? (
          <LedgerListScreen
            parties={parties}
            dayBook={dayBook}
            systemLedgers={systemLedgers}
            onEsc={() => setScreen("accounts_info")}
            onSelectLedger={(name) => {
              setSelectedLedgerName(name);
              setScreen("ledger_vouchers");
            }}
          />
        ) : screen === "ledger_vouchers" ? (
          <LedgerVouchersScreen
            ledgerName={selectedLedgerName}
            parties={parties}
            dayBook={dayBook}
            systemLedgers={systemLedgers}
            onEsc={() => setScreen("ledger_list")}
            onAlterVoucher={(vch) => {
              setVoucherToEdit(vch);
              setVoucherType(vch.type);
              setScreen("voucher_entry");
            }}
          />
        ) : screen === "stock_item_vouchers" ? (
          <StockItemVouchersScreen
            itemName={selectedStockItemName}
            dayBook={dayBook}
            onEsc={() => setScreen("stock_items_list")}
            onAlterVoucher={(vch) => {
              setVoucherToEdit(vch);
              setVoucherType(vch.type);
              setScreen("voucher_entry");
            }}
          />
        ) : screen === "daybook" ? (
          <DayBookScreen dayBook={dayBook} onEsc={() => setScreen("reports")} />
        ) : screen === "trial_balance" || screen === "balance_sheet" ? (
          <TrialBalanceScreen parties={parties} dayBook={dayBook} systemLedgers={systemLedgers} onEsc={() => setScreen("reports")} />
        ) : screen === "profit_loss" ? (
          <PnLScreen parties={parties} dayBook={dayBook} systemLedgers={systemLedgers} onEsc={() => setScreen("reports")} />
        ) : screen === "sale_to_update" ? (
          <SaleToUpdateScreen
            dayBook={dayBook}
            onSendToSaleAccount={handleSaveVoucher}
            onEsc={() => setScreen("gateway")}
          />
        ) : null}

        {activeOverlayScreen === "party_creation" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#6b7c8c", display: "flex", flexDirection: "column" }}>
            <PartyCreationScreen
              onSave={handleSavePartyFromVoucher}
              onEsc={() => setActiveOverlayScreen(null)}
            />
          </div>
        )}
        {activeOverlayScreen === "stock_item_creation" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#6b7c8c", display: "flex", flexDirection: "column" }}>
            <StockItemCreationScreen
              onSave={handleSaveStockItemFromVoucher}
              onEsc={() => setActiveOverlayScreen(null)}
            />
          </div>
        )}
        {activeOverlayScreen === "stock_item_edit" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#6b7c8c", display: "flex", flexDirection: "column" }}>
            <StockItemEditScreen
              stockItems={stockItems}
              onSave={handleSaveStockItemFromVoucher}
              onDelete={handleDeleteStockItemFromVoucher}
              onEsc={() => setActiveOverlayScreen(null)}
              initialStockItemToEdit={stockItems.find(s => s.name === selectedStockItemName)}
            />
          </div>
        )}
      </div>

      <FKeyBar keys={fkeys} />
    </div>
  );
}
