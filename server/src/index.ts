import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authenticateToken } from "./middleware/auth.js";
import { register, login, refresh } from "./controllers/auth.js";
import { createVoucher, getVouchers } from "./controllers/vouchers.js";
import { pushSync, pullSync } from "./controllers/sync.js";
import { getTrialBalance, getProfitAndLoss } from "./controllers/reports.js";

dotenv.config();

// Validate required environment variables at server startup
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    console.error("❌ FATAL: JWT_SECRET environment variable is required in production!");
    process.exit(1);
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    console.error("❌ FATAL: JWT_REFRESH_SECRET environment variable is required in production!");
    process.exit(1);
  }
}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function ensureDefaultTenant() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: 1 } });
    if (!tenant) {
      await prisma.tenant.create({
        data: { id: 1, name: "Default Dev Tenant" }
      });
      console.log("🌱 Created default dev tenant (id: 1)");
    }
  } catch (err) {
    console.error("Error creating default tenant:", err);
  }
}
ensureDefaultTenant();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Public Auth Endpoints
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/refresh", refresh);

// Protected Financial & Sync Endpoints
app.use("/api", authenticateToken);

app.post("/api/vouchers", createVoucher);
app.get("/api/vouchers", getVouchers);

app.post("/api/sync/push", pushSync);
app.get("/api/sync/pull", pullSync);

app.get("/api/reports/trial-balance", getTrialBalance);
app.get("/api/reports/p-and-l", getProfitAndLoss);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString(), message: "Accounting Multi-Tenant Server Running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Accounting Backend Server listening on http://localhost:${PORT}`);
});
