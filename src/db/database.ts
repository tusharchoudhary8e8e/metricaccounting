// ─── Cloud-Connected Database & Data Service (Supabase + IndexedDB Cache) ───────────────────────────
import { supabase } from "../lib/supabase";

export interface Company {
  id?: number;
  name: string;
  financialYear: string;
  booksFrom: string;
  state?: string;
  gstin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ledger {
  id?: number;
  name: string;
  group: string;
  opening: number;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Party {
  id?: number;
  name: string;
  group: string;
  address: string;
  phone: string;
  gstin: string;
  state?: string;
  opening: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockItem {
  id?: number;
  name: string;
  alias?: string;
  group: string;
  unit: string;
  openingQty: number;
  openingRate: number;
  openingValue: number;
  valuationMethod?: "FIFO" | "Weighted Average" | "Last Purchase";
  gstApplicability?: string;
  hsnDetails?: string;
  hsnCode?: string;
  description?: string;
  gstRateDetails?: string;
  gstRate?: number;
  typeOfSupply?: "Goods" | "Services";
  rateOfDuty?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherEntryLine {
  ledgerId?: number;
  ledgerName: string;
  amount: number;
  dr: boolean; // true = debit, false = credit
}

export interface VoucherItemLine {
  name: string;
  qty: number;
  rate: number;
  amount: number;
  gstRate?: number;
  hsnCode?: string;
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface Voucher {
  id?: number;
  vno: string;
  date: string;
  type: "Payment" | "Receipt" | "Sales" | "Purchase" | "Journal" | "Contra";
  particulars: string;
  account?: string;
  partyId?: number;
  ledgerId?: number;
  item?: string;
  qty?: number;
  rate?: number;
  advance?: number;
  orderDate?: string;
  deliveryDate?: string;
  amount: number;
  dr: boolean;
  narration?: string;
  items?: VoucherItemLine[];
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalWithTax?: number;
  entries?: VoucherEntryLine[];
  isPendingUpdate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id?: number;
  timestamp: string;
  action: string;
  details: string;
  xmlPayload?: string;
}

export interface SyncQueueItem {
  id?: number;
  entity: "company" | "ledger" | "party" | "stock_item" | "voucher";
  operation: "create" | "update" | "delete";
  localId: number;
  serverId?: number;
  payload: any;
  status: "pending" | "syncing" | "synced" | "failed" | "conflict";
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[][];
  message?: string;
  rowCount: number;
}

const DB_NAME = "TapAccountingSQL";
const DB_VERSION = 3;

// Default seeds if database is empty on first boot
const DEFAULT_COMPANY: Company = {
  name: "Meridian Enterprises Ltd.",
  financialYear: "1-Apr-2024 to 31-Mar-2025",
  booksFrom: "1-Apr-2024",
  state: "Maharashtra",
};

const DEFAULT_LEDGERS: Ledger[] = [
  { name: "Cash", group: "Cash-in-Hand", opening: 0, isSystem: true },
  { name: "Bank of India - CC", group: "Bank Accounts", opening: 0, isSystem: true },
  { name: "Sales Account", group: "Sales Accounts", opening: 0, isSystem: true },
  { name: "Purchase Account", group: "Purchase Accounts", opening: 0, isSystem: true },
  { name: "Sundry Debtors", group: "Sundry Debtors", opening: 0, isSystem: true },
  { name: "Sundry Creditors", group: "Sundry Creditors", opening: 0, isSystem: true },
  { name: "Capital Account", group: "Capital Account", opening: 0, isSystem: true },
  { name: "Salary Expenses", group: "Indirect Expenses", opening: 0, isSystem: true },
  { name: "Rent Expenses", group: "Indirect Expenses", opening: 0, isSystem: true },
  { name: "Duties & Taxes", group: "Duties & Taxes", opening: 0, isSystem: true },
  { name: "CGST", group: "Duties & Taxes", opening: 0, isSystem: true },
  { name: "SGST", group: "Duties & Taxes", opening: 0, isSystem: true },
  { name: "IGST", group: "Duties & Taxes", opening: 0, isSystem: true },
];

const DEFAULT_PARTIES: Party[] = [];
const DEFAULT_STOCK_ITEMS: StockItem[] = [];
const DEFAULT_VOUCHERS: Voucher[] = [];

class DatabaseEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;

        if (!db.objectStoreNames.contains("companies")) {
          db.createObjectStore("companies", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("ledgers")) {
          const store = db.createObjectStore("ledgers", { keyPath: "id", autoIncrement: true });
          store.createIndex("name", "name", { unique: true });
        }
        if (!db.objectStoreNames.contains("parties")) {
          const store = db.createObjectStore("parties", { keyPath: "id", autoIncrement: true });
          store.createIndex("name", "name", { unique: true });
        }
        if (!db.objectStoreNames.contains("stock_items")) {
          const store = db.createObjectStore("stock_items", { keyPath: "id", autoIncrement: true });
          store.createIndex("name", "name", { unique: true });
        }
        if (!db.objectStoreNames.contains("vouchers")) {
          const store = db.createObjectStore("vouchers", { keyPath: "id", autoIncrement: true });
          store.createIndex("vno", "vno", { unique: true });
        }
        if (!db.objectStoreNames.contains("audit_logs")) {
          db.createObjectStore("audit_logs", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          const store = db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("sync_meta")) {
          db.createObjectStore("sync_meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("app_settings")) {
          db.createObjectStore("app_settings", { keyPath: "key" });
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result as IDBDatabase;
        resolve(db);
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });

    return this.dbPromise;
  }

  public async init(): Promise<void> {
    const db = await this.getDB();

    // Check if local cache has company data
    const tx = db.transaction(["companies"], "readonly");
    const compStore = tx.objectStore("companies");
    const countReq = compStore.count();

    await new Promise<void>((resolve, reject) => {
      countReq.onsuccess = async () => {
        if (countReq.result === 0) {
          await this.seedDefaultData();
        }
        resolve();
      };
      countReq.onerror = () => reject(countReq.error);
    });

    // Try initializing & syncing from Supabase Cloud
    try {
      await this.syncFromSupabaseCloud();
    } catch (err) {
      console.warn("Supabase initial fetch warning (using local IndexedDB cache):", err);
    }
  }

  private async getActiveUserId(): Promise<string | undefined> {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id || undefined;
    } catch {
      return undefined;
    }
  }

  public async resetAndReloadForUser(): Promise<void> {
    const db = await this.getDB();
    const stores = ["companies", "ledgers", "parties", "stock_items", "vouchers", "audit_logs", "sync_queue"];
    const tx = db.transaction(stores, "readwrite");
    for (const s of stores) {
      tx.objectStore(s).clear();
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    await this.seedDefaultData();
    await this.syncFromSupabaseCloud();
  }

  public async syncFromSupabaseCloud(): Promise<void> {
    const userId = await this.getActiveUserId();

    // 1. Fetch Company from Supabase
    let compQuery = supabase.from("companies").select("*");
    if (userId) {
      compQuery = compQuery.eq("user_id", userId);
    }
    const { data: cloudCompany } = await compQuery.limit(1).maybeSingle();

    if (cloudCompany) {
      const companyObj: Company = {
        id: cloudCompany.id,
        name: cloudCompany.name,
        financialYear: cloudCompany.financial_year,
        booksFrom: cloudCompany.books_from,
        state: cloudCompany.state,
        gstin: cloudCompany.gstin,
        createdAt: cloudCompany.created_at,
        updatedAt: cloudCompany.updated_at,
      };
      await this.saveLocalCompany(companyObj);
    } else if (!cloudCompany && userId) {
      const defaultComp = await this.getCompany();
      await supabase.from("companies").insert({
        name: defaultComp.name,
        financial_year: defaultComp.financialYear,
        books_from: defaultComp.booksFrom,
        state: defaultComp.state,
        gstin: defaultComp.gstin,
        tenant_id: 1,
        user_id: userId,
      });
    }

    // 2. Sync Ledgers
    let ledgersQuery = supabase.from("ledgers").select("*");
    if (userId) {
      ledgersQuery = ledgersQuery.eq("user_id", userId);
    }
    const { data: cloudLedgers } = await ledgersQuery;

    if (cloudLedgers && cloudLedgers.length > 0) {
      for (const cl of cloudLedgers) {
        const ledger: Ledger = {
          id: cl.id,
          name: cl.name,
          group: cl.group_name,
          opening: Number(cl.opening) || 0,
          isSystem: cl.is_system,
          createdAt: cl.created_at,
          updatedAt: cl.updated_at,
        };
        await this.saveLocalLedger(ledger);
      }
    } else if (cloudLedgers && cloudLedgers.length === 0 && userId) {
      const localLedgers = await this.getLedgers();
      if (localLedgers.length > 0) {
        const payload = localLedgers.map((l) => ({
          name: l.name,
          group_name: l.group,
          opening: l.opening,
          is_system: l.isSystem ?? false,
          tenant_id: 1,
          user_id: userId,
        }));
        await supabase.from("ledgers").insert(payload);
      }
    }

    // 3. Sync Parties
    let partiesQuery = supabase.from("parties").select("*");
    if (userId) {
      partiesQuery = partiesQuery.eq("user_id", userId);
    }
    const { data: cloudParties } = await partiesQuery;

    if (cloudParties && cloudParties.length > 0) {
      for (const cp of cloudParties) {
        const party: Party = {
          id: cp.id,
          name: cp.name,
          group: cp.group_name,
          address: cp.address || "",
          phone: cp.phone || "",
          gstin: cp.gstin || "",
          state: cp.state,
          opening: String(cp.opening || "0"),
          createdAt: cp.created_at,
          updatedAt: cp.updated_at,
        };
        await this.saveLocalParty(party);
      }
    }

    // 4. Sync Stock Items
    let stockQuery = supabase.from("stock_items").select("*");
    if (userId) {
      stockQuery = stockQuery.eq("user_id", userId);
    }
    const { data: cloudStock } = await stockQuery;

    if (cloudStock && cloudStock.length > 0) {
      for (const cs of cloudStock) {
        const item: StockItem = {
          id: cs.id,
          name: cs.name,
          alias: cs.alias,
          group: cs.group_name,
          unit: cs.unit,
          openingQty: Number(cs.opening_qty) || 0,
          openingRate: Number(cs.opening_rate) || 0,
          openingValue: Number(cs.opening_value) || 0,
          valuationMethod: cs.valuation_method as any,
          gstApplicability: cs.gst_applicability,
          hsnDetails: cs.hsn_details,
          hsnCode: cs.hsn_code,
          description: cs.description,
          gstRateDetails: cs.gst_rate_details,
          gstRate: Number(cs.gst_rate) || 0,
          typeOfSupply: cs.type_of_supply as any,
          rateOfDuty: Number(cs.rate_of_duty) || 0,
          createdAt: cs.created_at,
          updatedAt: cs.updated_at,
        };
        await this.saveLocalStockItem(item);
      }
    }

    // 5. Sync Vouchers
    let vouchersQuery = supabase.from("vouchers").select("*, voucher_items(*), voucher_entries(*)");
    if (userId) {
      vouchersQuery = vouchersQuery.eq("user_id", userId);
    }
    const { data: cloudVouchers } = await vouchersQuery;

    if (cloudVouchers && cloudVouchers.length > 0) {
      for (const cv of cloudVouchers) {
        const vch: Voucher = {
          id: cv.id,
          vno: cv.vno,
          date: cv.date,
          type: cv.type,
          particulars: cv.particulars,
          account: cv.account,
          partyId: cv.party_id,
          ledgerId: cv.ledger_id,
          item: cv.item,
          qty: Number(cv.qty) || undefined,
          rate: Number(cv.rate) || undefined,
          advance: Number(cv.advance) || undefined,
          orderDate: cv.order_date,
          deliveryDate: cv.delivery_date,
          amount: Number(cv.amount) || 0,
          dr: cv.dr,
          narration: cv.narration,
          taxableValue: Number(cv.taxable_value) || 0,
          cgst: Number(cv.cgst) || 0,
          sgst: Number(cv.sgst) || 0,
          igst: Number(cv.igst) || 0,
          totalWithTax: Number(cv.total_with_tax) || 0,
          items: cv.voucher_items ? cv.voucher_items.map((i: any) => ({
            name: i.name,
            qty: Number(i.qty),
            rate: Number(i.rate),
            amount: Number(i.amount),
            gstRate: Number(i.gst_rate),
            hsnCode: i.hsn_code,
            taxableValue: Number(i.taxable_value),
            cgst: Number(i.cgst),
            sgst: Number(i.sgst),
            igst: Number(i.igst),
          })) : [],
          entries: cv.voucher_entries ? cv.voucher_entries.map((e: any) => ({
            ledgerName: e.ledger_name,
            amount: Number(e.amount),
            dr: e.dr,
          })) : [],
          isPendingUpdate: !!cv.is_pending_update,
          createdAt: cv.created_at,
          updatedAt: cv.updated_at,
        };
        await this.saveLocalVoucher(vch);
      }
    }
  }

  private async seedDefaultData(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(["companies", "ledgers", "parties", "vouchers", "stock_items", "audit_logs"], "readwrite");

    const compStore = tx.objectStore("companies");
    compStore.add({ ...DEFAULT_COMPANY, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    const ledgerStore = tx.objectStore("ledgers");
    for (const l of DEFAULT_LEDGERS) {
      ledgerStore.add({ ...l, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    const partyStore = tx.objectStore("parties");
    for (const p of DEFAULT_PARTIES) {
      partyStore.add({ ...p, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    const stockStore = tx.objectStore("stock_items");
    for (const s of DEFAULT_STOCK_ITEMS) {
      stockStore.add({ ...s, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    const voucherStore = tx.objectStore("vouchers");
    for (const v of DEFAULT_VOUCHERS) {
      voucherStore.add({ ...v, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    const auditStore = tx.objectStore("audit_logs");
    auditStore.add({
      timestamp: new Date().toISOString(),
      action: "INIT_DATABASE",
      details: "Database engine initialized with default schema and Supabase cloud sync layer.",
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  // ─── Local IndexedDB Helpers ─────────────────────────────────────────

  private async saveLocalCompany(company: Company): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("companies", "readwrite");
    const store = tx.objectStore("companies");
    store.put(company);
  }

  private async saveLocalLedger(ledger: Ledger): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("ledgers", "readwrite");
    const store = tx.objectStore("ledgers");
    store.put(ledger);
  }

  private async saveLocalParty(party: Party): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("parties", "readwrite");
    const store = tx.objectStore("parties");
    store.put(party);
  }

  private async saveLocalStockItem(item: StockItem): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("stock_items", "readwrite");
    const store = tx.objectStore("stock_items");
    store.put(item);
  }

  private async saveLocalVoucher(voucher: Voucher): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("vouchers", "readwrite");
    const store = tx.objectStore("vouchers");
    store.put(voucher);
  }

  // ─── Public Data Access Methods (Supabase Cloud + Local Store) ──────

  public async getCompany(): Promise<Company> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("companies", "readonly");
      const store = tx.objectStore("companies");
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result[0] || DEFAULT_COMPANY);
      };
    });
  }

  public async updateCompany(company: Company): Promise<Company> {
    const updated = { ...company, updatedAt: new Date().toISOString() };
    await this.saveLocalCompany(updated);

    // Sync to Supabase Cloud
    try {
      const userId = await this.getActiveUserId();
      await supabase.from("companies").upsert({
        id: updated.id || 1,
        name: updated.name,
        financial_year: updated.financialYear,
        books_from: updated.booksFrom,
        state: updated.state,
        gstin: updated.gstin,
        tenant_id: 1,
        user_id: userId,
        updated_at: updated.updatedAt,
      });
      await this.logAudit("UPDATE_COMPANY", `Updated Company details in Cloud for: ${company.name}`);
    } catch (err) {
      console.error("Failed to sync Company to Supabase:", err);
    }

    return updated;
  }

  public async getLedgers(): Promise<Ledger[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("ledgers", "readonly");
      const store = tx.objectStore("ledgers");
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
    });
  }

  public async addLedger(ledger: Ledger): Promise<Ledger> {
    const db = await this.getDB();
    const now = new Date().toISOString();
    const newLedger = { ...ledger, createdAt: ledger.createdAt || now, updatedAt: now };

    const saved: Ledger = await new Promise((resolve, reject) => {
      const tx = db.transaction(["ledgers", "audit_logs"], "readwrite");
      const store = tx.objectStore("ledgers");
      const req = store.add(newLedger);
      req.onsuccess = () => {
        resolve({ ...newLedger, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });

    // Cloud Sync to Supabase
    try {
      const userId = await this.getActiveUserId();
      const { data, error } = await supabase.from("ledgers").insert({
        name: saved.name,
        group_name: saved.group,
        opening: saved.opening,
        is_system: saved.isSystem ?? false,
        tenant_id: 1,
        user_id: userId,
      }).select().single();
      if (!error && data) {
        saved.id = data.id;
        await this.saveLocalLedger(saved);
      }
      await this.logAudit("INSERT_LEDGER", `Inserted Ledger into Cloud: ${saved.name} (${saved.group})`);
    } catch (err) {
      console.error("Supabase ledger insert warning:", err);
    }

    return saved;
  }

  public async updateLedger(ledger: Ledger): Promise<Ledger> {
    const now = new Date().toISOString();
    const updated = { ...ledger, updatedAt: now };
    await this.saveLocalLedger(updated);

    try {
      const userId = await this.getActiveUserId();
      await supabase.from("ledgers").upsert({
        id: updated.id,
        name: updated.name,
        group_name: updated.group,
        opening: updated.opening,
        is_system: updated.isSystem ?? false,
        tenant_id: 1,
        user_id: userId,
        updated_at: now,
      });
      await this.logAudit("UPDATE_LEDGER", `Updated Ledger in Cloud: ${ledger.name}`);
    } catch (err) {
      console.error("Supabase ledger update warning:", err);
    }

    return updated;
  }

  public async getParties(): Promise<Party[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("parties", "readonly");
      const store = tx.objectStore("parties");
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
    });
  }

  public async addParty(party: Party): Promise<Party> {
    const db = await this.getDB();
    const now = new Date().toISOString();
    const newParty = { ...party, createdAt: party.createdAt || now, updatedAt: now };

    const saved: Party = await new Promise((resolve, reject) => {
      const tx = db.transaction(["parties", "audit_logs"], "readwrite");
      const store = tx.objectStore("parties");
      const req = store.add(newParty);
      req.onsuccess = () => {
        resolve({ ...newParty, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });

    try {
      const userId = await this.getActiveUserId();
      const { data, error } = await supabase.from("parties").insert({
        name: saved.name,
        group_name: saved.group,
        address: saved.address,
        phone: saved.phone,
        gstin: saved.gstin,
        state: saved.state,
        opening: saved.opening,
        tenant_id: 1,
        user_id: userId,
      }).select().single();
      if (!error && data) {
        saved.id = data.id;
        await this.saveLocalParty(saved);
      }
      await this.logAudit("INSERT_PARTY", `Inserted Party in Cloud: ${saved.name}`);
    } catch (err) {
      console.error("Supabase party insert warning:", err);
    }

    return saved;
  }

  public async updateParty(party: Party): Promise<Party> {
    const now = new Date().toISOString();
    const updated = { ...party, updatedAt: now };
    await this.saveLocalParty(updated);

    try {
      const userId = await this.getActiveUserId();
      await supabase.from("parties").upsert({
        id: updated.id,
        name: updated.name,
        group_name: updated.group,
        address: updated.address,
        phone: updated.phone,
        gstin: updated.gstin,
        state: updated.state,
        opening: updated.opening,
        tenant_id: 1,
        user_id: userId,
        updated_at: now,
      });
      await this.logAudit("UPDATE_PARTY", `Updated Party in Cloud: ${party.name}`);
    } catch (err) {
      console.error("Supabase party update warning:", err);
    }

    return updated;
  }

  public async getStockItems(): Promise<StockItem[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("stock_items", "readonly");
      const store = tx.objectStore("stock_items");
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
    });
  }

  public async addStockItem(item: StockItem): Promise<StockItem> {
    const db = await this.getDB();
    const now = new Date().toISOString();
    const newItem = { ...item, createdAt: item.createdAt || now, updatedAt: now };

    const saved: StockItem = await new Promise((resolve, reject) => {
      const tx = db.transaction(["stock_items", "audit_logs"], "readwrite");
      const store = tx.objectStore("stock_items");
      const req = store.add(newItem);
      req.onsuccess = () => {
        resolve({ ...newItem, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });

    try {
      const userId = await this.getActiveUserId();
      const { data, error } = await supabase.from("stock_items").insert({
        name: saved.name,
        alias: saved.alias,
        group_name: saved.group,
        unit: saved.unit,
        opening_qty: saved.openingQty,
        opening_rate: saved.openingRate,
        opening_value: saved.openingValue,
        valuation_method: saved.valuationMethod || "FIFO",
        gst_applicability: saved.gstApplicability,
        hsn_details: saved.hsnDetails,
        hsn_code: saved.hsnCode,
        description: saved.description,
        gst_rate_details: saved.gstRateDetails,
        gst_rate: saved.gstRate || 0,
        type_of_supply: saved.typeOfSupply || "Goods",
        rate_of_duty: saved.rateOfDuty || 0,
        tenant_id: 1,
        user_id: userId,
      }).select().single();
      if (!error && data) {
        saved.id = data.id;
        await this.saveLocalStockItem(saved);
      }
      await this.logAudit("INSERT_STOCK_ITEM", `Inserted Stock Item in Cloud: ${saved.name}`);
    } catch (err) {
      console.error("Supabase stock item insert warning:", err);
    }

    return saved;
  }

  public async updateStockItem(item: StockItem): Promise<StockItem> {
    const now = new Date().toISOString();
    const updated = { ...item, updatedAt: now };
    await this.saveLocalStockItem(updated);

    try {
      const userId = await this.getActiveUserId();
      await supabase.from("stock_items").upsert({
        id: updated.id,
        name: updated.name,
        alias: updated.alias,
        group_name: updated.group,
        unit: updated.unit,
        opening_qty: updated.openingQty,
        opening_rate: updated.openingRate,
        opening_value: updated.openingValue,
        valuation_method: updated.valuationMethod || "FIFO",
        gst_applicability: updated.gstApplicability,
        hsn_details: updated.hsnDetails,
        hsn_code: updated.hsnCode,
        description: updated.description,
        gst_rate_details: updated.gstRateDetails,
        gst_rate: updated.gstRate || 0,
        type_of_supply: updated.typeOfSupply || "Goods",
        rate_of_duty: updated.rateOfDuty || 0,
        tenant_id: 1,
        user_id: userId,
        updated_at: now,
      });
      await this.logAudit("UPDATE_STOCK_ITEM", `Updated Stock Item in Cloud: ${item.name}`);
    } catch (err) {
      console.error("Supabase stock item update warning:", err);
    }

    return updated;
  }

  public async deleteStockItem(id: number): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["stock_items", "audit_logs"], "readwrite");
      const store = tx.objectStore("stock_items");
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    try {
      await supabase.from("stock_items").delete().eq("id", id);
      await this.logAudit("DELETE_STOCK_ITEM", `Deleted Stock Item ID in Cloud: ${id}`);
    } catch (err) {
      console.error("Supabase stock item delete warning:", err);
    }
  }

  public async getVouchers(): Promise<Voucher[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("vouchers", "readonly");
      const store = tx.objectStore("vouchers");
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as Voucher[];
        list.reverse();
        resolve(list);
      };
    });
  }

  private validateVoucherBalance(voucher: Voucher): void {
    if (voucher.entries && voucher.entries.length > 0) {
      let totalDebits = 0;
      let totalCredits = 0;
      for (const entry of voucher.entries) {
        if (entry.dr) totalDebits += Number(entry.amount) || 0;
        else totalCredits += Number(entry.amount) || 0;
      }
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          `Double-entry balance mismatch! Total Debits (₹${totalDebits.toFixed(
            2
          )}) must equal Total Credits (₹${totalCredits.toFixed(2)}).`
        );
      }
    }
  }

  public async addVoucher(voucher: Voucher): Promise<Voucher> {
    this.validateVoucherBalance(voucher);

    const db = await this.getDB();
    const now = new Date().toISOString();
    const newVch = { ...voucher, createdAt: voucher.createdAt || now, updatedAt: now };

    const saved: Voucher = await new Promise((resolve, reject) => {
      const tx = db.transaction(["vouchers", "audit_logs"], "readwrite");
      const store = tx.objectStore("vouchers");
      const req = store.add(newVch);
      req.onsuccess = () => {
        resolve({ ...newVch, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });

    // Sync Voucher & line items to Supabase
    try {
      const userId = await this.getActiveUserId();
      const { data: vdata, error: verr } = await supabase.from("vouchers").insert({
        vno: saved.vno,
        date: saved.date,
        type: saved.type,
        particulars: saved.particulars,
        account: saved.account,
        party_id: saved.partyId,
        ledger_id: saved.ledgerId,
        item: saved.item,
        qty: saved.qty,
        rate: saved.rate,
        advance: saved.advance,
        order_date: saved.orderDate,
        delivery_date: saved.deliveryDate,
        amount: saved.amount,
        dr: saved.dr,
        narration: saved.narration,
        taxable_value: saved.taxableValue || 0,
        cgst: saved.cgst || 0,
        sgst: saved.sgst || 0,
        igst: saved.igst || 0,
        total_with_tax: saved.totalWithTax || 0,
        is_pending_update: saved.isPendingUpdate || false,
        tenant_id: 1,
        user_id: userId,
      }).select().single();

      if (!verr && vdata) {
        saved.id = vdata.id;
        await this.saveLocalVoucher(saved);

        // Insert Voucher Items
        if (saved.items && saved.items.length > 0) {
          const itemPayload = saved.items.map((i) => ({
            voucher_id: vdata.id,
            name: i.name,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            gst_rate: i.gstRate || 0,
            hsn_code: i.hsnCode,
            taxable_value: i.taxableValue || 0,
            cgst: i.cgst || 0,
            sgst: i.sgst || 0,
            igst: i.igst || 0,
          }));
          await supabase.from("voucher_items").insert(itemPayload);
        }

        // Insert Voucher Entries
        if (saved.entries && saved.entries.length > 0) {
          const entryPayload = saved.entries.map((e) => ({
            voucher_id: vdata.id,
            ledger_name: e.ledgerName,
            amount: e.amount,
            dr: e.dr,
          }));
          await supabase.from("voucher_entries").insert(entryPayload);
        }
      }

      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><VOUCHER VOUCHERNUMBER="${voucher.vno}" VOUCHERTYPENAME="${voucher.type}"><DATE>${voucher.date}</DATE><PARTYNAME>${voucher.particulars}</PARTYNAME><AMOUNT>${voucher.amount}</AMOUNT></VOUCHER></IMPORTDATA></BODY></ENVELOPE>`;
      await this.logAudit("INSERT_VOUCHER", `Committed Transaction in Cloud: ${voucher.vno} (${voucher.type}) - Amount ₹${voucher.amount}`, xml);
    } catch (err) {
      console.error("Supabase voucher insert warning:", err);
    }

    return saved;
  }

  public async updateVoucher(voucher: Voucher): Promise<Voucher> {
    this.validateVoucherBalance(voucher);

    const now = new Date().toISOString();
    const updated = { ...voucher, updatedAt: now };
    await this.saveLocalVoucher(updated);

    try {
      const userId = await this.getActiveUserId();
      await supabase.from("vouchers").upsert({
        id: updated.id,
        vno: updated.vno,
        date: updated.date,
        type: updated.type,
        particulars: updated.particulars,
        account: updated.account,
        party_id: updated.partyId,
        ledger_id: updated.ledgerId,
        item: updated.item,
        qty: updated.qty,
        rate: updated.rate,
        advance: updated.advance,
        order_date: updated.orderDate,
        delivery_date: updated.deliveryDate,
        amount: updated.amount,
        dr: updated.dr,
        narration: updated.narration,
        taxable_value: updated.taxableValue || 0,
        cgst: updated.cgst || 0,
        sgst: updated.sgst || 0,
        igst: updated.igst || 0,
        total_with_tax: updated.totalWithTax || 0,
        is_pending_update: updated.isPendingUpdate || false,
        tenant_id: 1,
        user_id: userId,
        updated_at: now,
      });

      if (updated.id) {
        // Re-insert line items
        await supabase.from("voucher_items").delete().eq("voucher_id", updated.id);
        if (updated.items && updated.items.length > 0) {
          const itemPayload = updated.items.map((i) => ({
            voucher_id: updated.id,
            name: i.name,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            gst_rate: i.gstRate || 0,
            hsn_code: i.hsnCode,
            taxable_value: i.taxableValue || 0,
            cgst: i.cgst || 0,
            sgst: i.sgst || 0,
            igst: i.igst || 0,
          }));
          await supabase.from("voucher_items").insert(itemPayload);
        }

        // Re-insert entries
        await supabase.from("voucher_entries").delete().eq("voucher_id", updated.id);
        if (updated.entries && updated.entries.length > 0) {
          const entryPayload = updated.entries.map((e) => ({
            voucher_id: updated.id,
            ledger_name: e.ledgerName,
            amount: e.amount,
            dr: e.dr,
          }));
          await supabase.from("voucher_entries").insert(entryPayload);
        }
      }

      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><VOUCHER VOUCHERNUMBER="${voucher.vno}" VOUCHERTYPENAME="${voucher.type}"><DATE>${voucher.date}</DATE><PARTYNAME>${voucher.particulars}</PARTYNAME><AMOUNT>${voucher.amount}</AMOUNT></VOUCHER></IMPORTDATA></BODY></ENVELOPE>`;
      await this.logAudit("UPDATE_VOUCHER", `Updated Transaction in Cloud: ${voucher.vno} (${voucher.type}) - Amount ₹${voucher.amount}`, xml);
    } catch (err) {
      console.error("Supabase voucher update warning:", err);
    }

    return updated;
  }

  public async deleteVoucher(id: number): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["vouchers", "audit_logs"], "readwrite");
      const store = tx.objectStore("vouchers");
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    try {
      await supabase.from("vouchers").delete().eq("id", id);
      await this.logAudit("DELETE_VOUCHER", `Deleted Voucher ID in Cloud: ${id}`);
    } catch (err) {
      console.error("Supabase voucher delete warning:", err);
    }
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const userId = await this.getActiveUserId();
      let query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(100);
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          timestamp: d.timestamp,
          action: d.action,
          details: d.details,
          xmlPayload: d.xml_payload,
        }));
      }
    } catch (err) {
      console.warn("Falling back to local audit logs:", err);
    }

    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("audit_logs", "readonly");
      const store = tx.objectStore("audit_logs");
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as AuditLog[];
        list.reverse();
        resolve(list);
      };
    });
  }

  public async logAudit(action: string, details: string, xmlPayload?: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const db = await this.getDB();
    const tx = db.transaction("audit_logs", "readwrite");
    const store = tx.objectStore("audit_logs");
    store.add({ timestamp, action, details, xmlPayload });

    try {
      const userId = await this.getActiveUserId();
      await supabase.from("audit_logs").insert({
        timestamp,
        action,
        details,
        xml_payload: xmlPayload,
        tenant_id: 1,
        user_id: userId,
      });
    } catch (err) {
      console.warn("Supabase audit log insert warning:", err);
    }
  }

  // ─── Settings Store Methods (App Settings saved to Supabase) ───────────

  public async getAppSetting(key: string): Promise<any> {
    try {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
      if (!error && data) {
        return data.value;
      }
    } catch (err) {
      console.warn(`Falling back to local app_settings for key '${key}':`, err);
    }

    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("app_settings", "readonly");
      const store = tx.objectStore("app_settings");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
    });
  }

  public async saveAppSetting(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("app_settings", "readwrite");
    const store = tx.objectStore("app_settings");
    store.put({ key, value });

    try {
      await supabase.from("app_settings").upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });
      await this.logAudit("SAVE_SETTING", `Saved application setting '${key}' to Supabase Cloud`);
    } catch (err) {
      console.error("Setting cloud save warning:", err);
    }
  }

  // ─── Sync Outbox Store Methods ──────────────────────────────────────────

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("sync_queue", "readonly");
      const store = tx.objectStore("sync_queue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  public async addSyncQueueItem(item: Omit<SyncQueueItem, "id">): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getSyncMeta(key: string): Promise<any> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("sync_meta", "readonly");
      const store = tx.objectStore("sync_meta");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
    });
  }

  public async setSyncMeta(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_meta", "readwrite");
      const store = tx.objectStore("sync_meta");
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ─── SQL Query Processor for Debug Console ──────────────────────

  public async executeSql(query: string): Promise<SqlQueryResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { columns: [], rows: [], message: "Empty SQL Query", rowCount: 0 };
    }

    const db = await this.getDB();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("show tables") || lower === "tables") {
      const tables = Array.from(db.objectStoreNames);
      return {
        columns: ["Table Name"],
        rows: tables.map((t) => [t]),
        message: `${tables.length} tables in local cache & Supabase schema`,
        rowCount: tables.length,
      };
    }

    if (lower.startsWith("describe ") || lower.startsWith("desc ")) {
      const tableName = trimmed.split(/\s+/)[1]?.toLowerCase();
      if (!db.objectStoreNames.contains(tableName)) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const schemaMap: Record<string, string[]> = {
        companies: ["id (INT PK)", "name (VARCHAR)", "financialYear (VARCHAR)", "booksFrom (VARCHAR)", "state (VARCHAR)", "createdAt (DATETIME)"],
        ledgers: ["id (INT PK)", "name (VARCHAR UNIQUE)", "group (VARCHAR)", "opening (FLOAT)", "isSystem (BOOL)"],
        parties: ["id (INT PK)", "name (VARCHAR UNIQUE)", "group (VARCHAR)", "address (TEXT)", "phone (VARCHAR)", "gstin (VARCHAR)", "opening (FLOAT)", "createdAt (DATETIME)"],
        stock_items: ["id (INT PK)", "name (VARCHAR UNIQUE)", "group (VARCHAR)", "unit (VARCHAR)", "openingQty (FLOAT)", "openingRate (FLOAT)", "openingValue (FLOAT)", "valuationMethod (VARCHAR)", "createdAt (DATETIME)"],
        vouchers: ["id (INT PK)", "vno (VARCHAR UNIQUE)", "date (VARCHAR)", "type (VARCHAR)", "particulars (VARCHAR)", "account (VARCHAR)", "amount (FLOAT)", "dr (BOOL)", "taxableValue (FLOAT)", "cgst (FLOAT)", "sgst (FLOAT)", "igst (FLOAT)", "totalWithTax (FLOAT)", "narration (TEXT)", "createdAt (DATETIME)"],
        audit_logs: ["id (INT PK)", "timestamp (DATETIME)", "action (VARCHAR)", "details (TEXT)", "xmlPayload (CLOB)"],
        app_settings: ["key (VARCHAR PK)", "value (JSONB)", "updated_at (DATETIME)"],
        sync_queue: ["id (INT PK)", "entity (VARCHAR)", "operation (VARCHAR)", "localId (INT)", "serverId (INT)", "status (VARCHAR)", "createdAt (DATETIME)", "attempts (INT)", "lastError (TEXT)"],
      };

      const fields = schemaMap[tableName] || ["id", "data"];
      return {
        columns: ["Column Definition"],
        rows: fields.map((f) => [f]),
        message: `Schema for table '${tableName}'`,
        rowCount: fields.length,
      };
    }

    if (lower.startsWith("select")) {
      const match = trimmed.match(/select\s+(.+?)\s+from\s+([a-z0-9_]+)(?:\s+where\s+(.+))?/i);
      if (!match) {
        throw new Error("Syntax error in SQL SELECT statement. Usage: SELECT * FROM table [WHERE col = val]");
      }

      const [, colString, tableName, whereClause] = match;
      if (!db.objectStoreNames.contains(tableName.toLowerCase())) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const records: any[] = await new Promise((resolve) => {
        const tx = db.transaction(tableName.toLowerCase(), "readonly");
        const store = tx.objectStore(tableName.toLowerCase());
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
      });

      let filtered = records;

      if (whereClause) {
        const parts = whereClause.split("=");
        if (parts.length === 2) {
          const colKey = parts[0].trim();
          const targetVal = parts[1].trim().replace(/['"]/g, "");
          filtered = records.filter((r) => String(r[colKey]).toLowerCase() === targetVal.toLowerCase());
        }
      }

      if (filtered.length === 0) {
        return { columns: ["Result"], rows: [["No records found"]], message: "0 rows returned", rowCount: 0 };
      }

      let keys: string[] = [];
      if (colString.trim() === "*") {
        keys = Object.keys(filtered[0]);
      } else {
        keys = colString.split(",").map((k) => k.trim());
      }

      const rows = filtered.map((rec) => keys.map((k) => (rec[k] !== undefined ? String(typeof rec[k] === "object" ? JSON.stringify(rec[k]) : rec[k]) : "NULL")));

      return {
        columns: keys,
        rows,
        message: `Fetched ${rows.length} records from table '${tableName}'`,
        rowCount: rows.length,
      };
    }

    if (lower.startsWith("delete from")) {
      const match = trimmed.match(/delete\s+from\s+([a-z0-9_]+)(?:\s+where\s+(.+))?/i);
      if (!match) {
        throw new Error("Syntax error in SQL DELETE. Usage: DELETE FROM table [WHERE col = val]");
      }

      const [, tableNameRaw, whereClause] = match;
      const tableName = tableNameRaw.toLowerCase();
      if (!db.objectStoreNames.contains(tableName)) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const tx = db.transaction(tableName, "readwrite");
      const store = tx.objectStore(tableName);

      if (!whereClause) {
        store.clear();
        return new Promise((resolve) => {
          tx.oncomplete = () => {
            resolve({
              columns: ["Status"],
              rows: [["Table truncated successfully"]],
              message: `Cleared all rows from '${tableName}'`,
              rowCount: 1,
            });
          };
        });
      } else {
        const parts = whereClause.split("=");
        if (parts.length !== 2) {
          throw new Error("Invalid WHERE clause. Usage: WHERE col = val");
        }
        const colKey = parts[0].trim();
        const targetVal = parts[1].trim().replace(/['"]/g, "");

        return new Promise((resolve, reject) => {
          const req = store.openCursor();
          let deletedCount = 0;

          req.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              const record = cursor.value;
              if (String(record[colKey]).toLowerCase() === targetVal.toLowerCase()) {
                cursor.delete();
                deletedCount++;
              }
              cursor.continue();
            }
          };

          tx.oncomplete = () => {
            resolve({
              columns: ["Status"],
              rows: [[`Deleted ${deletedCount} record(s)`]],
              message: `Deleted ${deletedCount} record(s) matching condition from '${tableName}'`,
              rowCount: deletedCount,
            });
          };
          tx.onerror = () => reject(tx.error);
        });
      }
    }

    throw new Error("Unsupported query command. Supported commands: SELECT, SHOW TABLES, DESCRIBE <table>, DELETE FROM <table> WHERE ...");
  }

  public async exportSqlDump(): Promise<string> {
    const parties = await this.getParties();
    const ledgers = await this.getLedgers();
    const stockItems = await this.getStockItems();
    const vouchers = await this.getVouchers();
    const company = await this.getCompany();

    let sql = `-- Tap Accounting Supabase & Local Database Dump\n`;
    sql += `-- Exported on: ${new Date().toISOString()}\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY, name TEXT, financial_year TEXT, books_from TEXT);\n`;
    sql += `INSERT INTO companies VALUES (1, '${company.name.replace(/'/g, "''")}', '${company.financialYear}', '${company.booksFrom}');\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS ledgers (id INTEGER PRIMARY KEY, name TEXT UNIQUE, group_name TEXT, opening_balance REAL);\n`;
    for (const l of ledgers) {
      sql += `INSERT INTO ledgers (name, group_name, opening_balance) VALUES ('${l.name.replace(/'/g, "''")}', '${l.group}', ${l.opening});\n`;
    }
    sql += `\n`;

    sql += `CREATE TABLE IF NOT EXISTS parties (id INTEGER PRIMARY KEY, name TEXT UNIQUE, group_name TEXT, address TEXT, phone TEXT, gstin TEXT, opening_balance REAL);\n`;
    for (const p of parties) {
      sql += `INSERT INTO parties (name, group_name, address, phone, gstin, opening_balance) VALUES ('${p.name.replace(/'/g, "''")}', '${p.group}', '${p.address.replace(/'/g, "''")}', '${p.phone}', '${p.gstin}', ${parseFloat(p.opening) || 0});\n`;
    }
    sql += `\n`;

    sql += `CREATE TABLE IF NOT EXISTS stock_items (id INTEGER PRIMARY KEY, name TEXT UNIQUE, group_name TEXT, unit TEXT, opening_qty REAL, opening_rate REAL, opening_value REAL, valuation_method TEXT);\n`;
    for (const s of stockItems) {
      sql += `INSERT INTO stock_items (name, group_name, unit, opening_qty, opening_rate, opening_value, valuation_method) VALUES ('${s.name.replace(/'/g, "''")}', '${s.group}', '${s.unit}', ${s.openingQty}, ${s.openingRate}, ${s.openingValue}, '${s.valuationMethod || "FIFO"}');\n`;
    }
    sql += `\n`;

    sql += `CREATE TABLE IF NOT EXISTS vouchers (id INTEGER PRIMARY KEY, vno TEXT UNIQUE, date TEXT, type TEXT, particulars TEXT, account TEXT, item TEXT, qty REAL, rate REAL, amount REAL, dr INTEGER);\n`;
    for (const v of vouchers) {
      sql += `INSERT INTO vouchers (vno, date, type, particulars, account, item, qty, rate, amount, dr) VALUES ('${v.vno}', '${v.date}', '${v.type}', '${v.particulars.replace(/'/g, "''")}', '${v.account || ""}', '${(v.item || "").replace(/'/g, "''")}', ${v.qty || 1}, ${v.rate || 0}, ${v.amount}, ${v.dr ? 1 : 0});\n`;
    }

    return sql;
  }

  public async resetDatabase(): Promise<void> {
    const db = await this.getDB();
    const stores = ["companies", "ledgers", "parties", "stock_items", "vouchers", "audit_logs", "sync_queue", "sync_meta", "app_settings"];
    const tx = db.transaction(stores, "readwrite");
    for (const s of stores) {
      tx.objectStore(s).clear();
    }
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(null);
    });

    try {
      await supabase.from("vouchers").delete().neq("id", 0);
      await supabase.from("stock_items").delete().neq("id", 0);
      await supabase.from("parties").delete().neq("id", 0);
      await supabase.from("ledgers").delete().neq("id", 0);
    } catch (err) {
      console.error("Cloud database reset error:", err);
    }

    await this.seedDefaultData();
  }
}

export const DB = new DatabaseEngine();
