import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    tenantId: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: JWT_SECRET environment variable is required in production!");
}
const SECRET_KEY = JWT_SECRET || "accounting_secret_key_2026";

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      // Default fallback tenant (tenantId = 1) if no token provided during dev
      req.user = { userId: 1, email: "dev@meridian.com", tenantId: 1 };
      return next();
    }
    return res.status(401).json({ error: "Access token is required" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired JWT token" });
  }
}
