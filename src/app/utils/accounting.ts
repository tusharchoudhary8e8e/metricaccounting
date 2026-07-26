import { Party, Voucher, Ledger } from "../../db/database";

export const MONO = "'Share Tech Mono', 'Courier Prime', monospace";

export const COMPANY = "Meridian Enterprises Ltd.";
export const FY = "1-Apr-2024 to 31-Mar-2025";

export const getTodayString = () => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

export const today = getTodayString();

export function parseAndFormatDate(input: string): string {
  if (!input) return today;
  const clean = input.trim();

  // Regex for standard DD-MMM-YYYY or DD-MMM-YY (e.g. 21-Jul-2026, 21-Jul-26)
  const mmmRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/;
  const matchMmm = clean.match(mmmRegex);
  if (matchMmm) {
    const day = matchMmm[1].padStart(2, "0");
    const month = matchMmm[2].charAt(0).toUpperCase() + matchMmm[2].slice(1).toLowerCase();
    let year = matchMmm[3];
    if (year.length === 2) {
      const yr = parseInt(year, 10);
      year = String(yr + (yr < 50 ? 2000 : 1900));
    }
    return `${day}-${month}-${year}`;
  }

  // Parse numerical formats e.g. 21-7-26, 7-7-26, 21/07/2026, 7.7.26
  const sepRegex = /[-/.]/;
  if (sepRegex.test(clean)) {
    const parts = clean.split(sepRegex);
    if (parts.length >= 2) {
      let dayNum = parseInt(parts[0], 10);
      let monthNum = parseInt(parts[1], 10);
      let yearNum = new Date().getFullYear(); // fallback to current year

      if (parts.length >= 3) {
        let yr = parseInt(parts[2], 10);
        if (yr < 100) {
          yearNum = yr + (yr < 50 ? 2000 : 1900);
        } else {
          yearNum = yr;
        }
      }

      if (!isNaN(dayNum) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dayStr = String(dayNum).padStart(2, "0");
        const monthStr = months[monthNum - 1];
        return `${dayStr}-${monthStr}-${yearNum}`;
      }
    }
  }

  return clean;
}

export const MONTHS = [
  { full: "April", short: "Apr" },
  { full: "May", short: "May" },
  { full: "June", short: "Jun" },
  { full: "July", short: "Jul" },
  { full: "August", short: "Aug" },
  { full: "September", short: "Sep" },
  { full: "October", short: "Oct" },
  { full: "November", short: "Nov" },
  { full: "December", short: "Dec" },
  { full: "January", short: "Jan" },
  { full: "February", short: "Feb" },
  { full: "March", short: "Mar" },
];

export type VoucherType = "Payment" | "Receipt" | "Sales" | "Purchase" | "Journal" | "Contra";

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Accounting Helper: Get complete ledger transaction history and balances
export function calculateLedgerTransactions(
  ledgerName: string,
  parties: Party[],
  dayBook: Voucher[],
  systemLedgers: Ledger[]
) {
  if (!ledgerName) return { transactions: [], openingBal: 0, closingBal: 0, isNormalDr: true };

  const normName = ledgerName.trim().toLowerCase();

  const partyObj = parties.find((p) => p.name.trim().toLowerCase() === normName);
  const ledgerObj = systemLedgers.find((l) => l.name.trim().toLowerCase() === normName);

  let openingBal = 0;
  let isNormalDr = true;

  if (partyObj) {
    openingBal = parseFloat(partyObj.opening) || 0;
    if (partyObj.group === "Sundry Creditors") {
      isNormalDr = false;
    }
  } else if (ledgerObj) {
    openingBal = ledgerObj.opening || 0;
    const grp = ledgerObj.group.toLowerCase();
    if (
      grp.includes("sales") ||
      grp.includes("creditor") ||
      grp.includes("capital") ||
      grp.includes("taxes") ||
      grp.includes("liability")
    ) {
      isNormalDr = false;
    }
  }

  const sortedDayBook = [...dayBook].reverse();
  const txs: any[] = [];
  let runningBalance = isNormalDr ? openingBal : -openingBal;

  for (const m of sortedDayBook) {
    // If the voucher has precise double-entry lines, parse them directly!
    if (m.entries && m.entries.length > 0) {
      const match = m.entries.find((e) => e.ledgerName.trim().toLowerCase() === normName);
      if (match) {
        const amt = match.amount || 0;
        const isDr = match.dr;
        if (isDr) {
          runningBalance += isNormalDr ? amt : -amt;
        } else {
          runningBalance += isNormalDr ? -amt : amt;
        }

        // Find the opposing entry ledger name for particulars display
        const opposing = m.entries.find((e) => e.dr !== isDr);
        const particularsText = opposing ? opposing.ledgerName : (m.particulars || "Account");

        txs.push({
          date: m.date,
          vno: m.vno,
          type: m.type,
          particulars: isDr ? `To ${particularsText}` : `By ${particularsText}`,
          debit: isDr ? amt : 0,
          credit: !isDr ? amt : 0,
          balance: runningBalance,
          raw: m,
        });
      }
      continue;
    }

    const part = (m.particulars || "").trim().toLowerCase();
    const acc = (m.account || "").trim().toLowerCase();
    const isParticulars = part === normName || part.includes(normName);
    const isAccount = acc === normName || acc.includes(normName);

    if (m.type === "Sales") {
      if (isParticulars || normName === "sundry debtors") {
        const amt = m.amount || 0;
        runningBalance += amt;
        const itemsStr = m.items && m.items.length > 0 ? m.items.map((it) => it.name).join(", ") : (m.item || "Goods/Services");
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Sales",
          particulars: `Sales: ${itemsStr}`,
          debit: amt,
          credit: 0,
          balance: runningBalance,
          raw: m,
        });
        if (m.advance && parseFloat(String(m.advance)) > 0) {
          const adv = parseFloat(String(m.advance));
          runningBalance -= adv;
          txs.push({
            date: m.date,
            vno: `${m.vno}-Adv`,
            type: "Receipt",
            particulars: "Advance Received",
            debit: 0,
            credit: adv,
            balance: runningBalance,
            raw: m,
          });
        }
      } else if (normName === "sales account" || normName === "sales accounts") {
        if (m.isPendingUpdate) continue;
        const amt = m.amount || 0;
        runningBalance += amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Sales",
          particulars: m.particulars,
          debit: 0,
          credit: amt,
          balance: runningBalance,
          raw: m,
        });
      } else if ((normName === "cash" || normName.includes("bank")) && m.advance && parseFloat(String(m.advance)) > 0) {
        const adv = parseFloat(String(m.advance));
        runningBalance += adv;
        txs.push({
          date: m.date,
          vno: `${m.vno}-Adv`,
          type: "Receipt",
          particulars: `Advance from ${m.particulars}`,
          debit: adv,
          credit: 0,
          balance: runningBalance,
          raw: m,
        });
      }
    } else if (m.type === "Purchase") {
      if (isParticulars || normName === "sundry creditors") {
        const amt = m.amount || 0;
        runningBalance += amt;
        const itemsStr = m.items && m.items.length > 0 ? m.items.map((it) => it.name).join(", ") : (m.item || "Items");
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Purchase",
          particulars: `Purchase: ${itemsStr}`,
          debit: 0,
          credit: amt,
          balance: runningBalance,
          raw: m,
        });
      } else if (normName === "purchase account" || normName === "purchase accounts") {
        const amt = m.amount || 0;
        runningBalance += amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Purchase",
          particulars: m.particulars,
          debit: amt,
          credit: 0,
          balance: runningBalance,
          raw: m,
        });
      }
    } else if (m.type === "Receipt") {
      const amt = parseFloat(String(m.amount)) || 0;
      if (isParticulars) {
        runningBalance -= amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Receipt",
          particulars: `Received into ${m.account || "Bank/Cash"}`,
          debit: 0,
          credit: amt,
          balance: runningBalance,
          raw: m,
        });
      } else if (isAccount) {
        runningBalance += amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Receipt",
          particulars: `Received from ${m.particulars}`,
          debit: amt,
          credit: 0,
          balance: runningBalance,
          raw: m,
        });
      }
    } else if (m.type === "Payment") {
      const amt = parseFloat(String(m.amount)) || 0;
      if (isParticulars) {
        runningBalance += amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Payment",
          particulars: `Paid via ${m.account || "Bank/Cash"}`,
          debit: amt,
          credit: 0,
          balance: runningBalance,
          raw: m,
        });
      } else if (isAccount) {
        runningBalance -= amt;
        txs.push({
          date: m.date,
          vno: m.vno,
          type: "Payment",
          particulars: `Paid to ${m.particulars}`,
          debit: 0,
          credit: amt,
          balance: runningBalance,
          raw: m,
        });
      }
    } else {
      const amt = parseFloat(String(m.amount)) || 0;
      if (isParticulars) {
        if (m.dr) {
          runningBalance += amt;
          txs.push({ date: m.date, vno: m.vno, type: m.type, particulars: m.particulars, debit: amt, credit: 0, balance: runningBalance, raw: m });
        } else {
          runningBalance -= amt;
          txs.push({ date: m.date, vno: m.vno, type: m.type, particulars: m.particulars, debit: 0, credit: amt, balance: runningBalance, raw: m });
        }
      } else if (isAccount) {
        if (m.dr) {
          runningBalance -= amt;
          txs.push({ date: m.date, vno: m.vno, type: m.type, particulars: m.account, debit: 0, credit: amt, balance: runningBalance, raw: m });
        } else {
          runningBalance += amt;
          txs.push({ date: m.date, vno: m.vno, type: m.type, particulars: m.account, debit: amt, credit: 0, balance: runningBalance, raw: m });
        }
      }
    }
  }

  return {
    transactions: txs.reverse(),
    openingBal,
    closingBal: runningBalance,
    isNormalDr,
  };
}

export function generateVoucherNo(type: VoucherType, dayBook: Voucher[]) {
  const prefixMap: Record<VoucherType, string> = {
    Sales: "Sal-",
    Payment: "Pay-",
    Receipt: "Rcpt-",
    Purchase: "Pur-",
    Journal: "Jnl-",
    Contra: "Cnt-",
  };
  const baseNums: Record<VoucherType, number> = {
    Sales: 890,
    Payment: 204,
    Receipt: 91,
    Purchase: 312,
    Journal: 45,
    Contra: 10,
  };
  const count = dayBook.filter((v) => v.type === type).length + 1;
  return `${prefixMap[type]}${baseNums[type] + count}`;
}
