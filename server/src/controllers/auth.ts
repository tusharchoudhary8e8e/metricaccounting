import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (process.env.NODE_ENV === "production" && (!JWT_SECRET || !JWT_REFRESH_SECRET)) {
  throw new Error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables are required in production!");
}
const SECRET_KEY = JWT_SECRET || "accounting_secret_key_2026";
const REFRESH_SECRET_KEY = JWT_REFRESH_SECRET || "accounting_refresh_key_2026";

export async function register(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, name, tenantName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email." });
    }

    const tenant = await prisma.tenant.create({
      data: { name: tenantName || `${name}'s Business` },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        tenantId: tenant.id,
      },
    });

    // Seed default company and system ledgers for tenant
    await prisma.company.create({
      data: {
        name: `${name} Enterprises`,
        financialYear: "1-Apr-2024 to 31-Mar-2025",
        booksFrom: "1-Apr-2024",
        state: "Maharashtra",
        tenantId: tenant.id,
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, tenantId: tenant.id }, SECRET_KEY, {
      expiresIn: "1d",
    });
    const refreshToken = jwt.sign({ userId: user.id, tenantId: tenant.id }, REFRESH_SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, tenantId: tenant.id },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
}

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, tenantId: user.tenantId }, SECRET_KEY, {
      expiresIn: "1d",
    });
    const refreshToken = jwt.sign({ userId: user.id, tenantId: user.tenantId }, REFRESH_SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.json({
      message: "Login successful",
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
}

export async function refresh(req: AuthenticatedRequest, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required." });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET_KEY) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, tenantId: user.tenantId }, SECRET_KEY, {
      expiresIn: "1d",
    });

    return res.json({ token });
  } catch (err: any) {
    return res.status(403).json({ error: "Invalid refresh token." });
  }
}
