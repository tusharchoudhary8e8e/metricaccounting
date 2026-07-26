import { DB, SyncQueueItem, Ledger, Party, StockItem, Voucher } from "./database";
import { SyncStatusInfo } from "../app/components/HeaderBars";

export class SyncEngine {
  private listener: ((status: SyncStatusInfo) => void) | null = null;
  private isSyncing = false;

  public setStatusListener(listener: (status: SyncStatusInfo) => void) {
    this.listener = listener;
    this.notifyStatus();
  }

  public async notifyStatus() {
    if (!this.listener) return;

    if (!navigator.onLine) {
      const queue = await DB.getSyncQueue();
      const pending = queue.filter((q) => q.status === "pending" || q.status === "failed" || q.status === "syncing");
      this.listener({
        status: "offline",
        pendingCount: pending.length,
      });
      return;
    }

    if (this.isSyncing) {
      const queue = await DB.getSyncQueue();
      const pending = queue.filter((q) => q.status === "pending" || q.status === "failed" || q.status === "syncing");
      this.listener({
        status: "syncing",
        pendingCount: pending.length,
      });
      return;
    }

    const queue = await DB.getSyncQueue();
    const pending = queue.filter((q) => q.status === "pending" || q.status === "syncing");
    const failed = queue.filter((q) => q.status === "failed" || q.status === "conflict");
    const lastSync = await DB.getSyncMeta("lastSyncTimestamp");

    if (failed.length > 0) {
      this.listener({
        status: "failed",
        pendingCount: failed.length,
        lastSync,
        error: failed[0]?.lastError || "Sync failed for some items",
      });
    } else if (pending.length > 0) {
      this.listener({
        status: "pending",
        pendingCount: pending.length,
        lastSync,
      });
    } else {
      this.listener({
        status: "synced",
        pendingCount: 0,
        lastSync: lastSync ? new Date(lastSync).toLocaleTimeString() : undefined,
      });
    }
  }

  public async enqueue(
    entity: "company" | "ledger" | "party" | "stock_item" | "voucher",
    operation: "create" | "update" | "delete",
    localId: number,
    payload: any
  ) {
    const item: Omit<SyncQueueItem, "id"> = {
      entity,
      operation,
      localId,
      payload,
      status: "pending",
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await DB.addSyncQueueItem(item);
    await this.notifyStatus();
  }

  public async executeSync(apiBaseUrl = "http://localhost:4000/api", token?: string): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) {
      await this.notifyStatus();
      return { success: false, message: "No internet connection available." };
    }

    if (this.isSyncing) {
      return { success: false, message: "Sync is already in progress." };
    }

    this.isSyncing = true;
    await this.notifyStatus();

    try {
      const queue = await DB.getSyncQueue();
      const pendingItems = queue.filter((q) => q.status === "pending" || q.status === "failed" || q.status === "syncing");

      // Step 1: Push pending local changes to server if any exist
      if (pendingItems.length > 0) {
        for (const item of pendingItems) {
          item.status = "syncing";
          item.attempts += 1;
          await DB.updateSyncQueueItem(item);
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${apiBaseUrl}/sync/push`, {
          method: "POST",
          headers,
          body: JSON.stringify({ items: pendingItems }),
        });

        if (response.ok) {
          const result = await response.json();
          for (const res of result.results || []) {
            const match = pendingItems.find((p) => p.localId === res.localId && p.entity === res.entity);
            if (match) {
              if (res.success) {
                match.status = "synced";
                match.serverId = res.serverId;
                await DB.updateSyncQueueItem(match);
              } else {
                match.status = res.conflict ? "conflict" : "failed";
                match.lastError = res.error || "Server processing error";
                await DB.updateSyncQueueItem(match);
              }
            }
          }
        } else {
          for (const item of pendingItems) {
            item.status = "failed";
            item.lastError = `Server HTTP ${response.status}`;
            await DB.updateSyncQueueItem(item);
          }
        }
      }

      // Step 2: Pull remote delta changes from server
      const lastSync = await DB.getSyncMeta("lastSyncTimestamp") || "1970-01-01T00:00:00.000Z";
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const pullResponse = await fetch(`${apiBaseUrl}/sync/pull?since=${encodeURIComponent(lastSync)}`, {
        headers,
      });

      if (pullResponse.ok) {
        const delta = await pullResponse.json();
        if (delta.ledgers) {
          for (const l of delta.ledgers as Ledger[]) await DB.addLedger(l);
        }
        if (delta.parties) {
          for (const p of delta.parties as Party[]) await DB.addParty(p);
        }
        if (delta.stockItems) {
          for (const s of delta.stockItems as StockItem[]) await DB.addStockItem(s);
        }
        if (delta.vouchers) {
          for (const v of delta.vouchers as Voucher[]) await DB.addVoucher(v);
        }

        await DB.setSyncMeta("lastSyncTimestamp", new Date().toISOString());
      }

      this.isSyncing = false;
      await this.notifyStatus();
      return { success: true, message: "Sync completed successfully!" };
    } catch (err: any) {
      this.isSyncing = false;
      // Revert attempted items in syncing status back to failed state so they don't get orphaned
      try {
        const queue = await DB.getSyncQueue();
        const syncingItems = queue.filter((q) => q.status === "syncing");
        for (const item of syncingItems) {
          item.status = "failed";
          item.lastError = err.message || String(err);
          await DB.updateSyncQueueItem(item);
        }
      } catch (dbErr) {
        console.error("Failed to revert syncing items:", dbErr);
      }
      await this.notifyStatus();
      return { success: false, message: err.message || "Network or server connection error during sync." };
    }
  }
}

export const syncEngine = new SyncEngine();
