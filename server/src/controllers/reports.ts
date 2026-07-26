import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();

export async function getTrialBalance(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const ledgers = await prisma.ledger.findMany({ where: { tenantId } });
    const parties = await prisma.party.findMany({ where: { tenantId } });
    const vouchers = await prisma.voucher.findMany({ where: { tenantId } });

    let totDr = 0;
    let totCr = 0;
    const rows: any[] = [];

    for (const l of ledgers) {
      const vchs = vouchers.filter((v) => v.particulars === l.name || v.account === l.name);
      let balance = l.opening;
      vchs.forEach((v) => {
        if (v.dr) balance += v.amount;
        else balance -= v.amount;
      });

      const dr = balance >= 0 ? balance : 0;
      const cr = balance < 0 ? Math.abs(balance) : 0;
      totDr += dr;
      totCr += cr;
      rows.push({ name: l.name, group: l.group, debit: dr, credit: cr });
    }

    for (const p of parties) {
      const vchs = vouchers.filter((v) => v.particulars === p.name || v.account === p.name);
      let balance = parseFloat(p.opening) || 0;
      vchs.forEach((v) => {
        if (v.dr) balance += v.amount;
        else balance -= v.amount;
      });

      const dr = balance >= 0 ? balance : 0;
      const cr = balance < 0 ? Math.abs(balance) : 0;
      totDr += dr;
      totCr += cr;
      rows.push({ name: p.name, group: p.group, debit: dr, credit: cr });
    }

    return res.json({ rows, totalDebit: totDr, totalCredit: totCr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to calculate Trial Balance" });
  }
}

export async function getProfitAndLoss(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const vouchers = await prisma.voucher.findMany({ where: { tenantId } });

    const salesVchs = vouchers.filter((v) => v.type === "Sales" || v.account === "Sales Account");
    const purchaseVchs = vouchers.filter((v) => v.type === "Purchase" || v.account === "Purchase Account");

    const salesIncome = salesVchs.reduce((s, v) => s + (v.amount || 0), 0);
    const purchaseCost = purchaseVchs.reduce((s, v) => s + (v.amount || 0), 0);

    const salaries = vouchers.filter((v) => v.particulars === "Salary Expenses").reduce((s, v) => s + v.amount, 0);
    const rent = vouchers.filter((v) => v.particulars === "Rent Expenses").reduce((s, v) => s + v.amount, 0);

    const totalExpenses = purchaseCost + salaries + rent;
    const netProfit = salesIncome - totalExpenses;

    return res.json({
      salesIncome,
      purchaseCost,
      salaries,
      rent,
      totalExpenses,
      netProfit,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to calculate P&L" });
  }
}
