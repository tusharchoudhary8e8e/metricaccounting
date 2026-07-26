import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();

export async function createVoucher(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const {
      vno,
      date,
      type,
      particulars,
      account,
      amount,
      dr,
      narration,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalWithTax,
      items,
      entries,
    } = req.body;

    if (!vno || !date || !type || !particulars || amount === undefined) {
      return res.status(400).json({ error: "vno, date, type, particulars, and amount are required." });
    }

    // Fix 1.5: Enforce Double-Entry Balance Server-Side inside a DB transaction
    if (entries && Array.isArray(entries) && entries.length > 0) {
      let totalDebits = 0;
      let totalCredits = 0;
      for (const entry of entries) {
        if (entry.dr) totalDebits += Number(entry.amount) || 0;
        else totalCredits += Number(entry.amount) || 0;
      }

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return res.status(400).json({
          error: `Unbalanced Voucher! Total Debits (₹${totalDebits.toFixed(
            2
          )}) must equal Total Credits (₹${totalCredits.toFixed(2)}).`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          vno,
          date,
          type,
          particulars,
          account,
          amount: Number(amount),
          dr: Boolean(dr),
          narration,
          taxableValue: Number(taxableValue) || Number(amount),
          cgst: Number(cgst) || 0,
          sgst: Number(sgst) || 0,
          igst: Number(igst) || 0,
          totalWithTax: Number(totalWithTax) || Number(amount),
          tenantId,
        },
      });

      if (items && Array.isArray(items)) {
        for (const item of items) {
          await tx.voucherItem.create({
            data: {
              voucherId: voucher.id,
              name: item.name,
              qty: Number(item.qty),
              rate: Number(item.rate),
              amount: Number(item.amount),
              gstRate: Number(item.gstRate) || 0,
              hsnCode: item.hsnCode,
              taxableValue: Number(item.taxableValue) || Number(item.amount),
              cgst: Number(item.cgst) || 0,
              sgst: Number(item.sgst) || 0,
              igst: Number(item.igst) || 0,
            },
          });
        }
      }

      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          await tx.voucherEntry.create({
            data: {
              voucherId: voucher.id,
              ledgerName: entry.ledgerName,
              amount: Number(entry.amount),
              dr: Boolean(entry.dr),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: "INSERT_VOUCHER",
          details: `Server Committed Transaction: ${vno} (${type}) - Amount ₹${amount}`,
          tenantId,
        },
      });

      return voucher;
    });

    return res.status(201).json({ message: "Voucher created successfully", voucher: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create voucher" });
  }
}

export async function getVouchers(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const since = req.query.since as string;

    const where: any = { tenantId };
    if (since) {
      where.updatedAt = { gte: new Date(since) };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: { items: true, entries: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ vouchers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch vouchers" });
  }
}
