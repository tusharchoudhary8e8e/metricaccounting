import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import {
  signInUser,
  signOutUser,
  getCurrentUser,
  getSupabaseConfig,
} from "../../lib/supabase";
import { MONO } from "../utils/accounting";

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: () => void;
  isMandatory?: boolean;
}

export function LoginScreen({ onBack, onLoginSuccess, isMandatory = false }: LoginScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // IP Address Security States
  const [currentIp, setCurrentIp] = useState<string>("Detecting IP...");
  const [fetchingIp, setFetchingIp] = useState(true);

  const config = getSupabaseConfig();

  useEffect(() => {
    getCurrentUser().then((u) => setCurrentUser(u));

    let isMounted = true;
    const fetchPublicIp = async () => {
      setFetchingIp(true);
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        if (isMounted && data.ip) {
          setCurrentIp(data.ip);
          setFetchingIp(false);
          return;
        }
      } catch (e) {
        try {
          const res = await fetch("https://api.ip.sb/json");
          const data = await res.json();
          if (isMounted && data.ip) {
            setCurrentIp(data.ip);
            setFetchingIp(false);
            return;
          }
        } catch (err) {}
      }
      if (isMounted) {
        setCurrentIp("127.0.0.1 (Local)");
        setFetchingIp(false);
      }
    };
    fetchPublicIp();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMsg({ type: "error", text: "Please enter both User ID (Email) and Password." });
      return;
    }

    setLoading(true);
    try {
      const res = await signInUser(normalizedEmail, password);
      const user = res.user;

      // Determine bound IP address from Cloud user_metadata or localStorage
      const cloudAllowedIp = user?.user_metadata?.allowed_ip;
      const localAllowedIp = localStorage.getItem(`tap_allowed_ip_${normalizedEmail}`);
      const boundIp = cloudAllowedIp || localAllowedIp;

      const effectiveCurrentIp = currentIp.replace(" (Local)", "");

      // Enforce IP Matching: If an IP is registered, current IP must match!
      if (boundIp && effectiveCurrentIp !== "127.0.0.1" && boundIp !== effectiveCurrentIp) {
        await signOutUser();
        setMsg({
          type: "error",
          text: `⛔ ACCESS DENIED (IP RESTRICTION): This account is locked to IP [${boundIp}]. Your current device IP is [${effectiveCurrentIp}]. Login from this device/IP is blocked.`,
        });
        setLoading(false);
        return;
      }

      if (effectiveCurrentIp !== "127.0.0.1") {
        localStorage.setItem(`tap_allowed_ip_${normalizedEmail}`, boundIp || effectiveCurrentIp);
      }

      setMsg({ type: "success", text: `Successfully logged in as ${user.email}! Device IP [${effectiveCurrentIp}] verified.` });
      setCurrentUser(user);
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to sign in. Check email and password." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOutUser();
    setCurrentUser(null);
    setMsg({ type: "info", text: "Logged out successfully." });
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: MONO }} className="min-h-screen bg-slate-900/90 fixed inset-0 z-50 p-4 flex flex-col items-center justify-center backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border-2 border-sky-800 shadow-2xl rounded-sm overflow-hidden">
        {/* Header */}
        <div className="bg-sky-900 text-white px-4 py-3.5 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
              <span>🔒 SYSTEM SIGN IN</span>
            </h2>
            <p className="text-xs text-sky-200">Authorized Access & Single-Device IP Security</p>
          </div>
          {!isMandatory && (
            <button
              onClick={onBack}
              className="bg-sky-700 hover:bg-sky-600 text-white text-xs px-3 py-1 font-bold border border-sky-500 rounded cursor-pointer"
            >
              Esc: Back
            </button>
          )}
        </div>

        {/* User Badge if logged in */}
        {currentUser ? (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-emerald-900">AUTHENTICATED USER</span>
              </div>
              <p className="text-xs text-emerald-700 font-mono mt-1">User ID: <strong>{currentUser.email}</strong></p>
              <p className="text-[11px] text-emerald-600 font-mono">
                Bound IP: {currentUser.user_metadata?.allowed_ip || localStorage.getItem(`tap_allowed_ip_${currentUser.email?.toLowerCase()}`) || currentIp}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 font-bold rounded shadow cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : null}

        {/* Alert Messages */}
        {msg && (
          <div
            className={`p-3 text-xs font-semibold m-4 rounded border ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : msg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">USER ID (EMAIL ADDRESS)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@domain.com"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-sky-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-sky-600 font-mono"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">Detected Device IP:</span>
              <span className="font-mono font-bold text-slate-900">{fetchingIp ? "Detecting..." : currentIp}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              🛡️ System verifies this IP matches your account's authorized IP set by administrator.
            </p>
          </div>

          <div className="pt-2 flex justify-between items-center">
            {!isMandatory ? (
              <button
                type="button"
                onClick={onBack}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-4 py-2 font-bold rounded cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <span className="text-xs text-amber-700 font-bold">🔒 Login required to access system</span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-sky-800 hover:bg-sky-900 text-white text-xs px-6 py-2 font-bold rounded shadow cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying IP & Logging in..." : "SIGN IN"}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="bg-sky-50 border-t border-sky-200 px-4 py-2 text-[11px] text-slate-600 flex justify-between items-center">
          <span>Target: {config.isCustom ? "Custom Supabase Project" : "TAP Managed Supabase Cloud"}</span>
          <span>Status: {currentUser ? "Logged In" : "Authenticating"}</span>
        </div>
      </div>
    </div>
  );
}
