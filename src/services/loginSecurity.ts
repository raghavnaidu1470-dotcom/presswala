import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
}

interface AttemptRecord {
  timestamps: number[];
  lockoutUntil?: number;
}

const STORAGE_KEY = 'presswala_lockout_state_v1';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 3 * 60 * 1000; // 3 minutes window
const LOCKOUT_MS = 3 * 60 * 1000; // 3 minutes lockout duration

function getStore(): Record<string, AttemptRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, AttemptRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[LoginSecurity] Failed to save store:', e);
  }
}

function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
}

export const loginSecurity = {
  checkLockout(key: string): LockoutStatus {
    const normalized = normalizeKey(key);
    if (!normalized) {
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    const store = getStore();
    const record = store[normalized];
    const now = Date.now();

    if (!record) {
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    // Check if active lockout exists
    if (record.lockoutUntil && record.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        attemptsLeft: 0
      };
    }

    // Filter out attempts older than the window
    const recentTimestamps = (record.timestamps || []).filter(t => now - t < WINDOW_MS);
    record.timestamps = recentTimestamps;
    delete record.lockoutUntil;
    saveStore(store);

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - recentTimestamps.length);
    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsLeft
    };
  },

  recordFailedAttempt(key: string): LockoutStatus {
    const normalized = normalizeKey(key);
    const store = getStore();
    const now = Date.now();

    const record = store[normalized] || { timestamps: [] };
    const recentTimestamps = (record.timestamps || []).filter(t => now - t < WINDOW_MS);
    recentTimestamps.push(now);
    record.timestamps = recentTimestamps;

    let isLocked = false;
    let remainingSeconds = 0;

    if (recentTimestamps.length >= MAX_ATTEMPTS) {
      record.lockoutUntil = now + LOCKOUT_MS;
      isLocked = true;
      remainingSeconds = Math.ceil(LOCKOUT_MS / 1000);
    }

    store[normalized] = record;
    saveStore(store);

    // Record in remote Supabase login_attempts asynchronously if available
    if (isSupabaseConfigured && supabase) {
      supabase.from('login_attempts').insert({
        login_key: normalized,
        success: false,
        user_agent: navigator.userAgent
      }).then();
    }

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - recentTimestamps.length);
    return {
      isLocked,
      remainingSeconds,
      attemptsLeft
    };
  },

  clearLockout(key: string): void {
    const normalized = normalizeKey(key);
    const store = getStore();
    if (store[normalized]) {
      delete store[normalized];
      saveStore(store);
    }

    // Record success in remote Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('login_attempts').insert({
        login_key: normalized,
        success: true,
        user_agent: navigator.userAgent
      }).then();
    }
  }
};

interface JoinRequestRecord {
  timestamps: number[];
}

const JOIN_REQ_STORAGE_KEY = 'presswala_join_request_rate_v1';
const MAX_JOIN_REQUESTS_PER_WINDOW = 3;
const JOIN_REQ_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours window

function getJoinReqStore(): Record<string, JoinRequestRecord> {
  try {
    const raw = localStorage.getItem(JOIN_REQ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveJoinReqStore(store: Record<string, JoinRequestRecord>): void {
  try {
    localStorage.setItem(JOIN_REQ_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[LoginSecurity] Failed to save join request store:', e);
  }
}

export const joinRequestSecurity = {
  checkRateLimit(phone: string): { allowed: boolean; remainingSubmissions: number; retryAfterSeconds: number } {
    const normalized = phone.trim();
    if (!normalized) {
      return { allowed: true, remainingSubmissions: MAX_JOIN_REQUESTS_PER_WINDOW, retryAfterSeconds: 0 };
    }

    const store = getJoinReqStore();
    const record = store[normalized];
    const now = Date.now();

    if (!record) {
      return { allowed: true, remainingSubmissions: MAX_JOIN_REQUESTS_PER_WINDOW, retryAfterSeconds: 0 };
    }

    // Filter attempts within 24 hours
    const recentTimestamps = (record.timestamps || []).filter(t => now - t < JOIN_REQ_WINDOW_MS);
    record.timestamps = recentTimestamps;
    saveJoinReqStore(store);

    if (recentTimestamps.length >= MAX_JOIN_REQUESTS_PER_WINDOW) {
      const oldest = Math.min(...recentTimestamps);
      const retryAfterSeconds = Math.max(0, Math.ceil((oldest + JOIN_REQ_WINDOW_MS - now) / 1000));
      return {
        allowed: false,
        remainingSubmissions: 0,
        retryAfterSeconds
      };
    }

    return {
      allowed: true,
      remainingSubmissions: MAX_JOIN_REQUESTS_PER_WINDOW - recentTimestamps.length,
      retryAfterSeconds: 0
    };
  },

  recordSubmission(phone: string): void {
    const normalized = phone.trim();
    if (!normalized) return;

    const store = getJoinReqStore();
    const now = Date.now();
    const record = store[normalized] || { timestamps: [] };
    const recentTimestamps = (record.timestamps || []).filter(t => now - t < JOIN_REQ_WINDOW_MS);
    recentTimestamps.push(now);
    record.timestamps = recentTimestamps;
    store[normalized] = record;
    saveJoinReqStore(store);
  },

  clearRateLimit(phone: string): void {
    const normalized = phone.trim();
    const store = getJoinReqStore();
    if (store[normalized]) {
      delete store[normalized];
      saveJoinReqStore(store);
    }
  }
};

