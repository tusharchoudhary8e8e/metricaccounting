import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = "https://vgyxuaistuegijwjopnf.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_HOyOBnSCNUnClEfzvPeiVw_bO2gzrrL";

function getInitialConfig() {
  const customUrl = localStorage.getItem("custom_supabase_url");
  const customKey = localStorage.getItem("custom_supabase_key");
  if (customUrl && customKey) {
    return { url: customUrl, key: customKey, isCustom: true };
  }
  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_PUBLISHABLE_KEY, isCustom: false };
}

let currentConfig = getInitialConfig();
export let supabase: SupabaseClient = createClient(currentConfig.url, currentConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function getSupabaseConfig() {
  return currentConfig;
}

export function updateCustomSupabaseConfig(url: string, key: string) {
  localStorage.setItem("custom_supabase_url", url);
  localStorage.setItem("custom_supabase_key", key);
  currentConfig = { url, key, isCustom: true };
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabase;
}

export function resetSupabaseConfig() {
  localStorage.removeItem("custom_supabase_url");
  localStorage.removeItem("custom_supabase_key");
  currentConfig = { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_PUBLISHABLE_KEY, isCustom: false };
  supabase = createClient(currentConfig.url, currentConfig.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabase;
}

// ─── Auth Helper Functions ───────────────────────────────────────────────────

export async function signUpUser(email: string, pass: string, options?: { data?: Record<string, any> }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options,
  });
  if (error) throw error;
  return data;
}

export async function updateUserMetadata(metadata: Record<string, any>) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });
  if (error) throw error;
  return data;
}

export async function signInUser(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign out warning:", error);
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null, session);
  });
}

