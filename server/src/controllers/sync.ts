import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();

export async function pushSync(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "items array is required." });
    }

    const results: any[] = [];

    for (const item of items) {
      const { entity, operation, localId, payload } = item;

      try {
        if (entity === "ledger") {
          if (operation === "create" || operation === "update") {
            const saved = await prisma.ledger.upsert({
              where: { tenantId_name: { tenantId, name: payload.name } },
              update: {
                group: payload.group,
                opening: Number(payload.opening) || 0,
                isSystem: Boolean(payload.isSystem),
              },
              create: {
                name: payload.name,
                group: payload.group,
                opening: Number(payload.opening) || 0,
                isSystem: Boolean(payload.isSystem),
                tenantId,
              },
            });
            results.push({ localId, entity, success: true, serverId: saved.id });
          } else if (operation === "delete" && payload.id) {
            await prisma.ledger.deleteMany({ where: { id: payload.id, tenantId } });
            results.push({ localId, entity, success: true });
          }
        } else if (entity === "party") {
          if (operation === "create" || operation === "update") {
            const saved = await prisma.party.upsert({
              where: { tenantId_name: { tenantId, name: payload.name } },
              update: {
                group: payload.group,
                address: payload.address || "",
                phone: payload.phone || "",
                gstin: payload.gstin || "",
                state: payload.state || "",
                opening: String(payload.opening || "0"),
              },
              create: {
                name: payload.name,
                group: payload.group,
                address: payload.address || "",
                phone: payload.phone || "",
                gstin: payload.gstin || "",
                state: payload.state || "",
                opening: String(payload.opening || "0"),
                tenantId,
              },
            });
            results.push({ localId, entity, success: true, serverId: saved.id });
          } else if (operation === "delete" && payload.id) {
            await prisma.party.deleteMany({ where: { id: payload.id, tenantId } });
            results.push({ localId, entity, success: true });
          }
        } else if (entity === "stock_item") {
          if (operation === "create" || operation === "update") {
            const saved = await prisma.stockItem.upsert({
              where: { tenantId_name: { tenantId, name: payload.name } },
              update: {
                alias: payload.alias,
                group: payload.group,
                unit: payload.unit,
                openingQty: Number(payload.openingQty) || 0,
                openingRate: Number(payload.openingRate) || 0,
                openingValue: Number(payload.openingValue) || 0,
                valuationMethod: payload.valuationMethod || "FIFO",
                gstApplicability: payload.gstApplicability,
                hsnCode: payload.hsnCode,
                description: payload.description,
                gstRate: Number(payload.gstRate) || 0,
                typeOfSupply: payload.typeOfSupply || "Goods",
                rateOfDuty: Number(payload.rateOfDuty) || 0,
              },
              create: {
                name: payload.name,
                alias: payload.alias,
                group: payload.group,
                unit: payload.unit,
                openingQty: Number(payload.openingQty) || 0,
                openingRate: Number(payload.openingRate) || 0,
                openingValue: Number(payload.openingValue) || 0,
                valuationMethod: payload.valuationMethod || "FIFO",
                gstApplicability: payload.gstApplicability,
                hsnCode: payload.hsnCode,
                description: payload.description,
                gstRate: Number(payload.gstRate) || 0,
                typeOfSupply: payload.typeOfSupply || "Goods",
                rateOfDuty: Number(payload.rateOfDuty) || 0,
                tenantId,
              },
            });
            results.push({ localId, entity, success: true, serverId: saved.id });
          } else if (operation === "delete" && payload.id) {
            await prisma.stockItem.deleteMany({ where: { id: payload.id, tenantId } });
            results.push({ localId, entity, success: true });
          }
        } else if (entity === "voucher") {
          if (operation === "create" || operation === "update") {
            // Check double-entry balance for financial amounts
            if (payload.entries && Array.isArray(payload.entries)) {
              let debits = 0;
              let credits = 0;
              for (const e of payload.entries) {
                if (e.dr) debits += Number(e.amount) || 0;
                else credits += Number(e.amount) || 0;
              }
              if (Math.abs(debits - credits) > 0.01) {
                results.push({
                  localId,
                  entity,
                  success: false,
                  error: `Unbalanced debits (₹${debits}) vs credits (₹${credits})`,
                });
                continue;
              }
            }

            const saved = await prisma.voucher.upsert({
              where: { tenantId_vno: { tenantId, vno: payload.vno } },
              update: {
                date: payload.date,
                type: payload.type,
                particulars: payload.particulars,
                account: payload.account,
                amount: Number(payload.amount) || 0,
                dr: Boolean(payload.dr),
                narration: payload.narration,
                taxableValue: Number(payload.taxableValue) || Number(payload.amount),
                cgst: Number(payload.cgst) || 0,
                sgst: Number(payload.sgst) || 0,
                igst: Number(payload.igst) || 0,
                totalWithTax: Number(payload.totalWithTax) || Number(payload.amount),
              },
              create: {
                vno: payload.vno,
                date: payload.date,
                type: payload.type,
                particulars: payload.particulars,
                account: payload.account,
                amount: Number(payload.amount) || 0,
                dr: Boolean(payload.dr),
                narration: payload.narration,
                taxableValue: Number(payload.taxableValue) || Number(payload.amount),
                cgst: Number(payload.cgst) || 0,
                sgst: Number(payload.sgst) || 0,
                igst: Number(payload.igst) || 0,
                totalWithTax: Number(payload.totalWithTax) || Number(payload.amount),
                tenantId,
              },
            });
            results.push({ localId, entity, success: true, serverId: saved.id });
          } else if (operation === "delete" && payload.id) {
            await prisma.voucher.deleteMany({ where: { id: payload.id, tenantId } });
            results.push({ localId, entity, success: true });
          }
        }
      } catch (itemErr: any) {
        results.push({ localId, entity, success: false, error: itemErr.message || "Push error" });
      }
    }

    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process push sync" });
  }
}

export async function pullSync(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const sinceParam = req.query.since as string;
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(0);

    const companies = await prisma.company.findMany({ where: { tenantId, updatedAt: { gte: sinceDate } } });
    const ledgers = await prisma.ledger.findMany({ where: { tenantId, updatedAt: { gte: sinceDate } } });
    const parties = await prisma.party.findMany({ where: { tenantId, updatedAt: { gte: sinceDate } } });
    const stockItems = await prisma.stockItem.findMany({ where: { tenantId, updatedAt: { gte: sinceDate } } });
    const vouchers = await prisma.voucher.findMany({
      where: { tenantId, updatedAt: { gte: sinceDate } },
      include: { items: true, entries: true },
    });

    return res.json({
      timestamp: new Date().toISOString(),
      companies,
      ledgers,
      parties,
      stockItems,
      vouchers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process pull sync" });
  }
}
